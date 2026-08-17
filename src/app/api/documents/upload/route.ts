import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { processAndVectorizeDocument } from "@/agents/documentAgent";
import { executeDocumentSyncPipeline } from "@/services/documentSyncPipeline";


/** Extract text from a PDF buffer, with optional password for protected files. */
export async function extractPdfText(buffer: Buffer, password?: string): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    try {
      const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    } catch {
      // fallback
    }

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      password: password ?? "",
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let lastY: number | null = null;
      let pageStr = "";

      for (const item of content.items as any[]) {
        if (!item.str && !item.hasEOL) continue;
        const currentY = item.transform ? Math.round(item.transform[5]) : null;

        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 4) {
          pageStr += "\n";
        } else if (pageStr.length > 0 && !pageStr.endsWith("\n") && !pageStr.endsWith(" ")) {
          pageStr += " ";
        }

        pageStr += item.str || "";
        if (item.hasEOL) {
          pageStr += "\n";
        }
        lastY = currentY;
      }
      pageTexts.push(pageStr.trim());
    }

    return pageTexts.join("\n\n");
  } catch (err: any) {
    if (err?.name === "PasswordException") {
      throw err;
    }
    console.warn("PDF text extraction warning:", err?.message || err);
    return "";
  }
}

function autoDetectAccountInfo(
  text: string,
  fileName: string
): { institution: string; name: string; type: string; accountNumber: string | null } {
  const lower = (text + " " + fileName).toLowerCase();

  // Parse Account Number from text or filename
  let accountNumber: string | null = null;
  const accMatch =
    text.match(/(?:account\s*number|account\s*no|acc\s*no|account\s*#)[\s:]*([A-Z0-9\s-]+)/i) ||
    fileName.match(/(?:inv|sta|vbi|acc)[-_]([A-Z0-9-]+)/i);

  if (accMatch && accMatch[1].trim().length >= 3) {
    accountNumber = accMatch[1].trim().replace(/\s+/g, " ");
  }

  // 1. BANKING (Check bank headers FIRST before merchant debit order keywords like Telkom/Vodacom/SARS)
  if (lower.includes("standard bank") || lower.includes("the standard bank of south africa")) {
    let type = "CURRENT";
    if (lower.includes("credit card")) type = "CREDIT_CARD";
    else if (lower.includes("revolving credit") || lower.includes("personal loan") || lower.includes("home loan") || lower.includes("mortgage")) type = "LOAN";
    else if (lower.includes("plusplan") || lower.includes("savings")) type = "SAVINGS";

    return { institution: "Standard Bank", name: accountNumber ? `Standard Bank ${accountNumber}` : "Standard Bank Account", type, accountNumber };
  }
  if (lower.includes("fnb") || lower.includes("first national bank")) {
    return { institution: "FNB", name: accountNumber ? `FNB Account ${accountNumber}` : "FNB Cheque Account", type: "CURRENT", accountNumber };
  }
  if (lower.includes("capitec")) {
    return { institution: "Capitec", name: accountNumber ? `Capitec ${accountNumber}` : "Capitec Global One", type: "CURRENT", accountNumber };
  }
  if (lower.includes("absa")) {
    return { institution: "Absa", name: accountNumber ? `Absa ${accountNumber}` : "Absa Account", type: "CURRENT", accountNumber };
  }
  if (lower.includes("nedbank")) {
    return { institution: "Nedbank", name: accountNumber ? `Nedbank ${accountNumber}` : "Nedbank Account", type: "CURRENT", accountNumber };
  }

  // 2. MUNICIPAL (Strict matching — exclude customer address lines)
  if (lower.includes("city of ekurhuleni") || lower.includes("ekurhuleni municipality")) {
    return { institution: "City of Ekurhuleni", name: "Ekurhuleni Municipal Account", type: "MUNICIPAL", accountNumber };
  }
  if (lower.includes("city of johannesburg") || lower.includes("coj municipal") || lower.includes("johannesburg water")) {
    return { institution: "City of Johannesburg", name: "COJ Municipal Rates", type: "MUNICIPAL", accountNumber };
  }
  if (lower.includes("city of tshwane") || lower.includes("tshwane municipality") || lower.includes("tshwane metro")) {
    return { institution: "City of Tshwane", name: "Tshwane Utilities Account", type: "MUNICIPAL", accountNumber };
  }
  if (lower.includes("city of cape town") || lower.includes("cape town municipality")) {
    return { institution: "City of Cape Town", name: "CCT Rates & Taxes", type: "MUNICIPAL", accountNumber };
  }

  // 3. TELCO / SERVICE UTILITIES
  if (lower.includes("telkom") || lower.includes("telkom sa")) {
    return { institution: "Telkom SA", name: accountNumber ? `Telkom Account ${accountNumber}` : "Telkom Landline / Broadband", type: "SERVICE_ACCOUNT", accountNumber };
  }
  if (lower.includes("vodacom") || lower.includes("tobi")) {
    return { institution: "Vodacom", name: accountNumber ? `Vodacom Contract ${accountNumber}` : "Vodacom Mobile Contract", type: "SERVICE_ACCOUNT", accountNumber };
  }
  if (lower.includes("mtn")) {
    return { institution: "MTN", name: accountNumber ? `MTN Account ${accountNumber}` : "MTN Cellular Account", type: "SERVICE_ACCOUNT", accountNumber };
  }

  // 4. EDUCATION
  if (lower.includes("school") || lower.includes("college") || lower.includes("academy") || lower.includes("university")) {
    return { institution: "School Admin", name: accountNumber ? `School Account ${accountNumber}` : "School Fees Account", type: "EDUCATION", accountNumber };
  }

  // 5. INSURANCE
  if (lower.includes("insurance") || lower.includes("santam") || lower.includes("outsurance") || lower.includes("hollard") || lower.includes("discovery insure")) {
    return { institution: "Insurance Provider", name: accountNumber ? `Policy ${accountNumber}` : "Insurance Policy Account", type: "INSURANCE", accountNumber };
  }

  // Fallback
  const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim().slice(0, 30);
  const instName = accountNumber ? `Account ${accountNumber}` : cleanName || "Service Provider";
  return {
    institution: instName,
    name: `${instName} Account`,
    type: "SERVICE_ACCOUNT",
    accountNumber,
  };
}
function extractDocumentFinancials(text: string): { amountDue: number | null; isLiability: boolean } {
  const lower = text.toLowerCase();

  const isLiability =
    lower.includes("invoice") ||
    lower.includes("tax invoice") ||
    lower.includes("amount due") ||
    lower.includes("total due") ||
    lower.includes("balance fwd") ||
    lower.includes("balance brought forward") ||
    lower.includes("municipal") ||
    lower.includes("rates & taxes") ||
    lower.includes("telecom") ||
    lower.includes("telkom") ||
    lower.includes("vodacom") ||
    lower.includes("mtn") ||
    lower.includes("loan") ||
    lower.includes("credit card") ||
    lower.includes("cellular");

  let amountDue: number | null = null;
  const patterns = [
    /(?:total\s*due|amount\s*due|pay\s*on\s*or\s*before|balance\s*fwd|balance\s*brought\s*forward|total\s*payable|amount\s*payable|current\s*balance|total\s*amount)[\s:]*R?\s*([\d,]+(?:\.\d{2})?)/i,
    /R\s*([\d,]+\.\d{2})/i,
    /([\d,]+\.\d{2})/
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const parsedVal = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(parsedVal) && parsedVal > 0) {
        amountDue = parsedVal;
        break;
      }
    }
  }

  return { amountDue, isLiability };
}

/** POST /api/documents/upload
 *  FormData fields: file (File), password? (string), accountId (string)
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const password = (formData.get("password") as string | null) || undefined;
    const accountId = formData.get("accountId") as string | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Exact-duplicate check — no LLM call needed
    const existing = await prisma.document.findFirst({ where: { fileHash } });
    if (existing) {
      return NextResponse.json(
        { error: "DUPLICATE", message: "This file was already uploaded", existingId: existing.id },
        { status: 409 }
      );
    }

    // Extract text early so we can auto-detect institution if needed
    let rawText: string;
    try {
      rawText = await extractPdfText(buffer, password);
    } catch (err: any) {
      if (err?.name === "PasswordException") {
        return NextResponse.json(
          {
            error: err.code === 2 ? "WRONG_PASSWORD" : "PASSWORD_REQUIRED",
            message: err.code === 2 ? "Incorrect password" : "This PDF is password-protected",
          },
          { status: 422 }
        );
      }
      throw err;
    }

    let resolvedAccountId = accountId;
    let accountNameCreated: string | null = null;

    if (accountId === "__AUTO__" || !accountId) {
      const detected = autoDetectAccountInfo(rawText, file.name);

      let existingAccount = null;
      const userAccounts = await prisma.account.findMany({ where: { userId } });

      if (detected.accountNumber) {
        // 1. Match by normalized digits of account number (e.g. "02 307 446 9" -> "023074469" or ending digits "4469")
        const rawDigits = detected.accountNumber.replace(/\D/g, "");

        existingAccount = userAccounts.find((a) => {
          const accDigits = (a.accountNumberMasked || "").replace(/\D/g, "");
          const nameDigits = a.name.replace(/\D/g, "");

          if (rawDigits.length >= 4 && accDigits.length >= 4) {
            return accDigits.endsWith(rawDigits.slice(-4)) || rawDigits.endsWith(accDigits.slice(-4));
          }
          if (rawDigits.length >= 4 && nameDigits.length >= 4) {
            return nameDigits.endsWith(rawDigits.slice(-4));
          }
          return false;
        }) ?? null;
      }

      if (!existingAccount && detected.institution) {
        // 2. Match by institution name (fallback)
        existingAccount = userAccounts.find((a) =>
          a.institution.toLowerCase() === detected.institution.toLowerCase()
        ) ?? null;
      }

      if (existingAccount) {
        resolvedAccountId = existingAccount.id;
        accountNameCreated = `${existingAccount.name} (${existingAccount.institution})`;

        // Fill in missing account number if newly parsed
        if (detected.accountNumber && !existingAccount.accountNumberMasked) {
          await prisma.account.update({
            where: { id: existingAccount.id },
            data: { accountNumberMasked: detected.accountNumber },
          });
        }
      } else {
        // 3. Auto-create a brand new account only if no matching account exists
        const newAccount = await prisma.account.create({
          data: {
            userId,
            name: detected.accountNumber ? `${detected.institution} ${detected.accountNumber}` : detected.name,
            institution: detected.institution,
            accountNumberMasked: detected.accountNumber ?? null,
            type: detected.type as any,
            currency: "ZAR",
            openingBalance: 0,
            isDebt: !["CURRENT", "SAVINGS", "INVESTMENT", "CASH_WALLET"].includes(detected.type),
            notes: `Auto-created from document upload ${file.name}`,
          },
        });
        resolvedAccountId = newAccount.id;
        accountNameCreated = `${newAccount.name} (${newAccount.institution})`;
      }
    } else if (accountId === "__NEW__") {
      // Auto-detect details from document text, with optional form overrides
      const detected = autoDetectAccountInfo(rawText, file.name);

      const userInst = (formData.get("newInstitution") as string | null)?.trim();
      const userName = (formData.get("newAccountName") as string | null)?.trim();
      const userType = (formData.get("newAccountType") as string | null);

      const inst = userInst || detected.institution;
      const acctName = userName || (detected.accountNumber ? `${inst} ${detected.accountNumber}` : detected.name);
      const acctType = userType || detected.type;

      // Check if matching account already exists before creating
      let existingAccount = await prisma.account.findFirst({
        where: {
          userId,
          OR: [
            ...(detected.accountNumber ? [{ accountNumberMasked: detected.accountNumber }] : []),
            { institution: { equals: inst, mode: "insensitive" as const } },
          ],
        },
      });

      if (existingAccount) {
        resolvedAccountId = existingAccount.id;
        accountNameCreated = `${existingAccount.name} (${existingAccount.institution})`;
      } else {
        const newAccount = await prisma.account.create({
          data: {
            userId,
            name: acctName,
            institution: inst,
            accountNumberMasked: detected.accountNumber ?? null,
            type: acctType as any,
            currency: "ZAR",
            openingBalance: 0,
            isDebt: !["CURRENT", "SAVINGS", "INVESTMENT", "CASH_WALLET"].includes(acctType),
            notes: `Created from document upload ${file.name}`,
          },
        });
        resolvedAccountId = newAccount.id;
        accountNameCreated = `${newAccount.name} (${newAccount.institution})`;
      }
    }

    if (!resolvedAccountId) return NextResponse.json({ error: "accountId is required" }, { status: 400 });

    // Verify account belongs to current user
    const account = await prisma.account.findFirst({ where: { id: resolvedAccountId, userId } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // Extract balance/financials from document text and update account
    const financials = extractDocumentFinancials(rawText);
    const isAsset = ["CURRENT", "SAVINGS", "INVESTMENT", "CASH_WALLET"].includes(account.type);
    const isDebt = !isAsset;

    const accountUpdates: any = { isDebt };
    if (financials.amountDue && (Number(account.openingBalance) === 0 || isDebt)) {
      accountUpdates.openingBalance = isDebt ? -Math.abs(financials.amountDue) : Math.abs(financials.amountDue);
    }

    await prisma.account.update({
      where: { id: account.id },
      data: accountUpdates,
    });

    // Persist document record
    const doc = await prisma.document.create({
      data: {
        relatedEntityType: "ACCOUNT",
        relatedEntityId: resolvedAccountId,
        documentType: "OTHER",
        fileUrl: `upload/${fileHash}`,
        fileHash,
        parseStatus: "PENDING",
        uploadedAt: new Date(),
      },
    });

    // Run Document Agent pipeline (hashing, classification, urgency, vectorization)
    const existingHashes = (
      await prisma.document.findMany({ where: { id: { not: doc.id } }, select: { fileHash: true } })
    )
      .map((d) => d.fileHash)
      .filter(Boolean) as string[];

    const result = await processAndVectorizeDocument(doc.id, buffer, rawText, existingHashes);

    // Run Automated Ground-Truth Database Alignment Pipeline
    const syncReport = await executeDocumentSyncPipeline(
      userId,
      doc.id,
      rawText,
      result.documentType,
      result.parsedFields
    );

    // Update record with refined classification and parse status
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        documentType: result.documentType as any,
        parseStatus: "PARSED_AWAITING_REVIEW",
        parsedData: {
          documentType: result.documentType,
          urgency: result.detectedUrgency,
          urgencyNote: result.urgencyNote ?? null,
          embeddingsCreated: result.embeddingsCreated ?? 0,
          authorityLevel: result.authorityLevel,
          rawText,
          fullText: rawText,
          parsedFields: result.parsedFields ?? {},
          syncReport,
          ...(result.parsedFields ?? {}),
        },
      },
    });

    return NextResponse.json(
      {
        id: doc.id,
        documentType: result.documentType,
        parseStatus: "PARSED_AWAITING_REVIEW",
        urgency: result.detectedUrgency,
        urgencyNote: result.urgencyNote,
        embeddingsCreated: result.embeddingsCreated,
        accountCreated: accountNameCreated ?? `${account.name} (${account.institution})`,
        syncReport,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message ?? "Upload failed" }, { status: 500 });
  }
}

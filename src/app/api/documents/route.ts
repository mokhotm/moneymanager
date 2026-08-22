import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { getUserEntityScope } from "@/lib/userEntityScope";

/** GET /api/documents — list documents for the current user with enriched names & account metadata */
export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await getUserEntityScope(userId);
    if (scope.allEntityIds.length === 0) {
      return NextResponse.json([]);
    }

    const documents = await prisma.document.findMany({
      where: {
        relatedEntityId: { in: scope.allEntityIds },
      },
      orderBy: { uploadedAt: "desc" },
    });

    const { accountMap, incomeMap, assetMap, debtMap } = scope;

    const enriched = documents.map((doc) => {
      const parsedData = (doc.parsedData as any) || {};
      const parsedFields = parsedData.parsedFields || parsedData;
      const rawText: string = parsedData.rawText || parsedData.fullText || "";

      let documentName = "";
      let institution = "";
      let accountName = "";
      let accountNumber = "";

      // Check linked entity
      if (doc.relatedEntityType === "ACCOUNT") {
        const acc = accountMap.get(doc.relatedEntityId);
        if (acc) {
          institution = acc.institution;
          accountName = acc.name;
          accountNumber = acc.accountNumberMasked || "";
        }
      } else if (doc.relatedEntityType === "DEBT") {
        const debt = debtMap.get(doc.relatedEntityId);
        if (debt?.account) {
          institution = debt.account.institution;
          accountName = debt.account.name;
          accountNumber = debt.account.accountNumberMasked || "";
        }
      } else if (doc.relatedEntityType === "INCOME") {
        const inc = incomeMap.get(doc.relatedEntityId);
        if (inc) {
          institution = "SARS / Employer";
          accountName = inc.sourceName;
        }
      } else if (doc.relatedEntityType === "ASSET") {
        const asset = assetMap.get(doc.relatedEntityId);
        if (asset) {
          institution = asset.type;
          accountName = asset.name;
        }
      }

      // Check text or parsed fields for specific account matches if institution/name is generic
      if (!accountName || accountName === "Default") {
        if (rawText.includes("02 307 446 9") || rawText.includes("PRESTIGE CURRENT")) {
          institution = "Standard Bank";
          accountName = "Prestige Current Account";
          accountNumber = "02 307 446 9";
        } else if (rawText.includes("02 593 650 6") || rawText.includes("MYMO")) {
          institution = "Standard Bank";
          accountName = "MyMo Account";
          accountNumber = "02 593 650 6";
        } else if (rawText.includes("02 596 759 2") || rawText.includes("PLUSPLAN")) {
          institution = "Standard Bank";
          accountName = "PlusPlan Savings";
          accountNumber = "02 596 759 2";
        } else if (rawText.includes("22 043 551 0") || rawText.includes("REVOLVING CREDIT")) {
          institution = "Standard Bank";
          accountName = "Revolving Credit Plan";
          accountNumber = "22 043 551 0";
        } else if (rawText.includes("5239-xxxx-xxxx-3529") || rawText.includes("TITANIUM PRESTIGE")) {
          institution = "Standard Bank";
          accountName = "Titanium Credit Card";
          accountNumber = "5239-xxxx-3529";
        } else if (rawText.includes("62819203948") || rawText.includes("FNB") || rawText.includes("First National Bank")) {
          institution = "FNB";
          accountName = "Cheque Account";
          accountNumber = "62819203948";
        } else if (rawText.includes("EKURHULENI") || rawText.includes("MUNICIPAL")) {
          institution = "City of Ekurhuleni";
          accountName = "Municipal Rates & Electricity";
        } else if (rawText.includes("VODACOM")) {
          institution = "Vodacom";
          accountName = "Monthly Cellular Contract";
        }
      }

      // Default fallbacks based on document type
      if (!accountName) {
        if (doc.documentType === "PAYSLIP" || parsedFields.employer) {
          accountName = parsedFields.employer || "Employer Salary / SARS";
          if (!institution) institution = "SARS / Payroll";
        } else if (doc.documentType === "MUNICIPAL_BILL") {
          accountName = "City Municipal Rates";
          if (!institution) institution = "Municipality";
        } else if (doc.documentType === "INVOICE") {
          accountName = "Telecom / Service Invoice";
          if (!institution) institution = "Service Provider";
        } else {
          accountName = "Standard Bank Account";
          if (!institution) institution = "Standard Bank";
        }
      }

      // Formulate clear, descriptive document name
      if (parsedFields.employer || doc.documentType === "PAYSLIP") {
        const emp = parsedFields.employer || "Employer Salary";
        documentName = `${emp} — Payslip / IRP5`;
      } else if (doc.documentType === "MUNICIPAL_BILL") {
        documentName = `${institution || "Municipal"} — ${accountName}`;
      } else if (doc.documentType === "INVOICE") {
        documentName = `${institution || "Provider"} — ${accountName}`;
      } else {
        documentName = `${institution ? `${institution} ` : ""}${accountName} — Statement`;
      }

      // Exclude heavy raw text blob from list response to keep JSON payload lightweight
      const { parsedData: _fullParsed, ...docBase } = doc;

      return {
        ...docBase,
        documentName,
        institution: institution || "Standard Bank",
        accountName: accountName || "Standard Bank Account",
        accountNumber: accountNumber || "",
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

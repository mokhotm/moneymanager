import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { processAndVectorizeDocument } from "@/agents/documentAgent";

// Disable Next.js body parser — we handle multipart manually via formData()
export const config = { api: { bodyParser: false } };

/** Extract text from a PDF buffer, with optional password for protected files. */
async function extractPdfText(buffer: Buffer, password?: string): Promise<string> {
  // Dynamic import keeps pdfjs-dist out of the client bundle
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "";

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
    pageTexts.push(content.items.map((item: any) => item.str).join(" "));
  }

  return pageTexts.join("\n");
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
    if (!accountId) return NextResponse.json({ error: "accountId is required" }, { status: 400 });

    // Verify account belongs to the current user
    const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

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

    // Extract text — surface PASSWORD_REQUIRED without storing anything
    let rawText: string;
    try {
      rawText = await extractPdfText(buffer, password);
    } catch (err: any) {
      // PasswordException.name === "PasswordException"; code 1 = needs password, 2 = wrong password
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

    // Persist the document record
    const doc = await prisma.document.create({
      data: {
        relatedEntityType: "ACCOUNT",
        relatedEntityId: accountId,
        documentType: "OTHER",      // processAndVectorizeDocument will refine this
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
        },
      },
    });

    return NextResponse.json({
      id: doc.id,
      documentType: result.documentType,
      parseStatus: "PARSED_AWAITING_REVIEW",
      urgency: result.detectedUrgency,
      urgencyNote: result.urgencyNote,
      embeddingsCreated: result.embeddingsCreated,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message ?? "Upload failed" }, { status: 500 });
  }
}

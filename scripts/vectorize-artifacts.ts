import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { generateEmbeddingVector } from "../src/lib/embeddings";

const prisma = new PrismaClient();

function sanitizeText(str: string): string {
  return str.replace(/[^\x00-\x7F]/g, " ").replace(/\s+/g, " ").trim();
}

async function vectorizeArtifacts() {
  console.log("Starting vector embedding pipeline for all 11 Artifact PDFs...");

  const summaryPath = path.join(process.cwd(), "Artifacts", "extracted_pdf_summary.txt");
  if (!fs.existsSync(summaryPath)) {
    console.error("extracted_pdf_summary.txt not found in Artifacts");
    return;
  }

  const fileContent = fs.readFileSync(summaryPath, "utf-8");
  const sections = fileContent.split("=========================================");

  let totalDocs = 0;
  let totalChunks = 0;

  for (let i = 0; i < sections.length; i++) {
    const text = sections[i].trim();
    if (text.startsWith("FILE:")) {
      const filename = text.split("\n")[0].replace("FILE:", "").trim();
      const bodyText = (sections[i + 1] || "").trim();

      if (!filename || !bodyText) continue;

      let docType: any = "OTHER";
      if (filename.toLowerCase().includes("paystub")) docType = "PAYSLIP";
      else if (filename.toLowerCase().includes("bill") || filename.toLowerCase().includes("generatebill")) docType = "MUNICIPAL_BILL";
      else if (filename.toLowerCase().includes("telkom")) docType = "INVOICE";
      else if (filename.toLowerCase().includes("xxxx") || filename.toLowerCase().includes("pln")) docType = "BANK_STATEMENT";

      const doc = await prisma.document.create({
        data: {
          relatedEntityType: "ACCOUNT",
          relatedEntityId: "artifact_ingest",
          documentType: docType,
          fileUrl: `/Artifacts/${filename}`,
          fileHash: `hash_${filename}_v3_${Date.now()}_${i}`,
          parsed: true,
          parseStatus: "APPLIED",
          parsedData: { filename, length: bodyText.length },
        },
      });
      totalDocs++;

      // Chunk text into 8-line blocks
      const lines = bodyText.split("\n").map((l) => sanitizeText(l)).filter((l) => l.length > 0);
      for (let c = 0; c < lines.length; c += 8) {
        const chunkText = lines.slice(c, c + 8).join(" | ");
        if (chunkText.length < 10) continue;

        const vector = generateEmbeddingVector(chunkText);
        await prisma.documentEmbedding.create({
          data: {
            documentId: doc.id,
            contentChunk: chunkText.slice(0, 1000),
            embeddingJson: vector,
            metadataJson: { filename, docType },
          },
        });
        totalChunks++;
      }
    }
  }

  console.log(`SUCCESS: Vectorized ${totalChunks} semantic chunks across ${totalDocs} Artifact documents into PostgreSQL!`);
}

vectorizeArtifacts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

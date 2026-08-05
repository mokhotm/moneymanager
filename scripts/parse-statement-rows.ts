import fs from "fs";
import path from "path";

const summaryPath = path.join(process.cwd(), "Artifacts", "extracted_pdf_summary.txt");
const text = fs.readFileSync(summaryPath, "utf-8");

const sections = text.split("=========================================");

for (let i = 0; i < sections.length; i++) {
  if (sections[i].includes("FILE: XXXX4469.pdf")) {
    const body = sections[i + 1] || "";
    const lines = body.split("\n");
    
    console.log(`=== FULL LINE SCAN OF XXXX4469.pdf (${lines.length} lines) ===\n`);
    
    // Print all non-empty lines that contain debit amounts
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j].trim();
      if (!line) continue;
      
      // Match lines with negative amounts or debit descriptions
      if (line.startsWith("-") || line.toLowerCase().includes("debit") || line.toLowerCase().includes("std bank") || line.toLowerCase().includes("debicheck") || line.toLowerCase().includes("fee") || line.toLowerCase().includes("policy") || line.toLowerCase().includes("insurance")) {
        console.log(`L${j}: ${line}`);
      }
    }
  }
}

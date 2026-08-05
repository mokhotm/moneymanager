import fs from "fs";
import path from "path";

const summaryPath = path.join(process.cwd(), "Artifacts", "extracted_pdf_summary.txt");
const text = fs.readFileSync(summaryPath, "utf-8");

const sections = text.split("=========================================");

for (let i = 0; i < sections.length; i++) {
  if (sections[i].includes("FILE: XXXX4469.pdf")) {
    const body = sections[i + 1] || "";
    const lines = body.split("\n");
    console.log(`Found XXXX4469.pdf with ${lines.length} lines!`);
    
    // Print lines with amounts >= R1,000 or debit keywords
    for (let j = 0; j < lines.length; j++) {
      const l = lines[j].trim();
      if (l.match(/\d{1,3},\d{3}\.\d{2}/) || l.match(/\d{4,6}\.\d{2}/) || l.toLowerCase().includes("debit") || l.toLowerCase().includes("loan") || l.toLowerCase().includes("bond") || l.toLowerCase().includes("sars")) {
        console.log(`L${j}: ${l}`);
      }
    }
  }
}

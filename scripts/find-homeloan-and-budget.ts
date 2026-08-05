import fs from "fs";
import path from "path";

const summaryPath = path.join(process.cwd(), "Artifacts", "extracted_pdf_summary.txt");
const text = fs.readFileSync(summaryPath, "utf-8");

const sections = text.split("=========================================");

console.log("Searching for Home Loan / Mortgage / Bond debits and recurring budget lines across all statements...\n");

for (const section of sections) {
  if (!section.includes("FILE: XXXX4469.pdf") && !section.includes("FILE: Paystub_202705.pdf")) continue;

  const lines = section.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (
      lower.includes("home") ||
      lower.includes("bond") ||
      lower.includes("mortgage") ||
      lower.includes("housing") ||
      lower.includes("property") ||
      lower.includes("hl") ||
      lower.includes("sa home") ||
      lower.includes("std bank hl")
    ) {
      console.log(`[MATCH]: ${line}`);
      for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 3); j++) {
        console.log(`   ${lines[j]}`);
      }
      console.log("---");
    }
  }
}

import fs from "fs";
import path from "path";

const summaryPath = path.join(process.cwd(), "Artifacts", "extracted_pdf_summary.txt");
const text = fs.readFileSync(summaryPath, "utf-8");
console.log("File length:", text.length);

const sections = text.split(/=========================================/);
console.log("Sections count:", sections.length);
for (let i = 0; i < Math.min(sections.length, 5); i++) {
  console.log(`--- Section ${i} ---`);
  console.log(sections[i].slice(0, 150));
}

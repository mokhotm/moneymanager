import fs from "fs";
import path from "path";

const summaryPath = path.join(process.cwd(), "Artifacts", "extracted_pdf_summary.txt");
const text = fs.readFileSync(summaryPath, "utf-8");

const sections = text.split("=========================================");

for (let i = 0; i < sections.length; i++) {
  if (sections[i].includes("FILE: Paystub_202705.pdf")) {
    const body = sections[i + 1] || "";
    const lines = body.split("\n");
    console.log(`Found Paystub_202705.pdf with ${lines.length} lines!`);
    for (let j = 0; j < lines.length; j++) {
      console.log(`L${j}: ${lines[j].trim()}`);
    }
  }
}

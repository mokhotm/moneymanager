import fs from "fs";
import path from "path";

const summaryPath = path.join(process.cwd(), "Artifacts", "extracted_pdf_summary.txt");
const text = fs.readFileSync(summaryPath, "utf-8");

const sections = text.split("=========================================");

console.log(`Found ${sections.length} sections in extracted_pdf_summary.txt\n`);

for (let i = 0; i < sections.length; i++) {
  const block = sections[i].trim();
  if (block.startsWith("FILE:")) {
    const filename = block.split("\n")[0].replace("FILE:", "").trim();
    const body = sections[i + 1] || "";
    console.log(`\n==================================================`);
    console.log(`FILE: ${filename}`);
    console.log(`==================================================`);
    
    // Scan for keywords
    const lower = body.toLowerCase();
    const keywords = ["home", "bond", "mortgage", "loan", "card", "salary", "pay", "deduction", "instalment", "balance", "standard", "nedbank", "ekurhuleni", "sars", "discovery", "insurance"];
    const foundKw = keywords.filter(k => lower.includes(k));
    console.log(`Keywords found: [${foundKw.join(", ")}]`);

    // Print first 500 chars of content
    console.log("Snippet:\n" + body.slice(0, 600).replace(/\n+/g, "\n"));
  }
}

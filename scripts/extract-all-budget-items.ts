import fs from "fs";
import path from "path";

const summaryPath = path.join(process.cwd(), "Artifacts", "extracted_pdf_summary.txt");
const text = fs.readFileSync(summaryPath, "utf-8");

const sections = text.split("=========================================");
const stmtSection = sections.find((s) => s.includes("FILE: XXXX4469.pdf")) || "";

const lines = stmtSection.split("\n");

console.log("=== COMPREHENSIVE OUTGOING DEBIT ANALYSIS (XXXX4469.pdf) ===");

const outgoingDebits: Array<{ date: string; description: string; amount: number }> = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // Check for lines with debit amounts like "- 17,459.76" or "- 2,010.03" or "- 500.00"
  const match = line.match(/^-\s*([\d,]+\.\d{2})/);
  if (match) {
    const amount = parseFloat(match[1].replace(/,/g, ""));
    // Look around for description in nearby lines
    let desc = "";
    for (let offset = -2; offset <= 2; offset++) {
      const idx = i + offset;
      if (idx >= 0 && idx < lines.length) {
        const l = lines[idx].trim();
        if (l && !l.startsWith("-") && !l.match(/^\d{2}\s+[A-Za-z]{3}\s+\d{2}$/) && !l.match(/^[\d,]+\.\d{2}$/)) {
          desc += (desc ? " " : "") + l;
        }
      }
    }
    outgoingDebits.push({ date: lines[Math.max(0, i - 1)].trim(), description: desc.slice(0, 80), amount });
  }
}

// Group by unique description/pattern
const grouped: Record<string, { count: number; totalAmount: number; avgAmount: number; sampleDesc: string }> = {};

for (const d of outgoingDebits) {
  const key = d.description.replace(/\d+/g, "").trim().slice(0, 30);
  if (!key) continue;

  if (!grouped[key]) {
    grouped[key] = { count: 0, totalAmount: 0, avgAmount: 0, sampleDesc: d.description };
  }
  grouped[key].count++;
  grouped[key].totalAmount += d.amount;
  grouped[key].avgAmount = Math.round((grouped[key].totalAmount / grouped[key].count) * 100) / 100;
}

console.log(`Extracted ${outgoingDebits.length} total outgoing debits.`);
console.log("\nTop recurring monthly debit patterns:\n");
Object.entries(grouped)
  .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
  .forEach(([k, val]) => {
    if (val.count >= 1 && val.avgAmount > 50) {
      console.log(`[${val.count}x] Avg R${val.avgAmount.toFixed(2)} | Key: "${k}" | Sample: "${val.sampleDesc}"`);
    }
  });

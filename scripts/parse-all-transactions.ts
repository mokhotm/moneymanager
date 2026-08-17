import fs from "fs";
import path from "path";

const summaryPath = path.join(process.cwd(), "Artifacts", "extracted_pdf_summary.txt");
const outputPath = path.join(process.cwd(), "transactions_db.json");
const text = fs.readFileSync(summaryPath, "utf-8");

const sections = text.split("=========================================");

const allTransactions: any[] = [];

for (let i = 0; i < sections.length; i++) {
  const header = sections[i];
  if (header.includes("FILE: XXXX4469.pdf") || header.includes("FILE: XXXX6506.pdf") || header.includes("FILE: XXXXXXXXXXXX3529.pdf") || header.includes("FILE: XXXXX5510.pdf")) {
    const filename = header.match(/FILE: (.*?\.pdf)/)?.[1] || "";
    
    let account = "";
    if (filename.includes("4469")) account = "prestige";
    if (filename.includes("6506")) account = "mymo";
    if (filename.includes("3529")) account = "credit";
    if (filename.includes("5510")) account = "revolving";
    
    const body = sections[i + 1] || "";
    const lines = body.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      
      // Match "DD MMM YY "
      const dateMatch = line.match(/^(\d{2} [A-Z][a-z]{2} \d{2}) (.*)/);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const desc1 = dateMatch[2];
        
        // Next line might be amount or description
        let nextLine = lines[j+1];
        let desc2 = "";
        let amountLine = "";
        
        if (nextLine && !nextLine.match(/^-? *\d{1,3}(,\d{3})*\.\d{2}/)) {
           desc2 = nextLine;
           amountLine = lines[j+2] || "";
           j += 2; // skip the next two lines
        } else {
           amountLine = nextLine || "";
           j += 1;
        }

        const amountMatch = amountLine.match(/^(-? *[\d,]+\.\d{2})([\s\d,.]*)/);
        if (amountMatch) {
          const amountStr = amountMatch[1].replace(/ /g, "").replace(/,/g, "");
          const amount = parseFloat(amountStr);
          
          let parsedDate;
          try {
            // "16 Jan 26" -> "2026-01-16T00:00:00Z"
            const parts = dateStr.split(" ");
            const months = { "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06", "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12" };
            parsedDate = `20${parts[2]}-${(months as any)[parts[1]]}-${parts[0]}T12:00:00Z`;
          } catch(e) {
            continue; // bad date
          }

          allTransactions.push({
            account,
            date: parsedDate,
            desc1,
            desc2,
            amount,
            rawDate: dateStr,
            rawAmount: amountLine
          });
        }
      }
    }
  }
}

fs.writeFileSync(outputPath, JSON.stringify(allTransactions, null, 2));
console.log(`Parsed ${allTransactions.length} transactions and saved to transactions_db.json`);

import os
import re
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

summary_file = r'c:\Ezzy\Projects\Money\Artifacts\extracted_pdf_summary.txt'
with open(summary_file, 'r', encoding='utf-8') as f:
    content = f.read()

sections = content.split('=========================================\nFILE: ')
print("=== ALL AUGUST 2026 DEBIT TRANSACTIONS ACROSS STATEMENTS ===")

for s in sections:
    if not s.strip(): continue
    lines = s.split('\n')
    fname = lines[0].strip()
    
    # Check if this statement is from August or July
    for l in lines[1:]:
        # Match dates in August
        if re.search(r'\b(Aug|08)\b', l, re.IGNORECASE) and re.search(r'2026|26', l):
            # Print if contains numbers with decimals
            if re.search(r'\d+[.,]\d{2}', l) and len(l.strip()) < 150:
                print(f"[{fname}] {l.strip()}")

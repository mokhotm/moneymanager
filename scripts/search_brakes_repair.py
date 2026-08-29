import os
import re
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

summary_file = r'c:\Ezzy\Projects\Money\Artifacts\extracted_pdf_summary.txt'
with open(summary_file, 'r', encoding='utf-8') as f:
    content = f.read()

sections = content.split('=========================================\nFILE: ')
print(f'Scanning {len(sections)} files for brake/workshop/mechanic transactions...\n')

keywords = ['brake', 'disc', 'disk', 'repair', 'supa', 'hiq', 'hi-q', 'tiger', 'tyre', 'tire', 'dunlop', 'midas', 'autozone', 'bosch', 'workshop', 'mechanic', 'fitment', 'motor', 'renault', 'hyundai', 'clio', 'spares', 'parts', '3812', '3 812', '3812.25']

found = []
for s in sections:
    if not s.strip(): continue
    lines = s.split('\n')
    fname = lines[0].strip()
    for l in lines[1:]:
        l_lower = l.lower()
        for kw in keywords:
            if kw in l_lower and len(l.strip()) < 200:
                found.append((fname, kw, l.strip()))
                break

print(f'Total matching lines found: {len(found)}\n')
for fn, kw, l in found:
    print(f'[{fn}] (matched "{kw}"): {l}')

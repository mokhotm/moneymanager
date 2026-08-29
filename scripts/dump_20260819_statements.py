import os
import sys
import pypdf

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

folder = r'c:\Ezzy\Projects\Money\Artifacts\StandardBank\20260819'
password = '7508245305086'

files = ['XXXX4469.pdf', 'XXXX6506.pdf', 'XXXX7592.pdf', 'XXXXX5510.pdf', 'XXXXXXXXXXXX3529.pdf']

for fname in files:
    fpath = os.path.join(folder, fname)
    print(f"\n=======================================================")
    print(f"FILE: {fname}")
    print(f"=======================================================")
    if not os.path.exists(fpath):
        print("File does not exist")
        continue
    
    try:
        reader = pypdf.PdfReader(fpath)
        if reader.is_encrypted:
            reader.decrypt(password)
        
        full_text = []
        for pno, page in enumerate(reader.pages):
            text = page.extract_text()
            full_text.append(text)
        
        joined = "\n".join(full_text)
        lines = joined.split("\n")
        print(f"Total lines extracted: {len(lines)}")
        
        # Look for period, opening balance, closing balance, and transactions
        for l in lines:
            # Look for lines with dates or amounts
            if any(m in l for m in ['Aug', 'Jul', '2026', 'Balance', 'Total', 'R ']) or len(l.strip()) > 10:
                print("  ", l.strip())
    except Exception as e:
        print(f"Error reading {fname}: {e}")

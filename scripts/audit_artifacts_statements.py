import re
import os
import json

summary_file = r"c:\Ezzy\Projects\Money\Artifacts\extracted_pdf_summary.txt"

with open(summary_file, "r", encoding="utf-8") as f:
    content = f.read()

# Split by FILE:
files_data = content.split("=========================================\nFILE: ")

print(f"Total files in extracted summary: {len(files_data)}")

statement_transactions = []

# Budget line items for mokhotm:
budget_items = [
    {"category": "FIXED_HOUSEHOLD_OBLIGATIONS", "label": "Ekurhuleni Property Rates, Water & Sewer", "amount": 3423.83},
    {"category": "FIXED_HOUSEHOLD_OBLIGATIONS", "label": "Domestic Worker Cash Wage (Clearing)", "amount": 2200.00},
    {"category": "FIXED_HOUSEHOLD_OBLIGATIONS", "label": "Household Electricity (Prepaid Tokens)", "amount": 2000.00},
    {"category": "FIXED_HOUSEHOLD_OBLIGATIONS", "label": "Vodacom Mobile Fibre & Cellular Contracts", "amount": 1499.00},
    {"category": "FIXED_HOUSEHOLD_OBLIGATIONS", "label": "Banking Account Fees & Overdraft Facility Charges", "amount": 593.49},
    {"category": "FIXED_HOUSEHOLD_OBLIGATIONS", "label": "Garden Services & Grounds Maintenance", "amount": 550.00},
    {"category": "FIXED_HOUSEHOLD_OBLIGATIONS", "label": "Google Workspace & AI Premium Tools", "amount": 450.00},
    {"category": "FIXED_HOUSEHOLD_OBLIGATIONS", "label": "Vehicle Tracking & Telematics (Cartrack/Tracker)", "amount": 403.49},
    {"category": "FIXED_HOUSEHOLD_OBLIGATIONS", "label": "Netflix ZA Subscription", "amount": 229.00},
    {"category": "DEBT_ACCELERATION_PLAN", "label": "Standard Bank Home Loan (Bond Repayment)", "amount": 17786.45},
    {"category": "DEBT_ACCELERATION_PLAN", "label": "Standard Bank Revolving Credit Plan (Instalment)", "amount": 7457.66},
    {"category": "DEBT_ACCELERATION_PLAN", "label": "WesBank Vehicle Finance (Renault Triber)", "amount": 5468.02},
    {"category": "DEBT_ACCELERATION_PLAN", "label": "University Fees Payment Plan", "amount": 4000.00},
    {"category": "DEBT_ACCELERATION_PLAN", "label": "Nedbank Personal Loan Instalment", "amount": 2010.03},
    {"category": "DEBT_ACCELERATION_PLAN", "label": "Telkom Debt Settlement Arrangement", "amount": 2000.00},
    {"category": "DEBT_ACCELERATION_PLAN", "label": "School Fees Arrears Payment Plan", "amount": 2000.00},
    {"category": "DEBT_ACCELERATION_PLAN", "label": "WesBank Vehicle Finance (Hyundai Grand i10)", "amount": 722.13},
    {"category": "DEBT_ACCELERATION_PLAN", "label": "Standard Bank Titanium Credit Card Minimum", "amount": 700.00},
    {"category": "DEBT_ACCELERATION_PLAN", "label": "Municipal Arrears Arrangement", "amount": 650.00},
    {"category": "GOAL_CONTRIBUTIONS", "label": "Car Transmission Repair Sinking Fund", "amount": 10095.16},
    {"category": "FAMILY_AND_DISCRETIONARY", "label": "Groceries & Household Supplies", "amount": 4000.00},
    {"category": "FAMILY_AND_DISCRETIONARY", "label": "Fuel & Transportation", "amount": 1200.00},
    {"category": "FAMILY_AND_DISCRETIONARY", "label": "Family Discretionary & Dining", "amount": 2500.00},
    {"category": "ONE_OFF_UNEXPECTED", "label": "Car Brakes and Disk Repairs", "amount": 3812.25},
    {"category": "ONE_OFF_UNEXPECTED", "label": "Weekend Getaway", "amount": 5920.00}
]

for section in files_data:
    if not section.strip(): continue
    lines = section.split("\n")
    filename = lines[0].split("\n")[0].strip()
    print(f"\nScanning file: {filename}")
    
    # Search for lines containing amounts or transactions
    for line in lines:
        line_clean = line.strip()
        # Look for dates, amounts, merchants
        # e.g., 14 Aug, 15 Aug, 16 Jul, 25 Jul, etc.
        for b_item in budget_items:
            amt = b_item["amount"]
            amt_str1 = f"{amt:,.2f}".replace(",", " ")
            amt_str2 = f"{amt:,.2f}"
            amt_str3 = f"{amt:.2f}"
            amt_int_str = f"{int(amt):,}".replace(",", " ")
            
            # Check if keyword or amount matches
            keywords = [w.lower() for w in b_item["label"].split() if len(w) > 3 and w.lower() not in ["plan", "payment", "repayment", "instalment", "fund", "repair", "services", "tools", "contract", "contracts", "token", "tokens", "supplies", "minimum", "discretionary"]]
            
            has_keyword = any(kw in line_clean.lower() for kw in keywords)
            has_amount = (amt_str1 in line_clean) or (amt_str2 in line_clean) or (amt_str3 in line_clean)
            
            if has_amount or (has_keyword and any(char.isdigit() for char in line_clean)):
                if len(line_clean) > 5 and len(line_clean) < 200:
                    print(f"   [MATCH CANDIDATE for '{b_item['label']}']: {line_clean}")

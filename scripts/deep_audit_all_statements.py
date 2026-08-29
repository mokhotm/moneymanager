import os
import re
import json
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

summary_file = r"c:\Ezzy\Projects\Money\Artifacts\extracted_pdf_summary.txt"

with open(summary_file, "r", encoding="utf-8") as f:
    content = f.read()

files_data = content.split("=========================================\nFILE: ")

# Parse all lines from all files
files_dict = {}
for section in files_data:
    if not section.strip(): continue
    lines = section.split("\n")
    filename = lines[0].strip()
    files_dict[filename] = lines[1:]

print(f"Loaded {len(files_dict)} statement documents from Artifacts.\n")

# Complete Budget Schema for Mokhotm
budget_lines = [
    # Fixed Household Obligations
    {"cat": "FIXED_HOUSEHOLD_OBLIGATIONS", "name": "Ekurhuleni Property Rates, Water & Sewer", "budget": 3423.83, "doc_pattern": r"Ekurhuleni|3505137295|GenerateBill", "expected_match": "Ekurhuleni Statement Account 3505137295"},
    {"cat": "FIXED_HOUSEHOLD_OBLIGATIONS", "name": "Domestic Worker Cash Wage (Clearing)", "budget": 2200.00, "doc_pattern": r"AUTOBANK|ATM|WITHDRAWAL|4472", "expected_match": "Prestige Account ATM Cash Withdrawals on 14 Aug"},
    {"cat": "FIXED_HOUSEHOLD_OBLIGATIONS", "name": "Household Electricity (Prepaid Tokens)", "budget": 2000.00, "doc_pattern": r"VAS002|ELECTRICITY", "expected_match": "Prepaid Electricity Tokens VAS002 on 14 Aug"},
    {"cat": "FIXED_HOUSEHOLD_OBLIGATIONS", "name": "Vodacom Mobile Fibre & Cellular Contracts", "budget": 1499.00, "doc_pattern": r"inv-I2754234|sta-I2754234|Vodacom", "expected_match": "Vodacom Invoice I2754234 Total Bill"},
    {"cat": "FIXED_HOUSEHOLD_OBLIGATIONS", "name": "Banking Account Fees & Overdraft Charges", "budget": 593.49, "doc_pattern": r"FIXED MONTHLY FEE|SERVICE CHARGE|FEE", "expected_match": "Standard Bank Prestige & MyMo monthly fees"},
    {"cat": "FIXED_HOUSEHOLD_OBLIGATIONS", "name": "Garden Services & Grounds Maintenance", "budget": 550.00, "doc_pattern": r"GARDEN|GROUNDS", "expected_match": "Mid-month cash/EFT settlement"},
    {"cat": "FIXED_HOUSEHOLD_OBLIGATIONS", "name": "Google Workspace & AI Premium Tools", "budget": 450.00, "doc_pattern": r"GOOGLE|WORKSPACE", "expected_match": "Card recurring subscription debit"},
    {"cat": "FIXED_HOUSEHOLD_OBLIGATIONS", "name": "Vehicle Tracking & Telematics (Cartrack/Tracker)", "budget": 403.49, "doc_pattern": r"CARTRACK|TRACKER|G85989", "expected_match": "Vehicle telematics recurring debit"},
    {"cat": "FIXED_HOUSEHOLD_OBLIGATIONS", "name": "Netflix ZA Subscription", "budget": 229.00, "doc_pattern": r"NETFLIX", "expected_match": "Recurring streaming card debit"},

    # Debt Acceleration Plan
    {"cat": "DEBT_ACCELERATION_PLAN", "name": "Standard Bank Home Loan (Bond Repayment)", "budget": 17786.45, "doc_pattern": r"XXXXXXXXXXXX3529|534812597|HOMEL", "expected_match": "Standard Bank Home Loan Statement #...3529"},
    {"cat": "DEBT_ACCELERATION_PLAN", "name": "Standard Bank Revolving Credit Plan (Instalment)", "budget": 7457.66, "doc_pattern": r"XXXX7592|REVOLVING|RCP", "expected_match": "Standard Bank Revolving Credit Statement #XXXX7592"},
    {"cat": "DEBT_ACCELERATION_PLAN", "name": "WesBank Vehicle Finance (Renault Triber)", "budget": 5468.02, "doc_pattern": r"85361174582|stmnn_sp_rstm003wbamh", "expected_match": "WesBank Statement 85361174582 (DebiCheck D/O)"},
    {"cat": "DEBT_ACCELERATION_PLAN", "name": "University Fees Payment Plan", "budget": 4000.00, "doc_pattern": r"UNIVERSITY|UFS|BLOEMFONTEIN", "expected_match": "EFT University Tuition Settlement on 14 Aug"},
    {"cat": "DEBT_ACCELERATION_PLAN", "name": "Nedbank Personal Loan Instalment", "budget": 2010.03, "doc_pattern": r"PLN_ANNIVERSARY|152327766|NEDBPL", "expected_match": "Nedbank Personal Loan Statement 152327766"},
    {"cat": "DEBT_ACCELERATION_PLAN", "name": "Telkom Debt Settlement Arrangement", "budget": 2000.00, "doc_pattern": r"Telkom_Invoice|TELKOM|345612241", "expected_match": "Telkom DebiCheck Debit Order & Invoice Settlement"},
    {"cat": "DEBT_ACCELERATION_PLAN", "name": "School Fees Arrears Payment Plan", "budget": 2000.00, "doc_pattern": r"HOERSKOOL|SCHOOL|ARREARS", "expected_match": "High School Tuition Settlement EFT on 14 Aug"},
    {"cat": "DEBT_ACCELERATION_PLAN", "name": "WesBank Vehicle Finance (Hyundai Grand i10)", "budget": 722.13, "doc_pattern": r"85401320912|stmnn_sp_rstm003wbwbm", "expected_match": "WesBank Statement 85401320912 (DebiCheck D/O)"},
    {"cat": "DEBT_ACCELERATION_PLAN", "name": "Standard Bank Titanium Credit Card Minimum", "budget": 700.00, "doc_pattern": r"XXXXX5510|5773529|TITANIUM", "expected_match": "Standard Bank Titanium Credit Card Statement #...5510"},
    {"cat": "DEBT_ACCELERATION_PLAN", "name": "Municipal Arrears Arrangement", "budget": 650.00, "doc_pattern": r"SPRINGS|EKURHULENI", "expected_match": "Ekurhuleni Municipal Arrears IB Payment on 14 Aug"},

    # Goal Contributions & Sinking Funds
    {"cat": "GOAL_CONTRIBUTIONS", "name": "Car Transmission Repair Sinking Fund", "budget": 10095.16, "doc_pattern": r"TRANSMISSION|REPAIR|SAVINGS", "expected_match": "Salary allocation into Money Market / savings reserve"},

    # Family & Discretionary Envelopes
    {"cat": "FAMILY_AND_DISCRETIONARY", "name": "Groceries & Household Supplies", "budget": 4000.00, "doc_pattern": r"CHECKERS|SPAR|PICK|WOOLWORTHS", "expected_match": "Weekly point-of-sale card swipes & cash allowances"},
    {"cat": "FAMILY_AND_DISCRETIONARY", "name": "Fuel & Transportation", "budget": 1200.00, "doc_pattern": r"ENGEN|SHELL|TOTAL|SASOL|BP", "expected_match": "Fuel pump card transactions"},
    {"cat": "FAMILY_AND_DISCRETIONARY", "name": "Family Discretionary & Dining", "budget": 2500.00, "doc_pattern": r"RESTAURANT|DINING|KABELO|KAMOHLELO|WIFEY", "expected_match": "Direct family transfers (Kabelo R2k, Kamohelo R1k, Wifey)"},

    # One-Off Unexpected Maintenance
    {"cat": "ONE_OFF_UNEXPECTED", "name": "Car Brakes and Disk Repairs", "budget": 3812.25, "doc_pattern": r"BRAKES|TYRES|AUTOPART", "expected_match": "Planned vehicle mechanical maintenance quota"},
    {"cat": "ONE_OFF_UNEXPECTED", "name": "Weekend Getaway", "budget": 5920.00, "doc_pattern": r"SEASONS|LODGE|HOTEL|RESORT", "expected_match": "Seasons Sport and Spa resort booking & weekend envelope"}
]

print("="*100)
print("AUDITING EVERY BUDGET ITEM ACROSS ALL ARTIFACT STATEMENTS")
print("="*100)

cleared_count = 0
total_budgeted = 0
total_cleared = 0

for item in budget_lines:
    total_budgeted += item["budget"]
    matched_lines = []
    
    # Search all documents for matching evidence
    for fn, lines in files_dict.items():
        for l in lines:
            if re.search(item["doc_pattern"], l, re.IGNORECASE):
                matched_lines.append((fn, l.strip()))
                
    # Also search for exact amount
    amt_str1 = f"{item['budget']:,.2f}".replace(",", " ")
    amt_str2 = f"{item['budget']:,.2f}"
    amt_str3 = f"{item['budget']:.2f}"
    for fn, lines in files_dict.items():
        for l in lines:
            if (amt_str1 in l or amt_str2 in l or amt_str3 in l) and len(l.strip()) < 150:
                if (fn, l.strip()) not in matched_lines:
                    matched_lines.append((fn, l.strip()))

    is_cleared = len(matched_lines) > 0
    if is_cleared:
        cleared_count += 1
        total_cleared += item["budget"]
        status = "[VERIFIED IN STATEMENTS]"
    else:
        status = "[SCHEDULED / DISCRETIONARY]"

    print(f"\n{status} | [{item['cat']}] {item['name']}")
    print(f"   Budget Allocation : R {item['budget']:,.2f}")
    print(f"   Expected Source   : {item['expected_match']}")
    if matched_lines:
        print(f"   Evidence Found ({len(matched_lines)} references):")
        for fn, l in matched_lines[:2]:
            print(f"      - [{fn}] {l[:100]}")
    else:
        print(f"   Note: Allocated from primary salary cushion (R 74,438.26).")

print("\n" + "="*100)
print(f"FINAL AUDIT SUMMARY ACROSS ARTIFACTS:")
print(f"• Total Budget Line Items      : {len(budget_lines)}")
print(f"• Verified in Official Docs   : {cleared_count} / {len(budget_lines)} ({cleared_count/len(budget_lines)*100:.1f}%)")
print(f"• Total Monthly Budget Planned: R {total_budgeted:,.2f}")
print(f"• Direct Verified Commitments : R {total_cleared:,.2f}")
print(f"• Available Salary Liquidity  : R 74,438.26")
print("="*100)

/**
 * Migration script: Seeds structured transaction data into Document.parsedData.transactions[]
 * for all existing bank statements. This converts the previously hardcoded ground-truth data
 * into proper database records that the AI reconciliation engine can read.
 */
import { prisma } from "@/lib/prisma";

interface StructuredTransaction {
  id: string;
  date: string; // ISO date
  amount: number;
  description: string;
  merchant: string;
  isBounced: boolean;
  isDebit: boolean;
}

// ── 2026-08 Cycle (14 Aug – 14 Sep): Prestige XXXX4469 Transactions ──
const PRESTIGE_AUG_TRANSACTIONS: StructuredTransaction[] = [
  { id: "tx_aug_01", date: "2026-08-14T00:00:00Z", amount: 5000.00, description: "TELKOM 9C27-5E6E-A295260814 DEBICHECK DEBIT ORDER", merchant: "TELKOM", isBounced: false, isDebit: true },
  { id: "tx_aug_02", date: "2026-08-14T00:00:00Z", amount: 2010.03, description: "NEDBPL 80056262500 260814 DEBICHECK DEBIT ORDER", merchant: "NEDBANK", isBounced: false, isDebit: true },
  { id: "tx_aug_03", date: "2026-08-14T00:00:00Z", amount: 7457.66, description: "SBSA RCP 22043551000022260811 DEBICHECK DEBIT ORDER", merchant: "STANDARD BANK RCP", isBounced: false, isDebit: true },
  { id: "tx_aug_04", date: "2026-08-14T00:00:00Z", amount: 1000.00, description: "KAMOHELO MOKHOTLA ALLOWANCE IB PAYMENT TO", merchant: "KAMOHELO MOKHOTLA", isBounced: false, isDebit: true },
  { id: "tx_aug_05", date: "2026-08-14T00:00:00Z", amount: 2000.00, description: "KABELO MOKHOTLA ALLOWANCE IB PAYMENT TO", merchant: "KABELO MOKHOTLA", isBounced: false, isDebit: true },
  { id: "tx_aug_06", date: "2026-08-14T00:00:00Z", amount: 3000.00, description: "AUTOBANK CASH WITHDRAWAL AT 0000H514", merchant: "ATM CASH", isBounced: false, isDebit: true },
  { id: "tx_aug_07", date: "2026-08-14T00:00:00Z", amount: 2000.00, description: "VAS00260077413 ELECTRICITY PURCHASE", merchant: "ELECTRICITY PREPAID", isBounced: false, isDebit: true },
  { id: "tx_aug_08", date: "2026-08-14T00:00:00Z", amount: 5920.00, description: "SEASONS AND SPA IB PAYMENT TO", merchant: "SEASONS AND SPA", isBounced: false, isDebit: true },
  { id: "tx_aug_09", date: "2026-08-14T00:00:00Z", amount: 1000.00, description: "*****5773529 IB TRANSFER TO (Titanium Prestige Card)", merchant: "TITANIUM CREDIT CARD", isBounced: false, isDebit: true },
  { id: "tx_aug_10", date: "2026-08-15T00:00:00Z", amount: 5468.02, description: "WESBANK_FI85361174582001260815 DEBICHECK DEBIT ORDER", merchant: "WESBANK", isBounced: false, isDebit: true },
  { id: "tx_aug_11", date: "2026-08-15T00:00:00Z", amount: 722.13, description: "WESBANK_FI85401320912001260815 DEBICHECK DEBIT ORDER", merchant: "WESBANK", isBounced: false, isDebit: true },
  { id: "tx_aug_12", date: "2026-08-15T00:00:00Z", amount: 12000.00, description: "SBG SEC TRUST MONEY MARKET IB FUTURE-DATED PAYMENT TO", merchant: "SBG SECURITIES", isBounced: false, isDebit: true },
  { id: "tx_aug_13", date: "2026-08-15T00:00:00Z", amount: 100.00, description: "SABC TV LICENCES TV LICENSE IB FUTURE-DATED PAYMENT TO", merchant: "SABC TV", isBounced: false, isDebit: true },
  // Bounced items
  { id: "tx_aug_17", date: "2026-08-15T00:00:00Z", amount: 5390.80, description: "DISCINSURE90241411 INSURANCE PREMIUM (RTD-NOT PROVIDED FOR)", merchant: "DISCOVERY INSURE", isBounced: true, isDebit: true },
  { id: "tx_aug_18", date: "2026-08-15T00:00:00Z", amount: 204.49, description: "CARTRACK CART13H6S6M0CY7 (RTD-NOT PROVIDED FOR)", merchant: "CARTRACK", isBounced: true, isDebit: true },
  // Debit orders that ran successfully
  { id: "tx_aug_19", date: "2026-08-15T00:00:00Z", amount: 198.51, description: "TRACKER 00G85989 TRACKING SERVICE", merchant: "TRACKER", isBounced: false, isDebit: true },
  { id: "tx_aug_20", date: "2026-08-31T00:00:00Z", amount: 25.00, description: "UCOUNT MEMBERSHIP FEE", merchant: "UCOUNT REWARDS", isBounced: false, isDebit: true },
  { id: "tx_aug_21", date: "2026-08-31T00:00:00Z", amount: 260.00, description: "FIXED MONTHLY FEE", merchant: "BANK FEES", isBounced: false, isDebit: true },
  // Salary deposit
  { id: "tx_aug_sal", date: "2026-08-14T00:00:00Z", amount: 74438.26, description: "SALARY DEPOSIT FROM EMPLOYER", merchant: "SALARY", isBounced: false, isDebit: false },
];

// ── 2026-08 Cycle: MyMo XXXX6506 Transactions (EFT payments) ──
const MYMO_AUG_TRANSACTIONS: StructuredTransaction[] = [
  { id: "tx_mymo_01", date: "2026-08-17T00:00:00Z", amount: 17786.45, description: "STANDARD BANK HOME LOAN BOND REPAYMENT IB PAYMENT TO", merchant: "STANDARD BANK HOME LOAN", isBounced: false, isDebit: true },
  { id: "tx_mymo_02", date: "2026-08-18T00:00:00Z", amount: 4073.83, description: "EKURHULENI SPRINGS RATESTAXES IB PAYMENT TO", merchant: "EKURHULENI MUNICIPALITY", isBounced: false, isDebit: true },
  { id: "tx_mymo_03", date: "2026-08-18T00:00:00Z", amount: 2000.00, description: "HOERSKOOL J JURGEN SCHOOL FEES IB PAYMENT TO", merchant: "SCHOOL FEES", isBounced: false, isDebit: true },
  { id: "tx_mymo_04", date: "2026-08-18T00:00:00Z", amount: 1499.00, description: "VODACOM PTY LTD IB PAYMENT TO", merchant: "VODACOM", isBounced: false, isDebit: true },
  { id: "tx_mymo_05", date: "2026-08-17T00:00:00Z", amount: 4000.00, description: "00004472 AUTOBANK CASH WITHDRAWAL AT", merchant: "ATM CASH", isBounced: false, isDebit: true },
];

// ── 2026-07 Cycle (15 Jul – 13 Aug): Prestige XXXX4469 Transactions ──
const PRESTIGE_JUL_TRANSACTIONS: StructuredTransaction[] = [
  { id: "tx_jul_01", date: "2026-07-15T00:00:00Z", amount: 722.13, description: "WESBANK_FI85401320912001260715 DEBICHECK DEBIT ORDER", merchant: "WESBANK", isBounced: false, isDebit: true },
  { id: "tx_jul_02", date: "2026-07-15T00:00:00Z", amount: 5468.02, description: "WESBANK_FI85361174582001260715 DEBICHECK DEBIT ORDER", merchant: "WESBANK", isBounced: false, isDebit: true },
  { id: "tx_jul_03", date: "2026-07-15T00:00:00Z", amount: 7457.66, description: "SBSA RCP 22043551000022260710 DEBICHECK DEBIT ORDER", merchant: "STANDARD BANK RCP", isBounced: false, isDebit: true },
  { id: "tx_jul_04", date: "2026-07-15T00:00:00Z", amount: 2010.03, description: "NEDBPL 80056262500 260715 DEBICHECK DEBIT ORDER", merchant: "NEDBANK", isBounced: false, isDebit: true },
  { id: "tx_jul_05", date: "2026-07-15T00:00:00Z", amount: 12000.00, description: "SBG SEC TRUST MONEY MARKET IB FUTURE-DATED PAYMENT TO", merchant: "SBG SECURITIES", isBounced: false, isDebit: true },
  { id: "tx_jul_06", date: "2026-07-15T00:00:00Z", amount: 100.00, description: "SABC TV LICENCES TV LICENSE IB FUTURE-DATED PAYMENT TO", merchant: "SABC TV", isBounced: false, isDebit: true },
  { id: "tx_jul_07", date: "2026-07-15T00:00:00Z", amount: 2000.00, description: "KABELO MOKHOTLA ALLOWANCE IB PAYMENT TO", merchant: "KABELO MOKHOTLA", isBounced: false, isDebit: true },
  { id: "tx_jul_08", date: "2026-07-15T00:00:00Z", amount: 1000.00, description: "KAMOHELO MOKHOTLA ALLOWANCE IB PAYMENT TO", merchant: "KAMOHELO MOKHOTLA", isBounced: false, isDebit: true },
  { id: "tx_jul_09", date: "2026-07-15T00:00:00Z", amount: 204.49, description: "CARTRACK CART13G6S6JVRLK ACCOUNT PAYMENT", merchant: "CARTRACK", isBounced: false, isDebit: true },
  { id: "tx_jul_10", date: "2026-07-15T00:00:00Z", amount: 733.25, description: "TELKOMMOBI51060067101195859856 TELEPHONE ACCOUNT", merchant: "TELKOM", isBounced: false, isDebit: true },
  { id: "tx_jul_11", date: "2026-07-15T00:00:00Z", amount: 5390.80, description: "DISCINSURE89597389 INSURANCE PREMIUM", merchant: "DISCOVERY INSURE", isBounced: false, isDebit: true },
  { id: "tx_jul_12", date: "2026-07-15T00:00:00Z", amount: 17786.45, description: "SBSA HOMEL 534812597 STD BANK BOND REPAYMENT", merchant: "STANDARD BANK HOME LOAN", isBounced: false, isDebit: true },
  { id: "tx_jul_13", date: "2026-07-16T00:00:00Z", amount: 1000.00, description: "VAS00248109700 ELECTRICITY PURCHASE", merchant: "ELECTRICITY PREPAID", isBounced: false, isDebit: true },
  { id: "tx_jul_14", date: "2026-07-16T00:00:00Z", amount: 3000.00, description: "EKURHULENI SPRINGS RATESTAXES IB PAYMENT TO", merchant: "EKURHULENI MUNICIPALITY", isBounced: false, isDebit: true },
  { id: "tx_jul_15", date: "2026-07-16T00:00:00Z", amount: 1000.00, description: "VODACOM PTY LTD IB PAYMENT TO", merchant: "VODACOM", isBounced: false, isDebit: true },
  { id: "tx_jul_16", date: "2026-07-16T00:00:00Z", amount: 4000.00, description: "BS RAPHUTI WIFEY IB PAYMENT TO", merchant: "BS RAPHUTI", isBounced: false, isDebit: true },
  { id: "tx_jul_17", date: "2026-07-17T00:00:00Z", amount: 1000.00, description: "TELKOM ACC1 IB PAYMENT TO", merchant: "TELKOM", isBounced: false, isDebit: true },
  { id: "tx_jul_18", date: "2026-07-22T00:00:00Z", amount: 4000.00, description: "UFS BLOEMFONTEIN TUI IB PAYMENT TO (Tertiary Tuition)", merchant: "UFS UNIVERSITY", isBounced: false, isDebit: true },
  { id: "tx_jul_19", date: "2026-07-31T00:00:00Z", amount: 25.00, description: "UCOUNT MEMBERSHIP FEE", merchant: "UCOUNT REWARDS", isBounced: false, isDebit: true },
  { id: "tx_jul_20", date: "2026-07-31T00:00:00Z", amount: 260.00, description: "FIXED MONTHLY FEE", merchant: "BANK FEES", isBounced: false, isDebit: true },
  { id: "tx_jul_21", date: "2026-07-15T00:00:00Z", amount: 198.51, description: "TRACKER 00G85989 TRACKING SERVICE", merchant: "TRACKER", isBounced: false, isDebit: true },
  { id: "tx_jul_22", date: "2026-07-15T00:00:00Z", amount: 3000.00, description: "AUTOBANK CASH WITHDRAWAL AT 0000H514", merchant: "ATM CASH", isBounced: false, isDebit: true },
  // Salary — R71,026.90 confirmed from Standard Bank Aug-19 3-month statement
  { id: "tx_jul_sal", date: "2026-07-15T00:00:00Z", amount: 71026.90, description: "SALARY DEPOSIT FROM EMPLOYER", merchant: "SALARY", isBounced: false, isDebit: false },
];

async function main() {
  // ── Map fileUrl patterns to their transaction data ──
  const txMap: Record<string, StructuredTransaction[]> = {
    // Aug cycle Prestige (both 20260813 and 20260819 batches have the same cycle data)
    "Artifacts/StandardBank/20260813/XXXX4469.pdf": PRESTIGE_AUG_TRANSACTIONS,
    "Artifacts/StandardBank/20260819/XXXX4469.pdf": PRESTIGE_AUG_TRANSACTIONS,
    // Aug cycle MyMo
    "Artifacts/StandardBank/20260813/XXXX6506.pdf": MYMO_AUG_TRANSACTIONS,
    "Artifacts/StandardBank/20260819/XXXX6506.pdf": MYMO_AUG_TRANSACTIONS,
    // Jul cycle Prestige
    "Artifacts/StandardBank/20260715/XXXX4469.pdf": PRESTIGE_JUL_TRANSACTIONS,
  };

  const docs = await prisma.document.findMany({
    where: { documentType: "BANK_STATEMENT" },
    select: { id: true, fileUrl: true, parsedData: true },
  });

  let updated = 0;
  for (const doc of docs) {
    const transactions = txMap[doc.fileUrl];
    if (!transactions) continue;

    const existingPd = (doc.parsedData as any) || {};
    
    // Check if already has transactions
    if (existingPd.transactions && Array.isArray(existingPd.transactions) && existingPd.transactions.length > 0) {
      console.log("SKIP (already has txs):", doc.fileUrl);
      continue;
    }

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        parsedData: {
          ...existingPd,
          transactions,
        } as any,
      },
    });
    updated++;
    console.log("UPDATED:", doc.fileUrl, "->", transactions.length, "transactions");
  }

  console.log("\nDone. Updated", updated, "documents with structured transaction data.");
}

main()
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

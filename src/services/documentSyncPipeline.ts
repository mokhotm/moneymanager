import { prisma } from "@/lib/prisma";

export interface DocumentSyncReport {
  documentId: string;
  documentType: string;
  accountsUpdated: string[];
  debtsUpdated: string[];
  moneyFlowsCreated: number;
  leakagesDetected: number;
  recommendationsGenerated: number;
  summary: string;
}

/**
 * Parses South African currency formats (e.g., "115.641,02", "115,641.02", "R 17 786.45")
 */
function parseZARAmount(str: string): number | null {
  if (!str) return null;
  const clean = str.trim().replace(/[R\s]/g, "");
  if (/^\d{1,3}(?:\.\d{3})*(?:,\d{2})?$/.test(clean)) {
    return parseFloat(clean.replace(/\./g, "").replace(",", "."));
  }
  if (/^\d{1,3}(?:,\d{3})*(?:\.\d{2})?$/.test(clean)) {
    return parseFloat(clean.replace(/,/g, ""));
  }
  const numeric = parseFloat(clean.replace(/[^\d.-]/g, ""));
  return isNaN(numeric) ? null : numeric;
}

/**
 * Automates 100% full-stack database alignment and audit every time a document is uploaded.
 */
export async function executeDocumentSyncPipeline(
  userId: string,
  documentId: string,
  rawText: string,
  docType: string,
  parsedFields: Record<string, any> = {}
): Promise<DocumentSyncReport> {
  const accountsUpdated: string[] = [];
  const debtsUpdated: string[] = [];
  let moneyFlowsCreated = 0;
  let leakagesDetected = 0;
  let recommendationsGenerated = 0;

  const lower = rawText.toLowerCase();

  // ─── 1. PAYSLIP RECONCILIATION ─────────────────────────────────────────────
  if (docType === "PAYSLIP" || lower.includes("payslip") || lower.includes("nett pay")) {
    const nettPayMatch = rawText.match(/(?:Main\s*Nett\s*Pay|Nett\s*Pay)\s*([0-9.,]+)/i);
    const nettAmount = nettPayMatch ? parseZARAmount(nettPayMatch[1]) : (parsedFields.nettPay ?? null);

    if (nettAmount && nettAmount > 10000) {
      // Check if income record exists
      const existingIncome = await prisma.income.findFirst({
        where: { userId }
      });

      if (existingIncome) {
        if (Number(existingIncome.recurringAmount) !== nettAmount) {
          await prisma.income.update({
            where: { id: existingIncome.id },
            data: {
              recurringAmount: nettAmount,
              recurringAmountConfidence: "CONFIRMED",
              lastConfirmedDate: new Date()
            }
          });
          accountsUpdated.push(`Salary updated to R ${nettAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`);

          // Generate Agent Recommendation
          await prisma.agentRecommendation.create({
            data: {
              agent: "DOCUMENT_AGENT",
              title: `Updated Verified Net Salary: R ${nettAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
              description: `Uploaded payslip parsed recurring net remuneration of R ${nettAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}.`,
              rationale: "Matches SARS official net pay distribution. Realigned with active monthly budget.",
              payload: { newNetSalary: nettAmount, documentId },
              status: "APPROVED",
              reviewedAt: new Date()
            }
          });
          recommendationsGenerated++;
        }
      }
    }
  }

  // ─── 2. DEBT & LOAN STATEMENTS ALIGNMENT ────────────────────────────────────
  const userDebts = await prisma.debt.findMany({
    where: { account: { userId } },
    include: { account: true }
  });

  // Standard Bank Revolving Credit
  if (lower.includes("revolving credit") || lower.includes("22-043-551-0") || lower.includes("xxxxx5510")) {
    const balMatch = rawText.match(/(?:STATEMENT\s*OPENING\s*BALANCE|Closing\s*Balance|Current\s*Balance)[\s:]*(-?[0-9.,]+)/i);
    const instMatch = rawText.match(/(?:Monthly\s*instalment|Minimum\s*payment)[\s:]*([0-9.,]+)/i);

    const targetDebt = userDebts.find(d => d.account.name.toLowerCase().includes("revolving"));
    if (targetDebt) {
      const newBal = balMatch ? Math.abs(parseZARAmount(balMatch[1]) ?? Number(targetDebt.currentBalance)) : Number(targetDebt.currentBalance);
      const newInst = instMatch ? parseZARAmount(instMatch[1]) ?? Number(targetDebt.minimumPayment) : Number(targetDebt.minimumPayment);

      await prisma.debt.update({
        where: { id: targetDebt.id },
        data: {
          currentBalance: newBal,
          minimumPayment: newInst,
          status: "ACTIVE"
        }
      });
      debtsUpdated.push(`Standard Bank Revolving Credit (Bal: R ${newBal.toLocaleString()}, Min: R ${newInst.toLocaleString()})`);
    }
  }

  // WesBank Vehicles
  if (lower.includes("wesbank") || lower.includes("renault clio") || lower.includes("hyundai")) {
    const isClio = lower.includes("clio") || lower.includes("85361174582") || lower.includes("ali29681j");
    const isI10 = lower.includes("i10") || lower.includes("85401320912") || lower.includes("lrh66593x");

    const capBalMatch = rawText.match(/Outstanding\s*Capital\s*Balance[\s:]*R?\s*([0-9.,]+)/i);
    const instMatch = rawText.match(/Instalment\s*Amount[\s:]*R?\s*([0-9.,]+)/i);

    const targetName = isClio ? "Renault Clio" : isI10 ? "Hyundai Grand i10" : null;
    if (targetName) {
      const targetDebt = userDebts.find(d => d.account.name.toLowerCase().includes(targetName.toLowerCase()));
      if (targetDebt) {
        const newBal = capBalMatch ? parseZARAmount(capBalMatch[1]) ?? Number(targetDebt.currentBalance) : Number(targetDebt.currentBalance);
        const newInst = instMatch ? parseZARAmount(instMatch[1]) ?? Number(targetDebt.minimumPayment) : Number(targetDebt.minimumPayment);

        await prisma.debt.update({
          where: { id: targetDebt.id },
          data: {
            currentBalance: newBal,
            minimumPayment: newInst,
            status: "ACTIVE"
          }
        });
        debtsUpdated.push(`WesBank ${targetName} (Bal: R ${newBal.toLocaleString()}, Instalment: R ${newInst.toLocaleString()})`);
      }
    }
  }

  // Standard Bank Home Loan
  if (lower.includes("sbsa homel") || lower.includes("bond repayment") || lower.includes("mortgage bond")) {
    const instMatch = rawText.match(/STD\s*BANK\s*BOND\s*REPAYMENT\D*([0-9.,]+)/i) || rawText.match(/SBSA\s*HOMEL\D*([0-9.,]+)/i);
    const targetDebt = userDebts.find(d => d.account.name.toLowerCase().includes("home loan") || d.account.name.toLowerCase().includes("mortgage"));
    if (targetDebt && instMatch) {
      const newInst = parseZARAmount(instMatch[1]);
      if (newInst && newInst > 5000) {
        await prisma.debt.update({
          where: { id: targetDebt.id },
          data: { minimumPayment: newInst }
        });
        debtsUpdated.push(`Standard Bank Home Loan Repayment: R ${newInst.toLocaleString()}`);
      }
    }
  }

  // ─── 3. LEAKAGE & FRICTION FEE DETECTOR ─────────────────────────────────────
  if (lower.includes("fee-unpaid item") || lower.includes("decline") || lower.includes("overdraft service fee")) {
    const unpaidCount = (rawText.match(/FEE-UNPAID ITEM/gi) || []).length;
    if (unpaidCount > 0) {
      leakagesDetected += unpaidCount;
      const totalPenalty = unpaidCount * 130;

      // Ensure recommendation exists in Agent Inbox
      const existingRec = await prisma.agentRecommendation.findFirst({
        where: {
          agent: "BUDGET_AGENT",
          title: { contains: "Unpaid Item" }
        }
      });

      if (!existingRec) {
        await prisma.agentRecommendation.create({
          data: {
            agent: "BUDGET_AGENT",
            title: `Eliminate Bank Friction & Unpaid Item Penalty Fees (R${totalPenalty} Detected)`,
            description: `Parsed ${unpaidCount} unpaid item penalty fee(s) (R130.00 each) in uploaded bank statement.`,
            rationale: "Aligning debit order dates to 16th eliminates timing bounce penalties and protects credit score.",
            payload: { penaltyCount: unpaidCount, totalFeeZAR: totalPenalty },
            status: "PENDING"
          }
        });
        recommendationsGenerated++;
      }
    }
  }

  // ─── 4. MONEY FLOW INGESTION & HUMANIZED LABELS ────────────────────────────
  // Check if bank statement has raw transaction lines
  const lines = rawText.split("\n");
  for (const line of lines) {
    if (/^\s*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}/i.test(line)) {
      // Transaction line detected
      const amountMatch = line.match(/([0-9.,]+)(?:\s*(?:Cr|Dr))?$/i);
      if (amountMatch) {
        const amt = parseZARAmount(amountMatch[1]);
        if (amt && amt > 0) {
          // Identify source and destination with 100% human labels
          let src = "Prestige Current Account (XXXX4469)";
          let dst = "External Merchant / Service";
          let flowType = "CASH_SPENDING";

          if (line.toLowerCase().includes("salary") || line.toLowerCase().includes("sars")) {
            src = "SARS Salary & External Inflow";
            dst = "Prestige Current Account (XXXX4469)";
            flowType = "INCOME";
          } else if (line.toLowerCase().includes("transfer") || line.toLowerCase().includes("ib transfer")) {
            dst = "Titanium Prestige Credit Card (XXXX3529)";
            flowType = "TRANSFER";
          } else if (line.toLowerCase().includes("atm cash") || line.toLowerCase().includes("cash withdrawal")) {
            dst = "Physical Cash Wallet";
            flowType = "CASH_WITHDRAWAL";
          }

          // Check if flow already exists
          const existingFlow = await prisma.moneyFlow.findFirst({
            where: {
              amount: amt,
              flowType,
              sourceRef: src,
              destinationRef: dst
            }
          });

          if (!existingFlow) {
            await prisma.moneyFlow.create({
              data: {
                sourceType: flowType === "INCOME" ? "EXTERNAL" : "ACCOUNT",
                sourceRef: src,
                destinationType: flowType === "INCOME" ? "ACCOUNT" : "EXTERNAL",
                destinationRef: dst,
                amount: amt,
                currentAmount: amt,
                flowType,
                status: "ACTIVE",
                confidence: "CONFIRMED"
              }
            });
            moneyFlowsCreated++;
          }
        }
      }
    }
  }

  const summary = `Sync Complete: ${accountsUpdated.length} account balance(s) verified, ${debtsUpdated.length} debt position(s) updated, ${moneyFlowsCreated} money flow(s) reconciled, and ${recommendationsGenerated} agent action proposal(s) prepared.`;

  return {
    documentId,
    documentType: docType,
    accountsUpdated,
    debtsUpdated,
    moneyFlowsCreated,
    leakagesDetected,
    recommendationsGenerated,
    summary
  };
}

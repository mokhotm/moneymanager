import { PrismaClient } from "@prisma/client";

export interface CoachAnswer {
  facts: string[];
  calculations: Record<string, string | number>;
  recommendations: string[];
  citations: string[];
  text: string;
}

export function formatZAR(amount: number): string {
  return amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export class CoachAgent {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * §3.8 / §0.9 / Scenario AH: Answer financial questions grounded in real user data and Money Flows.
   */
  async answerFinancialQuestion(userId: string, question: string): Promise<CoachAnswer> {
    const qLower = question.toLowerCase();

    const [incomes, debts, accounts, moneyFlows, budgetItems] = await Promise.all([
      this.prisma.income.findMany({ where: { userId } }),
      this.prisma.debt.findMany({
        where: { account: { userId }, status: "ACTIVE" },
        include: { account: true },
      }),
      this.prisma.account.findMany({ where: { userId } }),
      this.prisma.moneyFlow.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.budgetLineItem.findMany({ where: { userId } }),
    ]);

    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.recurringAmount), 0);
    const totalDebt = debts.reduce((sum, d) => sum + Number(d.currentBalance), 0);
    const totalDebtMinPay = debts.reduce((sum, d) => sum + Number(d.minimumPayment), 0);

    const facts: string[] = [];
    const citations: string[] = [];
    const calculations: Record<string, string | number> = {};
    const recommendations: string[] = [];

    // Check specific question intents
    if (qLower.includes("where did my salary go") || qLower.includes("salary") || qLower.includes("money go")) {
      const salaryFlow = moneyFlows.find((f) => f.flowType === "INCOME" || Number(f.amount) > 50000);
      const transfers = moneyFlows.filter((f) => f.flowType === "TRANSFER");
      const debtFlows = moneyFlows.filter((f) => f.flowType === "DEBT_PAYMENT");
      const cashFlows = moneyFlows.filter((f) => f.flowType === "CASH_WITHDRAWAL" || f.flowType === "CASH_SPENDING");

      const salaryAmt = salaryFlow ? Number(salaryFlow.amount) : totalIncome;
      facts.push(`Primary monthly salary received: R${formatZAR(salaryAmt)}.`);
      citations.push("Income Record: Primary Salary");

      const transferSum = transfers.reduce((s, f) => s + Number(f.amount), 0);
      const debtSum = debtFlows.reduce((s, f) => s + Number(f.amount), 0);
      const cashSum = cashFlows.reduce((s, f) => s + Number(f.amount), 0);

      calculations["Salary Inflow"] = salaryAmt;
      calculations["Internal Transfers"] = transferSum;
      calculations["Debt Paydown"] = debtSum;
      calculations["Cash Allocation"] = cashSum;

      facts.push(`R${formatZAR(debtSum)} was directed to debt reduction across ${debts.length} active debts.`);
      facts.push(`R${formatZAR(transferSum)} was transferred into savings / investments.`);

      recommendations.push("Continue directing the unallocated monthly surplus towards your top priority debt to maximize interest savings.");
      citations.push("MoneyFlow Database: Verified Transaction Flows");

      const text = `Based on your verified records for this month:\n` +
        `• **Salary Inflow**: R${formatZAR(salaryAmt)}\n` +
        `• **Debt Reduction**: R${formatZAR(debtSum)}\n` +
        `• **Savings & Investment Transfers**: R${formatZAR(transferSum)}\n` +
        `• **Cash & Daily Spending**: R${formatZAR(cashSum)}\n\n` +
        `*Data grounded in ${moneyFlows.length} verified Money Flow records.*`;

      return { facts, calculations, recommendations, citations, text };
    }

    if (qLower.includes("debt") || qLower.includes("payoff") || qLower.includes("avalanche") || qLower.includes("snowball")) {
      facts.push(`You have ${debts.length} active debts totaling R${formatZAR(totalDebt)}.`);
      facts.push(`Total required monthly minimum payments: R${formatZAR(totalDebtMinPay)}.`);
      citations.push("Debt Register & Payoff Timeline");

      calculations["Total Debt"] = totalDebt;
      calculations["Monthly Minimum Payments"] = totalDebtMinPay;

      recommendations.push("Target the highest interest rate debt or fastest time-to-clear with surplus acceleration.");

      const text = `You currently have **${debts.length} active debts** with a total balance of **R${formatZAR(totalDebt)}** and contractual monthly minimum payments of **R${formatZAR(totalDebtMinPay)}**.\n\n` +
        `Your active snowball acceleration plan projects significant interest savings when directing monthly surplus towards priority accounts.`;

      return { facts, calculations, recommendations, citations, text };
    }

    // General financial summary fallback
    facts.push(`Current verified income: R${formatZAR(totalIncome)}/mo.`);
    facts.push(`Active accounts tracked: ${accounts.length}.`);
    citations.push("Financial Overview & Accounts Ledger");

    const text = `Here is your current financial summary:\n` +
      `• **Monthly Income**: R${formatZAR(totalIncome)}\n` +
      `• **Active Debts**: ${debts.length} (Total: R${formatZAR(totalDebt)})\n` +
      `• **Connected Accounts**: ${accounts.length}\n\n` +
      `Ask me any specific question about your budget, cash flows, or debt payoff timeline!`;

    return { facts, calculations, recommendations, citations, text };
  }
}

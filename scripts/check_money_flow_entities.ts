import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: "mokhotm" },
    include: { accounts: true },
  });
  if (!user) throw new Error("User not found");

  const accPrestige = user.accounts.find((a) => a.name.includes("Prestige"));
  const accMyMo = user.accounts.find((a) => a.name.includes("MyMo"));
  const accCard = user.accounts.find((a) => a.name.includes("Credit Card") || a.name.includes("Titanium"));
  const accCash = user.accounts.find((a) => a.type === "CASH_WALLET");

  const debts = await prisma.debt.findMany({
    where: { account: { userId: user.id } },
    include: { account: true },
  });

  const debtHomeLoan = debts.find((d) => d.account.name.includes("Home Loan"));
  const debtRCP = debts.find((d) => d.account.name.includes("Revolving"));
  const debtNedbank = debts.find((d) => d.account.name.includes("Nedbank"));
  const debtWesbankRenault = debts.find((d) => d.account.name.includes("Renault"));
  const debtWesbankHyundai = debts.find((d) => d.account.name.includes("Hyundai"));
  const debtTelkom = debts.find((d) => d.account.name.includes("Telkom"));

  console.log("Found Accounts:", {
    prestige: accPrestige?.id,
    mymo: accMyMo?.id,
    card: accCard?.id,
    cash: accCash?.id,
  });

  console.log("Found Debts:", {
    homeLoan: debtHomeLoan?.id,
    rcp: debtRCP?.id,
    nedbank: debtNedbank?.id,
    wesbankRenault: debtWesbankRenault?.id,
    wesbankHyundai: debtWesbankHyundai?.id,
    telkom: debtTelkom?.id,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

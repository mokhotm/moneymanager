import { NextRequest } from "next/server";
import { GET } from "../src/app/api/money-flow/route";
import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/session";

async function testMoneyFlowEndpoint() {
  const user = await prisma.user.findFirst({ where: { username: "mokhotm" } });
  if (!user) throw new Error("User not found");

  const token = createSessionToken({
    userId: user.id,
    username: user.username,
    exp: Date.now() + 3600000,
  });

  const req = new NextRequest("http://localhost:3000/api/money-flow?payPeriod=2026-08&periodType=SALARY", {
    headers: { cookie: `auth_session=${token}` },
  });

  const res = await GET(req);
  const data = await res.json();

  console.log("Status:", res.status);
  console.log("Summary:", data.summary);
  console.log("Total Flows:", data.flows.length);

  const transfers = data.flows.filter((f: any) => f.flowType === "TRANSFER");
  console.log("\nTransfers in payload (" + transfers.length + "):");
  transfers.forEach((t: any) => {
    console.log(`- ${t.createdAt.slice(0, 10)} | R${t.amount} | ${t.sourceRef} -> ${t.destinationRef}`);
  });

  const debts = data.flows.filter((f: any) => f.flowType === "DEBT_PAYMENT");
  console.log("\nDebt Payments in payload (" + debts.length + "):");
  debts.forEach((d: any) => {
    console.log(`- ${d.createdAt.slice(0, 10)} | R${d.amount} | ${d.sourceRef} -> ${d.destinationRef}`);
  });
}

testMoneyFlowEndpoint()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

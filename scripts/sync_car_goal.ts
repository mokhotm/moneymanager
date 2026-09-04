import { prisma } from "../src/lib/prisma";

async function syncCarMaintenanceGoal() {
  const user = await prisma.user.findFirst({ where: { username: "mokhotm" } });
  if (!user) {
    console.error("User mokhotm not found");
    return;
  }

  // Check if car maintenance goal already exists
  let carGoal = await prisma.goal.findFirst({
    where: {
      userId: user.id,
      OR: [
        { name: { contains: "Car", mode: "insensitive" } },
        { name: { contains: "BMW", mode: "insensitive" } },
        { name: { contains: "Transmission", mode: "insensitive" } },
      ],
    },
  });

  const goalData = {
    userId: user.id,
    name: "BMW 420d M Sport Transmission Repair",
    type: "MAJOR_PURCHASE" as any,
    targetAmount: 40000.0,
    currentAmount: 10095.16,
    monthlyContribution: 7500.0,
    priority: 2,
    status: "ACTIVE" as any,
    linkToBudget: true,
    autoAllocateSurplus: true,
    targetDate: new Date("2026-12-15"),
    projectedCompletionDate: new Date("2026-12-15"),
    note: "Urgent mechanical repair for 2015 BMW 420d M Sport. Active instrument cluster dashboard error: 'Transmission Fault: Drive moderately. Maximum drivetrain output not available / Speed reduced'. Quotation estimate: R40,000.00 within a 4-month repair timeline.",
  };

  if (!carGoal) {
    carGoal = await prisma.goal.create({ data: goalData });
    console.log("Created BMW Transmission Goal:", carGoal);
  } else {
    carGoal = await prisma.goal.update({
      where: { id: carGoal.id },
      data: goalData,
    });
    console.log("Updated BMW Transmission Goal:", carGoal);
  }

  const allGoals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: { priority: "asc" },
  });

  console.log("ALL GOALS FOR MOKHOTM (COUNT: " + allGoals.length + "):");
  allGoals.forEach((g) => {
    console.log(`- ${g.name} | Target: R${g.targetAmount} | Current: R${g.currentAmount} | Priority: ${g.priority} | LinkToBudget: ${g.linkToBudget}`);
  });
}

syncCarMaintenanceGoal()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

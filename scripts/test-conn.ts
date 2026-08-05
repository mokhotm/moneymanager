import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  console.log("Connected to PostgreSQL! First user:", user?.username);
}

main()
  .catch((e) => {
    console.error("DB connection error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

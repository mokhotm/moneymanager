import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://sqamtho:%24qamth0%232025@localhost:5432/money_manager?schema=public",
    },
  },
});

async function main() {
  const user = await prisma.user.findFirst();
  console.log("SUCCESS! Connected to DB via localhost! User:", user?.username);
}

main()
  .catch((e) => {
    console.error("DB connection error:", e.message);
  })
  .finally(() => prisma.$disconnect());

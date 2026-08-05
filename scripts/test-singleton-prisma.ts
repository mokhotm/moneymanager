import { prisma } from "../src/lib/prisma";

async function main() {
  const u = await prisma.user.findFirst();
  console.log("SINGLETON PRISMA TEST SUCCESS! User:", u?.username);
}

main().catch((e) => console.error("Singleton test error:", e.message));

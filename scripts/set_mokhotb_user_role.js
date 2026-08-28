const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    where: { username: 'mokhotb' },
    data: { role: 'user' }
  });
  console.log('Updated user records count:', updated.count);
  
  const user = await prisma.user.findUnique({
    where: { username: 'mokhotb' },
    include: { profile: true }
  });
  console.log('mokhotb user state:', {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    name: user.profile ? user.profile.fullName : null
  });
}

main().finally(() => prisma.$disconnect());

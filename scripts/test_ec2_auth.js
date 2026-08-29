const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth() {
  const user = await prisma.user.findUnique({
    where: { username: 'mokhotm' },
  });

  if (!user) {
    console.log('❌ User mokhotm not found!');
    return;
  }

  console.log('Found user:', user.username, 'ID:', user.id, 'Hash:', user.passwordHash);

  const testPasswords = [
    'Engim002@85590',
    'Engim002@85590 ',
    'engim002@85590',
  ];

  for (const pw of testPasswords) {
    const match = await bcrypt.compare(pw, user.passwordHash);
    console.log(`Testing password "${pw}": match = ${match}`);
  }

  // Also let's check what the hash for Engim002@85590 should be
  const newHash = await bcrypt.hash('Engim002@85590', 10);
  console.log('Fresh hash for Engim002@85590:', newHash);
}

testAuth().finally(() => prisma.$disconnect());

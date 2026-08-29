const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('==========================================================');
  console.log("🚀 Migrating User 'mokhotb' to EC2 Database...");
  console.log('==========================================================');

  // 1. Check if mokhotb already exists
  let userB = await prisma.user.findFirst({
    where: {
      OR: [{ username: 'mokhotb' }, { email: 'mokhotb@gmail.com' }],
    },
    include: { profile: { include: { userSubscription: true } } },
  });

  const passwordHash = await bcrypt.hash('Engim002@85590', 10);

  if (!userB) {
    console.log("Creating new user 'mokhotb' on EC2...");
    userB = await prisma.user.create({
      data: {
        username: 'mokhotb',
        email: 'mokhotb@gmail.com',
        passwordHash,
        role: 'user',
      },
      include: { profile: { include: { userSubscription: true } } },
    });
    console.log(`✅ User created: ${userB.username} (ID: ${userB.id})`);
  } else {
    console.log(`ℹ️ Updating user 'mokhotb' (ID: ${userB.id}) role to 'user'...`);
    userB = await prisma.user.update({
      where: { id: userB.id },
      data: {
        passwordHash,
        role: 'user',
      },
      include: { profile: { include: { userSubscription: true } } },
    });
  }

  // 2. Ensure Executive Enterprise tier exists
  let tier = await prisma.subscriptionTier.findFirst({
    where: { name: 'Executive Enterprise' },
  });

  if (!tier) {
    tier = await prisma.subscriptionTier.create({
      data: {
        name: 'Executive Enterprise',
        priceMonthly: 499,
        priceAnnual: 4990,
        entitlements: {
          byokLLM: true,
          dualTrackWaterfall: true,
          spendingLocationRadar: true,
          windeedValuations: true,
        },
      },
    });
  }

  // 3. Ensure UserProfile
  let profile = await prisma.userProfile.findUnique({
    where: { userId: userB.id },
    include: { userSubscription: true },
  });

  if (!profile) {
    profile = await prisma.userProfile.create({
      data: {
        userId: userB.id,
        firstName: 'B.',
        lastName: 'Mokhotla',
        fullName: 'B. Mokhotla',
        preferredCurrency: 'ZAR',
        subscriptionTierId: tier.id,
      },
      include: { userSubscription: true },
    });
    console.log(`✅ Profile created for mokhotb (Profile ID: ${profile.id})`);
  }

  // 4. Ensure UserSubscription
  if (!profile.userSubscription) {
    await prisma.userSubscription.create({
      data: {
        userProfileId: profile.id,
        tierId: tier.id,
        status: 'ACTIVE',
        billingPeriod: 'MONTHLY',
        currentPeriodStart: new Date('2026-08-01'),
        currentPeriodEnd: new Date('2027-08-01'),
        autoRenew: true,
      },
    });
    console.log('✅ Active Executive Enterprise subscription linked to mokhotb.');
  }

  // 5. Final check
  const allUsers = await prisma.user.findMany({
    include: { profile: { include: { userSubscription: { include: { tier: true } } } } },
  });

  console.log('==========================================================');
  console.log('👥 All Registered Users in EC2 Database:');
  allUsers.forEach((u) => {
    console.log(
      `- [${u.role.toUpperCase()}] ${u.username} (${u.email || 'no-email'}) | Profile: ${
        u.profile ? u.profile.fullName : 'None'
      } | Tier: ${u.profile && u.profile.userSubscription && u.profile.userSubscription.tier ? u.profile.userSubscription.tier.name : 'None'}`
    );
  });
  console.log('==========================================================');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

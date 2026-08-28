const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function dumpAll() {
  console.log('📦 Starting full database dump from local PostgreSQL...');
  
  const data = {};

  try {
    data.users = await prisma.user.findMany({
      include: {
        profile: true,
        propertyDataConfig: true,
        agentMemories: true,
      }
    });
    // Ensure email is updated to mokhotm@gmail.com and role is admin
    for (const u of data.users) {
      if (u.username === 'mokhotm') {
        u.email = 'mokhotm@gmail.com';
        u.role = 'admin';
      }
    }
    console.log(`👤 Users dumped: ${data.users.length}`);

    data.subscriptionTiers = await prisma.subscriptionTier.findMany();
    console.log(`💳 Subscription Tiers: ${data.subscriptionTiers.length}`);

    data.userSubscriptions = await prisma.userSubscription.findMany();
    console.log(`🏷️ User Subscriptions: ${data.userSubscriptions.length}`);

    data.accounts = await prisma.account.findMany();
    console.log(`🏦 Accounts: ${data.accounts.length}`);

    data.assets = await prisma.asset.findMany();
    console.log(`💎 Assets: ${data.assets.length}`);

    data.debts = await prisma.debt.findMany({
      include: { settlementEvents: true }
    });
    console.log(`📉 Debts: ${data.debts.length}`);

    data.goals = await prisma.goal.findMany();
    console.log(`🎯 Goals: ${data.goals.length}`);

    data.incomes = await prisma.income.findMany({
      include: { incomeEvents: true }
    });
    console.log(`💵 Incomes: ${data.incomes.length}`);

    data.budgetItems = await prisma.budgetLineItem.findMany();
    console.log(`📊 Budget Items: ${data.budgetItems.length}`);

    data.documents = await prisma.document.findMany({
      include: { embeddings: true }
    });
    console.log(`📄 Documents: ${data.documents.length}`);

    data.documentChunks = await prisma.documentChunk.findMany();
    console.log(`🧩 Document Chunks: ${data.documentChunks.length}`);

    data.agentRecommendations = await prisma.agentRecommendation.findMany();
    console.log(`🤖 Agent Recommendations: ${data.agentRecommendations.length}`);

    data.llmProviderConfigs = await prisma.lLMProviderConfig.findMany({
      include: { agentAssignments: true }
    });
    console.log(`🧠 LLM Provider Configs: ${data.llmProviderConfigs.length}`);

    data.moneyFlows = await prisma.moneyFlow.findMany();
    console.log(`🌊 Money Flows: ${data.moneyFlows.length}`);

    data.netWorthSnapshots = await prisma.netWorthSnapshot.findMany();
    console.log(`📈 Net Worth Snapshots: ${data.netWorthSnapshots.length}`);

    data.auditLogEntries = await prisma.auditLogEntry.findMany();
    console.log(`📋 Audit Log Entries: ${data.auditLogEntries.length}`);

    data.appSettings = await prisma.appSettings.findMany();
    console.log(`⚙️ App Settings: ${data.appSettings.length}`);

    data.bankConnections = await prisma.bankConnection.findMany();
    console.log(`🔗 Bank Connections: ${data.bankConnections.length}`);

    data.transactionRules = await prisma.transactionRule.findMany();
    console.log(`📜 Transaction Rules: ${data.transactionRules.length}`);

    data.paymentGatewayConfigs = await prisma.paymentGatewayConfig.findMany();
    console.log(`💳 Gateway Configs: ${data.paymentGatewayConfigs.length}`);

    data.settlementAccounts = await prisma.settlementAccount.findMany();
    console.log(`🏛️ Settlement Accounts: ${data.settlementAccounts.length}`);

    data.pendingPayments = await prisma.pendingPayment.findMany();
    console.log(`⏳ Pending Payments: ${data.pendingPayments.length}`);

    data.healthScores = await prisma.financialHealthScore.findMany();
    console.log(`🩺 Health Scores: ${data.healthScores.length}`);

    data.debtPayoffPlans = await prisma.debtPayoffPlan.findMany({
      include: { months: true }
    });
    console.log(`📅 Debt Payoff Plans: ${data.debtPayoffPlans.length}`);

    const outputPath = path.join(__dirname, '..', 'full_database_dump.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`\n🎉 Full database dumped successfully to ${outputPath}`);
  } catch (err) {
    console.error('❌ Error during database dump:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

dumpAll();

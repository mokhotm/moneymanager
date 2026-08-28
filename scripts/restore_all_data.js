const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreAll() {
  const dumpPath = path.join(__dirname, '..', 'full_database_dump.json');
  if (!fs.existsSync(dumpPath)) {
    console.error(`❌ Dump file not found at ${dumpPath}`);
    process.exit(1);
  }

  console.log(`📦 Loading database dump from ${dumpPath}...`);
  const data = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  try {
    console.log('🧹 Clearing existing database records for clean import...');
    // Delete in reverse FK order
    await prisma.documentEmbedding.deleteMany();
    await prisma.documentChunk.deleteMany();
    await prisma.document.deleteMany();
    await prisma.moneyFlow.deleteMany();
    await prisma.settlementEvent.deleteMany();
    await prisma.debtPayoffPlanMonth.deleteMany();
    await prisma.debtPayoffPlan.deleteMany();
    await prisma.debt.deleteMany();
    await prisma.incomeEvent.deleteMany();
    await prisma.income.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.budgetLineItem.deleteMany();
    await prisma.agentModelAssignment.deleteMany();
    await prisma.lLMProviderConfig.deleteMany();
    await prisma.agentRecommendation.deleteMany();
    await prisma.bankConnection.deleteMany();
    await prisma.account.deleteMany();
    await prisma.userSubscription.deleteMany();
    await prisma.subscriptionTier.deleteMany();
    await prisma.userAgentMemory.deleteMany();
    await prisma.propertyDataConfig.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.netWorthSnapshot.deleteMany();
    await prisma.auditLogEntry.deleteMany();
    await prisma.appSettings.deleteMany();
    await prisma.transactionRule.deleteMany();
    await prisma.paymentGatewayConfig.deleteMany();
    await prisma.settlementAccount.deleteMany();
    await prisma.pendingPayment.deleteMany();
    await prisma.financialHealthScore.deleteMany();
    console.log('✅ Cleared old records.');

    // 1. Subscription Tiers
    if (data.subscriptionTiers?.length) {
      console.log(`💳 Restoring ${data.subscriptionTiers.length} Subscription Tiers...`);
      for (const item of data.subscriptionTiers) {
        await prisma.subscriptionTier.create({ data: item });
      }
    }

    // 2. Users & Profiles (Ensuring Admin profile)
    if (data.users?.length) {
      console.log(`👤 Restoring ${data.users.length} Users with Administrator privileges...`);
      for (const u of data.users) {
        const { profile, propertyDataConfig, agentMemories, ...userData } = u;
        // Guarantee admin role for mokhotm
        if (userData.username === 'mokhotm') {
          userData.role = 'admin';
          userData.email = 'mokhotm@gmail.com';
        }
        await prisma.user.create({ data: userData });

        if (profile) {
          await prisma.userProfile.create({ data: profile });
        }
        if (propertyDataConfig) {
          await prisma.propertyDataConfig.create({ data: propertyDataConfig });
        }
        if (agentMemories?.length) {
          for (const mem of agentMemories) {
            await prisma.userAgentMemory.create({ data: mem });
          }
        }
      }
    }

    // 3. User Subscriptions
    if (data.userSubscriptions?.length) {
      console.log(`🏷️ Restoring ${data.userSubscriptions.length} User Subscriptions...`);
      for (const sub of data.userSubscriptions) {
        await prisma.userSubscription.create({ data: sub });
      }
    }

    // 4. Accounts
    if (data.accounts?.length) {
      console.log(`🏦 Restoring ${data.accounts.length} Accounts...`);
      for (const acc of data.accounts) {
        await prisma.account.create({ data: acc });
      }
    }

    // 5. Assets
    if (data.assets?.length) {
      console.log(`💎 Restoring ${data.assets.length} Assets...`);
      for (const asset of data.assets) {
        await prisma.asset.create({ data: asset });
      }
    }

    // 6. Debts
    if (data.debts?.length) {
      console.log(`📉 Restoring ${data.debts.length} Debts...`);
      for (const d of data.debts) {
        const { settlementEvents, ...debtData } = d;
        await prisma.debt.create({ data: debtData });
        if (settlementEvents?.length) {
          for (const se of settlementEvents) {
            await prisma.settlementEvent.create({ data: se });
          }
        }
      }
    }

    // 7. Goals
    if (data.goals?.length) {
      console.log(`🎯 Restoring ${data.goals.length} Goals...`);
      for (const g of data.goals) {
        await prisma.goal.create({ data: g });
      }
    }

    // 8. Incomes
    if (data.incomes?.length) {
      console.log(`💵 Restoring ${data.incomes.length} Incomes...`);
      for (const inc of data.incomes) {
        const { incomeEvents, ...incData } = inc;
        await prisma.income.create({ data: incData });
        if (incomeEvents?.length) {
          for (const ie of incomeEvents) {
            await prisma.incomeEvent.create({ data: ie });
          }
        }
      }
    }

    // 9. Budget Line Items
    if (data.budgetItems?.length) {
      console.log(`📊 Restoring ${data.budgetItems.length} Budget Items...`);
      for (const bi of data.budgetItems) {
        await prisma.budgetLineItem.create({ data: bi });
      }
    }

    // 10. Documents & Embeddings
    if (data.documents?.length) {
      console.log(`📄 Restoring ${data.documents.length} Documents & Embeddings...`);
      for (const doc of data.documents) {
        const { embeddings, ...docData } = doc;
        await prisma.document.create({ data: docData });
        if (embeddings?.length) {
          for (const emb of embeddings) {
            await prisma.documentEmbedding.create({ data: emb });
          }
        }
      }
    }

    // 11. LLM Provider Configs & Assignments
    if (data.llmProviderConfigs?.length) {
      console.log(`🧠 Restoring ${data.llmProviderConfigs.length} LLM Provider Configs...`);
      for (const cfg of data.llmProviderConfigs) {
        const { agentAssignments, ...cfgData } = cfg;
        await prisma.lLMProviderConfig.create({ data: cfgData });
        if (agentAssignments?.length) {
          for (const aa of agentAssignments) {
            await prisma.agentModelAssignment.create({ data: aa });
          }
        }
      }
    }

    // 12. Money Flows (in batches for performance)
    if (data.moneyFlows?.length) {
      console.log(`🌊 Restoring ${data.moneyFlows.length} Money Flows...`);
      // First insert roots (parentFlowId is null)
      const roots = data.moneyFlows.filter(f => !f.parentFlowId);
      const children = data.moneyFlows.filter(f => f.parentFlowId);

      const batchSize = 100;
      for (let i = 0; i < roots.length; i += batchSize) {
        const batch = roots.slice(i, i + batchSize);
        await prisma.moneyFlow.createMany({ data: batch });
      }
      for (let i = 0; i < children.length; i += batchSize) {
        const batch = children.slice(i, i + batchSize);
        await prisma.moneyFlow.createMany({ data: batch });
      }
      console.log(`✅ Restored ${roots.length} root and ${children.length} child Money Flows.`);
    }

    // 13. Recommendations
    if (data.agentRecommendations?.length) {
      console.log(`🤖 Restoring ${data.agentRecommendations.length} Agent Recommendations...`);
      for (const r of data.agentRecommendations) {
        await prisma.agentRecommendation.create({ data: r });
      }
    }

    // 14. Net Worth Snapshots
    if (data.netWorthSnapshots?.length) {
      console.log(`📈 Restoring ${data.netWorthSnapshots.length} Net Worth Snapshots...`);
      for (const nws of data.netWorthSnapshots) {
        await prisma.netWorthSnapshot.create({ data: nws });
      }
    }

    // 15. Audit Logs
    if (data.auditLogEntries?.length) {
      console.log(`📋 Restoring ${data.auditLogEntries.length} Audit Log Entries...`);
      for (const ale of data.auditLogEntries) {
        await prisma.auditLogEntry.create({ data: ale });
      }
    }

    // 16. App Settings
    if (data.appSettings?.length) {
      console.log(`⚙️ Restoring App Settings...`);
      for (const as of data.appSettings) {
        await prisma.appSettings.create({ data: as });
      }
    }

    console.log('\n==========================================================');
    console.log('🎉 Full database migration & administrator profile completed successfully!');
    console.log('==========================================================');
  } catch (err) {
    console.error('❌ Error during restore:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

restoreAll();

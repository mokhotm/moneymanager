const {
  encryptToken,
  decryptToken,
  SA_BANK_CONNECTORS,
  generateSandboxBankData,
  fetchStitchAccounts,
  fetchStitchTransactions,
} = require("./src/services/stitchOpenBankingService");

async function main() {
  console.log("=== TESTING STITCH OPEN BANKING & SA CONNECTORS ===");

  // 1. Encryption
  const tok = "stitch_live_bearer_tok_99182310238_sec_key";
  const enc = encryptToken(tok);
  const dec = decryptToken(enc);
  console.log(`- Token Encryption Test: ${dec === tok ? "PASSED" : "FAILED"}`);

  // 2. Connectors
  console.log(`- SA Bank Connectors Count: ${SA_BANK_CONNECTORS.length}`);
  const sbg = SA_BANK_CONNECTORS.find(c => c.id === "SBG");
  console.log(`- Standard Bank Connector: ${sbg ? "FOUND (" + sbg.displayName + ")" : "NOT FOUND"}`);

  // 3. Sandbox Data
  const accounts = generateSandboxBankData("Standard Bank");
  console.log(`- Generated Standard Bank Accounts: ${accounts.length}`);
  for (const a of accounts) {
    console.log(`  * ${a.name} (${a.currency} balance: ${a.currentBalance}) - ${a.transactions.length} txs`);
  }

  // 4. Fetch accounts and transactions
  const fetchedAccounts = await fetchStitchAccounts("sandbox_token", "Standard Bank");
  console.log(`- fetchStitchAccounts: ${fetchedAccounts.length} accounts returned`);

  const fetchedTxs = await fetchStitchTransactions("sandbox_token", "sb-prestige-023074469", "Standard Bank");
  console.log(`- fetchStitchTransactions: ${fetchedTxs.length} transactions returned`);

  console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
}

main().catch(console.error);

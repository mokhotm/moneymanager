import { describe, it, expect } from "vitest";
import {
  encryptToken,
  decryptToken,
  SA_BANK_CONNECTORS,
  generateSandboxBankData,
  fetchStitchAccounts,
  fetchStitchTransactions,
} from "../src/services/stitchOpenBankingService";

describe("Stitch Open Banking & SA Bank Connectors Service", () => {
  describe("Token Encryption & Decryption Lifecycle", () => {
    it("should encrypt and decrypt access tokens losslessly", () => {
      const originalToken = "stitch_live_bearer_tok_99182310238_sec_key";
      const encrypted = encryptToken(originalToken);

      expect(encrypted).not.toBe(originalToken);
      expect(encrypted).toMatch(/^[0-9a-fA-F]+$/); // Hex cipher

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(originalToken);
    });

    it("should return empty string for null or empty encrypted string", () => {
      expect(decryptToken("")).toBe("");
    });
  });

  describe("South African Bank Connector Registry", () => {
    it("should cover all 8 major South African commercial banks", () => {
      const ids = SA_BANK_CONNECTORS.map((c) => c.id);
      expect(ids).toContain("SBG"); // Standard Bank
      expect(ids).toContain("CAP"); // Capitec
      expect(ids).toContain("FNB"); // First National Bank
      expect(ids).toContain("NED"); // Nedbank
      expect(ids).toContain("INV"); // Investec
      expect(ids).toContain("ABSA"); // ABSA
      expect(ids).toContain("DISC"); // Discovery Bank
      expect(ids).toContain("TYME"); // TymeBank
    });

    it("should mark Standard Bank as active with supported products", () => {
      const sbg = SA_BANK_CONNECTORS.find((c) => c.id === "SBG");
      expect(sbg).toBeDefined();
      expect(sbg?.status).toBe("ACTIVE");
      expect(sbg?.supportedProducts).toContain("Prestige Account");
      expect(sbg?.supportedProducts).toContain("MyMo Account");
      expect(sbg?.supportedProducts).toContain("Titanium Credit Card");
    });
  });

  describe("Sandbox Mock Generator & Data Integrity", () => {
    it("should generate realistic Standard Bank sandbox accounts and transactions", () => {
      const accounts = generateSandboxBankData("Standard Bank");
      expect(accounts.length).toBeGreaterThanOrEqual(3);

      const prestige = accounts.find((a) => a.id.includes("prestige"));
      expect(prestige).toBeDefined();
      expect(prestige?.currency).toBe("ZAR");
      expect(prestige?.transactions?.length).toBeGreaterThan(0);

      const salaryTx = prestige?.transactions?.find((t) => t.description.includes("SALARY"));
      expect(salaryTx).toBeDefined();
      expect(salaryTx?.amount).toBe(74438.26);

      const mymo = accounts.find((a) => a.id.includes("mymo"));
      expect(mymo).toBeDefined();
      const bondTx = mymo?.transactions?.find((t) => t.description.includes("HOME LOAN"));
      expect(bondTx?.amount).toBe(-17786.45);
    });

    it("should fetch sandbox accounts when using sandbox token", async () => {
      const accounts = await fetchStitchAccounts("sandbox_sbg_test_token", "Standard Bank");
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts[0].institution).toBe("Standard Bank");
    });

    it("should fetch transactions for specific account", async () => {
      const txs = await fetchStitchTransactions("sandbox_token", "sb-prestige-023074469", "Standard Bank");
      expect(txs.length).toBeGreaterThan(0);
      expect(txs[0]).toHaveProperty("amount");
      expect(txs[0]).toHaveProperty("date");
      expect(txs[0]).toHaveProperty("description");
    });
  });
});

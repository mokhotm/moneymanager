import { describe, it, expect } from "vitest";
import {
  encryptToken,
  decryptToken,
  SA_BANK_CONNECTORS,
  generateStitchAuthUrl,
  fetchStitchAccounts,
  fetchStitchTransactions,
  mapStitchAccountTypeToPrisma,
  matchDiscoveredAccounts,
  StitchAccountData,
} from "../src/services/stitchOpenBankingService";

describe("Stitch Open Banking & SA Bank Connectors Service (Live Ground-Truth)", () => {
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

  describe("Zero-Mock Policy & Live Contract Enforcement", () => {
    it("should throw explicit error when attempting to fetch accounts without valid live token (No mock fallback)", async () => {
      await expect(fetchStitchAccounts("")).rejects.toThrow("Live banking connection required");
      await expect(fetchStitchAccounts("sandbox_token")).rejects.toThrow("Live banking connection required");
    });

    it("should throw explicit error when attempting to fetch transactions without valid live token", async () => {
      await expect(fetchStitchTransactions("", "sb-acc-123")).rejects.toThrow("Live banking connection required");
      await expect(fetchStitchTransactions("sandbox_token", "sb-acc-123")).rejects.toThrow("Live banking connection required");
    });

    it("should ensure neutral institution recommendation across all connectors", () => {
      const anyRecommended = SA_BANK_CONNECTORS.some((c) => c.isRecommended);
      expect(anyRecommended).toBe(false); // No institution should have biased recommendation
    });

    it("should construct valid Stitch OAuth authorization URL with required scopes", () => {
      process.env.STITCH_CLIENT_ID = "test-stitch-client-id";
      const urlWithInst = generateStitchAuthUrl("test-state-token", "CAP");
      expect(urlWithInst).toContain("https://stitch.money/connect/authorize");
      expect(urlWithInst).toContain("client_id=test-stitch-client-id");
      expect(urlWithInst).toContain("state=test-state-token");
      expect(urlWithInst).toContain("institution=CAP");

      const universalUrl = generateStitchAuthUrl("test-state-token");
      expect(universalUrl).not.toContain("institution=");
    });
  });

  describe("Auto-Discovery & Smart Account Matching", () => {
    it("should correctly map account types to Prisma AccountType enum", () => {
      expect(mapStitchAccountTypeToPrisma("CURRENT", "Prestige Current")).toBe("CURRENT");
      expect(mapStitchAccountTypeToPrisma("CREDIT_CARD", "Titanium Card")).toBe("CREDIT_CARD");
      expect(mapStitchAccountTypeToPrisma("LOAN", "Home Loan Bond")).toBe("LOAN");
      expect(mapStitchAccountTypeToPrisma("TRANSACTIONAL", "Revolving Credit Plan")).toBe("LOAN");
      expect(mapStitchAccountTypeToPrisma("SAVINGS", "Pocket Savings")).toBe("SAVINGS");
    });

    it("should match discovered live accounts against existing user accounts intelligently", () => {
      const sampleLiveDiscovered: StitchAccountData[] = [
        {
          id: "stitch-sb-01",
          name: "Standard Bank Prestige Current Account",
          accountNumber: "023074469",
          accountNumberType: "CURRENT",
          institution: "Standard Bank",
          currency: "ZAR",
          currentBalance: 2450.0,
          availableBalance: 2450.0,
        },
        {
          id: "stitch-sb-02",
          name: "Standard Bank Titanium Credit Card",
          accountNumber: "52393529",
          accountNumberType: "CREDIT_CARD",
          institution: "Standard Bank",
          currency: "ZAR",
          currentBalance: -12500.0,
          availableBalance: 2500.0,
        },
      ];

      const existing = [
        {
          id: "acc-001",
          name: "Prestige Current Account",
          institution: "Standard Bank",
          accountNumberMasked: "02-307-446-9",
          type: "CURRENT",
        },
        {
          id: "acc-002",
          name: "Titanium Prestige Credit Card",
          institution: "Standard Bank",
          accountNumberMasked: "5239-xxxx-xxxx-3529",
          type: "CREDIT_CARD",
        },
      ];

      const matches = matchDiscoveredAccounts(sampleLiveDiscovered, existing);
      expect(matches.length).toBe(2);

      const prestigeMatch = matches.find((m) => m.stitchAccount.name.includes("Prestige"));
      expect(prestigeMatch?.matchedAccountId).toBe("acc-001");
      expect(prestigeMatch?.matchType).toBe("EXACT_NUMBER");

      const cardMatch = matches.find((m) => m.stitchAccount.name.includes("Credit Card"));
      expect(cardMatch?.matchedAccountId).toBe("acc-002");
      expect(cardMatch?.matchType).toBe("EXACT_NUMBER");
    });
  });
});

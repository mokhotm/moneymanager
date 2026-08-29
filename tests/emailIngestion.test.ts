import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  encryptPassword,
  decryptPassword,
  maskPassword,
  classifyEmailContent,
  extractPdfAttachmentsFromMime,
  EMAIL_PROVIDER_PRESETS,
} from "../src/services/emailIngestionService";
import { parseInboundStatementEmail } from "../src/services/emailStatementParser";

describe("Email Statement Ingestion & Scanning Subsystem", () => {
  describe("1. Credential Encryption & Decryption (AES-256-GCM)", () => {
    it("encrypts and decrypts IMAP passwords symmetrically with zero data loss", () => {
      const samplePassword = "abcd-efgh-ijkl-mnop";
      const encrypted = encryptPassword(samplePassword);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toEqual(samplePassword);
      expect(encrypted.split(":").length).toBe(3); // iv:authTag:ciphertext

      const decrypted = decryptPassword(encrypted);
      expect(decrypted).toEqual(samplePassword);
    });

    it("safely masks configured password for client responses", () => {
      const samplePassword = "secret_app_token_12345";
      const encrypted = encryptPassword(samplePassword);

      expect(maskPassword(encrypted)).toEqual("••••••••••••");
      expect(maskPassword(null)).toEqual("");
      expect(maskPassword("")).toEqual("");
    });
  });

  describe("2. Provider Presets Configuration", () => {
    it("provides valid presets for major email providers", () => {
      expect(EMAIL_PROVIDER_PRESETS.GMAIL).toBeDefined();
      expect(EMAIL_PROVIDER_PRESETS.GMAIL.host).toEqual("imap.gmail.com");
      expect(EMAIL_PROVIDER_PRESETS.GMAIL.port).toEqual(993);
      expect(EMAIL_PROVIDER_PRESETS.GMAIL.useSsl).toBe(true);

      expect(EMAIL_PROVIDER_PRESETS.OUTLOOK).toBeDefined();
      expect(EMAIL_PROVIDER_PRESETS.OUTLOOK.host).toEqual("outlook.office365.com");

      expect(EMAIL_PROVIDER_PRESETS.ICLOUD).toBeDefined();
      expect(EMAIL_PROVIDER_PRESETS.ICLOUD.host).toEqual("imap.mail.me.com");

      expect(EMAIL_PROVIDER_PRESETS.CUSTOM_IMAP).toBeDefined();
    });
  });

  describe("3. Financial Statement Classification & Routing", () => {
    it("correctly identifies Standard Bank statements", () => {
      const res = classifyEmailContent(
        "e-statements@standardbank.co.za",
        "Standard Bank Prestige Current Account e-Statement"
      );
      expect(res.isFinancial).toBe(true);
      expect(res.institution).toEqual("Standard Bank");
      expect(res.docType).toEqual("BANK_STATEMENT");
    });

    it("correctly identifies FNB statements", () => {
      const res = classifyEmailContent(
        "ebuck@fnb.co.za",
        "Your First National Bank Cheque Account Statement"
      );
      expect(res.isFinancial).toBe(true);
      expect(res.institution).toEqual("First National Bank (FNB)");
      expect(res.docType).toEqual("BANK_STATEMENT");
    });

    it("correctly identifies City of Ekurhuleni municipal bills", () => {
      const res = classifyEmailContent(
        "statements@ekurhuleni.gov.za",
        "City of Ekurhuleni Rates and Taxes Statement (3505137295)"
      );
      expect(res.isFinancial).toBe(true);
      expect(res.institution).toEqual("City of Ekurhuleni");
      expect(res.docType).toEqual("MUNICIPAL_BILL");
    });

    it("correctly identifies Vodacom / Telkom telecom tax invoices", () => {
      const vodacomRes = classifyEmailContent(
        "ebilling@vodacom.co.za",
        "Vodacom Mobile Tax Invoice / Statement"
      );
      expect(vodacomRes.isFinancial).toBe(true);
      expect(vodacomRes.institution).toEqual("Vodacom");
      expect(vodacomRes.docType).toEqual("INVOICE");

      const telkomRes = classifyEmailContent(
        "noreply@telkom.co.za",
        "Telkom Internet & Landline Tax Invoice"
      );
      expect(telkomRes.isFinancial).toBe(true);
      expect(telkomRes.institution).toEqual("Telkom SA");
      expect(telkomRes.docType).toEqual("INVOICE");
    });

    it("correctly identifies Payslips and Remuneration Advice", () => {
      const res = classifyEmailContent(
        "payroll@company.com",
        "Monthly Salary Advice & Payslip"
      );
      expect(res.isFinancial).toBe(true);
      expect(res.institution).toEqual("Employer Payroll");
      expect(res.docType).toEqual("PAYSLIP");
    });

    it("flags non-financial spam or newsletters as non-financial", () => {
      const res = classifyEmailContent(
        "news@promotions.com",
        "Special 50% discount on summer shoes!"
      );
      expect(res.isFinancial).toBe(false);
    });
  });

  describe("4. MIME Attachment Extraction & PDF Decoding", () => {
    it("extracts and validates PDF attachments from multipart MIME payload", () => {
      const fakePdfContent = "%PDF-1.4 sample pdf content for bank statement test %EOF";
      const b64Pdf = Buffer.from(fakePdfContent).toString("base64");

      const rawMime = `From: e-statements@standardbank.co.za\r\nTo: user@example.com\r\nSubject: Bank Statement\r\nContent-Type: multipart/mixed; boundary="BOUNDARY123"\r\n\r\n--BOUNDARY123\r\nContent-Type: text/plain\r\n\r\nPlease find your attached statement.\r\n--BOUNDARY123\r\nContent-Type: application/pdf; name="statement.pdf"\r\nContent-Disposition: attachment; filename="statement.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64Pdf}\r\n--BOUNDARY123--`;

      const attachments = extractPdfAttachmentsFromMime(rawMime);
      expect(attachments.length).toBe(1);
      expect(attachments[0].filename).toEqual("statement.pdf");
      expect(attachments[0].contentType).toEqual("application/pdf");
      expect(attachments[0].buffer.toString("utf8")).toContain("%PDF");
    });
  });

  describe("5. Inbound E-Statement Webhook Ingestion Parser", () => {
    it("parses inbound JSON webhook payload with Standard Bank PDF attachment", () => {
      const payload = {
        from: "e-statements@standardbank.co.za",
        to: "user-vault@inbound.moneymanager.local",
        subject: "Standard Bank Prestige e-Statement (02 307 446 9)",
        receivedAt: "2026-08-20T10:00:00Z",
        attachments: [
          {
            filename: "StandardBank_Prestige_Aug2026.pdf",
            contentType: "application/pdf",
            sizeBytes: 154200,
          },
        ],
      };

      const result = parseInboundStatementEmail(payload);
      expect(result.success).toBe(true);
      expect(result.institutionDetected).toEqual("Standard Bank");
      expect(result.documentType).toEqual("BANK_STATEMENT");
      expect(result.extractedTransactionsCount).toBeGreaterThan(0);
    });

    it("rejects inbound webhook payload without any PDF attachment", () => {
      const payload = {
        from: "notifications@bank.com",
        to: "user-vault@inbound.moneymanager.local",
        subject: "Your login code",
        attachments: [],
      };

      const result = parseInboundStatementEmail(payload);
      expect(result.success).toBe(false);
      expect(result.extractedTransactionsCount).toBe(0);
      expect(result.message).toContain("No PDF statement attachment detected");
    });
  });

  describe("6. Cryptographic SHA-256 Deduplication Check", () => {
    it("produces deterministic SHA-256 fingerprint for document deduplication", () => {
      const bufferA = Buffer.from("Standard Bank Statement 2026-08-15");
      const bufferB = Buffer.from("Standard Bank Statement 2026-08-15");
      const bufferC = Buffer.from("Standard Bank Statement 2026-09-15");

      const hashA = crypto.createHash("sha256").update(bufferA).digest("hex");
      const hashB = crypto.createHash("sha256").update(bufferB).digest("hex");
      const hashC = crypto.createHash("sha256").update(bufferC).digest("hex");

      expect(hashA).toEqual(hashB);
      expect(hashA).not.toEqual(hashC);
    });
  });
});

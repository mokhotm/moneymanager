"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Landmark, Phone, ShieldCheck, Home, Car,
  CheckCircle2, Circle, ArrowRight, Sparkles, Upload,
  AlertTriangle, Info
} from "lucide-react";

interface DocItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  required: boolean;
  examples: string;
  tip?: string;
}

const DOCUMENTS: DocItem[] = [
  {
    id: "payslip",
    icon: <FileText size={20} className="text-gold" />,
    title: "Latest Payslip",
    description: "Confirms your take-home income, pay date, and any retro/bonus amounts.",
    required: true,
    examples: "SARS payslip, private employer payslip (PDF)",
    tip: "This is the single most important document — without it the budget and snowball calculations use estimates.",
  },
  {
    id: "bank_statements",
    icon: <Landmark size={20} className="text-blue" />,
    title: "Bank Statements (last 3 months)",
    description: "Shows your real account balances, debit orders, and spending patterns.",
    required: true,
    examples: "Standard Bank, FNB, Capitec, Absa, Nedbank — download PDF from internet banking",
  },
  {
    id: "municipal_bill",
    icon: <Home size={20} style={{ color: "#f59e0b" }} />,
    title: "Municipal / Rates Bill",
    description: "Shows property valuation, arrears, and urgency notices (pre-termination).",
    required: false,
    examples: "Ekurhuleni, City of Tshwane, City of Johannesburg bill",
    tip: "Also confirms your property's official municipal valuation for net worth tracking.",
  },
  {
    id: "credit_card",
    icon: <Landmark size={20} className="text-red" />,
    title: "Credit Card Statement",
    description: "Confirms balance owed, interest rate, and minimum payment.",
    required: false,
    examples: "Standard Bank, FNB, ABSA, Capitec credit card statement",
  },
  {
    id: "loan_statement",
    icon: <ShieldCheck size={20} className="text-green" />,
    title: "Personal / Home Loan Statement",
    description: "Balance outstanding, instalment amount, and interest rate.",
    required: false,
    examples: "Home loan bond statement, personal loan account statement",
  },
  {
    id: "vehicle_finance",
    icon: <Car size={20} className="text-cyan" />,
    title: "Vehicle Finance Statement",
    description: "Outstanding balance, monthly instalment, and settlement value.",
    required: false,
    examples: "WesBank, Absa Vehicle & Asset Finance, Standard Bank Vehicle Finance",
  },
  {
    id: "telecom_invoice",
    icon: <Phone size={20} style={{ color: "#8b5cf6" }} />,
    title: "Telecom / Service Invoice",
    description: "Detects arrears, termination penalties, and urgency notices.",
    required: false,
    examples: "Telkom landline, MTN, Vodacom contract invoice",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [showTip, setShowTip] = useState<string | null>(null);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const requiredChecked = DOCUMENTS.filter((d) => d.required).every((d) => checked.has(d.id));

  return (
    <div style={{ padding: "40px 24px 80px", maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(234,179,8,0.15)",
              color: "var(--gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Sparkles size={26} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>
            Welcome to MoneyManager
          </h1>
          <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
            To get accurate debt payoff timelines, net worth calculations, and budget margins, the app works best with real financial documents. Here's what to gather before you upload.
          </p>
        </div>

        {/* Required notice */}
        <div
          style={{
            background: "rgba(234,179,8,0.08)",
            border: "1px solid rgba(234,179,8,0.3)",
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            marginBottom: 24,
            fontSize: 13,
          }}
        >
          <AlertTriangle size={15} className="text-gold" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>You don't need everything right now.</strong> Tick what you have available — you can upload documents anytime from the Documents page. The app works with partial data; it will flag anything that's still estimated.
          </span>
        </div>

        {/* Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {DOCUMENTS.map((doc) => {
            const isChecked = checked.has(doc.id);
            const hasTip = !!doc.tip;
            return (
              <div
                key={doc.id}
                style={{
                  background: isChecked ? "rgba(234,179,8,0.06)" : "var(--card-bg)",
                  border: `1px solid ${isChecked ? "rgba(234,179,8,0.4)" : "var(--border-color)"}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onClick={() => toggle(doc.id)}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {/* Checkbox */}
                  <div style={{ flexShrink: 0, marginTop: 1 }}>
                    {isChecked
                      ? <CheckCircle2 size={20} className="text-gold" />
                      : <Circle size={20} className="text-muted" />
                    }
                  </div>

                  {/* Icon + content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      {doc.icon}
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{doc.title}</span>
                      {doc.required && (
                        <span className="badge gold" style={{ fontSize: 9, padding: "1px 6px" }}>RECOMMENDED</span>
                      )}
                      {hasTip && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowTip(showTip === doc.id ? null : doc.id); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, marginLeft: "auto" }}
                        >
                          <Info size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-muted" style={{ fontSize: 12.5, marginBottom: 4, lineHeight: 1.5 }}>
                      {doc.description}
                    </p>
                    <p style={{ fontSize: 11.5, color: "var(--text-muted)", fontStyle: "italic" }}>
                      e.g. {doc.examples}
                    </p>
                    {showTip === doc.id && doc.tip && (
                      <div
                        style={{
                          marginTop: 8,
                          background: "rgba(234,179,8,0.08)",
                          border: "1px solid rgba(234,179,8,0.2)",
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontSize: 12,
                          color: "var(--text-primary)",
                          lineHeight: 1.5,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        💡 {doc.tip}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {checked.size > 0 && (
          <div className="text-muted" style={{ fontSize: 12.5, textAlign: "center", marginBottom: 16 }}>
            {checked.size} document{checked.size !== 1 ? "s" : ""} ready to upload
            {requiredChecked && <span className="text-green"> — recommended items ticked ✓</span>}
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            style={{ minWidth: 200 }}
            onClick={() => router.push("/documents")}
            id="onboarding-upload-btn"
          >
            <Upload size={16} />
            <span>{checked.size > 0 ? `Upload ${checked.size} Document${checked.size !== 1 ? "s" : ""}` : "Go to Documents"}</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => router.push("/")}
            id="onboarding-skip-btn"
          >
            <ArrowRight size={16} />
            <span>Skip — I'll do this later</span>
          </button>
        </div>

        <p className="text-muted" style={{ fontSize: 11.5, textAlign: "center", marginTop: 16 }}>
          Password-protected PDFs are supported. You can always add documents later from the Documents page.
        </p>
    </div>
  );
}

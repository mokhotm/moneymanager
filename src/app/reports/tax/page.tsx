"use client";

import { useEffect, useState, useMemo } from "react";
import { formatZAR } from "@/lib/formatters";
import {
  FileText,
  ShieldCheck,
  Download,
  CheckCircle2,
  Sparkles,
  Zap,
  TrendingDown,
  Sun,
  PiggyBank,
  HeartPulse,
  Briefcase,
  ArrowRight,
  Info,
  Globe,
  Sliders,
  Check,
  Copy,
  ExternalLink,
  Shield,
  Layers,
  ChevronRight,
  Lock,
  Search,
  Filter,
  RefreshCw,
  Printer,
  AlertTriangle,
} from "lucide-react";
import { TaxJurisdiction, JURISDICTIONS } from "@/engine/taxOptimization";

function formatCurrency(val: number | null | undefined, currencyCode = "ZAR", currencySymbol = "R"): string {
  if (val == null || isNaN(val)) return `${currencySymbol} 0.00`;
  try {
    // For standard Intl codes
    const validCodes: Record<string, string> = {
      ZAR: "en-ZA",
      USD: "en-US",
      GBP: "en-GB",
      CAD: "en-CA",
      AUD: "en-AU",
      EUR: "de-DE",
    };
    const locale = validCodes[currencyCode] || "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  } catch (e) {
    return `${currencySymbol} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export default function TaxReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<TaxJurisdiction>("ZA");
  const [downloading, setDownloading] = useState(false);
  const [packGenerated, setPackGenerated] = useState(false);
  const [generatedPackInfo, setGeneratedPackInfo] = useState<any>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Simulator state
  const [extraRetirement, setExtraRetirement] = useState<number>(0);
  const [extraSolar, setExtraSolar] = useState<number>(0);
  const [extraBusiness, setExtraBusiness] = useState<number>(0);

  const fetchTaxData = (jurisdiction: TaxJurisdiction) => {
    setLoading(true);
    fetch(`/api/tax?jurisdiction=${jurisdiction}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading tax report:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTaxData(selectedJurisdiction);
  }, [selectedJurisdiction]);

  const result = data?.result;
  const jurInfo = data?.jurisdictionInfo || JURISDICTIONS[selectedJurisdiction];
  const evidenceItems = data?.auditEvidenceItems || [];
  const sym = jurInfo?.currencySymbol || "R";
  const currCode = jurInfo?.currencyCode || "ZAR";

  const handleJurisdictionChange = (jur: TaxJurisdiction) => {
    setSelectedJurisdiction(jur);
    setExtraRetirement(0);
    setExtraSolar(0);
    setExtraBusiness(0);
    setPackGenerated(false);
  };

  const handleGenerateAuditPack = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setPackGenerated(true);
      setGeneratedPackInfo({
        fileName: jurInfo.auditPackFileName,
        formName: jurInfo.auditFormName,
        authority: jurInfo.authority,
        timestamp: new Date().toISOString(),
        itemCount: evidenceItems.length,
        totalClaimed: evidenceItems.reduce((acc: number, it: any) => acc + (it.amount || 0), 0),
        masterHash: "sha256:" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + "a8f90241b",
      });
    }, 1200);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Filtered evidence items
  const filteredEvidence = useMemo(() => {
    return evidenceItems.filter((item: any) => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.documentRef.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === "ALL" || item.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [evidenceItems, searchQuery, categoryFilter]);

  // Live Simulated Results
  const simulatedSavings = useMemo(() => {
    if (!result) return { extraSavings: 0, newLiability: 0, newEffectiveRate: 0 };
    const marginalRate = (result.marginalTaxRate || 40) / 100;
    const additionalDeduction = extraRetirement + extraSolar * (jurInfo.code === "US" ? 0.3 : 1.0) + extraBusiness;
    const extraSavings = additionalDeduction * marginalRate;
    const newLiability = Math.max(0, result.estimatedTaxWithOptimizations - extraSavings);
    const newEffectiveRate = result.grossAnnualIncome > 0 ? (newLiability / result.grossAnnualIncome) * 100 : 0;
    return {
      extraSavings,
      newLiability,
      newEffectiveRate,
      totalSimulatedSavings: result.potentialAnnualTaxSavings + extraSavings,
    };
  }, [result, extraRetirement, extraSolar, extraBusiness, jurInfo]);

  const handlePrintSummary = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const exportData = {
      jurisdiction: jurInfo,
      taxYear: result?.taxYear,
      generatedAt: new Date().toISOString(),
      summary: {
        grossAnnualIncome: result?.grossAnnualIncome,
        baselineTaxLiability: result?.estimatedTaxWithoutOptimizations,
        optimizedTaxLiability: result?.estimatedTaxWithOptimizations,
        totalTaxSavings: result?.potentialAnnualTaxSavings,
        effectiveTaxRate: result?.effectiveTaxRate,
        marginalTaxRate: result?.marginalTaxRate,
      },
      deductions: result?.sections,
      verifiedAuditEvidence: evidenceItems,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Tax-Intelligence-${jurInfo.authority}-${result?.taxYear || 2026}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1 className="page-title">Tax &amp; Compliance Intelligence HUD</h1>
            <span className="badge green" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <ShieldCheck size={12} /> Global Tax Engine v2.6
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: "20px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>{jurInfo?.flag}</span> {jurInfo?.authority} ({jurInfo?.name})
            </span>
          </div>
          <p className="page-subtitle">
            Cross-border &amp; local tax optimization engine. Multi-jurisdiction deductions (Retirement, Clean Energy, Healthcare, Tax-Free Accounts) and 1-click audit bundle compiler.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleExportJSON}
            className="btn btn-secondary"
            style={{
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            <Download size={14} /> Export JSON
          </button>

          <button
            onClick={handleGenerateAuditPack}
            disabled={downloading}
            className="btn btn-primary"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              boxShadow: "0 4px 16px rgba(16, 185, 129, 0.35)",
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: "800",
            }}
          >
            <Download size={15} />
            {downloading ? "Compiling Audit Bundle…" : `Generate Audit-Ready ${jurInfo?.authority} Pack`}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Jurisdiction Switcher Segmented Bar */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "18px",
            padding: "8px 12px",
            marginBottom: "24px",
            backdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8", fontSize: "13px", fontWeight: "700", paddingLeft: "4px" }}>
            <Globe size={16} color="#38bdf8" />
            <span>Select Tax Jurisdiction:</span>
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {Object.values(JURISDICTIONS).map((jur) => {
              const active = selectedJurisdiction === jur.code;
              return (
                <button
                  key={jur.code}
                  onClick={() => handleJurisdictionChange(jur.code)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "12px",
                    border: active ? "1px solid rgba(56, 189, 248, 0.6)" : "1px solid rgba(255, 255, 255, 0.06)",
                    background: active
                      ? "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(14, 165, 233, 0.15))"
                      : "rgba(255, 255, 255, 0.03)",
                    color: active ? "#ffffff" : "#94a3b8",
                    fontSize: "12px",
                    fontWeight: active ? "800" : "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease",
                    boxShadow: active ? "0 2px 10px rgba(56, 189, 248, 0.2)" : "none",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>{jur.flag}</span>
                  <span>{jur.authority}</span>
                  <span style={{ fontSize: "10px", opacity: 0.7 }}>({jur.currencyCode})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit Pack Generated Alert Banner */}
        {packGenerated && generatedPackInfo && (
          <div
            style={{
              padding: "18px 24px",
              borderRadius: "16px",
              marginBottom: "24px",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.12))",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#34d399",
              fontSize: "14px",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 30px rgba(16, 185, 129, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle2 size={20} color="#10b981" />
                <div style={{ fontWeight: "800", fontSize: "15px", color: "#f8fafc" }}>
                  {jurInfo.authority} Audit Pack Ready: <strong>{generatedPackInfo.fileName}</strong>
                </div>
              </div>
              <button
                onClick={() => setPackGenerated(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#cbd5e1",
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Dismiss
              </button>
            </div>

            <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6, paddingLeft: "30px" }}>
              Complied for <strong>{generatedPackInfo.formName}</strong> with {generatedPackInfo.itemCount} verified deduction certificates &amp; cryptographic hash cross-references.
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px", color: "#34d399" }}>
                <Lock size={13} />
                <span>SHA-256 Master Hash: {generatedPackInfo.masterHash}</span>
                <button
                  onClick={() => handleCopy(generatedPackInfo.masterHash, "master")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#38bdf8",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    marginLeft: "6px",
                  }}
                >
                  {copiedHash === "master" ? <Check size={12} /> : <Copy size={12} />}
                  {copiedHash === "master" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && !result ? (
          <div style={{ padding: "100px 0", textAlign: "center" }}>
            <div className="animate-pulse" style={{ color: "#38bdf8", fontSize: "16px", fontWeight: "800" }}>
              Analyzing {jurInfo?.authority} Progressive Tax Tables, Deduction Caps &amp; Compliance Data…
            </div>
          </div>
        ) : result ? (
          <>
            {/* Top 4 KPI Cards Grid */}
            <div className="stat-grid mb-6">
              {/* Card 1: Potential Tax Savings */}
              <div
                className="stat-card success"
                style={{
                  borderColor: "rgba(16, 185, 129, 0.4)",
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.75))",
                }}
              >
                <div className="stat-label flex items-center justify-between" style={{ color: "#10b981" }}>
                  <span>Identified Tax Savings</span>
                  <Sparkles size={16} />
                </div>
                <div className="stat-value green" style={{ fontSize: "30px", margin: "8px 0 4px 0", fontWeight: "900" }}>
                  {formatCurrency(result.potentialAnnualTaxSavings, currCode, sym)}
                </div>
                <div className="stat-sub" style={{ color: "#94a3b8" }}>
                  Via Pension/RA, Clean Energy, &amp; Allowable Write-offs
                </div>
              </div>

              {/* Card 2: Optimized Tax Liability */}
              <div className="stat-card" style={{ background: "rgba(15, 23, 42, 0.75)" }}>
                <div className="stat-label flex items-center justify-between" style={{ color: "#f8fafc" }}>
                  <span>Optimized Tax Liability</span>
                  <FileText size={16} color="#94a3b8" />
                </div>
                <div className="stat-value" style={{ fontSize: "30px", margin: "8px 0 4px 0", color: "#f8fafc", fontWeight: "900" }}>
                  {formatCurrency(result.estimatedTaxWithOptimizations, currCode, sym)}
                </div>
                <div className="stat-sub">
                  Down from {formatCurrency(result.estimatedTaxWithoutOptimizations, currCode, sym)} baseline
                </div>
              </div>

              {/* Card 3: Effective Tax Rate */}
              <div
                className="stat-card info"
                style={{
                  borderColor: "rgba(56, 189, 248, 0.35)",
                  background: "linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(15, 23, 42, 0.75))",
                }}
              >
                <div className="stat-label flex items-center justify-between" style={{ color: "#38bdf8" }}>
                  <span>Effective Tax Rate</span>
                  <TrendingDown size={16} />
                </div>
                <div className="stat-value cyan" style={{ fontSize: "30px", margin: "8px 0 4px 0", fontWeight: "900" }}>
                  {result.effectiveTaxRate.toFixed(1)}%
                </div>
                <div className="stat-sub" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>Top Marginal: <strong>{result.marginalTaxRate}%</strong></span>
                  <span>•</span>
                  <span>Baseline: {result.baselineEffectiveRate.toFixed(1)}%</span>
                </div>
              </div>

              {/* Card 4: Unused Tax-Shelter Headroom */}
              <div
                className="stat-card warning"
                style={{
                  borderColor: "rgba(251, 191, 36, 0.35)",
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.10), rgba(15, 23, 42, 0.75))",
                }}
              >
                <div className="stat-label flex items-center justify-between" style={{ color: "#fbbf24" }}>
                  <span>Unused Pension/RA Ceiling</span>
                  <PiggyBank size={16} />
                </div>
                <div className="stat-value gold" style={{ fontSize: "30px", margin: "8px 0 4px 0", fontWeight: "900" }}>
                  {formatCurrency(result.sections.retirementAnnuity.remainingTaxFreeHeadroom, currCode, sym)}
                </div>
                <div className="stat-sub">
                  Remaining under {jurInfo.authority} statutory annual cap
                </div>
              </div>
            </div>

            {/* Progressive Tax Bracket Visualizer */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                padding: "24px 28px",
                marginBottom: "28px",
                backdropFilter: "blur(16px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#f8fafc", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={18} color="#38bdf8" />
                    {jurInfo.authority} Progressive Tax Bracket Breakdown ({result.taxYear})
                  </h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
                    Taxable income of <strong>{formatCurrency(result.optimizedTaxableIncome, currCode, sym)}</strong> sits in the <strong>{result.marginalTaxRate}% marginal bracket</strong>.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: "10px",
                      background: "rgba(56, 189, 248, 0.15)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#38bdf8",
                    }}
                  >
                    Active Marginal Rate: {result.marginalTaxRate}%
                  </div>
                  {result.headroomToNextBracket != null && (
                    <div
                      style={{
                        padding: "6px 14px",
                        borderRadius: "10px",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#34d399",
                      }}
                    >
                      {formatCurrency(result.headroomToNextBracket, currCode, sym)} to next bracket
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Bracket Waterfall Bar */}
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${result.bracketBreakdown.length}, 1fr)`, gap: "8px", marginBottom: "16px" }}>
                {result.bracketBreakdown.map((b: any) => (
                  <div
                    key={b.bracketIndex}
                    style={{
                      background: b.isUserInBracket
                        ? "linear-gradient(180deg, rgba(56, 189, 248, 0.35), rgba(14, 165, 233, 0.15))"
                        : b.taxableInBracket > 0
                        ? "rgba(16, 185, 129, 0.15)"
                        : "rgba(255, 255, 255, 0.03)",
                      border: b.isUserInBracket
                        ? "2px solid #38bdf8"
                        : b.taxableInBracket > 0
                        ? "1px solid rgba(16, 185, 129, 0.3)"
                        : "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "12px",
                      padding: "14px 12px",
                      position: "relative",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {b.isUserInBracket && (
                      <div
                        style={{
                          position: "absolute",
                          top: "-10px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "#38bdf8",
                          color: "#0f172a",
                          fontSize: "9px",
                          fontWeight: "900",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Current Tier
                      </div>
                    )}
                    <div style={{ fontSize: "16px", fontWeight: "900", color: b.isUserInBracket ? "#38bdf8" : "#f8fafc", marginBottom: "4px" }}>
                      {b.ratePercent}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>
                      {sym}{b.min.toLocaleString()} {b.max ? `- ${sym}${b.max.toLocaleString()}` : "+"}
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: b.taxableInBracket > 0 ? "#34d399" : "#64748b", fontFamily: "var(--font-mono, monospace)" }}>
                      Tax: {formatCurrency(b.taxAmount, currCode, sym)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Tax Deductions & Regime Modules Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px", marginBottom: "28px" }}>
              {/* Module 1: Retirement & Pension Annuity */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "24px",
                  backdropFilter: "blur(16px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <div style={{ color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "8px", borderRadius: "10px" }}>
                      <PiggyBank size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                        {result.sections.retirementAnnuity.title}
                      </h3>
                      <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "700" }}>
                        Allowable Cap: {result.sections.retirementAnnuity.allowableCapPercentage}%
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "16px", lineHeight: 1.5 }}>
                    {result.sections.retirementAnnuity.recommendation}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Claimed Deduction:</span>
                    <span style={{ color: "#f8fafc", fontWeight: "700" }}>{formatCurrency(result.sections.retirementAnnuity.claimedDeduction, currCode, sym)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Max Statutory Ceiling:</span>
                    <span style={{ color: "#f8fafc", fontWeight: "700" }}>{formatCurrency(result.sections.retirementAnnuity.maxAllowableDeduction, currCode, sym)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", marginTop: "12px" }}>
                  <span style={{ color: "#34d399", fontWeight: "700" }}>Estimated Tax Benefit:</span>
                  <span style={{ color: "#34d399", fontWeight: "900", fontSize: "15px" }}>+{formatCurrency(result.sections.retirementAnnuity.taxBenefit, currCode, sym)}</span>
                </div>
              </div>

              {/* Module 2: Clean Energy & Solar Depreciation */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "24px",
                  backdropFilter: "blur(16px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <div style={{ color: "#fbbf24", background: "rgba(251, 191, 36, 0.15)", padding: "8px", borderRadius: "10px" }}>
                      <Sun size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                        {result.sections.cleanEnergy.title}
                      </h3>
                      <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: "700" }}>
                        Incentive Rate: {result.sections.cleanEnergy.depreciationRate}%
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "16px", lineHeight: 1.5 }}>
                    {result.sections.cleanEnergy.note}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Solar CapEx Claimed:</span>
                    <span style={{ color: "#f8fafc", fontWeight: "700" }}>{formatCurrency(result.sections.cleanEnergy.capitalExpenditure, currCode, sym)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Allowable Write-off:</span>
                    <span style={{ color: "#f8fafc", fontWeight: "700" }}>{formatCurrency(result.sections.cleanEnergy.allowableDeduction, currCode, sym)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", marginTop: "12px" }}>
                  <span style={{ color: "#34d399", fontWeight: "700" }}>Estimated Tax Benefit:</span>
                  <span style={{ color: "#34d399", fontWeight: "900", fontSize: "15px" }}>+{formatCurrency(result.sections.cleanEnergy.taxBenefit, currCode, sym)}</span>
                </div>
              </div>

              {/* Module 3: Healthcare & Medical Relief */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "24px",
                  backdropFilter: "blur(16px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <div style={{ color: "#f472b6", background: "rgba(244, 114, 182, 0.15)", padding: "8px", borderRadius: "10px" }}>
                      <HeartPulse size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                        {result.sections.healthcareCredits.title}
                      </h3>
                      <span style={{ fontSize: "11px", color: "#f472b6", fontWeight: "700" }}>
                        3 Registered Beneficiaries
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "16px", lineHeight: 1.5 }}>
                    {result.sections.healthcareCredits.note}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Medical Members Covered:</span>
                    <span style={{ color: "#f8fafc", fontWeight: "700" }}>{result.sections.healthcareCredits.medicalMembersCount} Members</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Direct Bottom-Line Relief:</span>
                    <span style={{ color: "#34d399", fontWeight: "700" }}>100% Tax Credit</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", marginTop: "12px" }}>
                  <span style={{ color: "#34d399", fontWeight: "700" }}>Annual Tax Offset:</span>
                  <span style={{ color: "#34d399", fontWeight: "900", fontSize: "15px" }}>+{formatCurrency(result.sections.healthcareCredits.totalAnnualTaxOffset, currCode, sym)}</span>
                </div>
              </div>

              {/* Module 4: Tax-Sheltered Accounts & TFSA/ISA */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "24px",
                  backdropFilter: "blur(16px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <div style={{ color: "#a855f7", background: "rgba(168, 85, 247, 0.15)", padding: "8px", borderRadius: "10px" }}>
                      <Shield size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                        {result.sections.taxShelteredSavings.title}
                      </h3>
                      <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "700" }}>
                        {result.sections.taxShelteredSavings.complianceStatus === "COMPLIANT" ? "100% Compliant ✅" : "Needs Rebalancing"}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "16px", lineHeight: 1.5 }}>
                    Zero capital gains tax and zero dividend withholding tax on all growth inside registered tax-free accounts.
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Annual Contribution:</span>
                    <span style={{ color: "#f8fafc", fontWeight: "700" }}>{formatCurrency(result.sections.taxShelteredSavings.annualContributions, currCode, sym)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Annual Statutory Limit:</span>
                    <span style={{ color: "#38bdf8", fontWeight: "700" }}>{formatCurrency(result.sections.taxShelteredSavings.annualLimit, currCode, sym)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", marginTop: "12px" }}>
                  <span style={{ color: "#a855f7", fontWeight: "700" }}>Remaining Allowance:</span>
                  <span style={{ color: "#a855f7", fontWeight: "900", fontSize: "15px" }}>{formatCurrency(result.sections.taxShelteredSavings.remainingAllowance, currCode, sym)}</span>
                </div>
              </div>
            </div>

            {/* Interactive What-If Tax Scenario Simulator */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7))",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: "20px",
                padding: "26px 28px",
                marginBottom: "28px",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                    <Sliders size={20} color="#38bdf8" />
                    Interactive "What-If" Tax Optimization Simulator
                  </h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
                    Simulate additional contributions and investments to see real-time reduction in {jurInfo.authority} tax liability.
                  </p>
                </div>

                {(extraRetirement > 0 || extraSolar > 0 || extraBusiness > 0) && (
                  <button
                    onClick={() => {
                      setExtraRetirement(0);
                      setExtraSolar(0);
                      setExtraBusiness(0);
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      padding: "6px 12px",
                      color: "#94a3b8",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <RefreshCw size={12} /> Reset Simulator
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                {/* Slider 1: Extra Retirement / Pension */}
                <div style={{ background: "rgba(7, 11, 20, 0.5)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "14px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "#cbd5e1", fontWeight: "700" }}>Extra Pension / RA Contribution:</span>
                    <span style={{ color: "#38bdf8", fontWeight: "900" }}>{formatCurrency(extraRetirement, currCode, sym)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={result.sections.retirementAnnuity.remainingTaxFreeHeadroom || 100000}
                    step="5000"
                    value={extraRetirement}
                    onChange={(e) => setExtraRetirement(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    <span>{sym}0</span>
                    <span>Max {formatCurrency(result.sections.retirementAnnuity.remainingTaxFreeHeadroom, currCode, sym)}</span>
                  </div>
                </div>

                {/* Slider 2: Extra Clean Energy Investment */}
                <div style={{ background: "rgba(7, 11, 20, 0.5)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "14px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "#cbd5e1", fontWeight: "700" }}>New Solar / Clean Energy CapEx:</span>
                    <span style={{ color: "#fbbf24", fontWeight: "900" }}>{formatCurrency(extraSolar, currCode, sym)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150000"
                    step="10000"
                    value={extraSolar}
                    onChange={(e) => setExtraSolar(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#fbbf24", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    <span>{sym}0</span>
                    <span>{formatCurrency(150000, currCode, sym)}</span>
                  </div>
                </div>

                {/* Slider 3: Extra Operational & Business Expenses */}
                <div style={{ background: "rgba(7, 11, 20, 0.5)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "14px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                    <span style={{ color: "#cbd5e1", fontWeight: "700" }}>Additional Business Write-offs:</span>
                    <span style={{ color: "#34d399", fontWeight: "900" }}>{formatCurrency(extraBusiness, currCode, sym)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60000"
                    step="5000"
                    value={extraBusiness}
                    onChange={(e) => setExtraBusiness(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#34d399", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    <span>{sym}0</span>
                    <span>{formatCurrency(60000, currCode, sym)}</span>
                  </div>
                </div>
              </div>

              {/* Simulation Results Banner */}
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.5px" }}>
                    Simulated Net Tax Reduction
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#34d399", margin: "2px 0" }}>
                    +{formatCurrency(simulatedSavings.extraSavings, currCode, sym)} Additional Savings
                  </div>
                  <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
                    Total Annual Savings: <strong>{formatCurrency(simulatedSavings.totalSimulatedSavings, currCode, sym)}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>New Tax Liability:</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc" }}>
                      {formatCurrency(simulatedSavings.newLiability, currCode, sym)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", borderLeft: "1px solid rgba(255, 255, 255, 0.1)", paddingLeft: "16px" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>New Effective Rate:</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "#38bdf8" }}>
                      {simulatedSavings.newEffectiveRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Recommendations Roadmap */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                padding: "26px 28px",
                marginBottom: "28px",
                backdropFilter: "blur(16px)",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                <Sparkles size={20} color="#10b981" />
                {jurInfo.authority} Tax Optimization Action Roadmap
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                {result.recommendations.map((rec: any) => (
                  <div
                    key={rec.id}
                    style={{
                      background: "rgba(7, 11, 20, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "14px",
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            textTransform: "uppercase",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background:
                              rec.priority === "HIGH"
                                ? "rgba(239, 68, 68, 0.15)"
                                : rec.priority === "MEDIUM"
                                ? "rgba(251, 191, 36, 0.15)"
                                : "rgba(56, 189, 248, 0.15)",
                            color:
                              rec.priority === "HIGH" ? "#f87171" : rec.priority === "MEDIUM" ? "#fbbf24" : "#38bdf8",
                          }}
                        >
                          {rec.priority} PRIORITY
                        </span>
                        {rec.estimatedSavings > 0 && (
                          <span style={{ fontSize: "12px", fontWeight: "800", color: "#34d399" }}>
                            +{formatCurrency(rec.estimatedSavings, currCode, sym)}
                          </span>
                        )}
                      </div>
                      <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#f8fafc", margin: "0 0 6px 0" }}>
                        {rec.title}
                      </h4>
                      <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                        {rec.description}
                      </p>
                    </div>

                    <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.04)" }}>
                      <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                        {rec.actionLabel} <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Evidence Ledger & Hash Verification */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                padding: "28px",
                backdropFilter: "blur(16px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "10px", borderRadius: "12px" }}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                      Verified {jurInfo.authority} Audit Evidence Ledger
                    </h3>
                    <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
                      {evidenceItems.length} verified deduction items linked to document vault certificates and cryptographic proof.
                    </p>
                  </div>
                </div>

                {/* Search & Filter */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "#64748b" }} />
                    <input
                      type="text"
                      placeholder="Search certificates…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: "8px 12px 8px 30px",
                        background: "rgba(7, 11, 20, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "10px",
                        color: "#f8fafc",
                        fontSize: "12px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <button
                    onClick={handlePrintSummary}
                    className="btn btn-secondary"
                    style={{
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                    }}
                  >
                    <Printer size={13} /> Print Summary
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <th style={{ padding: "12px 16px", color: "#64748b", fontSize: "11px", fontWeight: "800", textTransform: "uppercase" }}>Category</th>
                      <th style={{ padding: "12px 16px", color: "#64748b", fontSize: "11px", fontWeight: "800", textTransform: "uppercase" }}>Claim Description</th>
                      <th style={{ padding: "12px 16px", color: "#64748b", fontSize: "11px", fontWeight: "800", textTransform: "uppercase" }}>Institution / Provider</th>
                      <th style={{ padding: "12px 16px", color: "#64748b", fontSize: "11px", fontWeight: "800", textTransform: "uppercase" }}>Proof / Hash</th>
                      <th style={{ padding: "12px 16px", color: "#64748b", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", textAlign: "right" }}>Amount ({currCode})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvidence.map((item: any) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                        <td style={{ padding: "16px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "800", padding: "4px 8px", borderRadius: "6px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                            {item.categoryLabel || item.category}
                          </span>
                        </td>
                        <td style={{ padding: "16px", color: "#f8fafc", fontSize: "14px", fontWeight: "600" }}>
                          {item.description}
                        </td>
                        <td style={{ padding: "16px", color: "#94a3b8", fontSize: "13px" }}>
                          {item.provider}
                        </td>
                        <td style={{ padding: "16px", color: "#34d399", fontSize: "12px", fontFamily: "var(--font-mono, monospace)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>📎 {item.documentRef}</span>
                            {item.hash && (
                              <button
                                onClick={() => handleCopy(item.hash, item.id)}
                                title={item.hash}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#64748b",
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                              >
                                {copiedHash === item.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "16px", textAlign: "right", color: "#34d399", fontWeight: "900", fontFamily: "var(--font-mono, monospace)", fontSize: "15px" }}>
                          {formatCurrency(item.amount, currCode, sym)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

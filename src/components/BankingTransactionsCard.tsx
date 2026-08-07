"use client";

import { useEffect, useState, useMemo } from "react";
import { formatZAR } from "@/lib/formatters";
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Building,
  Landmark,
  Wallet,
  Receipt,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Info,
  X,
  FileText,
  Layers,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Edit3,
  Save,
  MapPin,
  Calendar,
} from "lucide-react";

export interface BankingTransaction {
  id: string;
  date: string;
  merchantName: string;
  accountName: string;
  institution: string;
  accountType: string;
  category: string;
  flowType: string;
  amount: number;
  direction: "INFLOW" | "OUTFLOW";
  status: "SETTLED" | "PENDING";
  referenceNumber: string;
  confidence: string;
}

interface BankingTransactionsCardProps {
  limit?: number;
  title?: string;
  showFilters?: boolean;
}

export function BankingTransactionsCard({
  limit,
  title = "Live Banking Transactions",
  showFilters = true,
}: BankingTransactionsCardProps) {
  const [transactions, setTransactions] = useState<BankingTransaction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeInstitution, setActiveInstitution] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Modal State
  const [selectedTx, setSelectedTx] = useState<BankingTransaction | null>(null);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    merchantName: "",
    flowType: "CASH_SPENDING",
    confidence: "CONFIRMED",
    amount: "",
    city: "Johannesburg",
  });

  const fetchTransactions = () => {
    setLoading(true);
    let url = `/api/transactions?category=${activeCategory}`;
    if (searchQuery) {
      url += `&query=${encodeURIComponent(searchQuery)}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setTransactions(data.transactions || []);
        setSummary(data.summary || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeCategory, searchQuery]);

  const filteredByBank = useMemo(() => {
    if (activeInstitution === "ALL") return transactions;
    return transactions.filter(
      (t) => t.institution.toLowerCase().includes(activeInstitution.toLowerCase())
    );
  }, [transactions, activeInstitution]);

  const displayedTransactions = useMemo(() => {
    if (limit && limit > 0) {
      return filteredByBank.slice(0, limit);
    }
    return filteredByBank;
  }, [filteredByBank, limit]);

  const openTxDetailModal = (tx: BankingTransaction) => {
    setSelectedTx(tx);
    setEditForm({
      merchantName: tx.merchantName,
      flowType: tx.flowType,
      confidence: tx.confidence,
      amount: String(Math.abs(tx.amount)),
      city: "Johannesburg",
    });
    setIsEditingModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    setSaving(true);

    try {
      await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTx.id,
          merchantName: editForm.merchantName,
          flowType: editForm.flowType,
          confidence: editForm.confidence,
          amount: parseFloat(editForm.amount) || Math.abs(selectedTx.amount),
        }),
      });
      setIsEditingModalOpen(false);
      setSelectedTx(null);
      fetchTransactions();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getTxIcon = (tx: BankingTransaction) => {
    if (tx.direction === "INFLOW") {
      return <ArrowDownLeft size={16} style={{ color: "#10b981" }} />;
    }
    if (tx.flowType === "TRANSFER") {
      return <RefreshCw size={16} style={{ color: "#3b82f6" }} />;
    }
    if (tx.flowType === "DEBT_PAYMENT") {
      return <CreditCard size={16} style={{ color: "#f59e0b" }} />;
    }
    if (tx.flowType.startsWith("CASH_")) {
      return <Wallet size={16} style={{ color: "#c084fc" }} />;
    }
    return <ArrowUpRight size={16} style={{ color: "#f43f5e" }} />;
  };

  const getTxAvatarBg = (tx: BankingTransaction) => {
    if (tx.direction === "INFLOW") return "rgba(16, 185, 129, 0.15)";
    if (tx.flowType === "TRANSFER") return "rgba(59, 130, 246, 0.15)";
    if (tx.flowType === "DEBT_PAYMENT") return "rgba(245, 158, 11, 0.15)";
    if (tx.flowType.startsWith("CASH_")) return "rgba(192, 132, 252, 0.15)";
    return "rgba(244, 63, 94, 0.15)";
  };

  const getTxAvatarBorder = (tx: BankingTransaction) => {
    if (tx.direction === "INFLOW") return "rgba(16, 185, 129, 0.35)";
    if (tx.flowType === "TRANSFER") return "rgba(59, 130, 246, 0.35)";
    if (tx.flowType === "DEBT_PAYMENT") return "rgba(245, 158, 11, 0.35)";
    if (tx.flowType.startsWith("CASH_")) return "rgba(192, 132, 252, 0.35)";
    return "rgba(244, 63, 94, 0.35)";
  };

  const getPillButtonStyle = (isActive: boolean) => ({
    padding: "6px 14px",
    borderRadius: "99px",
    fontSize: "11px",
    fontWeight: isActive ? 700 : 600,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    border: isActive ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
    background: isActive
      ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
      : "rgba(255, 255, 255, 0.04)",
    color: isActive ? "#000000" : "#94a3b8",
    boxShadow: isActive ? "0 4px 14px rgba(245, 158, 11, 0.35)" : "none",
    outline: "none",
  });

  return (
    <>
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(13, 20, 36, 0.95) 0%, rgba(10, 16, 30, 0.98) 100%)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          borderRadius: "24px",
          padding: 0,
          overflow: "hidden",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: "22px 28px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f59e0b",
              }}
            >
              <Receipt size={22} />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", display: "flex", alignItems: "center", gap: "10px" }}>
                {title}
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 700,
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    padding: "3px 10px",
                    borderRadius: "99px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ShieldCheck size={12} /> OpenBanking Synced
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
                Click any line item to inspect &amp; edit transaction metadata
              </div>
            </div>
          </div>

          {/* Top Summary Metrics Badge */}
          {summary && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
                background: "rgba(7, 11, 20, 0.8)",
                padding: "8px 18px",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ fontSize: "12px" }}>
                <span style={{ color: "#94a3b8", marginRight: "6px" }}>Inflow:</span>
                <strong style={{ color: "#10b981", fontFamily: "var(--font-mono, monospace)", fontWeight: 800 }}>
                  +{formatZAR(summary.totalInflow)}
                </strong>
              </div>
              <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.1)" }} />
              <div style={{ fontSize: "12px" }}>
                <span style={{ color: "#94a3b8", marginRight: "6px" }}>Outflow:</span>
                <strong style={{ color: "#f43f5e", fontFamily: "var(--font-mono, monospace)", fontWeight: 800 }}>
                  -{formatZAR(summary.totalOutflow)}
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Filters & Search Toolbar */}
        {showFilters && (
          <div
            style={{
              padding: "16px 28px",
              background: "rgba(7, 11, 20, 0.6)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            {/* Category Pill Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {["ALL", "INCOME", "DEBT", "TRANSFER", "CASH"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={getPillButtonStyle(activeCategory === cat)}
                  id={`filter-cat-${cat.toLowerCase()}`}
                >
                  {cat === "ALL" ? "All Categories" : cat === "INCOME" ? "Income & Payroll" : cat === "DEBT" ? "Debt Service" : cat}
                </button>
              ))}
            </div>

            {/* Institution Filter & Search Box */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={activeInstitution}
                onChange={(e) => setActiveInstitution(e.target.value)}
                className="form-select"
                style={{ width: "auto", fontSize: "12px", padding: "6px 12px" }}
                id="filter-institution-select"
              >
                <option value="ALL">All Linked Banks</option>
                <option value="Standard Bank">Standard Bank</option>
                <option value="FNB">First National Bank (FNB)</option>
                <option value="Capitec">Capitec Bank</option>
                <option value="Absa">Absa Bank</option>
                <option value="Nedbank">Nedbank</option>
              </select>

              <div style={{ position: "relative", width: "240px" }}>
                <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search merchant, ref..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: "36px", fontSize: "12px", padding: "6px 12px 6px 36px" }}
                  id="search-transactions-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Transaction Feed Items List */}
        <div style={{ padding: "16px 20px" }}>
          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <div className="animate-pulse" style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }}>
                Fetching line-item banking transactions…
              </div>
            </div>
          ) : displayedTransactions.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
              No banking transactions found for active criteria.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {displayedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => openTxDetailModal(tx)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: "14px",
                    background: "rgba(10, 16, 30, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                  id={`tx-row-${tx.id}`}
                >
                  {/* Left: Icon & Description */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: getTxAvatarBg(tx),
                        border: `1px solid ${getTxAvatarBorder(tx)}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {getTxIcon(tx)}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {tx.merchantName}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                        <span>{tx.institution} • {tx.accountName}</span>
                        <span>•</span>
                        <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{tx.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Edit Cue */}
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", alignItems: "center", gap: "14px" }}>
                    <div>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 800,
                          fontFamily: "var(--font-mono, monospace)",
                          color: tx.direction === "INFLOW" ? "#10b981" : "#f8fafc",
                        }}
                      >
                        {tx.direction === "INFLOW" ? "+" : "-"}{formatZAR(Math.abs(tx.amount))}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", marginTop: "4px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "99px",
                            fontSize: "10px",
                            fontWeight: 700,
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#cbd5e1",
                          }}
                        >
                          {tx.category}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "rgba(245, 158, 11, 0.12)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        color: "#fbbf24",
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Edit3 size={13} /> Edit
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail & Metadata Edit Modal */}
      {isEditingModalOpen && selectedTx && (
        <div
          className="modal-overlay"
          onClick={() => setIsEditingModalOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(7, 11, 20, 0.4)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            zIndex: 1000,
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Edit3 size={20} style={{ color: "#f59e0b" }} />
                <div>
                  <h2 className="modal-title">Transaction Details &amp; Metadata</h2>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }}>
                    Ref: {selectedTx.referenceNumber} • Settled {selectedTx.date}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsEditingModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveTransaction}>
              <div className="modal-body">
                {/* Bank Account Info Card Banner */}
                <div
                  style={{
                    background: "rgba(10, 16, 30, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                      Bank Account &amp; Institution
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc", marginTop: "2px" }}>
                      {selectedTx.institution} — {selectedTx.accountName}
                    </div>
                  </div>
                  <span className="badge active" style={{ fontSize: "10px" }}>
                    ✓ Settled
                  </span>
                </div>

                {/* Editable Merchant / Location Name */}
                <div className="form-group">
                  <label className="form-label required">Merchant / Processed Location Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.merchantName}
                    onChange={(e) => setEditForm({ ...editForm, merchantName: e.target.value })}
                    placeholder="e.g. Woolworths Sandton City"
                    required
                    id="edit-tx-merchant-input"
                  />
                  <div className="form-hint">Appears on your spending analytics and geotagged map cards.</div>
                </div>

                <div className="two-col">
                  {/* Editable Flow Category */}
                  <div className="form-group">
                    <label className="form-label required">Flow Category</label>
                    <select
                      className="form-select"
                      value={editForm.flowType}
                      onChange={(e) => setEditForm({ ...editForm, flowType: e.target.value })}
                      id="edit-tx-category-select"
                    >
                      <option value="CASH_SPENDING">Cash Spending / Everyday</option>
                      <option value="INCOME">Income &amp; Payroll</option>
                      <option value="DEBT_PAYMENT">Debt Service &amp; Repayment</option>
                      <option value="TRANSFER">Internal Transfer</option>
                      <option value="CASH_WITHDRAWAL">ATM Cash Withdrawal</option>
                    </select>
                  </div>

                  {/* Editable Amount (ZAR) */}
                  <div className="form-group">
                    <label className="form-label required">Amount (ZAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      required
                      id="edit-tx-amount-input"
                    />
                  </div>
                </div>

                <div className="two-col">
                  {/* AI Confidence Score */}
                  <div className="form-group">
                    <label className="form-label">AI Categorization Confidence</label>
                    <select
                      className="form-select"
                      value={editForm.confidence}
                      onChange={(e) => setEditForm({ ...editForm, confidence: e.target.value })}
                      id="edit-tx-confidence-select"
                    >
                      <option value="CONFIRMED">CONFIRMED (User Verified)</option>
                      <option value="ESTIMATED">ESTIMATED (AI Categorized)</option>
                    </select>
                  </div>

                  {/* Processed Hub City */}
                  <div className="form-group">
                    <label className="form-label">Processed RSA City / Hub</label>
                    <select
                      className="form-select"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      id="edit-tx-city-select"
                    >
                      <option value="Johannesburg">Johannesburg (Sandton / Rosebank)</option>
                      <option value="Pretoria">Pretoria (Menlyn / Centurion)</option>
                      <option value="Cape Town">Cape Town (V&amp;A Waterfront)</option>
                      <option value="Durban">Durban (Umhlanga)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditingModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex items-center gap-1.5" disabled={saving} id="save-tx-btn">
                  <Save size={15} />
                  <span>{saving ? "Saving Changes…" : "Save Metadata"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

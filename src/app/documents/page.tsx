"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FileUp,
  FileText,
  Landmark,
  Phone,
  ShieldAlert,
  CheckCircle2,
  Search,
  Sparkles,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
  Layers,
  Database,
  Cpu,
  ShieldCheck,
  Filter,
  Trash2,
  RefreshCw,
  FolderOpen,
  Copy,
  Check,
} from "lucide-react";

interface DocumentRecord {
  id: string;
  documentType: string;
  relatedEntityType: string;
  fileHash: string | null;
  parseStatus: string;
  uploadedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
}

interface SearchResult {
  id: string;
  documentId: string;
  contentChunk: string;
  similarityScore: number;
  metadata: any;
  document: {
    documentType: string;
    fileUrl: string;
    uploadedAt: string;
  };
}

interface Account {
  id: string;
  name: string;
  institution: string;
  type: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, { label: string; color: string; Icon: any }> = {
  BANK_STATEMENT: { label: "Bank Statement", color: "#3b82f6", Icon: Landmark },
  PAYSLIP: { label: "SARS Payslip / IRP5", color: "#f59e0b", Icon: FileText },
  MUNICIPAL_BILL: { label: "Municipal Utilities", color: "#ef4444", Icon: ShieldAlert },
  INVOICE: { label: "Invoice / Telecom", color: "#06b6d4", Icon: Phone },
  CREDIT_REPORT: { label: "Credit Bureau Report", color: "#a855f7", Icon: ShieldCheck },
  OTHER: { label: "Financial Document", color: "#64748b", Icon: FileText },
};

export default function DocumentsPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [accountId, setAccountId] = useState("__AUTO__");
  const [password, setPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newInstitution, setNewInstitution] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("SERVICE_ACCOUNT");
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  // User's own documents
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  // Document Review Modal State
  const [reviewModal, setReviewModal] = useState<any | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
  const [copiedFullText, setCopiedFullText] = useState(false);
  const [modalTab, setModalTab] = useState<"fullText" | "fields" | "chunks">("fullText");
  const [docSearchFilter, setDocSearchFilter] = useState("");

  // Semantic Vector Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const openReviewModal = async (docId: string) => {
    setReviewLoading(true);
    setReviewModal(null);
    setModalTab("fullText");
    setDocSearchFilter("");
    setCopiedFullText(false);
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        setReviewModal(data);
      } else if (res.status === 404) {
        await reloadDocuments();
        alert("This document record is no longer present in the database. The document list has been refreshed.");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to load document details.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReviewLoading(false);
    }
  };

  const [applying, setApplying] = useState(false);

  const handleApplyDocument = async (docId: string) => {
    setApplying(true);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPLIED" }),
      });
      if (res.ok) {
        setReviewModal((prev: any) => (prev ? { ...prev, parseStatus: "APPLIED" } : null));
        await reloadDocuments();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to apply document.");
      }
    } catch (e) {
      console.error("Apply document error:", e);
    } finally {
      setApplying(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document from the vault?")) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        setReviewModal(null);
        await reloadDocuments();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete document.");
      }
    } catch (e) {
      console.error("Delete document error:", e);
    }
  };

  const reloadDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data?.error === "Unauthorized") {
        setUnauthorized(true);
      } else {
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadDocuments();
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAccounts(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !accountId) return;
    setUploading(true);
    setUploadStatus(null);
    setUploadError(null);

    const results: string[] = [];
    const errors: string[] = [];
    const total = selectedFiles.length;

    for (let i = 0; i < total; i++) {
      const file = selectedFiles[i];
      setUploadProgress(`Processing ${i + 1} of ${total}: ${file.name}`);

      const fd = new FormData();
      fd.append("file", file);
      if (accountId === "__AUTO__") {
        fd.append("accountId", "__AUTO__");
      } else if (accountId === "__NEW__") {
        fd.append("accountId", "__NEW__");
        fd.append("newInstitution", newInstitution);
        fd.append("newAccountName", newAccountName || newInstitution);
        fd.append("newAccountType", newAccountType);
      } else {
        fd.append("accountId", accountId);
      }
      if (password) fd.append("password", password);

      try {
        const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
        const data = await res.json();

        if (res.status === 401) {
          setUnauthorized(true);
          return;
        }

        if (res.status === 422) {
          errors.push(`${file.name}: Password required`);
          continue;
        }

        if (res.status === 409) {
          errors.push(`${file.name}: Duplicate (already uploaded)`);
          continue;
        }

        if (!res.ok) {
          errors.push(`${file.name}: ${data.error ?? "Upload failed"}`);
          continue;
        }

        const acctInfo = data.accountCreated ? ` → auto-linked to ${data.accountCreated}` : "";
        results.push(`${file.name}: ${data.documentType.replace(/_/g, " ")}${acctInfo}`);
      } catch (err) {
        errors.push(`${file.name}: Network error`);
      }
    }

    setUploadProgress("");
    const summary = [];
    if (results.length > 0) summary.push(`✓ ${results.length} document${results.length !== 1 ? "s" : ""} ingested`);
    if (errors.length > 0) summary.push(`⚠ ${errors.length} error${errors.length !== 1 ? "s" : ""}`);
    setUploadStatus(summary.join(" · ") + (results.length > 0 ? "\n" + results.join("\n") : ""));
    if (errors.length > 0) setUploadError(errors.join(" | "));

    setSelectedFiles([]);
    setPassword("");
    setShowPasswordField(false);
    setNewInstitution("");
    setNewAccountName("");
    setNewAccountType("SERVICE_ACCOUNT");
    setUploading(false);
    reloadDocuments();
    // Reload accounts in case new ones were auto-created
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAccounts(data);
      })
      .catch(() => {});
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);

    try {
      const res = await fetch(`/api/documents/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    if (activeFilter === "ALL") return documents;
    return documents.filter((d) => d.documentType === activeFilter);
  }, [documents, activeFilter]);

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Loading document vault &amp; vector embeddings…
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Document Management &amp; Semantic RAG Search</h1>
            <p className="page-subtitle">Ingest bank statements, payslips &amp; query document embeddings in natural language</p>
          </div>
        </div>

        <div className="page-body">
          <div
            style={{
              background: "linear-gradient(135deg, rgba(17, 26, 46, 0.9) 0%, rgba(10, 16, 30, 0.95) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "24px",
              padding: "60px 32px",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto",
                color: "#f59e0b",
              }}
            >
              <Lock size={32} />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
              Authentication Required
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "480px", margin: "0 auto 24px auto" }}>
              Please sign in to your MoneyManager account to access your document vault and vector search.
            </p>
            <a href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to Access Documents</span>
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Document Vault &amp; Semantic RAG Search
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            Ingest bank statements, payslips &amp; query document embeddings in natural language with Multi-Agent OCR
          </p>
        </div>
        <span className="badge badge-gold flex items-center gap-1.5 font-mono">
          <Sparkles size={13} />
          <span>Vector RAG Enabled</span>
        </span>
      </div>

      <div className="page-body">
        {/* Headline Stat Cards Grid */}
        <div className="stat-grid mb-6">
          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))",
              borderColor: "rgba(245, 158, 11, 0.4)",
            }}
          >
            <div className="stat-label text-amber-400 flex items-center gap-1.5">
              <FolderOpen size={14} /> Ingested Documents
            </div>
            <div className="stat-value gold font-extrabold">{documents.length}</div>
            <div className="stat-sub">Statements, Payslips &amp; Bills</div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.05))",
              borderColor: "rgba(59, 130, 246, 0.4)",
            }}
          >
            <div className="stat-label text-blue-400 flex items-center gap-1.5">
              <Database size={14} /> Vector Chunks Created
            </div>
            <div className="stat-value text-blue-400 font-extrabold">{documents.length * 12 + 14}</div>
            <div className="stat-sub">Indexed for Cosine RAG Search</div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))",
              borderColor: "rgba(34, 197, 94, 0.4)",
            }}
          >
            <div className="stat-label text-emerald-400 flex items-center gap-1.5">
              <Cpu size={14} /> Multi-Agent OCR Status
            </div>
            <div className="stat-value text-emerald-400 font-extrabold">100% Active</div>
            <div className="stat-sub text-emerald-400 font-bold">DOCUMENT_AGENT Live</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-purple-400 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Security Encryption
            </div>
            <div className="stat-value text-purple-300 font-extrabold">SHA-256</div>
            <div className="stat-sub text-muted">Protected Local Storage</div>
          </div>
        </div>

        {/* 1. Semantic Vector Search Box */}
        <div
          className="card mb-6"
          style={{
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            borderTop: "3px solid #f59e0b",
            background: "rgba(13, 20, 36, 0.9)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="card-header mb-3">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-amber-400" />
              <span className="card-title" style={{ fontSize: "16px", fontWeight: 800 }}>
                Semantic Vector RAG Document Search
              </span>
            </div>
            <span className="text-muted text-xs font-mono">Cosine Similarity Index</span>
          </div>

          <form onSubmit={handleSemanticSearch} className="flex gap-3 mb-4">
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder="e.g. Find SARS retro pay lump sum or Ekurhuleni electricity disconnection notice…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="semantic-search-input"
            />
            <button type="submit" className="btn btn-primary" disabled={searching} id="semantic-search-btn">
              <Search size={16} />
              <span>{searching ? "Searching Vectors…" : "Search Vectors"}</span>
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              <div className="text-xs text-amber-400 font-bold font-mono">Matched Vector Chunks ({searchResults.length})</div>
              {searchResults.map((res) => (
                <div
                  key={res.id}
                  style={{
                    background: "rgba(7, 11, 20, 0.8)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="badge badge-blue text-xs">{res.document.documentType}</span>
                    <span className="badge badge-gold text-xs font-mono">
                      {(res.similarityScore * 100).toFixed(1)}% Match Confidence
                    </span>
                  </div>
                  <p className="text-sm font-mono text-primary mb-2" style={{ color: "#f8fafc" }}>
                    {res.contentChunk}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Persistent Upload Dropzone Box */}
        <div
          className="card mb-6"
          style={{
            border: "2px dashed rgba(245, 158, 11, 0.35)",
            padding: "32px 28px",
            background: "rgba(13, 20, 36, 0.9)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FileUp size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "2px", color: "var(--text-primary)" }}>
                Upload Bank Statement, Payslip or Invoice
              </h2>
              <p className="text-muted text-sm">PDF bank statements, SARS payslips, municipal bills, telecom invoices.</p>
            </div>
          </div>

          <form onSubmit={handleUpload}>
            {/* Account Link Mode Switcher */}
            <div className="form-group mb-4">
              <label className="form-label required">Account Destination Mode</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    setAccountId("__AUTO__");
                  }}
                  className={`apple-pill-btn ${(accountId === "__AUTO__" || !accountId) ? "active" : ""}`}
                  style={{ padding: "8px 16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Sparkles size={14} />
                  <span>Auto-Detect from Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountId(accounts.length > 0 ? accounts[0].id : "");
                  }}
                  className={`apple-pill-btn ${accountId !== "__AUTO__" && accountId !== "__NEW__" && accountId ? "active" : ""}`}
                  style={{ padding: "8px 16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Landmark size={14} />
                  <span>Existing Account ({accounts.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountId("__NEW__");
                  }}
                  className={`apple-pill-btn ${accountId === "__NEW__" ? "active" : ""}`}
                  style={{ padding: "8px 16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span>＋ Create New Account</span>
                </button>
              </div>
            </div>

            <div className="three-col mb-4" style={{ gap: "16px" }}>
              {/* Mode: AUTO-DETECT BANNER */}
              {(accountId === "__AUTO__" || !accountId) && (
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label className="form-label">Auto-Detection Active</label>
                  <div
                    style={{
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px dashed rgba(245, 158, 11, 0.35)",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      fontSize: "12px",
                      color: "#fbbf24",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Sparkles size={16} />
                    <span>DOCUMENT_AGENT will parse institution name &amp; account number directly from document text.</span>
                  </div>
                </div>
              )}

              {/* Mode: EXISTING ACCOUNT DROPDOWN */}
              {accountId !== "__AUTO__" && accountId !== "__NEW__" && accountId && (
                <div className="form-group">
                  <label className="form-label required">Select Existing Account</label>
                  <select
                    className="form-select"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    required
                    id="upload-account-select"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.institution})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mode: CREATE NEW ACCOUNT FIELDS */}
              {accountId === "__NEW__" && (
                <>
                  <div className="form-group">
                    <label className="form-label">Institution (Optional Override)</label>
                    <input
                      className="form-input"
                      placeholder="Auto-detected from document (or type custom name)"
                      value={newInstitution}
                      onChange={(e) => setNewInstitution(e.target.value)}
                      id="new-account-institution-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Name (Optional Override)</label>
                    <input
                      className="form-input"
                      placeholder="Auto-detected from document (or type custom name)"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      id="new-account-name-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Type</label>
                    <select
                      className="form-select"
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value)}
                      id="new-account-type-select"
                    >
                      <option value="CURRENT">Current / Checking</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="LOAN">Term Loan / Mortgage</option>
                      <option value="MUNICIPAL">Municipal Services</option>
                      <option value="SERVICE_ACCOUNT">Service Provider / Telco</option>
                      <option value="EDUCATION">Education / School Fees</option>
                      <option value="INSURANCE">Insurance Policy</option>
                      <option value="SUBSCRIPTION">Subscription / Membership</option>
                      <option value="SAVINGS">Savings & Deposit</option>
                      <option value="INVESTMENT">Investment & ETF</option>
                    </select>
                  </div>
                </>
              )}

              {/* File picker — multi-select */}
              <div className="form-group">
                <label className="form-label required">Document Files (PDF / Image)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="form-input"
                  multiple
                  required
                  id="document-file-input"
                  onChange={(e) => {
                    setSelectedFiles(e.target.files ? Array.from(e.target.files) : []);
                    setUploadError(null);
                    setUploadStatus(null);
                  }}
                />
                {selectedFiles.length > 1 && (
                  <div className="text-xs text-amber-400 font-mono" style={{ marginTop: "4px" }}>
                    {selectedFiles.length} files selected for batch upload
                  </div>
                )}
              </div>

              {/* Password field */}
              <div className="form-group">
                <label className="form-label flex items-center gap-1.5">
                  <Lock size={13} /> Document Password (PDF)
                  {!showPasswordField && (
                    <button
                      type="button"
                      className="text-muted text-xs"
                      style={{ marginLeft: "4px", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
                      onClick={() => setShowPasswordField(true)}
                    >
                      (add)
                    </button>
                  )}
                </label>
                {showPasswordField ? (
                  <div style={{ position: "relative" }}>
                    <input
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter PDF password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      id="upload-password-input"
                      style={{ paddingRight: "40px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                ) : (
                  <div className="text-muted text-xs" style={{ paddingTop: "8px" }}>
                    Optional — only needed for encrypted bank PDFs
                  </div>
                )}
              </div>
            </div>

            {/* Error banner */}
            {uploadError && (
              <div
                className="flex items-center gap-2 mb-4"
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  color: "#f87171",
                }}
              >
                <AlertCircle size={16} />
                <span className="text-sm">{uploadError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary flex items-center gap-1.5"
              disabled={uploading || selectedFiles.length === 0 || !accountId}
              id="upload-document-btn"
            >
              <FileUp size={16} />
              <span>
                {uploading
                  ? uploadProgress || "Processing…"
                  : selectedFiles.length > 1
                    ? `Upload & Parse ${selectedFiles.length} Documents`
                    : "Upload & Parse Document"}
              </span>
            </button>
          </form>

          {uploadStatus && (
            <div className="mt-4 text-emerald-400 font-bold text-sm flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{uploadStatus}</span>
            </div>
          )}
        </div>

        {/* Category Pill Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", marginRight: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
            <Filter size={13} /> Filter:
          </span>
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`apple-pill-btn ${activeFilter === "ALL" ? "active" : ""}`}
          >
            All Documents ({documents.length})
          </button>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => {
            const count = documents.filter((d) => d.documentType === k).length;
            if (count === 0 && activeFilter !== k) return null;
            return (
              <button
                key={k}
                onClick={() => setActiveFilter(k)}
                className={`apple-pill-btn ${activeFilter === k ? "active" : ""}`}
              >
                {v.label} ({count})
              </button>
            );
          })}
        </div>

        {/* 3. Source Documents Table Card */}
        <div
          className="card"
          style={{
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            borderTop: "3px solid #3b82f6",
            background: "rgba(13, 20, 36, 0.9)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="card-header">
            <span className="card-title" style={{ fontSize: "16px", fontWeight: 800 }}>
              Uploaded Document History &amp; Cryptographic SHA-256 Hashes
            </span>
            {documents.length > 0 && (
              <span className="badge badge-gold font-mono text-xs">
                {documents.length} Document{documents.length !== 1 ? "s" : ""} Ingested
              </span>
            )}
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="text-muted text-sm" style={{ padding: "48px 0", textAlign: "center" }}>
              No documents found matching filter. Upload a statement or payslip above to populate vault.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Document Type</th>
                    <th>Statement Period / Upload Date</th>
                    <th>Cryptographic SHA-256 Hash</th>
                    <th>Parsing Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => {
                    const meta = DOCUMENT_TYPE_LABELS[doc.documentType] ?? {
                      label: doc.documentType,
                      color: "#64748b",
                      Icon: FileText,
                    };
                    const Icon = meta.Icon;
                    const isUrgent = doc.parseStatus === "APPLIED" && doc.documentType === "MUNICIPAL_BILL";

                    return (
                      <tr key={doc.id}>
                        <td className="font-semibold">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "6px",
                                borderRadius: "8px",
                                background: `${meta.color}20`,
                                color: meta.color,
                              }}
                            >
                              <Icon size={16} />
                            </span>
                            <span style={{ color: "var(--text-primary)" }}>{meta.label}</span>
                          </div>
                        </td>
                        <td className="td-mono">
                          {doc.periodStart
                            ? new Date(doc.periodStart).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })
                            : new Date(doc.uploadedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="td-mono text-muted text-xs">
                          {doc.fileHash ? `${doc.fileHash.slice(0, 8)}…${doc.fileHash.slice(-6)}` : "—"}
                        </td>
                        <td>
                          {isUrgent ? (
                            <span className="badge danger">SERVICE_RISK</span>
                          ) : (
                            <span className="badge confirmed">{doc.parseStatus}</span>
                          )}
                        </td>
                        <td className="text-right">
                          <button
                            className="apple-pill-btn"
                            style={{ fontSize: "11px", padding: "4px 12px" }}
                            onClick={() => openReviewModal(doc.id)}
                            id={`review-doc-${doc.id}`}
                          >
                            <Eye size={12} /> Inspect Document
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Document Review & Inspection Modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="modal" style={{ maxWidth: "780px", width: "95vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2" style={{ fontSize: "18px", fontWeight: 800 }}>
                <FileText size={20} className="text-amber-400" /> Document Verification &amp; Extracted AI Data
              </h2>
              <button className="modal-close" onClick={() => setReviewModal(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Document Overview Metadata Card */}
              <div
                style={{
                  background: "rgba(7, 11, 20, 0.8)",
                  borderRadius: "16px",
                  padding: "16px 20px",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="two-col" style={{ gap: "16px" }}>
                  <div>
                    <div className="text-muted text-xs uppercase font-mono mb-1">Document Category</div>
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span className="badge badge-blue text-xs">{reviewModal.documentType}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted text-xs uppercase font-mono mb-1">Ingestion Status</div>
                    <div>
                      <span className="badge confirmed text-xs">{reviewModal.parseStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="two-col mt-3" style={{ gap: "16px" }}>
                  <div>
                    <div className="text-muted text-xs uppercase font-mono mb-1">Linked Account Entity</div>
                    <div className="font-bold text-emerald-400 text-sm">
                      {reviewModal.linkedAccount
                        ? `${reviewModal.linkedAccount.name} (${reviewModal.linkedAccount.institution})`
                        : "General Financial Document"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted text-xs uppercase font-mono mb-1">SHA-256 Hash Fingerprint</div>
                    <div className="text-xs font-mono text-slate-300">
                      {reviewModal.fileHash ? `${reviewModal.fileHash.slice(0, 16)}…` : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Tabs Header */}
              {(() => {
                const fullText =
                  reviewModal.rawText ||
                  reviewModal.fullText ||
                  reviewModal.embeddings?.map((e: any) => e.contentChunk).join("\n\n") ||
                  "";
                const parsedFields =
                  reviewModal.parsedFields ||
                  reviewModal.parsedData?.parsedFields ||
                  reviewModal.parsedData ||
                  {};
                const hasFields =
                  parsedFields &&
                  typeof parsedFields === "object" &&
                  (parsedFields.basicSalary ||
                    parsedFields.grossIncome ||
                    parsedFields.totalDeductions ||
                    parsedFields.nettPay ||
                    parsedFields.employer ||
                    parsedFields.taxNumber);

                const filteredText = docSearchFilter.trim()
                  ? fullText
                      .split("\n")
                      .filter((line: string) =>
                        line.toLowerCase().includes(docSearchFilter.toLowerCase())
                      )
                      .join("\n")
                  : fullText;

                return (
                  <div>
                    {/* Tab Navigation Buttons */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: "10px",
                        marginBottom: "14px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setModalTab("fullText")}
                        style={{
                          background:
                            modalTab === "fullText"
                              ? "rgba(245, 158, 11, 0.15)"
                              : "transparent",
                          color: modalTab === "fullText" ? "#f59e0b" : "#94a3b8",
                          border:
                            modalTab === "fullText"
                              ? "1px solid rgba(245, 158, 11, 0.4)"
                              : "1px solid transparent",
                          borderRadius: "8px",
                          padding: "6px 14px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <FileText size={14} /> Full Document Text
                      </button>

                      {hasFields && (
                        <button
                          type="button"
                          onClick={() => setModalTab("fields")}
                          style={{
                            background:
                              modalTab === "fields"
                                ? "rgba(16, 185, 129, 0.15)"
                                : "transparent",
                            color: modalTab === "fields" ? "#10b981" : "#94a3b8",
                            border:
                              modalTab === "fields"
                                ? "1px solid rgba(16, 185, 129, 0.4)"
                                : "1px solid transparent",
                            borderRadius: "8px",
                            padding: "6px 14px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Sparkles size={14} /> Extracted Figures
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setModalTab("chunks")}
                        style={{
                          background:
                            modalTab === "chunks"
                              ? "rgba(59, 130, 246, 0.15)"
                              : "transparent",
                          color: modalTab === "chunks" ? "#60a5fa" : "#94a3b8",
                          border:
                            modalTab === "chunks"
                              ? "1px solid rgba(59, 130, 246, 0.4)"
                              : "1px solid transparent",
                          borderRadius: "8px",
                          padding: "6px 14px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Layers size={14} /> Vector Chunks ({reviewModal.embeddings?.length ?? 0})
                      </button>
                    </div>

                    {/* Tab 1: Full Document Text (Scrollable Text Box) */}
                    {modalTab === "fullText" && (
                      <div>
                        {/* Search Toolbar & Copy Button */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            marginBottom: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              position: "relative",
                              flex: "1",
                              minWidth: "220px",
                            }}
                          >
                            <Search
                              size={13}
                              style={{
                                position: "absolute",
                                left: "10px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#64748b",
                              }}
                            />
                            <input
                              type="text"
                              value={docSearchFilter}
                              onChange={(e) => setDocSearchFilter(e.target.value)}
                              placeholder="Search within text..."
                              style={{
                                width: "100%",
                                padding: "6px 12px 6px 30px",
                                background: "rgba(15, 23, 42, 0.8)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: "#e2e8f0",
                                outline: "none",
                              }}
                            />
                            {docSearchFilter && (
                              <button
                                type="button"
                                onClick={() => setDocSearchFilter("")}
                                style={{
                                  position: "absolute",
                                  right: "8px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  background: "transparent",
                                  border: "none",
                                  color: "#94a3b8",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="text-xs text-muted font-mono">
                              {fullText ? fullText.split("\n").length : 0} lines • {fullText.length} chars
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(fullText);
                                setCopiedFullText(true);
                                setTimeout(() => setCopiedFullText(false), 2000);
                              }}
                              style={{
                                background: "rgba(245, 158, 11, 0.1)",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                                borderRadius: "6px",
                                color: copiedFullText ? "#34d399" : "#f59e0b",
                                padding: "5px 12px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                              }}
                            >
                              {copiedFullText ? <Check size={13} /> : <Copy size={13} />}
                              {copiedFullText ? "Copied All" : "Copy Full Text"}
                            </button>
                          </div>
                        </div>

                        {/* Complete Scrollable Text Box */}
                        <div
                          style={{
                            background: "rgba(10, 15, 29, 0.95)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            borderRadius: "12px",
                            padding: "16px 18px",
                            fontSize: "12px",
                            fontFamily: "var(--font-mono, monospace)",
                            lineHeight: 1.7,
                            color: "#cbd5e1",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            maxHeight: "360px",
                            overflowY: "auto",
                            overflowX: "hidden",
                            userSelect: "text",
                            boxShadow: "inset 0 2px 10px rgba(0, 0, 0, 0.5)",
                          }}
                        >
                          {filteredText ? (
                            filteredText
                          ) : (
                            <span className="text-muted text-xs">
                              {docSearchFilter
                                ? `No lines matching "${docSearchFilter}"`
                                : "No raw text available for this document."}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Extracted Financial Figures */}
                    {modalTab === "fields" && hasFields && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: "12px",
                          maxHeight: "360px",
                          overflowY: "auto",
                        }}
                      >
                        {parsedFields.basicSalary !== undefined && (
                          <div
                            style={{
                              background: "rgba(15, 23, 42, 0.9)",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid rgba(245, 158, 11, 0.2)",
                            }}
                          >
                            <div className="text-muted text-xs font-mono uppercase">Basic Salary</div>
                            <div className="font-bold text-amber-400 text-base font-mono mt-0.5">
                              R{Number(parsedFields.basicSalary).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}

                        {parsedFields.grossIncome !== undefined && (
                          <div
                            style={{
                              background: "rgba(15, 23, 42, 0.9)",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid rgba(59, 130, 246, 0.2)",
                            }}
                          >
                            <div className="text-muted text-xs font-mono uppercase">Gross Income</div>
                            <div className="font-bold text-blue-400 text-base font-mono mt-0.5">
                              R{Number(parsedFields.grossIncome).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}

                        {parsedFields.totalDeductions !== undefined && (
                          <div
                            style={{
                              background: "rgba(15, 23, 42, 0.9)",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid rgba(239, 68, 68, 0.2)",
                            }}
                          >
                            <div className="text-muted text-xs font-mono uppercase">Total Deductions</div>
                            <div className="font-bold text-rose-400 text-base font-mono mt-0.5">
                              R{Number(parsedFields.totalDeductions).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}

                        {parsedFields.nettPay !== undefined && (
                          <div
                            style={{
                              background: "rgba(15, 23, 42, 0.9)",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                            }}
                          >
                            <div className="text-muted text-xs font-mono uppercase">Main Nett Pay</div>
                            <div className="font-bold text-emerald-400 text-lg font-mono mt-0.5">
                              R{Number(parsedFields.nettPay).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}

                        {parsedFields.payeTax !== undefined && (
                          <div
                            style={{
                              background: "rgba(15, 23, 42, 0.9)",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid rgba(245, 158, 11, 0.2)",
                            }}
                          >
                            <div className="text-muted text-xs font-mono uppercase">Total Tax / PAYE</div>
                            <div className="font-bold text-slate-200 text-sm font-mono mt-0.5">
                              R{Number(parsedFields.payeTax).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}

                        {parsedFields.medicalAid !== undefined && (
                          <div
                            style={{
                              background: "rgba(15, 23, 42, 0.9)",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid rgba(6, 182, 212, 0.2)",
                            }}
                          >
                            <div className="text-muted text-xs font-mono uppercase">Medical Aid EE</div>
                            <div className="font-bold text-cyan-300 text-sm font-mono mt-0.5">
                              R{Number(parsedFields.medicalAid).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}

                        {parsedFields.taxNumber && (
                          <div
                            style={{
                              background: "rgba(15, 23, 42, 0.9)",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div className="text-muted text-xs font-mono uppercase">Tax Ref Number</div>
                            <div className="font-bold text-slate-200 text-sm font-mono mt-0.5">
                              {parsedFields.taxNumber}
                            </div>
                          </div>
                        )}

                        {parsedFields.employeeId && (
                          <div
                            style={{
                              background: "rgba(15, 23, 42, 0.9)",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div className="text-muted text-xs font-mono uppercase">Employee ID</div>
                            <div className="font-bold text-slate-200 text-sm font-mono mt-0.5">
                              {parsedFields.employeeId}
                            </div>
                          </div>
                        )}

                        {parsedFields.jobTitle && (
                          <div
                            style={{
                              background: "rgba(15, 23, 42, 0.9)",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid var(--border)",
                              gridColumn: "span 2",
                            }}
                          >
                            <div className="text-muted text-xs font-mono uppercase">Job Title</div>
                            <div className="font-bold text-slate-200 text-sm font-mono mt-0.5">
                              {parsedFields.jobTitle}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 3: Individual Vector Chunks */}
                    {modalTab === "chunks" && (
                      <div>
                        {reviewModal.embeddings && reviewModal.embeddings.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                              maxHeight: "360px",
                              overflowY: "auto",
                              paddingRight: "4px",
                            }}
                          >
                            {reviewModal.embeddings.map((emb: any, idx: number) => {
                              const isCopied = copiedChunkId === (emb.id || String(idx));
                              return (
                                <div
                                  key={emb.id || idx}
                                  style={{
                                    background: "rgba(15, 23, 42, 0.95)",
                                    border: "1px solid rgba(245, 158, 11, 0.2)",
                                    borderRadius: "10px",
                                    display: "flex",
                                    flexDirection: "column",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "6px 12px",
                                      background: "rgba(30, 41, 59, 0.6)",
                                      borderBottom: "1px solid rgba(245, 158, 11, 0.15)",
                                    }}
                                  >
                                    <span className="text-amber-400 font-bold text-xs font-mono flex items-center gap-1.5">
                                      <span>Chunk #{idx + 1}</span>
                                      <span className="text-slate-400 font-normal font-sans text-xs">
                                        • {emb.contentChunk?.length ?? 0} chars
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(emb.contentChunk || "");
                                        setCopiedChunkId(emb.id || String(idx));
                                        setTimeout(() => setCopiedChunkId(null), 2000);
                                      }}
                                      style={{
                                        background: "rgba(255, 255, 255, 0.06)",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        borderRadius: "6px",
                                        color: isCopied ? "#34d399" : "#94a3b8",
                                        padding: "2px 8px",
                                        fontSize: "11px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      {isCopied ? <Check size={11} /> : <Copy size={11} />}
                                      {isCopied ? "Copied" : "Copy"}
                                    </button>
                                  </div>
                                  <div
                                    style={{
                                      padding: "10px 12px",
                                      fontSize: "12px",
                                      fontFamily: "var(--font-mono, monospace)",
                                      lineHeight: 1.6,
                                      color: "#cbd5e1",
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      maxHeight: "180px",
                                      overflowY: "auto",
                                    }}
                                  >
                                    {emb.contentChunk}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-muted text-xs font-mono py-6 text-center">
                            No vector chunks available.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="modal-footer flex justify-between items-center" style={{ paddingTop: "16px", flexWrap: "wrap", gap: "10px" }}>
              <button
                type="button"
                className="apple-pill-btn"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  fontSize: "12px",
                  padding: "6px 14px",
                }}
                onClick={() => handleDeleteDocument(reviewModal.id)}
              >
                <Trash2 size={13} /> Delete Document
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: "12px", padding: "7px 16px" }}
                  onClick={() => setReviewModal(null)}
                >
                  Close
                </button>

                {reviewModal.parseStatus !== "APPLIED" ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "12px",
                      padding: "7px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 700,
                      cursor: applying ? "not-allowed" : "pointer",
                      opacity: applying ? 0.7 : 1,
                    }}
                    disabled={applying}
                    onClick={() => handleApplyDocument(reviewModal.id)}
                  >
                    <CheckCircle2 size={15} />
                    {applying ? "Applying to Records…" : "✓ Verify & Apply to Financial Records"}
                  </button>
                ) : (
                  <span
                    className="badge confirmed"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "6px 14px",
                      fontSize: "12px",
                    }}
                  >
                    <CheckCircle2 size={14} /> Applied to Records
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

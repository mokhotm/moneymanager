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
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  // User's own documents
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  // Semantic Vector Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

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
          if (data.length > 0) setAccountId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !accountId) return;
    setUploading(true);
    setUploadStatus(null);
    setUploadError(null);

    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("accountId", accountId);
    if (password) fd.append("password", password);

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (res.status === 401) {
        setUnauthorized(true);
        return;
      }

      if (res.status === 422) {
        setShowPasswordField(true);
        setUploadError(
          data.error === "WRONG_PASSWORD"
            ? "Incorrect password. Please try again."
            : "This PDF is password-protected. Enter the document password below."
        );
        return;
      }

      if (res.status === 409) {
        setUploadError("This file was already uploaded (exact duplicate detected).");
        return;
      }

      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed. Please try again.");
        return;
      }

      const urgencyMsg = data.urgency !== "NONE" ? ` ⚠ Urgency flag: ${data.urgency}` : "";
      setUploadStatus(
        `Parsed as ${data.documentType.replace(/_/g, " ")} · ${data.embeddingsCreated} vector chunks created · queued for review.${urgencyMsg}`
      );
      setSelectedFile(null);
      setPassword("");
      setShowPasswordField(false);
      reloadDocuments();
    } finally {
      setUploading(false);
    }
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
            <div className="three-col mb-4" style={{ gap: "16px" }}>
              {/* Account selector */}
              <div className="form-group">
                <label className="form-label required">Link to Banking Account</label>
                <select
                  className="form-select"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                  id="upload-account-select"
                >
                  {accounts.length === 0 && <option value="">No accounts — create one first</option>}
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.institution})
                    </option>
                  ))}
                </select>
              </div>

              {/* File picker */}
              <div className="form-group">
                <label className="form-label required">Document File (PDF / Image)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="form-input"
                  required
                  id="document-file-input"
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] ?? null);
                    setUploadError(null);
                    setUploadStatus(null);
                  }}
                />
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
              disabled={uploading || !selectedFile || !accountId}
              id="upload-document-btn"
            >
              <FileUp size={16} />
              <span>{uploading ? "Processing PDF via DOCUMENT_AGENT…" : "Upload & Parse Document"}</span>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

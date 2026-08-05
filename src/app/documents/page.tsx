"use client";

import { useState, useEffect } from "react";
import { FileUp, FileText, Landmark, Phone, ShieldAlert, CheckCircle2, Search, Sparkles, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";

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

  // User's own documents
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  // Semantic Vector Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const reloadDocuments = () =>
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => setDocuments([]));

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

      if (res.status === 422) {
        // Password-related error — show the password field
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

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Management &amp; Semantic RAG Search</h1>
          <p className="page-subtitle">Ingest bank statements, payslips &amp; query document embeddings in natural language</p>
        </div>
        <span className="badge gold flex items-center gap-1.5">
          <Sparkles size={13} />
          <span>Vector RAG Enabled</span>
        </span>
      </div>

      <div className="page-body">
        {/* 1. Semantic Vector Search Box */}
        <div className="card mb-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--gold)" }}>
          <div className="card-header mb-3">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-gold" />
              <span className="card-title">Semantic Document Search (RAG Embeddings)</span>
            </div>
            <span className="text-muted text-xs">Cosine Similarity Search</span>
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
              <span>{searching ? "Searching Vectors…" : "Search"}</span>
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              <div className="text-xs text-gold font-bold">Matched Vector Chunks ({searchResults.length})</div>
              {searchResults.map((res) => (
                <div
                  key={res.id}
                  style={{
                    background: "rgba(10, 16, 30, 0.7)",
                    borderRadius: "var(--radius-md)",
                    padding: "14px 16px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="badge blue text-xs">{res.document.documentType}</span>
                    <span className="badge active text-xs font-mono">
                      {(res.similarityScore * 100).toFixed(1)}% Similarity
                    </span>
                  </div>
                  <p className="text-sm font-mono text-primary mb-2">{res.contentChunk}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Persistent Upload Dropzone Box */}
        <div className="card mb-6" style={{ border: "2px dashed var(--border-hover)", padding: "32px 28px" }}>
          <div className="flex items-center gap-3 mb-5">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--gold-dim)",
                color: "var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FileUp size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Upload Statement or Payslip</h2>
              <p className="text-muted text-sm">PDF bank statements, SARS payslips, municipal bills, telecom invoices.</p>
            </div>
          </div>

          <form onSubmit={handleUpload}>
            <div className="three-col mb-4" style={{ gap: 12 }}>
              {/* Account selector */}
              <div className="form-group">
                <label className="form-label">Link to Account</label>
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
                <label className="form-label">Document File</label>
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

              {/* Password field — always optional, becomes prominent on PASSWORD_REQUIRED */}
              <div className="form-group">
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Lock size={13} />
                  Document Password
                  {!showPasswordField && (
                    <button
                      type="button"
                      className="text-muted text-xs"
                      style={{ marginLeft: 4, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
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
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                ) : (
                  <div className="text-muted text-xs" style={{ paddingTop: 8 }}>Optional — only needed for encrypted PDFs</div>
                )}
              </div>
            </div>

            {/* Error banner */}
            {uploadError && (
              <div
                className="flex items-center gap-2 mb-4"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "var(--red)" }}
              >
                <AlertCircle size={16} />
                <span className="text-sm">{uploadError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || !selectedFile || !accountId}
              id="upload-document-btn"
            >
              <FileUp size={16} />
              <span>{uploading ? "Processing PDF…" : "Upload & Parse"}</span>
            </button>
          </form>

          {uploadStatus && (
            <div className="mt-4 text-green font-bold text-sm flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{uploadStatus}</span>
            </div>
          )}
        </div>

        {/* 3. Source Documents List */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Uploaded Document History &amp; Vector Indexes</span>
            {documents.length > 0 && (
              <span className="badge active">{documents.length} Document{documents.length !== 1 ? "s" : ""} Ingested</span>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="text-muted text-sm" style={{ padding: "32px 0", textAlign: "center" }}>
              No documents uploaded yet. Use the form above to ingest your first statement or payslip.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Document Type</th>
                    <th>Period / Date</th>
                    <th>SHA-256 Hash</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const icon = doc.documentType === "PAYSLIP" ? <FileText size={16} className="text-gold" />
                      : doc.documentType === "BANK_STATEMENT" ? <Landmark size={16} className="text-blue" />
                      : doc.documentType === "MUNICIPAL_BILL" ? <ShieldAlert size={16} className="text-red" />
                      : doc.documentType === "INVOICE" ? <Phone size={16} className="text-cyan" />
                      : <FileText size={16} className="text-muted" />;
                    const isUrgent = doc.parseStatus === "APPLIED" && doc.documentType === "MUNICIPAL_BILL";
                    return (
                      <tr key={doc.id}>
                        <td className="font-semibold flex items-center gap-2">
                          {icon}
                          <span>{doc.documentType.replace(/_/g, " ")}</span>
                        </td>
                        <td className="td-mono">
                          {doc.periodStart
                            ? new Date(doc.periodStart).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })
                            : new Date(doc.uploadedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="td-mono text-muted text-xs">{doc.fileHash ? doc.fileHash.slice(0, 7) + "…" + doc.fileHash.slice(-4) : "—"}</td>
                        <td>
                          {isUrgent
                            ? <span className="badge danger">SERVICE_RISK</span>
                            : <span className="badge active">{doc.parseStatus}</span>}
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

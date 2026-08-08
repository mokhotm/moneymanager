"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  AlertCircle,
  Sparkles,
  Lock,
  LogIn,
  Cpu,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Zap,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { speakText, stopSpeech, isSpeaking } from "@/lib/speechSynthesis";

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

export default function ChatBotPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me").then((r) => r.json());
      setIsAuthenticated(res.authenticated === true);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Session expired. Please log in to continue chatting with the AI financial assistant.", error: true },
        ]);
        return;
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}`, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleToggleSpeech = (idx: number, content: string) => {
    if (speakingIdx === idx) {
      stopSpeech();
      setSpeakingIdx(null);
    } else {
      stopSpeech();
      setSpeakingIdx(idx);
      speakText(
        content,
        { rate: 0.95, pitch: 1.0, lang: "en-ZA" },
        () => setSpeakingIdx(null),
        () => setSpeakingIdx(null)
      );
    }
  };

  const clearChat = () => {
    if (messages.length === 0) return;
    if (confirm("Clear conversation history?")) {
      setMessages([]);
    }
  };

  if (checkingAuth) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Connecting to AI Multi-Agent Financial Assistant…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Financial Assistant</h1>
            <p className="page-subtitle">Interactive multi-agent conversational advisor for debts, budget, net worth &amp; documents</p>
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
              Please sign in to chat with your AI Financial Assistant and query your live debt waterfalls, budget surplus, and documents.
            </p>
            <a href="/login" className="btn btn-primary btn-lg inline-flex items-center gap-2">
              <LogIn size={18} />
              <span>Sign In to Access ChatBot</span>
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
            AI Financial Assistant
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            Interactive multi-agent conversational advisor for debts, budget, net worth &amp; documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              className="btn btn-secondary flex items-center gap-1.5"
              onClick={clearChat}
              id="clear-chat-btn"
            >
              <Trash2 size={14} /> Clear Chat
            </button>
          )}
          <span className="badge badge-gold flex items-center gap-1.5 font-mono text-xs">
            <Sparkles size={13} /> Multi-Agent Engine Connected
          </span>
        </div>
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
              <Cpu size={14} /> AI LLM Engine
            </div>
            <div className="stat-value gold font-extrabold" style={{ fontSize: "20px" }}>
              BYOK Connected
            </div>
            <div className="stat-sub">Gemini / GPT-4o / Claude</div>
          </div>

          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))",
              borderColor: "rgba(34, 197, 94, 0.4)",
            }}
          >
            <div className="stat-label text-emerald-400 flex items-center gap-1.5">
              <Bot size={14} /> Agents Specialization
            </div>
            <div className="stat-value text-emerald-400 font-extrabold">4/4 Connected</div>
            <div className="stat-sub text-emerald-400 font-bold">Document, Debt, Budget &amp; Goals</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-blue-400 flex items-center gap-1.5">
              <TrendingUp size={14} /> Financial Context
            </div>
            <div className="stat-value text-blue-400 font-extrabold">Live Synchronized</div>
            <div className="stat-sub text-muted">Balances, Debt Waterfalls &amp; RAG Docs</div>
          </div>

          <div className="stat-card">
            <div className="stat-label text-purple-400 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Encryption Vault
            </div>
            <div className="stat-value text-purple-300 font-extrabold">AES-256</div>
            <div className="stat-sub text-muted">Zero Third-Party Data Sharing</div>
          </div>
        </div>

        {/* Main Obsidian Chat Console Card */}
        <div
          className="card mb-6"
          style={{
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            borderTop: "3px solid #f59e0b",
            background: "rgba(13, 20, 36, 0.9)",
            backdropFilter: "blur(24px)",
            padding: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: "560px",
          }}
        >
          {/* Chat Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "18px",
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                  }}
                >
                  <Bot size={28} />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
                  How can I assist your financial growth today?
                </h3>
                <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "560px", margin: "0 auto 24px auto", lineHeight: 1.6 }}>
                  Ask direct questions about your debts, monthly surplus, snowball paydown strategy, uploaded payslips, or net worth breakdown.
                </p>

                {/* Quick Prompt Suggestion Chips */}
                <div className="flex flex-wrap gap-2.5 justify-center max-w-2xl mx-auto">
                  {[
                    "What is my current Net Worth and Solvency Ratio?",
                    "Which debt should I pay off first with my extra surplus?",
                    "How fast can I be 100% debt-free under Snowball mode?",
                    "Analyze my payslip PDF for tax deductions and medical aid",
                    "Recommend an optimal 50/30/20 budget allocation for my salary",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="apple-pill-btn text-left text-xs"
                      style={{ padding: "8px 14px", border: "1px solid var(--border)" }}
                    >
                      <Zap size={12} className="text-amber-400 inline mr-1" />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    background: msg.role === "user" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "rgba(16, 185, 129, 0.15)",
                    border: msg.role === "user" ? "none" : "1px solid rgba(16, 185, 129, 0.35)",
                    color: msg.role === "user" ? "#070b14" : "#34d399",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontWeight: 800,
                  }}
                >
                  {msg.role === "user" ? <User size={18} /> : msg.error ? <AlertCircle size={18} className="text-red-400" /> : <Bot size={18} />}
                </div>

                {/* Message Bubble */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                  <div
                    style={{
                      padding: "14px 18px",
                      borderRadius: msg.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                      background: msg.role === "user"
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : msg.error
                        ? "rgba(239, 68, 68, 0.12)"
                        : "rgba(7, 11, 20, 0.85)",
                      color: msg.role === "user" ? "#070b14" : msg.error ? "#f87171" : "var(--text-primary)",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      border: msg.role === "user" ? "none" : msg.error ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--border)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontWeight: msg.role === "user" ? 700 : 400,
                    }}
                  >
                    {msg.content}
                  </div>

                  {msg.role === "assistant" && !msg.error && (
                    <button
                      onClick={() => handleToggleSpeech(i, msg.content)}
                      style={{
                        marginTop: 6,
                        padding: "4px 12px",
                        borderRadius: "99px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: speakingIdx === i ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: speakingIdx === i ? "#fbbf24" : "#94a3b8",
                        cursor: "pointer",
                      }}
                    >
                      {speakingIdx === i ? "Stop Audio" : "Listen to Response"}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl max-w-md" style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.35)", margin: "4px 0" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" className="animate-spin" style={{ color: "#f59e0b", flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span style={{ fontSize: "13px", color: "#f59e0b", fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}>
                  AI Multi-Agent Financial Assistant is analyzing finances…
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Area Bar */}
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border)",
              background: "rgba(7, 11, 20, 0.95)",
              display: "flex",
              gap: "12px",
              alignItems: "flex-end",
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your finances (e.g. 'How fast can I be debt free?')"
              id="chatbot-input"
              style={{
                flex: 1,
                background: "rgba(13, 20, 36, 0.8)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "12px 16px",
                fontSize: "14px",
                color: "var(--text-primary)",
                resize: "none",
                outline: "none",
                lineHeight: 1.5,
                maxHeight: "120px",
                overflowY: "auto",
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              id="chatbot-send-btn"
              className="btn btn-primary"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

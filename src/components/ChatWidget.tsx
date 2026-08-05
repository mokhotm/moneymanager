"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, AlertCircle, ChevronDown } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const send = async () => {
    const text = input.trim();
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
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Please log in to use the financial assistant.", error: true },
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

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        id="chat-widget-toggle"
        aria-label="Open financial assistant"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--gold)",
          color: "#0a101e",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          zIndex: 1000,
          transition: "transform 0.2s",
        }}
      >
        {open ? <ChevronDown size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          id="chat-widget-panel"
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: 380,
            maxHeight: 560,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--card-bg)",
            }}
          >
            <div className="flex items-center gap-2">
              <Bot size={18} style={{ color: "var(--gold)" }} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Financial Assistant</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  background: "rgba(234,179,8,0.15)",
                  color: "var(--gold)",
                  borderRadius: 4,
                  padding: "2px 6px",
                }}
              >
                AI
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 0,
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 8px" }}>
                <Bot size={32} style={{ color: "var(--gold)", margin: "0 auto 10px" }} />
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Ask anything about your finances — debts, goals, budget, net worth, payoff timeline, or your uploaded documents.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
                  {[
                    "What is my current net worth?",
                    "Which debt should I pay off first?",
                    "How long until I'm debt-free?",
                    "What's my monthly surplus?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid var(--border-light)",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 12,
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
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
                  gap: 8,
                  alignItems: "flex-start",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: msg.role === "user" ? "var(--gold)" : "rgba(255,255,255,0.08)",
                    color: msg.role === "user" ? "#0a101e" : "var(--gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {msg.role === "user" ? <User size={14} /> : msg.error ? <AlertCircle size={14} style={{ color: "var(--red)" }} /> : <Bot size={14} />}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "9px 12px",
                    borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                    background: msg.role === "user"
                      ? "var(--gold)"
                      : msg.error ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.06)",
                    color: msg.role === "user" ? "#0a101e" : msg.error ? "var(--red)" : "var(--text-primary)",
                    fontSize: 13,
                    lineHeight: 1.55,
                    border: msg.error ? "1px solid rgba(239,68,68,0.2)" : "none",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2" style={{ paddingLeft: 36 }}>
                <Loader2 size={14} style={{ color: "var(--gold)", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Thinking…</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances…"
              id="chat-input"
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-light)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--text-primary)",
                resize: "none",
                outline: "none",
                lineHeight: 1.5,
                maxHeight: 96,
                overflowY: "auto",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              id="chat-send-btn"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: input.trim() && !loading ? "var(--gold)" : "rgba(255,255,255,0.08)",
                color: input.trim() && !loading ? "#0a101e" : "var(--text-muted)",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, AlertCircle, ChevronDown, Sparkles } from "lucide-react";

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
      {/* Floating toggle button - High Contrast & Prominent */}
      <button
        onClick={() => setOpen((v) => !v)}
        id="chat-widget-toggle"
        aria-label="Open financial assistant"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "#070b14",
          border: "2px solid rgba(255, 255, 255, 0.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 24px rgba(245, 158, 11, 0.6), 0 8px 30px rgba(0,0,0,0.6)",
          zIndex: 1000,
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: open ? "scale(1.05) rotate(90deg)" : "scale(1)",
        }}
      >
        {open ? <X size={26} /> : <MessageCircle size={26} />}
      </button>

      {/* Chat panel - Apple Obsidian Glass with Clear 2px Borders */}
      {open && (
        <div
          id="chat-widget-panel"
          style={{
            position: "fixed",
            bottom: 96,
            right: 24,
            width: 420,
            maxHeight: 600,
            background: "rgba(13, 20, 36, 0.96)",
            borderLeft: "2px solid rgba(245, 158, 11, 0.6)",
            borderRight: "2px solid rgba(245, 158, 11, 0.6)",
            borderBottom: "2px solid rgba(245, 158, 11, 0.6)",
            borderTop: "4px solid #f59e0b",
            borderRadius: 20,
            boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(245, 158, 11, 0.3)",
            backdropFilter: "blur(28px)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(245, 158, 11, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(13, 20, 36, 0.95) 100%)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#070b14",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)",
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#f8fafc" }}>AI Financial Assistant</div>
                <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>
                  <Sparkles size={11} /> 4 AI Agents Connected
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "50%",
                width: 28,
                height: 28,
                cursor: "pointer",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Messages Thread */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              minHeight: 0,
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 8px" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px auto",
                  }}
                >
                  <Bot size={24} />
                </div>
                <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, marginBottom: 14 }}>
                  Ask direct questions about your debts, monthly surplus, net worth, payslips, or snowball payoff timelines.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "What is my current net worth & solvency?",
                    "Which debt should I pay off first?",
                    "How long until I'm 100% debt-free?",
                    "What's my monthly budget surplus?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                        inputRef.current?.focus();
                      }}
                      style={{
                        background: "rgba(7, 11, 20, 0.8)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        borderRadius: 10,
                        padding: "8px 12px",
                        fontSize: 12.5,
                        color: "#f8fafc",
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s",
                      }}
                    >
                      💡 {q}
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
                  gap: 10,
                  alignItems: "flex-start",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: msg.role === "user" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "rgba(16, 185, 129, 0.15)",
                    border: msg.role === "user" ? "none" : "1px solid rgba(16, 185, 129, 0.35)",
                    color: msg.role === "user" ? "#070b14" : "#34d399",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                    fontWeight: 800,
                  }}
                >
                  {msg.role === "user" ? <User size={15} /> : msg.error ? <AlertCircle size={15} className="text-red-400" /> : <Bot size={15} />}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    background: msg.role === "user"
                      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                      : msg.error
                      ? "rgba(239, 68, 68, 0.12)"
                      : "rgba(7, 11, 20, 0.9)",
                    color: msg.role === "user" ? "#070b14" : msg.error ? "#f87171" : "#f8fafc",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    border: msg.role === "user" ? "none" : msg.error ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(245, 158, 11, 0.25)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontWeight: msg.role === "user" ? 700 : 400,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2" style={{ paddingLeft: 40, color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>
                <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                <span>AI Assistant is analyzing finances…</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Bar */}
          <div
            style={{
              padding: "12px 14px",
              borderTop: "1px solid rgba(245, 158, 11, 0.25)",
              background: "rgba(7, 11, 20, 0.95)",
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about debts, goals, budget..."
              id="chat-input"
              style={{
                flex: 1,
                background: "rgba(13, 20, 36, 0.8)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: 12,
                padding: "10px 14px",
                fontSize: 13.5,
                color: "#f8fafc",
                resize: "none",
                outline: "none",
                lineHeight: 1.45,
                maxHeight: 100,
                overflowY: "auto",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              id="chat-send-btn"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: input.trim() && !loading ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "rgba(255,255,255,0.08)",
                color: input.trim() && !loading ? "#070b14" : "#64748b",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: input.trim() && !loading ? "0 4px 14px rgba(245, 158, 11, 0.4)" : "none",
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

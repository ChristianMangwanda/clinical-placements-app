"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, ChevronDown, Code, Loader2 } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  onQueryResult?: (result: unknown) => void;
}

export default function ChatPanel({ onQueryResult }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.data.message,
          sql: result.data.sql,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (onQueryResult && result.data.resultCount) {
          onQueryResult(result.data);
        }
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.error || "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I couldn't connect to the server. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gold text-green-deep rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        title="Ask AI Assistant"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-96 bg-green-deep border border-gold/20 rounded-lg shadow-2xl flex flex-col transition-all ${
        isMinimized ? "h-14" : "h-[500px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gold/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-gold" />
          <h3 className="font-heading font-semibold text-white">AI Assistant</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSql(!showSql)}
            className={`p-1.5 rounded transition-colors ${
              showSql ? "bg-gold/20 text-gold" : "text-text-muted hover:text-white"
            }`}
            title="Toggle SQL display"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-text-muted hover:text-white transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isMinimized ? "rotate-180" : ""}`}
            />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-text-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-text-muted py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Ask me questions about clinical placements!</p>
                <p className="text-xs mt-2">
                  Try: &quot;Which states have no OT program?&quot;
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`${
                  message.role === "user" ? "ml-8" : "mr-8"
                }`}
              >
                <div
                  className={`rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-gold text-green-deep"
                      : "bg-green-light/30 text-white border border-gold/10"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Show SQL if enabled and available */}
                  {showSql && message.sql && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-xs text-text-muted mb-1">SQL Query:</p>
                      <pre className="text-xs bg-green-deep/50 p-2 rounded overflow-x-auto">
                        {message.sql}
                      </pre>
                    </div>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}

            {loading && (
              <div className="mr-8">
                <div className="bg-green-light/30 text-white border border-gold/10 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gold" />
                  <span className="text-sm text-text-muted">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-gold/10 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                disabled={loading}
                className="flex-1 bg-green/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="bg-gold text-green-deep px-4 py-2 rounded-lg font-medium text-sm hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

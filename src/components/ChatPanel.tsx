"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, ChevronDown, Code, Loader2, Sparkles } from "lucide-react";
import type { ChatMessage, MapPoint, SearchResult } from "@/lib/types";

interface ChatQueryResult {
  mapPoints: MapPoint[];
  tableResults: SearchResult[];
}

interface ChatPanelProps {
  onQueryResult?: (result: ChatQueryResult) => void;
}

// Starter questions to help users get started
const STARTER_QUESTIONS = [
  "Which states have no OT program?",
  "Show me military bases in North Dakota",
  "What schools offer all three programs?",
  "How many clinical sites are in Kansas?",
  "Where are Native American reserves in the Southwest?",
];

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

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-secret": process.env.NEXT_PUBLIC_API_SECRET || "",
        },
        body: JSON.stringify({ message: textToSend }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.data.summary,
          sql: result.data.sql,
          mapPoints: result.data.mapPoints,
          rowCount: result.data.rowCount,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Notify parent about query results for map highlighting and table display
        if (onQueryResult) {
          onQueryResult({
            mapPoints: result.data.mapPoints || [],
            tableResults: result.data.tableResults || [],
          });
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

  const handleStarterClick = (question: string) => {
    sendMessage(question);
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
              <div className="text-center py-4">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-gold/60" />
                <p className="text-sm text-white mb-1">Ask me about clinical placements!</p>
                <p className="text-xs text-text-muted mb-4">
                  I can search across 81,000+ sites, schools, and more.
                </p>

                {/* Starter questions */}
                <div className="space-y-2">
                  <p className="text-xs text-text-muted uppercase tracking-wider">Try asking:</p>
                  {STARTER_QUESTIONS.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleStarterClick(question)}
                      className="block w-full text-left text-sm bg-green-light/20 hover:bg-green-light/30 border border-gold/10 hover:border-gold/30 rounded-lg px-3 py-2 text-white/90 transition-colors"
                    >
                      &quot;{question}&quot;
                    </button>
                  ))}
                </div>
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

                  {/* Show row count for assistant messages */}
                  {message.role === "assistant" && message.rowCount !== undefined && message.rowCount !== null && (
                    <p className="text-xs mt-2 text-gold/80">
                      Found {message.rowCount} result{message.rowCount !== 1 ? "s" : ""}
                      {message.mapPoints && message.mapPoints.length > 0 && (
                        <span> • {message.mapPoints.length} shown on map</span>
                      )}
                    </p>
                  )}

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
                onClick={() => sendMessage()}
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

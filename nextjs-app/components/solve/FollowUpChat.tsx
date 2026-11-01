"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { apiClient, ClientApiError } from "@/lib/api/client";
import { renderMath } from "@/lib/katex";
import type { SolveMessage } from "@/types/solve";

function renderContentWithMath(content: string): ReactNode[] {
  const parts = content.split(/(\$[^$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      return <span key={i} dangerouslySetInnerHTML={renderMath(part.slice(1, -1))} />;
    }
    return <span key={i}>{part}</span>;
  });
}

export function FollowUpChat({
  solveId,
  initialMessages,
  disabled,
}: {
  solveId: string;
  initialMessages: SolveMessage[];
  disabled?: boolean;
}) {
  const [messages, setMessages] = useState<SolveMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setError(null);
    const pendingId = `pending-${Date.now()}`;
    const optimisticMessage: SolveMessage = {
      id: pendingId,
      solve_id: solveId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setSending(true);

    try {
      const agentMessage = await apiClient.post<SolveMessage>(
        `/api/solves/${solveId}/messages`,
        { content }
      );
      setMessages((prev) => [...prev, agentMessage]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== pendingId));
      setInput(content);
      setError(
        err instanceof ClientApiError ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-10 border-t border-grid-line pt-8">
      <h2 className="font-display font-bold text-lg mb-4">Ask a follow-up</h2>

      <div className="space-y-3 mb-4">
        {messages.length === 0 && (
          <p className="font-body text-sm text-ink/50">
            Confused about a step? Ask &ldquo;why?&rdquo; and we&apos;ll explain.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 font-body text-sm leading-relaxed ${
                message.role === "user"
                  ? "bg-study-teal text-paper"
                  : "bg-white/70 border border-grid-line text-ink"
              }`}
            >
              {renderContentWithMath(message.content)}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-2.5 bg-white/70 border border-grid-line flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-study-teal typing-dot" />
              <span
                className="h-1.5 w-1.5 rounded-full bg-study-teal typing-dot"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="h-1.5 w-1.5 rounded-full bg-study-teal typing-dot"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="font-body text-sm text-red-pen mb-3" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled || sending}
          maxLength={2000}
          placeholder="Ask about any step…"
          aria-label="Ask a follow-up question"
          className="input-field flex-1"
        />
        <button
          type="submit"
          disabled={disabled || sending || !input.trim()}
          className="btn-secondary px-5"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

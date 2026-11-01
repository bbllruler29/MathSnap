"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { renderMath } from "@/lib/katex";
import { EmptyState } from "@/components/shared/EmptyState";
import type { SolveSummary } from "@/types/solve";

interface SolvesPage {
  items: SolveSummary[];
  next_cursor: string | null;
}

function groupByTopic(items: SolveSummary[]): Map<string, SolveSummary[]> {
  const groups = new Map<string, SolveSummary[]>();
  for (const item of items) {
    const key = item.topic ?? "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

export function SolveList({
  topic,
  from,
  to,
}: {
  topic: string | null;
  from?: string;
  to?: string;
}) {
  const [items, setItems] = useState<SolveSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(
    async (nextCursor: string | null, replace: boolean) => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams();
        if (topic) params.set("topic", topic);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (nextCursor) params.set("cursor", nextCursor);
        const page = await apiClient.get<SolvesPage>(`/api/solves?${params.toString()}`);
        setItems((prev) => (replace ? page.items : [...prev, ...page.items]));
        setCursor(page.next_cursor);
        setHasMore(Boolean(page.next_cursor));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [topic, from, to]
  );

  useEffect(() => {
    loadPage(null, true);
  }, [loadPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loading) {
        loadPage(cursor, false);
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, hasMore, loading, loadPage]);

  if (loading && items.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4 h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!loading && items.length === 0 && !error) {
    const isFiltered = Boolean(topic || from || to);
    return (
      <EmptyState
        title={isFiltered ? "No solves match this filter." : "No solves yet — snap your first problem."}
        action={
          <Link href="/app" className="btn-primary">
            {isFiltered ? "Back to capture" : "Snap a problem"}
          </Link>
        }
      />
    );
  }

  const groups = groupByTopic(items);

  return (
    <div>
      {Array.from(groups.entries()).map(([groupTopic, groupItems]) => (
        <div key={groupTopic} className="mb-6">
          <h3 className="font-mono text-xs uppercase tracking-widest text-ink/50 mb-2">
            {groupTopic.replace(/_/g, " ")}
          </h3>
          <div className="space-y-2">
            {groupItems.map((item) => (
              <Link
                key={item.id}
                href={`/app/solve/${item.id}`}
                className="card p-4 flex items-center justify-between hover:border-study-teal transition-colors"
              >
                <div className="flex items-center gap-3">
                  {item.final_answer && (
                    <span
                      className="font-display font-bold text-sm"
                      dangerouslySetInnerHTML={renderMath(item.final_answer)}
                    />
                  )}
                  {item.verification_status === "failed" && (
                    <span className="badge-warning">Under review</span>
                  )}
                </div>
                <span className="font-mono text-xs text-ink/40">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {error && (
        <div className="card p-4 text-center">
          <p className="font-body text-sm text-red-pen mb-2">Couldn&apos;t load more.</p>
          <button type="button" onClick={() => loadPage(cursor, false)} className="btn-ghost">
            Retry
          </button>
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="h-4" />}
    </div>
  );
}

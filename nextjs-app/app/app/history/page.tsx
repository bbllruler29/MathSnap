"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { TopicFilter } from "@/components/history/TopicFilter";
import { SolveList } from "@/components/history/SolveList";

export default function HistoryPage() {
  const [topics, setTopics] = useState<string[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    apiClient
      .get<{ topics: string[] }>("/api/solves/topics")
      .then((res) => setTopics(res.topics))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-reading mx-auto px-6 py-10">
      <h1 className="font-display font-bold text-2xl mb-6">History</h1>

      <TopicFilter topics={topics} active={activeTopic} onChange={setActiveTopic} />

      <button
        type="button"
        onClick={() => setShowDateFilter((v) => !v)}
        className="font-body text-sm text-study-teal mb-4"
      >
        {showDateFilter ? "Hide date range" : "Filter by date"}
      </button>

      {showDateFilter && (
        <div className="flex gap-3 mb-6">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input-field"
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input-field"
            aria-label="To date"
          />
        </div>
      )}

      <SolveList topic={activeTopic} from={from || undefined} to={to || undefined} />
    </div>
  );
}

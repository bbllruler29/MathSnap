"use client";

export function TopicFilter({
  topics,
  active,
  onChange,
}: {
  topics: string[];
  active: string | null;
  onChange: (topic: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`badge ${active === null ? "bg-study-teal text-paper" : "bg-grid-line/60 text-ink/60"}`}
      >
        All
      </button>
      {topics.map((topic) => (
        <button
          key={topic}
          type="button"
          onClick={() => onChange(topic)}
          className={`badge ${active === topic ? "bg-study-teal text-paper" : "bg-grid-line/60 text-ink/60"}`}
        >
          {topic.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}

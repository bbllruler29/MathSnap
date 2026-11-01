import type { ReactNode } from "react";

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <p className="font-body text-sm text-ink/70 mb-4">{title}</p>
      {action}
    </div>
  );
}

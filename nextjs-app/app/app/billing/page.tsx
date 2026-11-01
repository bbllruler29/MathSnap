"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { apiClient, ClientApiError } from "@/lib/api/client";

export default function BillingPage() {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "annual" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) setNotice("You're upgraded! Unlimited solves are now unlocked.");
    if (params.get("canceled")) setNotice("Checkout was canceled — you can upgrade anytime.");
  }, []);

  async function upgrade(plan: "monthly" | "annual") {
    setLoadingPlan(plan);
    setError(null);
    try {
      const { checkout_url } = await apiClient.post<{ checkout_url: string }>(
        "/api/billing/checkout",
        { plan }
      );
      window.location.href = checkout_url;
    } catch (err) {
      setError(
        err instanceof ClientApiError ? err.message : "Something went wrong. Please try again."
      );
      setLoadingPlan(null);
    }
  }

  return (
    <div className="max-w-reading mx-auto px-6 py-10">
      <h1 className="font-display font-bold text-2xl mb-1">Plans</h1>
      <p className="font-body text-sm text-ink/60 mb-8">
        Unlimited solving, every topic, deeper follow-ups.
      </p>

      {notice && <p className="font-body text-sm text-study-teal mb-6">{notice}</p>}
      {error && <p className="font-body text-sm text-red-pen mb-6">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="card p-6">
          <p className="eyebrow mb-2">Free</p>
          <p className="font-display font-bold text-3xl mb-4">$0</p>
          <ul className="space-y-2 mb-6 font-body text-sm text-ink/70">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-study-teal shrink-0" /> 5 solves a day
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-study-teal shrink-0" /> Full step-by-step explanations
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-study-teal shrink-0" /> Core topics
            </li>
          </ul>
          <button type="button" disabled className="btn-ghost w-full">
            Current plan
          </button>
        </div>

        <div className="card p-6 border-highlighter">
          <p className="eyebrow mb-2">Unlimited</p>
          <p className="font-display font-bold text-3xl mb-4">
            $9.99<span className="text-base font-body text-ink/50">/mo</span>
          </p>
          <ul className="space-y-2 mb-6 font-body text-sm text-ink/70">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-study-teal shrink-0" /> Unlimited solves
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-study-teal shrink-0" /> Calculus and beyond
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-study-teal shrink-0" /> Unlimited follow-up depth
            </li>
          </ul>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => upgrade("monthly")}
              disabled={loadingPlan !== null}
              className="btn-primary w-full"
            >
              {loadingPlan === "monthly" ? "Redirecting…" : "Upgrade monthly — $9.99/mo"}
            </button>
            <button
              type="button"
              onClick={() => upgrade("annual")}
              disabled={loadingPlan !== null}
              className="btn-ghost w-full"
            >
              {loadingPlan === "annual" ? "Redirecting…" : "Upgrade yearly — $59.99/yr"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

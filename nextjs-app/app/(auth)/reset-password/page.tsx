"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"checking" | "request" | "update">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setMode(data.session ? "update" : "request");
    });
  }, []);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (resetError) {
      setError("We couldn't send a reset link. Please try again.");
      return;
    }
    setMessage("If that email has an account, a reset link is on its way.");
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError("We couldn't update your password. Please try again.");
      return;
    }
    router.push("/app");
  }

  if (mode === "checking") {
    return <p className="font-body text-sm text-ink/60">Loading…</p>;
  }

  if (mode === "update") {
    return (
      <div>
        <h1 className="font-display font-bold text-2xl mb-1">Set a new password</h1>
        <p className="font-body text-sm text-ink/60 mb-6">
          Choose a new password for your account.
        </p>
        <form onSubmit={handleUpdate} className="space-y-4">
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="New password"
          />
          {error && <p className="font-body text-sm text-red-pen">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-1">Reset your password</h1>
      <p className="font-body text-sm text-ink/60 mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <form onSubmit={handleRequest} className="space-y-4">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          placeholder="you@example.com"
        />
        {error && <p className="font-body text-sm text-red-pen">{error}</p>}
        {message && <p className="font-body text-sm text-study-teal">{message}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </div>
  );
}

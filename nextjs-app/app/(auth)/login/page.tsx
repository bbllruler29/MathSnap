"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validation/schemas";
import { apiClient, ClientApiError } from "@/lib/api/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Please check your details and try again.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/api/auth/login", result.data);
      const redirect = searchParams.get("redirect");
      router.push(redirect && redirect.startsWith("/") ? redirect : "/app");
      router.refresh();
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof ClientApiError ? err.message : "Something went wrong. Please try again."
      );
    }
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-1">Welcome back</h1>
      <p className="font-body text-sm text-ink/60 mb-6">Log in to keep solving.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="font-body text-sm font-medium block mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="font-body text-sm font-medium">
              Password
            </label>
            <Link href="/reset-password" className="font-body text-xs text-study-teal">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
        </div>

        {error && <p className="font-body text-sm text-red-pen">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-grid-line" />
        <span className="font-mono text-[11px] text-ink/40 uppercase">or</span>
        <div className="flex-1 h-px bg-grid-line" />
      </div>

      <button type="button" onClick={handleGoogleLogin} className="btn-ghost w-full">
        Continue with Google
      </button>

      <p className="font-body text-sm text-ink/60 text-center mt-6">
        New to MathSnap?{" "}
        <Link href="/signup" className="text-study-teal font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

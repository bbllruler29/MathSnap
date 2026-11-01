"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validation/schemas";
import { apiClient, ClientApiError } from "@/lib/api/client";

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 90 }, (_, i) => CURRENT_YEAR - 10 - i);

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [underage, setUnderage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setUnderage(false);

    const parsedBirthYear = Number(birthYear);
    const result = signupSchema.safeParse({
      email,
      password,
      birth_year: parsedBirthYear,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Please check your details and try again.");
      return;
    }

    const age = CURRENT_YEAR - parsedBirthYear;
    if (age < 13) {
      setUnderage(true);
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/api/auth/signup", result.data);
      router.push("/verify-email");
    } catch (err) {
      setError(
        err instanceof ClientApiError ? err.message : "We couldn't create your account. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (underage) {
    return (
      <div>
        <h1 className="font-display font-bold text-2xl mb-3">Almost there</h1>
        <p className="font-body text-sm text-ink/70 leading-relaxed mb-6">
          MathSnap requires a parent or guardian to create the account for
          users under 13. Ask a parent or guardian to sign up using their own
          email and birth year — you can use MathSnap together from their
          account.
        </p>
        <button type="button" onClick={() => setUnderage(false)} className="btn-ghost w-full">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-1">Create your account</h1>
      <p className="font-body text-sm text-ink/60 mb-6">
        Free: 5 solves a day, no credit card.
      </p>

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
          <label htmlFor="password" className="font-body text-sm font-medium block mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="birth-year" className="font-body text-sm font-medium block mb-1.5">
            Birth year
          </label>
          <select
            id="birth-year"
            required
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className="input-field"
          >
            <option value="" disabled>
              Select year
            </option>
            {BIRTH_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="font-body text-sm text-red-pen">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-grid-line" />
        <span className="font-mono text-[11px] text-ink/40 uppercase">or</span>
        <div className="flex-1 h-px bg-grid-line" />
      </div>

      <button type="button" onClick={handleGoogleSignup} className="btn-ghost w-full">
        Continue with Google
      </button>

      <p className="font-body text-sm text-ink/60 text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-study-teal font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}

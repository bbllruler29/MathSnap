"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { birthYearSchema } from "@/lib/validation/schemas";

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 90 }, (_, i) => CURRENT_YEAR - 10 - i);

export default function BirthYearOnboardingPage() {
  const router = useRouter();
  const [birthYear, setBirthYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [underage, setUnderage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setUnderage(false);

    const parsedBirthYear = Number(birthYear);
    const result = birthYearSchema.safeParse({ birth_year: parsedBirthYear });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Please select a valid year.");
      return;
    }

    if (CURRENT_YEAR - parsedBirthYear < 13) {
      setUnderage(true);
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ birth_year: parsedBirthYear })
      .eq("id", data.user.id);

    setSubmitting(false);

    if (updateError) {
      setError(`We couldn't save that: ${updateError.message}`);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="flex items-center gap-2 mb-8">
        <Camera className="h-5 w-5 text-study-teal" strokeWidth={2.25} />
        <span className="font-display font-bold text-xl">MathSnap</span>
      </div>
      <div className="w-full max-w-sm card p-8">
        {underage ? (
          <div>
            <h1 className="font-display font-bold text-2xl mb-3">One more thing</h1>
            <p className="font-body text-sm text-ink/70 leading-relaxed">
              MathSnap requires a parent or guardian to manage the account
              for users under 13. Please have a parent or guardian sign in
              with their own account instead.
            </p>
          </div>
        ) : (
          <div>
            <h1 className="font-display font-bold text-2xl mb-1">Almost ready</h1>
            <p className="font-body text-sm text-ink/60 mb-6">
              Just need your birth year to finish setting up.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <select
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
              {error && <p className="font-body text-sm text-red-pen">{error}</p>}
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? "Saving…" : "Continue"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

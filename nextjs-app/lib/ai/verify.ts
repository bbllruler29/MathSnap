import { logAiCall } from "./logging";
import { SYMBOLICALLY_VERIFIABLE_TOPICS, type Topic, type VerificationStatus } from "@/types/solve";

interface VerifyServiceResponse {
  verifiable: boolean;
  matches: boolean | null;
}

export async function verifySolution(
  topic: string,
  parsedProblem: string,
  candidateAnswer: string,
  context: { userId: string; solveId?: string }
): Promise<VerificationStatus> {
  if (!SYMBOLICALLY_VERIFIABLE_TOPICS.includes(topic as Topic)) {
    return "unverified";
  }

  const serviceUrl = process.env.SYMPY_VERIFY_SERVICE_URL;
  const serviceToken = process.env.SYMPY_VERIFY_SERVICE_TOKEN;

  if (!serviceUrl) {
    // No verification service configured (e.g. local dev) — a quality
    // gate, not a hard dependency, so we degrade to unverified rather
    // than failing the whole solve.
    return "unverified";
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${serviceUrl}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceToken}`,
      },
      body: JSON.stringify({
        topic,
        parsed_problem: parsedProblem,
        candidate_answer: candidateAnswer,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Verification service responded with ${response.status}`);
    }

    const result: VerifyServiceResponse = await response.json();
    logAiCall({
      user_id: context.userId,
      solve_id: context.solveId,
      step: "verify",
      latency_ms: Date.now() - startedAt,
      success: true,
    });

    if (!result.verifiable) return "unverified";
    return result.matches ? "verified" : "failed";
  } catch (err) {
    console.warn("Symbolic verification unreachable, treating as unverified:", err);
    logAiCall({
      user_id: context.userId,
      solve_id: context.solveId,
      step: "verify",
      latency_ms: Date.now() - startedAt,
      success: false,
    });
    return "unverified";
  } finally {
    clearTimeout(timeoutId);
  }
}

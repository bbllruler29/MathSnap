interface AiCallLog {
  user_id: string;
  solve_id?: string;
  step: "vision_parse" | "solve_agent" | "verify" | "follow_up";
  latency_ms: number;
  success: boolean;
}

/**
 * No problem content or PII is ever logged here — only identifiers and
 * timing, per docs/specs/rate-limiting-and-conventions.md §6.
 */
export function logAiCall(log: AiCallLog) {
  console.log(JSON.stringify({ type: "ai_call", ...log }));
}

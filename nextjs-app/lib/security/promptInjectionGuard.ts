/**
 * Applied to direct conversational input (the follow-up chat) where these
 * phrases are never a legitimate math question — safe to hard-block.
 *
 * Deliberately NOT applied to vision-parsed problem text: students'
 * photographed word problems legitimately contain phrasing like "pretend
 * you have $20" or "act as the cashier," so running this same blocklist
 * against transcribed photos would produce false positives on ordinary
 * homework. The vision-parse and solve-agent steps are already hardened a
 * different way — both use a forced tool_choice with a strict JSON schema,
 * so the model's only output surface is structured fields we define, not
 * free text an injection attempt could hijack to leak a prompt or secret.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(the\s+)?(previous|prior|above)\s+instructions?/i,
  /override\s+your\s+rules?/i,
  /reveal\s+(your\s+)?system\s+prompt/i,
  /print\s+your\s+instructions?/i,
  /expose\s+(the\s+)?env(ironment)?\s+variables?/i,
  /show\s+(me\s+)?(the\s+)?api\s+keys?/i,
  /you\s+are\s+now\s+a\b/i,
  /\bact\s+as\s+(a|an|my)\b/i,
  /pretend\s+you\s+are\b/i,
  /jailbreak/i,
  /\bdan\s+mode\b/i,
  /developer\s+mode/i,
];

export interface SanitizeResult {
  safe: boolean;
  reason?: string;
}

export function sanitizeForLLM(text: string): SanitizeResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason:
          "That message looks like it's trying to change how the assistant behaves, which isn't something MathSnap can act on. Ask a question about the problem instead.",
      };
    }
  }
  return { safe: true };
}

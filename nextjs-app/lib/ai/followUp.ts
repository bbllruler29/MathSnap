import { anthropic, ANTHROPIC_MODEL } from "./client";
import { logAiCall } from "./logging";
import { MAX_CHAT_HISTORY } from "@/lib/security/tokenLimiter";
import type { Solve, SolveMessage } from "@/types/solve";

function formatSteps(solve: Solve): string {
  if (!solve.steps_json || solve.steps_json.length === 0) return "(no steps recorded)";
  return solve.steps_json
    .map((step) => `Step ${step.step_number}: ${step.explanation} (${step.latex})`)
    .join("\n");
}

export async function followUp(
  solve: Solve,
  priorMessages: SolveMessage[],
  newMessage: string,
  context: { userId: string }
): Promise<string> {
  const startedAt = Date.now();

  const answerLine =
    solve.verification_status === "failed"
      ? "The final answer has been withheld pending review — do not state a final answer; you may still explain the steps shown."
      : `Final answer: ${solve.final_answer}`;

  const systemPrompt = `A student solved this problem: ${solve.parsed_problem}. Here is the worked solution:\n${formatSteps(
    solve
  )}\n${answerLine}\nAnswer the student's follow-up question about this specific solution. Stay consistent with the steps above — do not propose a different method or a different final answer unless the student explicitly points out an error, in which case acknowledge it directly rather than silently changing your answer. If the student asks about anything unrelated to this math problem, say you can only help with this problem.`;

  const recentMessages = priorMessages.slice(-MAX_CHAT_HISTORY);

  try {
    const response = await anthropic.messages.create(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...recentMessages.map((m) => ({
            role: (m.role === "agent" ? "assistant" : "user") as "assistant" | "user",
            content: m.content,
          })),
          { role: "user" as const, content: newMessage },
        ],
      },
      { timeout: 20000 }
    );

    const textBlock = response.content.find((block) => block.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    logAiCall({
      user_id: context.userId,
      solve_id: solve.id,
      step: "follow_up",
      latency_ms: Date.now() - startedAt,
      success: true,
    });
    return text;
  } catch (err) {
    logAiCall({
      user_id: context.userId,
      solve_id: solve.id,
      step: "follow_up",
      latency_ms: Date.now() - startedAt,
      success: false,
    });
    throw err;
  }
}

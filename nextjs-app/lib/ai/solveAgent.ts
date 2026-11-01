import { anthropic, ANTHROPIC_MODEL } from "./client";
import { logAiCall } from "./logging";
import type { SolveStep } from "@/types/solve";

export interface SolveAgentResult {
  topic: string;
  steps: SolveStep[];
  final_answer: string;
}

const TOOL_NAME = "report_solution";

export async function solveAgent(
  parsedProblem: string,
  topicGuess: string,
  context: { userId: string }
): Promise<SolveAgentResult> {
  const startedAt = Date.now();

  try {
    const response = await anthropic.messages.create(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        system:
          "You are a math tutor. Solve the given problem step by step. Every step must be independently justified in plain language — never write filler like 'do the rest the same way.' Include at least 2 steps for any non-trivial problem. The final step's latex must equal the final answer, and the final answer must also be reported separately. Report your result using the report_solution tool.",
        messages: [
          {
            role: "user",
            content: `Problem (topic guess: ${topicGuess}): ${parsedProblem}`,
          },
        ],
        tools: [
          {
            name: TOOL_NAME,
            description: "Report the step-by-step solution to the math problem.",
            input_schema: {
              type: "object",
              required: ["topic", "steps", "final_answer"],
              properties: {
                topic: { type: "string" },
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["step_number", "explanation", "latex"],
                    properties: {
                      step_number: { type: "integer" },
                      explanation: {
                        type: "string",
                        description: "Plain-language justification for this step",
                      },
                      latex: {
                        type: "string",
                        description: "The math expression for this step in LaTeX",
                      },
                    },
                  },
                },
                final_answer: { type: "string" },
              },
            },
          },
        ],
        tool_choice: { type: "tool", name: TOOL_NAME },
      },
      { timeout: 15000 }
    );

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Solve agent: model did not return a tool_use block");
    }

    const result = toolUse.input as SolveAgentResult;
    logAiCall({
      user_id: context.userId,
      step: "solve_agent",
      latency_ms: Date.now() - startedAt,
      success: true,
    });
    return result;
  } catch (err) {
    logAiCall({
      user_id: context.userId,
      step: "solve_agent",
      latency_ms: Date.now() - startedAt,
      success: false,
    });
    throw err;
  }
}

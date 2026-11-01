import { anthropic, ANTHROPIC_MODEL } from "./client";
import { logAiCall } from "./logging";
import type { Topic } from "@/types/solve";

export interface VisionParseResult {
  is_math_problem: boolean;
  parsed_problem: string;
  topic_guess: Topic;
  confidence: number;
}

const TOOL_NAME = "report_parsed_problem";

export async function visionParse(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png",
  context: { userId: string }
): Promise<VisionParseResult> {
  const startedAt = Date.now();

  try {
    const response = await anthropic.messages.create(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system:
          "You transcribe math problems from photos exactly as written. Do not solve the problem. Do not guess illegible parts — if any part of the problem is unreadable, lower your confidence score instead of inventing content. Report your result using the report_parsed_problem tool.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageBase64 },
              },
              {
                type: "text",
                text: "Transcribe the math problem in this photo.",
              },
            ],
          },
        ],
        tools: [
          {
            name: TOOL_NAME,
            description: "Report the transcribed math problem from the photo.",
            input_schema: {
              type: "object",
              required: ["is_math_problem", "parsed_problem", "topic_guess", "confidence"],
              properties: {
                is_math_problem: { type: "boolean" },
                parsed_problem: {
                  type: "string",
                  description: "The transcribed problem in plain text / LaTeX-style notation",
                },
                topic_guess: {
                  type: "string",
                  enum: [
                    "arithmetic",
                    "algebra",
                    "geometry",
                    "trigonometry",
                    "basic_calculus",
                    "calculus",
                    "statistics",
                    "other",
                  ],
                },
                confidence: { type: "number", minimum: 0, maximum: 1 },
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
      throw new Error("Vision parse: model did not return a tool_use block");
    }

    const result = toolUse.input as VisionParseResult;
    logAiCall({
      user_id: context.userId,
      step: "vision_parse",
      latency_ms: Date.now() - startedAt,
      success: true,
    });
    return result;
  } catch (err) {
    logAiCall({
      user_id: context.userId,
      step: "vision_parse",
      latency_ms: Date.now() - startedAt,
      success: false,
    });
    throw err;
  }
}

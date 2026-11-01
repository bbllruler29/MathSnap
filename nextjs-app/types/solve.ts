export type VerificationStatus = "pending" | "verified" | "unverified" | "failed";
export type MessageRole = "user" | "agent";
export type FlagStatus = "open" | "resolved" | "escalated";

export type Topic =
  | "arithmetic"
  | "algebra"
  | "geometry"
  | "trigonometry"
  | "basic_calculus"
  | "calculus"
  | "statistics"
  | "other";

export const SYMBOLICALLY_VERIFIABLE_TOPICS: readonly Topic[] = [
  "arithmetic",
  "algebra",
  "basic_calculus",
];

export interface SolveStep {
  step_number: number;
  explanation: string;
  latex: string;
}

export interface Solve {
  id: string;
  user_id: string;
  image_path: string;
  parsed_problem: string | null;
  topic: string | null;
  steps_json: SolveStep[] | null;
  final_answer: string | null;
  confidence_score: number | null;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface SolveSummary {
  id: string;
  topic: string | null;
  final_answer: string | null;
  confidence_score: number | null;
  verification_status: VerificationStatus;
  created_at: string;
}

export interface SolveMessage {
  id: string;
  solve_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface SolveDetail extends Solve {
  messages: SolveMessage[];
}

export interface FlaggedSolve {
  id: string;
  solve_id: string;
  flagged_by: string;
  reason: string | null;
  status: FlagStatus;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface FlaggedSolveWithDetail extends FlaggedSolve {
  solve: Solve;
}

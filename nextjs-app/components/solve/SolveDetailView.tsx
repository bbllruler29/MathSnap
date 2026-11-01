"use client";

import { StepRenderer } from "@/components/solve/StepRenderer";
import { FlagButton } from "@/components/solve/FlagButton";
import { FollowUpChat } from "@/components/solve/FollowUpChat";
import type { SolveMessage, SolveStep, VerificationStatus } from "@/types/solve";

interface SolveDetailData {
  id: string;
  parsed_problem: string | null;
  topic: string | null;
  steps: SolveStep[];
  final_answer: string | null;
  confidence_score: number | null;
  verification_status: VerificationStatus;
}

export function SolveDetailView({
  solve,
  initialMessages,
}: {
  solve: SolveDetailData;
  initialMessages: SolveMessage[];
}) {
  return (
    <div className="max-w-reading mx-auto px-6 py-10">
      {solve.topic && <p className="eyebrow mb-4">{solve.topic.replace(/_/g, " ")}</p>}

      <StepRenderer
        steps={solve.steps}
        finalAnswer={solve.final_answer}
        verificationStatus={solve.verification_status}
      />

      <FlagButton solveId={solve.id} />

      <FollowUpChat solveId={solve.id} initialMessages={initialMessages} />
    </div>
  );
}

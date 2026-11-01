import { renderMath } from "@/lib/katex";
import type { SolveStep, VerificationStatus } from "@/types/solve";

function BoxedAnswer({ tex }: { tex: string }) {
  return (
    <span className="boxed-answer">
      <span
        className="relative z-10 font-display font-bold text-ink text-lg"
        dangerouslySetInnerHTML={renderMath(tex)}
      />
      <span className="absolute -z-0 border-[2.5px] border-highlighter rounded-[6px_10px_7px_9px] rotate-[-0.4deg] inset-[-6px_-10px]" />
    </span>
  );
}

export function StepRenderer({
  steps,
  finalAnswer,
  verificationStatus,
}: {
  steps: SolveStep[];
  finalAnswer: string | null;
  verificationStatus: VerificationStatus;
}) {
  return (
    <div>
      {verificationStatus === "unverified" && (
        <p className="badge-neutral mb-5 w-fit">AI-generated, not independently checked</p>
      )}
      {verificationStatus === "failed" && (
        <p className="badge-warning mb-5 w-fit">We&apos;re double-checking this one</p>
      )}

      {steps.map((step, index) => {
        const isLastWithAnswer = index === steps.length - 1 && Boolean(finalAnswer);
        return (
          <div key={step.step_number} className="step-row">
            <span className={`step-badge ${isLastWithAnswer ? "step-badge-final" : ""}`}>
              {step.step_number}
            </span>
            <div>
              <p className="font-body text-base text-ink/70 mb-1.5 leading-relaxed">
                {step.explanation}
              </p>
              <span
                className="font-body text-lg"
                dangerouslySetInnerHTML={renderMath(step.latex)}
              />
            </div>
          </div>
        );
      })}

      {finalAnswer ? (
        <div className="pt-1">
          <p className="font-body text-sm text-ink/70 mb-1.5">Final answer</p>
          <BoxedAnswer tex={finalAnswer} />
        </div>
      ) : verificationStatus === "failed" ? (
        <p className="font-body text-sm text-ink/60 italic">
          Final answer withheld while we double-check it.
        </p>
      ) : null}
    </div>
  );
}

import { Camera, ListChecks, MessageCircleQuestion, BookOpen } from "lucide-react";
import { renderMath } from "@/lib/katex";

function BoxedAnswer({ tex }: { tex: string }) {
  return (
    <span className="boxed-answer">
      <span
        className="relative z-10 font-display font-bold text-ink"
        dangerouslySetInnerHTML={renderMath(tex)}
      />
      <span className="reveal-box absolute -z-0 border-[2.5px] border-highlighter rounded-[6px_10px_7px_9px] rotate-[-0.6deg] inset-[-8px_-12px]" />
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-study-teal" strokeWidth={2.25} />
          <span className="font-display font-bold text-xl">MathSnap</span>
        </div>
        <nav className="flex items-center gap-4">
          <a
            href="#how-it-works"
            className="font-body text-sm text-ink/70 hover:text-ink transition-colors hidden sm:inline"
          >
            How it works
          </a>
          <a
            href="/login"
            className="font-body text-sm text-ink/70 hover:text-ink transition-colors"
          >
            Log in
          </a>
          <a href="/signup" className="btn-primary text-sm py-2.5 px-5">
            Try it free
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-14 md:py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="eyebrow mb-4">Homework help that shows its work</p>
          <h1 className="font-display font-bold text-4xl md:text-5xl leading-[1.08] tracking-[-0.01em] mb-5">
            Stuck on a problem?
            <br />
            Snap it.
          </h1>
          <p className="font-body text-lg text-ink/70 max-w-md mb-8 leading-relaxed">
            MathSnap reads your photo, solves it step by step, and sticks
            around to answer &ldquo;wait, why?&rdquo; — because an answer you
            don&apos;t understand doesn&apos;t help you Tuesday.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/signup" className="btn-primary">
              Get started free
            </a>
            <a href="#how-it-works" className="btn-ghost">
              See how it works
            </a>
          </div>
        </div>

        {/* Live demo card */}
        <div className="card p-6 md:p-7">
          <p className="eyebrow mb-5">Your photo → the solution</p>

          <div className="w-fit bg-paper border border-grid-line rounded-lg px-4 py-3 rotate-[-1.5deg] shadow-sm mb-6">
            <span
              className="font-body italic text-ink/70 text-lg"
              dangerouslySetInnerHTML={renderMath("2x + 5 = 17")}
            />
          </div>

          <div>
            <div className="step-row reveal-step">
              <span className="step-badge">1</span>
              <div>
                <p className="font-body text-sm text-ink/70 mb-1">
                  Subtract 5 from both sides
                </p>
                <span
                  className="font-body text-base"
                  dangerouslySetInnerHTML={renderMath("2x = 12")}
                />
              </div>
            </div>
            <div className="step-row reveal-step">
              <span className="step-badge">2</span>
              <div>
                <p className="font-body text-sm text-ink/70 mb-1">
                  Divide both sides by 2
                </p>
                <span
                  className="font-body text-base"
                  dangerouslySetInnerHTML={renderMath("x = 6")}
                />
              </div>
            </div>
            <div className="step-row reveal-step">
              <span className="step-badge step-badge-final">3</span>
              <div>
                <p className="font-body text-sm text-ink/70 mb-1">
                  Final answer
                </p>
                <BoxedAnswer tex="x = 6" />
              </div>
            </div>
          </div>

          <p className="font-mono text-[11px] text-ink/50 flex items-center gap-1.5 mt-2">
            <MessageCircleQuestion className="h-3.5 w-3.5" />
            Ask &ldquo;why?&rdquo; on any step, anytime
          </p>
        </div>
      </section>

      {/* Why it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="font-display font-bold text-2xl md:text-3xl mb-10 max-w-lg">
          Not just an answer. The whole explanation.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-6">
            <ListChecks className="h-6 w-6 text-study-teal mb-4" strokeWidth={2} />
            <h3 className="font-display font-bold text-lg mb-2">
              See every step
            </h3>
            <p className="font-body text-sm text-ink/70 leading-relaxed">
              No black-box answers. Every step is explained in plain
              language, not just &ldquo;do this next.&rdquo;
            </p>
          </div>
          <div className="card p-6">
            <MessageCircleQuestion
              className="h-6 w-6 text-study-teal mb-4"
              strokeWidth={2}
            />
            <h3 className="font-display font-bold text-lg mb-2">
              Ask &ldquo;why?&rdquo; anytime
            </h3>
            <p className="font-body text-sm text-ink/70 leading-relaxed">
              Confused about step 2? Ask — MathSnap explains that exact
              step without changing the answer underneath you.
            </p>
          </div>
          <div className="card p-6">
            <BookOpen className="h-6 w-6 text-study-teal mb-4" strokeWidth={2} />
            <h3 className="font-display font-bold text-lg mb-2">
              Learn, don&apos;t just copy
            </h3>
            <p className="font-body text-sm text-ink/70 leading-relaxed">
              Five free solves a day, every one fully explained — so you
              walk into the next problem a little more ready.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="get-started" className="max-w-5xl mx-auto px-6 py-16">
        <div className="card p-10 text-center border-highlighter">
          <h2 className="font-display font-bold text-2xl md:text-3xl mb-3">
            Next time you&apos;re stuck, snap it.
          </h2>
          <a href="/signup" className="btn-primary mt-4">
            Get started free
          </a>
          <p className="font-mono text-[11px] text-ink/50 mt-4">
            Free: 5 solves a day. No credit card.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-8 border-t border-grid-line flex items-center justify-between text-sm text-ink/60">
        <span>© 2026 MathSnap</span>
        <nav className="flex items-center gap-4">
          <a href="#" className="hover:text-ink transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-ink transition-colors">
            Terms
          </a>
        </nav>
      </footer>
    </main>
  );
}

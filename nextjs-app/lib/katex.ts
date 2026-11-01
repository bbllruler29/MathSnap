import katex from "katex";

export function renderMath(tex: string): { __html: string } {
  return {
    __html: katex.renderToString(tex, {
      throwOnError: false,
      // Explicit, not just relying on KaTeX's default: this output is
      // injected via dangerouslySetInnerHTML and some of the source LaTeX
      // (follow-up chat messages) is direct user input. trust:false disables
      // commands like \includegraphics and javascript: hrefs that could
      // otherwise be abused for XSS.
      trust: false,
    }),
  };
}

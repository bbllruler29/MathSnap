"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled UI error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-8 text-center max-w-reading mx-auto my-10">
          <p className="font-body text-sm text-ink/70 mb-4">
            Something went wrong loading this page. Try refreshing.
          </p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary">
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

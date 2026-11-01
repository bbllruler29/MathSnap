import type { Metadata } from "next";
import { Space_Grotesk, Figtree, IBM_Plex_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ToastContainer } from "@/components/shared/Toast";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-figtree",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "MathSnap — Snap a problem. See every step.",
  description:
    "Photograph any math problem and get a clear, step-by-step solution you can actually learn from — plus follow-up help when a step doesn't make sense.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${figtree.variable} ${plexMono.variable}`}
    >
      <body className="bg-paper text-ink font-body antialiased">
        <ErrorBoundary>{children}</ErrorBoundary>
        <ToastContainer />
      </body>
    </html>
  );
}

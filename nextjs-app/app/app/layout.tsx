import Link from "next/link";
import { Camera, History, CreditCard } from "lucide-react";
import { LogoutButton } from "@/components/shared/LogoutButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-grid-line">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-study-teal" strokeWidth={2.25} />
            <span className="font-display font-bold text-lg">MathSnap</span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link
              href="/app"
              className="font-body text-sm text-ink/70 hover:text-ink transition-colors"
            >
              Capture
            </Link>
            <Link
              href="/app/history"
              className="font-body text-sm text-ink/70 hover:text-ink transition-colors flex items-center gap-1.5"
            >
              <History className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">History</span>
            </Link>
            <Link
              href="/app/billing"
              className="font-body text-sm text-ink/70 hover:text-ink transition-colors flex items-center gap-1.5"
            >
              <CreditCard className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">Billing</span>
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

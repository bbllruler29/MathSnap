import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/shared/LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-grid-line">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/admin/review" className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-study-teal" strokeWidth={2.25} />
            <span className="font-display font-bold text-lg">MathSnap Admin</span>
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

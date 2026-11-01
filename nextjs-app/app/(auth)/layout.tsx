import { Camera } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Camera className="h-5 w-5 text-study-teal" strokeWidth={2.25} />
        <span className="font-display font-bold text-xl">MathSnap</span>
      </Link>
      <div className="w-full max-w-sm card p-8">{children}</div>
    </main>
  );
}

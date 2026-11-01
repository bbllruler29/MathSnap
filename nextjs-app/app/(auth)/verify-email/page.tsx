import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="text-center">
      <MailCheck className="h-8 w-8 text-study-teal mx-auto mb-4" strokeWidth={2} />
      <h1 className="font-display font-bold text-2xl mb-2">Check your email</h1>
      <p className="font-body text-sm text-ink/70 leading-relaxed mb-6">
        We sent you a confirmation link. Click it to activate your account,
        then log in below.
      </p>
      <Link href="/login" className="btn-primary w-full">
        Go to login
      </Link>
    </div>
  );
}

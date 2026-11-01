"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { apiClient } from "@/lib/api/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await apiClient.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-1.5 font-body text-sm text-ink/60 hover:text-ink transition-colors"
    >
      <LogOut className="h-4 w-4" strokeWidth={2} />
      <span className="hidden sm:inline">Log out</span>
    </button>
  );
}

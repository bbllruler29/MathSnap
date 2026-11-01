import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      const { data: profile } = await supabase
        .from("users")
        .select("birth_year")
        .eq("id", data.user.id)
        .single();

      if (!profile || profile.birth_year === null) {
        return NextResponse.redirect(`${origin}/onboarding/birth-year`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/app`);
}

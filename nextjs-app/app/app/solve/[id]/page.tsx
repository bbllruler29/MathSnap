import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSolveById, listMessages } from "@/lib/solves/repository";
import { SolveDetailView } from "@/components/solve/SolveDetailView";

export default async function SolveDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const solve = await getSolveById(supabase, params.id, userData.user.id);
  if (!solve) {
    notFound();
  }

  const messages = await listMessages(supabase, solve.id);

  return (
    <SolveDetailView
      solve={{
        id: solve.id,
        parsed_problem: solve.parsed_problem,
        topic: solve.topic,
        steps: solve.steps_json ?? [],
        final_answer: solve.verification_status === "failed" ? null : solve.final_answer,
        confidence_score: solve.confidence_score,
        verification_status: solve.verification_status,
      }}
      initialMessages={messages}
    />
  );
}

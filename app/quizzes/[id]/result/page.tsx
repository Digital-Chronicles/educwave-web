"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";
import supabase from "@/lib/supabaseClient";

export default function QuizResultPage() {
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId");

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);

  useEffect(() => {
    async function loadResult() {
      if (!attemptId) return;

      try {
        const { data, error } = await supabase
          .from("quiz_attempt")
          .select(`
            id,
            score,
            total_marks,
            percentage,
            status,
            submitted_at,
            quiz:quiz_id(
              id,
              title
            ),
            quiz_attempt_answer(
              id,
              selected_answer,
              written_answer,
              is_correct,
              marks_awarded,
              question:question_id(
                id,
                question_text,
                correct_answer,
                explanation
              )
            )
          `)
          .eq("id", attemptId)
          .single();

        if (error) throw error;
        setAttempt(data);
      } catch (error) {
        console.error("Failed to load result:", error);
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [attemptId]);

  if (loading) return <div className="p-6">Loading result...</div>;
  if (!attempt) return <div className="p-6">Result not found.</div>;

  const answers = attempt.quiz_attempt_answer ?? [];
  const correctCount = answers.filter((a: any) => a.is_correct).length;
  const wrongCount = answers.length - correctCount;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1">
          <div className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
            <div className="rounded-2xl border bg-white p-6">
              <h1 className="text-2xl font-bold">{attempt.quiz?.title}</h1>
              <p className="mt-2 text-sm">
                Score: {attempt.score}/{attempt.total_marks} ({attempt.percentage}%)
              </p>
              <p className="text-sm">Correct: {correctCount}</p>
              <p className="text-sm">Wrong: {wrongCount}</p>
            </div>

            {answers.map((item: any, index: number) => (
              <div key={item.id} className="rounded-2xl border bg-white p-6 space-y-2">
                <h2 className="font-semibold">
                  {index + 1}. {item.question?.question_text}
                </h2>
                <p className="text-sm">Your answer: {item.selected_answer || item.written_answer || "No answer"}</p>
                <p className="text-sm">Correct answer: {item.question?.correct_answer}</p>
                <p className="text-sm">Explanation: {item.question?.explanation || "No explanation"}</p>
                <p className="text-sm font-medium">
                  {item.is_correct ? "Correct" : "Wrong"}
                </p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
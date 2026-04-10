"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";
import supabase from "@/lib/supabaseClient";

export default function QuizAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [attemptId, setAttemptId] = useState<number | null>(null);

  useEffect(() => {
    async function loadQuiz() {
      try {
        const { data, error } = await supabase
          .from("quiz")
          .select(`
            id,
            title,
            description,
            time_limit_minutes,
            total_marks,
            quiz_question(
              id,
              question_text,
              question_type,
              option_a,
              option_b,
              option_c,
              option_d,
              correct_answer,
              explanation,
              marks,
              question_order
            )
          `)
          .eq("id", quizId)
          .single();

        if (error) throw error;

        setQuiz(data);
        setQuestions(
          (data.quiz_question ?? []).sort(
            (a: any, b: any) => a.question_order - b.question_order
          )
        );

        const { data: createdAttempt, error: attemptError } = await supabase
          .from("quiz_attempt")
          .insert({
            quiz_id: quizId,
            status: "in_progress",
            score: 0,
            percentage: 0,
            total_marks: data.total_marks ?? 0,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        setAttemptId(createdAttempt.id);
      } catch (error) {
        console.error("Failed to load quiz:", error);
      } finally {
        setLoading(false);
      }
    }

    if (quizId) loadQuiz();
  }, [quizId]);

  function setAnswer(questionId: number, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function submitQuiz() {
    if (!attemptId) return;

    try {
      let totalScore = 0;
      const answerRows = questions.map((q) => {
        const selectedAnswer = answers[q.id] ?? "";
        const isCorrect =
          String(selectedAnswer).trim().toLowerCase() ===
          String(q.correct_answer ?? "").trim().toLowerCase();

        const awarded = isCorrect ? Number(q.marks ?? 1) : 0;
        totalScore += awarded;

        return {
          quiz_attempt_id: attemptId,
          question_id: q.id,
          selected_answer: selectedAnswer || null,
          is_correct: isCorrect,
          marks_awarded: awarded,
        };
      });

      const { error: answersError } = await supabase
        .from("quiz_attempt_answer")
        .insert(answerRows);

      if (answersError) throw answersError;

      const totalMarks = questions.reduce(
        (sum, q) => sum + Number(q.marks ?? 1),
        0
      );

      const percentage =
        totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

      const { error: updateError } = await supabase
        .from("quiz_attempt")
        .update({
          score: totalScore,
          total_marks: totalMarks,
          percentage,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", attemptId);

      if (updateError) throw updateError;

      router.push(`/quizzes/${quizId}/result?attemptId=${attemptId}`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to submit quiz");
    }
  }

  if (loading) {
    return <div className="p-6">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="p-6">Quiz not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1">
          <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
            <div className="rounded-2xl border bg-white p-6">
              <h1 className="text-2xl font-bold">{quiz.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{quiz.description}</p>
            </div>

            {questions.map((q, index) => (
              <div key={q.id} className="rounded-2xl border bg-white p-6 space-y-4">
                <h2 className="font-semibold">
                  {index + 1}. {q.question_text}
                </h2>

                {[q.option_a, q.option_b, q.option_c, q.option_d]
                  .filter(Boolean)
                  .map((option, i) => (
                    <label key={i} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={option}
                        checked={answers[q.id] === option}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
              </div>
            ))}

            <button
              onClick={submitQuiz}
              className="rounded-xl bg-primary px-5 py-3 text-white"
            >
              Submit Quiz
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
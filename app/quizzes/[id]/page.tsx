import Link from "next/link";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";

export default function QuizResultPage() {
  const result = {
    title: "Introduction to Plants Quiz",
    score: 16,
    total: 20,
    percentage: 80,
    correct: 8,
    wrong: 2,
    remark: "Very Good",
    answers: [
      {
        id: 1,
        question: "Which part of the plant absorbs water from the soil?",
        yourAnswer: "Roots",
        correctAnswer: "Roots",
        correct: true,
      },
      {
        id: 2,
        question: "Which part of the plant makes food?",
        yourAnswer: "Seed",
        correctAnswer: "Leaves",
        correct: false,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Quiz Result</h1>
          <p className="mt-2 text-sm text-slate-500">{result.title}</p>

          <div className="mt-6 flex justify-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-50 text-3xl font-bold text-emerald-600">
              {result.percentage}%
            </div>
          </div>

          <p className="mt-4 text-lg font-semibold text-slate-900">
            {result.remark}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/quizzes/1/attempt"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Retake Quiz
            </Link>
            <Link
              href="/quizzes/1"
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Back to Quiz
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="Score" value={`${result.score}/${result.total}`} />
          <StatCard label="Correct" value={String(result.correct)} accent="text-emerald-600" />
          <StatCard label="Wrong" value={String(result.wrong)} accent="text-rose-600" />
          <StatCard label="Performance" value={result.remark} />
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Answer review
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review each response and compare it with the correct answer.
          </p>

          <div className="mt-6 space-y-4">
            {result.answers.map((answer, index) => (
              <div
                key={answer.id}
                className={`rounded-[24px] border p-5 ${
                  answer.correct
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      answer.correct
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {answer.correct ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </span>

                  <div className="w-full">
                    <h3 className="text-base font-semibold text-slate-900">
                      {index + 1}. {answer.question}
                    </h3>
                    <p
                      className={`mt-3 text-sm ${
                        answer.correct ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      Your answer: {answer.yourAnswer}
                    </p>
                    <p
                      className={`mt-1 text-sm ${
                        answer.correct ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      Correct answer: {answer.correctAnswer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold text-slate-900 ${accent || ""}`}>
        {value}
      </p>
    </div>
  );
}
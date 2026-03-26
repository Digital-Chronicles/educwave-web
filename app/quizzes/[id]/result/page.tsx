"use client";

import Link from "next/link";
import { CheckCircle2, RotateCcw, XCircle, Share2, Download, Trophy, Award, TrendingUp } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";

export default function QuizResultPage() {
  const searchParams = useSearchParams();
  const [showExplanations, setShowExplanations] = useState(true);

  // In a real app, you'd parse the answers from URL params or fetch from API
  const result = {
    title: "Introduction to Plants Quiz",
    score: 16,
    total: 20,
    percentage: 80,
    correct: 8,
    wrong: 2,
    remark: "Very Good",
    rank: "Top 15%",
    timeSpent: "12:45",
    answers: [
      {
        id: 1,
        question: "Which part of the plant absorbs water from the soil?",
        yourAnswer: "Roots",
        correctAnswer: "Roots",
        correct: true,
        explanation: "Roots absorb water and minerals from the soil through root hairs.",
      },
      {
        id: 2,
        question: "Which part of the plant makes food?",
        yourAnswer: "Seed",
        correctAnswer: "Leaves",
        correct: false,
        explanation: "Leaves contain chlorophyll and carry out photosynthesis to make food.",
      },
      {
        id: 3,
        question: "Roots make food for the plant.",
        yourAnswer: "FALSE",
        correctAnswer: "FALSE",
        correct: true,
        explanation: "Roots absorb water and nutrients; leaves make food through photosynthesis.",
      },
    ],
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-amber-600";
    return "text-rose-600";
  };

  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 80) return "Excellent work! You've mastered this topic.";
    if (percentage >= 60) return "Good effort! Review the incorrect answers to improve.";
    return "Keep practicing! Review the explanations to strengthen your understanding.";
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `My Quiz Result: ${result.percentage}%`,
        text: `I scored ${result.score}/${result.total} (${result.percentage}%) on the ${result.title} quiz!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`I scored ${result.score}/${result.total} (${result.percentage}%) on the ${result.title} quiz!`);
      alert("Result copied to clipboard!");
    }
  };

  const handleDownload = () => {
    // In a real app, generate PDF report
    alert("Downloading result report...");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1">
          <div className="mx-auto max-w-5xl p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
              <Link
                href="/quizzes"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                ← Back to Quizzes
              </Link>
            </div>

            {/* Result Card */}
            <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-8 text-center text-white">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-sm">
                  <Trophy className="h-4 w-4" />
                  Quiz Completed
                </div>
                <h1 className="text-2xl font-bold md:text-3xl">{result.title}</h1>
                <p className="mt-2 text-indigo-200">Your performance summary</p>

                <div className="mt-6 flex justify-center">
                  <div className="relative">
                    <svg className="h-32 w-32">
                      <circle
                        className="text-white/20"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="64"
                        cy="64"
                      />
                      <circle
                        className="text-white"
                        strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 58 * result.percentage / 100} ${2 * Math.PI * 58}`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="64"
                        cy="64"
                        transform="rotate(-90 64 64)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">{result.percentage}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className={`text-2xl font-bold ${getPerformanceColor(result.percentage)}`}>
                    {result.remark}
                  </p>
                  <p className="mt-2 text-sm text-indigo-200">{getPerformanceMessage(result.percentage)}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4">
                <StatItem label="Score" value={`${result.score}/${result.total}`} />
                <StatItem label="Correct" value={String(result.correct)} valueColor="text-emerald-600" />
                <StatItem label="Wrong" value={String(result.wrong)} valueColor="text-rose-600" />
                <StatItem label="Time Spent" value={result.timeSpent} />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 border-t border-slate-200 p-6">
                <Link
                  href="/quizzes"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Back to Quizzes
                </Link>
                <Link
                  href="/quizzes/1/attempt"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake Quiz
                </Link>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Share2 className="h-4 w-4" />
                  Share Result
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Download Report
                </button>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-900">Performance Insights</h3>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Rank</span>
                    <span className="font-medium text-slate-900">{result.rank}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Time per Question</span>
                    <span className="font-medium text-slate-900">~95 seconds</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Accuracy Rate</span>
                    <span className="font-medium text-slate-900">{Math.round((result.correct / (result.correct + result.wrong)) * 100)}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold text-slate-900">Recommendations</h3>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>• Review the section on plant parts and their functions</li>
                  <li>• Practice identifying the role of each plant part</li>
                  <li>• Take the revision quiz to reinforce your understanding</li>
                </ul>
              </div>
            </div>

            {/* Answer Review */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Answer Review</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review each response and learn from the explanations
                  </p>
                </div>
                <button
                  onClick={() => setShowExplanations(!showExplanations)}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  {showExplanations ? "Hide Explanations" : "Show Explanations"}
                </button>
              </div>

              <div className="space-y-4">
                {result.answers.map((answer, index) => (
                  <div
                    key={answer.id}
                    className={`rounded-xl border p-5 transition ${
                      answer.correct
                        ? "border-emerald-200 bg-emerald-50/30"
                        : "border-rose-200 bg-rose-50/30"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
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

                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-slate-900">
                          {index + 1}. {answer.question}
                        </h3>

                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          <div>
                            <span className="text-slate-500">Your answer:</span>
                            <p className={`mt-0.5 font-medium ${
                              answer.correct ? "text-emerald-700" : "text-rose-700"
                            }`}>
                              {answer.yourAnswer}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Correct answer:</span>
                            <p className="mt-0.5 font-medium text-slate-900">
                              {answer.correctAnswer}
                            </p>
                          </div>
                        </div>

                        {showExplanations && answer.explanation && (
                          <div className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-600">
                            <span className="font-medium text-indigo-600">Explanation:</span>{" "}
                            {answer.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-50 to-indigo-100 p-6 text-center">
              <h3 className="text-lg font-semibold text-indigo-900">Want to improve your score?</h3>
              <p className="mt-1 text-sm text-indigo-700">
                Review the related notes and try the quiz again to master the topic
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link
                  href="/notes"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  Review Notes
                </Link>
                <Link
                  href="/quizzes/1/attempt"
                  className="rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
                >
                  Retake Quiz
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatItem({ label, value, valueColor = "text-slate-900" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="bg-white p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
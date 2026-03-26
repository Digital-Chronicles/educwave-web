"use client";

import { useMemo, useState, useEffect } from "react";
import { CheckCircle2, Clock3, ChevronLeft, ChevronRight, AlertCircle, Flag, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";

const questions = [
  {
    id: 1,
    type: "mcq",
    question: "Which part of the plant absorbs water from the soil?",
    options: ["Stem", "Roots", "Leaves", "Flower"],
    explanation: "Roots absorb water and minerals from the soil through root hairs.",
  },
  {
    id: 2,
    type: "mcq",
    question: "Which part of the plant makes food?",
    options: ["Leaves", "Roots", "Seed", "Fruit"],
    explanation: "Leaves contain chlorophyll and carry out photosynthesis to make food.",
  },
  {
    id: 3,
    type: "true_false",
    question: "Roots make food for the plant.",
    options: ["TRUE", "FALSE"],
    explanation: "Roots absorb water and nutrients; leaves make food through photosynthesis.",
  },
  {
    id: 4,
    type: "short_answer",
    question: "What is the process called where plants make their own food?",
    options: [],
    explanation: "Photosynthesis is the process where plants use sunlight, water, and carbon dioxide to make food.",
  },
];

export default function QuizAttemptPage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const progress = useMemo(() => {
    return Math.round(((currentQuestion + 1) / questions.length) * 100);
  }, [currentQuestion]);

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flagged.size;

  // Timer effect
  useEffect(() => {
    if (quizSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quizSubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelect = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questions[currentQuestion].id]: value,
    }));
  };

  const toggleFlag = () => {
    const newFlagged = new Set(flagged);
    if (flagged.has(questions[currentQuestion].id)) {
      newFlagged.delete(questions[currentQuestion].id);
    } else {
      newFlagged.add(questions[currentQuestion].id);
    }
    setFlagged(newFlagged);
  };

  const goPrevious = () => {
    setCurrentQuestion((prev) => Math.max(prev - 1, 0));
  };

  const goNext = () => {
    setCurrentQuestion((prev) => Math.min(prev + 1, questions.length - 1));
  };

  const handleSubmit = () => {
    setQuizSubmitted(true);
    // Navigate to results page with answers
    router.push(`/quizzes/result?answers=${JSON.stringify(answers)}`);
  };

  const currentQ = questions[currentQuestion];
  const isAnswered = answers[currentQ.id] !== undefined;
  const isFlagged = flagged.has(currentQ.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1">
          <div className="mx-auto max-w-5xl p-4 md:p-6">
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link
                  href="/quizzes"
                  className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                >
                  ← Back to Quizzes
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">Introduction to Plants Quiz</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Question {currentQuestion + 1} of {questions.length}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                  timeLeft < 300 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-700"
                }`}>
                  <Clock3 className="h-4 w-4" />
                  Time Left: {formatTime(timeLeft)}
                </div>
                <button
                  onClick={toggleFlag}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isFlagged
                      ? "bg-amber-100 text-amber-700"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Flag className="mr-1.5 inline h-4 w-4" />
                  {isFlagged ? "Flagged" : "Flag for Review"}
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
              {/* Main Content */}
              <div className="space-y-6">
                {/* Progress Bar */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                    <span>Progress</span>
                    <span>{progress}% Complete</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Answered: {answeredCount}/{questions.length}</span>
                    <span>Flagged: {flaggedCount}</span>
                  </div>
                </div>

                {/* Question Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                      {currentQ.type === "mcq"
                        ? "Multiple Choice"
                        : currentQ.type === "true_false"
                        ? "True / False"
                        : "Short Answer"}
                    </span>
                    <span className="text-sm text-slate-400">Question {currentQuestion + 1}</span>
                  </div>

                  <h2 className="text-xl font-semibold leading-relaxed text-slate-900">
                    {currentQ.question}
                  </h2>

                  <div className="mt-8 space-y-3">
                    {currentQ.type === "mcq" && (
                      currentQ.options.map((option) => {
                        const selected = answers[currentQ.id] === option;
                        return (
                          <label
                            key={option}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                              selected
                                ? "border-indigo-600 bg-indigo-50"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQ.id}`}
                              checked={selected}
                              onChange={() => handleSelect(option)}
                              className="hidden"
                            />
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                                selected
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {option.charAt(0)}
                            </span>
                            <span className="text-sm font-medium text-slate-700">{option}</span>
                          </label>
                        );
                      })
                    )}

                    {currentQ.type === "true_false" && (
                      <>
                        {["TRUE", "FALSE"].map((option) => {
                          const selected = answers[currentQ.id] === option;
                          return (
                            <label
                              key={option}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                                selected
                                  ? "border-indigo-600 bg-indigo-50"
                                  : "border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${currentQ.id}`}
                                checked={selected}
                                onChange={() => handleSelect(option)}
                                className="hidden"
                              />
                              <span
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                                  selected
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {option.charAt(0)}
                              </span>
                              <span className="text-sm font-medium text-slate-700">{option}</span>
                            </label>
                          );
                        })}
                      </>
                    )}

                    {currentQ.type === "short_answer" && (
                      <textarea
                        rows={4}
                        value={answers[currentQ.id] || ""}
                        onChange={(e) => handleSelect(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
                    <button
                      type="button"
                      onClick={goPrevious}
                      disabled={currentQuestion === 0}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <div className="flex gap-3">
                      {currentQuestion < questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={goNext}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Submit Quiz
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar - Question Navigator */}
              <aside className="space-y-6">
                <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">Question Navigator</h3>
                  <p className="mt-1 text-xs text-slate-500">Click a number to jump to a question</p>

                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {questions.map((question, index) => {
                      const isCurrent = currentQuestion === index;
                      const isAnsweredQuestion = Boolean(answers[question.id]);
                      const isFlaggedQuestion = flagged.has(question.id);

                      let bgColor = "bg-slate-100 text-slate-600 hover:bg-slate-200";
                      if (isCurrent) bgColor = "bg-indigo-600 text-white";
                      else if (isAnsweredQuestion && isFlaggedQuestion) bgColor = "bg-amber-100 text-amber-700";
                      else if (isAnsweredQuestion) bgColor = "bg-emerald-100 text-emerald-700";
                      else if (isFlaggedQuestion) bgColor = "bg-amber-100 text-amber-700";

                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => setCurrentQuestion(index)}
                          className={`flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition ${bgColor}`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      <span>Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <span>Flagged</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-indigo-600" />
                      <span>Current</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-slate-300" />
                      <span>Not Answered</span>
                    </div>
                  </div>
                </div>

                {/* Tips Card */}
                <div className="rounded-2xl border border-slate-200 bg-blue-50 p-5">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900">Tips</h4>
                      <p className="mt-1 text-xs text-blue-700">
                        • Read each question carefully<br />
                        • Use the flag button for questions to review later<br />
                        • Your answers are auto-saved as you go<br />
                        • Review all questions before submitting
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
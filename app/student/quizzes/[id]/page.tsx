"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileQuestion,
  GraduationCap,
  Loader2,
  PlayCircle,
  RotateCcw,
  Send,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";

type QuizSettings = {
  passing_score: number | null;
  max_attempts: number | null;
  allow_retake: boolean | null;
  show_results_immediately: boolean | null;
  shuffle_questions: boolean | null;
  shuffle_options: boolean | null;
};

type QuizQuestion = {
  id: number;
  quiz_id: number;
  topic_id: number | null;
  question_text: string;
  question_type: "mcq" | "true_false" | "short_answer";
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string | null;
  explanation: string | null;
  marks: number | null;
  question_order: number | null;
  is_required: boolean | null;
};

type Subject = {
  id: number;
  name: string;
  code: string | null;
};

type Class = {
  id: number;
  grade_name: string;
};

type Notes = {
  id: number;
  description: string | null;
  notes_content: string | null;
};

type AssessmentTopic = {
  id: number;
  name: string;
};

type QuizData = {
  id: number;
  title: string;
  description: string | null;
  notes_id: number | null;
  subject_id: number;
  grade_id: number;
  topic_id: number | null;
  quiz_type: string | null;
  time_limit_minutes: number | null;
  total_marks: number | null;
  is_active: boolean | null;
  created_at: string | null;
  subject: Subject | null;
  class: Class | null;
  notes: Notes | null;
  assessment_topics: AssessmentTopic | null;
  quiz_settings: QuizSettings | null;
  quiz_question: QuizQuestion[];
};

type AnswerState = {
  selected_answer?: string;
  written_answer?: string;
};

type GradedAnswer = {
  question_id: number;
  selected_answer: string | null;
  written_answer: string | null;
  is_correct: boolean;
  marks_awarded: number;
};

type QuizResult = {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  gradedAnswers: GradedAnswer[];
};

// Helper function to extract first item from array or return null
function getFirstOrNull<T>(arr: T[] | null | undefined): T | null {
  if (!arr || !Array.isArray(arr)) return null;
  return arr[0] || null;
}

function normalizeSettings(
  settings: any[] | null | undefined
): QuizSettings | null {
  if (!settings) return null;
  if (Array.isArray(settings)) return settings[0] ?? null;
  return settings;
}

function formatTimeLeft(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getQuestionMarks(question: QuizQuestion) {
  return Number(question.marks || 1);
}

function getTotalMarks(questions: QuizQuestion[]) {
  return questions.reduce((sum, q) => sum + getQuestionMarks(q), 0);
}

function isAnswered(question: QuizQuestion, answer?: AnswerState) {
  if (!answer) return false;

  if (question.question_type === "short_answer") {
    return Boolean(answer.written_answer?.trim());
  }

  return Boolean(answer.selected_answer);
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function StudentQuizAttemptPage() {
  const params = useParams();
  const quizId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [settings, setSettings] = useState<QuizSettings | null>(null);

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    if (!quizId || Number.isNaN(quizId)) {
      setError("Invalid quiz ID.");
      setLoading(false);
      return;
    }

    const loadPage = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: quizDataRaw, error: quizError } = await supabase
          .from("quiz")
          .select(`
            id,
            title,
            description,
            notes_id,
            subject_id,
            grade_id,
            topic_id,
            quiz_type,
            time_limit_minutes,
            total_marks,
            is_active,
            created_at,
            subject:subject_id (
              id,
              name,
              code
            ),
            class:grade_id (
              id,
              grade_name
            ),
            notes:notes_id (
              id,
              description,
              notes_content
            ),
            assessment_topics:topic_id (
              id,
              name
            ),
            quiz_settings (
              passing_score,
              max_attempts,
              allow_retake,
              show_results_immediately,
              shuffle_questions,
              shuffle_options
            ),
            quiz_question (
              id,
              quiz_id,
              topic_id,
              question_text,
              question_type,
              option_a,
              option_b,
              option_c,
              option_d,
              correct_answer,
              explanation,
              marks,
              question_order,
              is_required
            )
          `)
          .eq("id", quizId)
          .single();

        if (quizError) throw quizError;
        if (!quizDataRaw) throw new Error("Quiz not found.");

        // Transform the data to match QuizData type
        const transformedData: QuizData = {
          ...quizDataRaw,
          subject: getFirstOrNull(quizDataRaw.subject),
          class: getFirstOrNull(quizDataRaw.class),
          notes: getFirstOrNull(quizDataRaw.notes),
          assessment_topics: getFirstOrNull(quizDataRaw.assessment_topics),
          quiz_settings: normalizeSettings(quizDataRaw.quiz_settings),
          quiz_question: quizDataRaw.quiz_question || [],
        };

        if (!transformedData.is_active) {
          throw new Error("This quiz is not active.");
        }

        // Shuffle questions if needed
        let questions = [...(transformedData.quiz_question || [])].sort(
          (a: QuizQuestion, b: QuizQuestion) =>
            Number(a.question_order || 0) - Number(b.question_order || 0)
        );

        if (transformedData.quiz_settings?.shuffle_questions) {
          questions = shuffleArray(questions);
        }

        const quizData = {
          ...transformedData,
          quiz_question: questions,
        };

        setQuiz(quizData);
        setSettings(quizData.quiz_settings);

        const limitSeconds = quizData.time_limit_minutes
          ? Number(quizData.time_limit_minutes) * 60
          : null;

        setSecondsLeft(limitSeconds);
      } catch (err: any) {
        console.error("Failed to load quiz page:", err);
        setError(err?.message || "Failed to load the quiz.");
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [quizId]);

  useEffect(() => {
    if (!started || finished || secondsLeft === null || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return prev;
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, finished, secondsLeft]);

  useEffect(() => {
    if (!started || finished || secondsLeft !== 0 || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    handleSubmitQuiz(true);
  }, [started, finished, secondsLeft]);

  const questions = quiz?.quiz_question || [];
  const totalQuestions = questions.length;
  const totalMarks = useMemo(() => getTotalMarks(questions), [questions]);

  const answeredCount = useMemo(() => {
    return questions.filter((q) => isAnswered(q, answers[q.id])).length;
  }, [questions, answers]);

  const currentQuestion = questions[currentQuestionIndex] || null;

  const updateAnswer = (questionId: number, value: AnswerState) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...value,
      },
    }));
  };

  const handleStartQuiz = async () => {
    setStarting(true);
    setStarted(true);
    setFinished(false);
    setResult(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    autoSubmittedRef.current = false;

    if (quiz?.time_limit_minutes) {
      setSecondsLeft(Number(quiz.time_limit_minutes) * 60);
    } else {
      setSecondsLeft(null);
    }

    setStarting(false);
  };

  const handleRestartQuiz = () => {
    if (!quiz) return;

    let questionsReset = [...quiz.quiz_question];

    if (settings?.shuffle_questions) {
      questionsReset = shuffleArray(questionsReset);
    }

    setQuiz({
      ...quiz,
      quiz_question: questionsReset,
    });

    setAnswers({});
    setResult(null);
    setFinished(false);
    setStarted(false);
    setCurrentQuestionIndex(0);
    autoSubmittedRef.current = false;

    if (quiz.time_limit_minutes) {
      setSecondsLeft(Number(quiz.time_limit_minutes) * 60);
    } else {
      setSecondsLeft(null);
    }
  };

  const handleSubmitQuiz = async (forcedByTimer = false) => {
    if (!quiz) return;

    try {
      setSubmitting(true);

      const gradedAnswers: GradedAnswer[] = questions.map((q) => {
        const answer = answers[q.id] || {};
        const marks = getQuestionMarks(q);

        let selected_answer: string | null = null;
        let written_answer: string | null = null;
        let is_correct = false;
        let marks_awarded = 0;

        if (q.question_type === "short_answer") {
          written_answer = answer.written_answer?.trim() || null;

          const expected = (q.correct_answer || "").trim().toLowerCase();
          const given = (written_answer || "").trim().toLowerCase();

          if (expected && given && expected === given) {
            is_correct = true;
            marks_awarded = marks;
          }
        } else {
          selected_answer = answer.selected_answer || null;

          const expected = (q.correct_answer || "").trim().toLowerCase();
          const given = (selected_answer || "").trim().toLowerCase();

          if (expected && given && expected === given) {
            is_correct = true;
            marks_awarded = marks;
          }
        }

        return {
          question_id: q.id,
          selected_answer,
          written_answer,
          is_correct,
          marks_awarded,
        };
      });

      const score = gradedAnswers.reduce(
        (sum, row) => sum + Number(row.marks_awarded || 0),
        0
      );

      const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
      const passingScore = Number(settings?.passing_score ?? 50);

      setResult({
        score,
        total: totalMarks,
        percentage,
        passed: percentage >= passingScore,
        gradedAnswers,
      });

      setFinished(true);
      setStarted(false);

      if (forcedByTimer) {
        alert("Time is up. Your quiz has been submitted automatically.");
      }
    } catch (err: any) {
      console.error("Failed to submit quiz:", err);
      alert(err?.message || "Failed to submit quiz.");
      autoSubmittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-20">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
            <span className="text-slate-700">Loading quiz...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Unable to open quiz</h1>
                <p className="mt-2 text-sm text-slate-600">
                  {error || "Quiz not found."}
                </p>
                <Link
                  href="/student/quizzes"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Quizzes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (finished && result) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/student/quizzes"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Quizzes
            </Link>

            <button
              onClick={handleRestartQuiz}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-700"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-8 text-white">
              <h1 className="text-3xl font-bold">{quiz.title}</h1>
              <p className="mt-2 text-cyan-50">Quiz result</p>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-4">
              <SummaryCard
                icon={<Trophy className="h-5 w-5" />}
                label="Score"
                value={`${result.score}/${result.total}`}
              />
              <SummaryCard
                icon={
                  result.passed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )
                }
                label="Result"
                value={result.passed ? "Passed" : "Not Passed"}
              />
              <SummaryCard
                icon={<Target className="h-5 w-5" />}
                label="Percentage"
                value={`${result.percentage.toFixed(1)}%`}
              />
              <SummaryCard
                icon={<Clock3 className="h-5 w-5" />}
                label="Passing Score"
                value={`${Number(settings?.passing_score ?? 50)}%`}
              />
            </div>

            <div className="border-t border-slate-200 p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Question Review
              </h2>

              <div className="space-y-4">
                {questions.map((q, index) => {
                  const graded = result.gradedAnswers.find(
                    (item) => item.question_id === q.id
                  );
                  const correct =
                    q.question_type === "short_answer"
                      ? q.correct_answer || "—"
                      : q.correct_answer || "—";

                  return (
                    <div
                      key={q.id}
                      className={`rounded-2xl border p-4 ${
                        graded?.is_correct
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-semibold text-slate-900">
                          {index + 1}. {q.question_text}
                        </h3>
                        <span className="text-sm font-medium text-slate-700">
                          {graded?.marks_awarded || 0}/{getQuestionMarks(q)} marks
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm">
                        <p>
                          <span className="font-medium text-slate-700">Your answer:</span>{" "}
                          <span className="text-slate-900">
                            {q.question_type === "short_answer"
                              ? graded?.written_answer || "No answer"
                              : graded?.selected_answer || "No answer"}
                          </span>
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Correct answer:</span>{" "}
                          <span className="text-slate-900">{correct}</span>
                        </p>
                        {q.explanation && (
                          <p>
                            <span className="font-medium text-slate-700">Explanation:</span>{" "}
                            <span className="text-slate-900">{q.explanation}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/student/quizzes"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Quizzes
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 px-6 py-10 text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                <FileQuestion className="h-4 w-4" />
                {quiz.quiz_type || "practice"} quiz
              </div>

              <h1 className="mt-4 text-3xl font-bold md:text-4xl">{quiz.title}</h1>

              <p className="mt-3 max-w-3xl text-cyan-50">
                {quiz.description ||
                  "Answer all questions carefully and submit before time runs out."}
              </p>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoCard
                    icon={<BookOpen className="h-5 w-5" />}
                    label="Subject"
                    value={quiz.subject?.name || "General"}
                  />
                  <InfoCard
                    icon={<GraduationCap className="h-5 w-5" />}
                    label="Class"
                    value={quiz.class?.grade_name || "—"}
                  />
                  <InfoCard
                    icon={<FileQuestion className="h-5 w-5" />}
                    label="Questions"
                    value={`${totalQuestions}`}
                  />
                  <InfoCard
                    icon={<Clock3 className="h-5 w-5" />}
                    label="Time Limit"
                    value={
                      quiz.time_limit_minutes
                        ? `${quiz.time_limit_minutes} min`
                        : "No limit"
                    }
                  />
                </div>

                {quiz.notes?.description || quiz.notes?.notes_content ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">Linked Note</h3>
                    <p className="mt-2 text-sm text-slate-700">
                      {quiz.notes?.description || "Study note attached to this quiz."}
                    </p>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-slate-900">Instructions</h3>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>• Total questions: {totalQuestions}</p>
                    <p>• Total marks: {totalMarks}</p>
                    <p>• Passing score: {Number(settings?.passing_score ?? 50)}%</p>
                    <p>
                      • This version is in guest mode. Attempts are not stored in the database.
                    </p>
                    <p>
                      • Results are graded immediately in the browser after submission.
                    </p>
                  </div>
                </div>
              </div>

              <aside>
                <div className="sticky top-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">Ready to start?</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Anyone can take this quiz. Your answers will not be saved to the database.
                  </p>

                  <button
                    onClick={handleStartQuiz}
                    disabled={starting}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
                  >
                    {starting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}
                    Start Quiz
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const currentAnswer = answers[currentQuestion.id] || {};
  const progressPercent =
    totalQuestions > 0
      ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 md:text-xl">{quiz.title}</h1>
            <p className="text-sm text-slate-500">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {secondsLeft !== null && (
              <div
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  secondsLeft <= 60
                    ? "bg-red-50 text-red-700"
                    : "bg-cyan-50 text-cyan-700"
                }`}
              >
                <Clock3 className="mr-1 inline h-4 w-4" />
                {formatTimeLeft(secondsLeft)}
              </div>
            )}

            <button
              onClick={() => handleSubmitQuiz(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit
            </button>
          </div>
        </div>

        <div className="h-2 w-full bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="order-2 lg:order-1">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Question Navigator</h3>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((q, index) => {
                const active = index === currentQuestionIndex;
                const answered = isAnswered(q, answers[q.id]);

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-cyan-600 text-white"
                        : answered
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <p>
                Answered:{" "}
                <span className="font-semibold text-slate-900">{answeredCount}</span>
              </p>
              <p>
                Remaining:{" "}
                <span className="font-semibold text-slate-900">
                  {Math.max(0, totalQuestions - answeredCount)}
                </span>
              </p>
            </div>
          </div>
        </aside>

        <main className="order-1 lg:order-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                  {currentQuestion.question_type === "mcq"
                    ? "Multiple Choice"
                    : currentQuestion.question_type === "true_false"
                    ? "True / False"
                    : "Short Answer"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {getQuestionMarks(currentQuestion)} mark
                  {getQuestionMarks(currentQuestion) === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <h2 className="text-xl font-semibold leading-relaxed text-slate-900">
              {currentQuestion.question_text}
            </h2>

            <div className="mt-6">
              {currentQuestion.question_type === "mcq" && (
                <div className="space-y-3">
                  {[
                    { key: "A", label: currentQuestion.option_a },
                    { key: "B", label: currentQuestion.option_b },
                    { key: "C", label: currentQuestion.option_c },
                    { key: "D", label: currentQuestion.option_d },
                  ].map((option) => (
                    <label
                      key={option.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                        currentAnswer.selected_answer === option.key
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        checked={currentAnswer.selected_answer === option.key}
                        onChange={() =>
                          updateAnswer(currentQuestion.id, {
                            selected_answer: option.key,
                          })
                        }
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{option.key}</div>
                        <div className="text-sm text-slate-700">{option.label}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.question_type === "true_false" && (
                <div className="space-y-3">
                  {[
                    { key: "true", label: "True" },
                    { key: "false", label: "False" },
                  ].map((option) => (
                    <label
                      key={option.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                        currentAnswer.selected_answer === option.key
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        checked={currentAnswer.selected_answer === option.key}
                        onChange={() =>
                          updateAnswer(currentQuestion.id, {
                            selected_answer: option.key,
                          })
                        }
                        className="mt-1"
                      />
                      <div className="font-medium text-slate-900">{option.label}</div>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.question_type === "short_answer" && (
                <div>
                  <textarea
                    rows={6}
                    value={currentAnswer.written_answer || ""}
                    onChange={(e) =>
                      updateAnswer(currentQuestion.id, {
                        written_answer: e.target.value,
                      })
                    }
                    placeholder="Write your answer here..."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <button
                onClick={() =>
                  setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={currentQuestionIndex === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {currentQuestionIndex === totalQuestions - 1 ? (
                <button
                  onClick={() => handleSubmitQuiz(false)}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit Quiz
                </button>
              ) : (
                <button
                  onClick={() =>
                    setCurrentQuestionIndex((prev) =>
                      Math.min(totalQuestions - 1, prev + 1)
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">{icon}</div>
      <p className="mt-2 text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="text-cyan-600">{icon}</div>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
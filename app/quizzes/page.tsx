"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";
import supabase from "@/lib/supabaseClient";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Eye,
  FileQuestion,
  Filter,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  TimerReset,
} from "lucide-react";

type QuizRow = {
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
  updated_at: string | null;
  class?: {
    id: number;
    grade_name: string;
  } | null;
  subject?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  notes?: {
    id: number;
    description: string | null;
  } | null;
  assessment_topics?: {
    id: number;
    name: string;
  } | null;
  quiz_settings?: {
    passing_score: number | null;
    max_attempts: number | null;
    allow_retake: boolean | null;
    show_results_immediately: boolean | null;
    shuffle_questions: boolean | null;
  } | null;
};

type QuizQuestionCountRow = {
  quiz_id: number;
};

type ClassOption = {
  id: number;
  grade_name: string;
};

type SubjectOption = {
  id: number;
  name: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getQuizTypeLabel(type?: string | null) {
  if (!type) return "Practice";
  if (type === "class_test") return "Class Test";
  if (type === "revision") return "Revision";
  return "Practice";
}

function getQuizTypeBadgeClass(type?: string | null) {
  if (type === "class_test") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (type === "revision") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-indigo-50 text-indigo-700 border-indigo-200";
}

export default function QuizzesPage() {
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string>("");
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({});
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  async function loadPageData(showReload = false) {
    try {
      setError("");
      if (showReload) {
        setReloading(true);
      } else {
        setLoading(true);
      }

      const [quizRes, questionRes, classRes, subjectRes] = await Promise.all([
        supabase
          .from("quiz")
          .select(
            `
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
            updated_at,
            class:grade_id (
              id,
              grade_name
            ),
            subject:subject_id (
              id,
              name,
              code
            ),
            notes:notes_id (
              id,
              description
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
              shuffle_questions
            )
          `
          )
          .order("created_at", { ascending: false }),

        supabase.from("quiz_question").select("quiz_id"),

        supabase.from("class").select("id, grade_name").order("grade_name", { ascending: true }),

        supabase.from("subject").select("id, name").order("name", { ascending: true }),
      ]);

      if (quizRes.error) throw quizRes.error;
      if (questionRes.error) throw questionRes.error;
      if (classRes.error) throw classRes.error;
      if (subjectRes.error) throw subjectRes.error;

      const quizData = (quizRes.data || []).map((quiz: any) => ({
        ...quiz,
        quiz_settings: Array.isArray(quiz.quiz_settings)
          ? quiz.quiz_settings[0] || null
          : quiz.quiz_settings || null,
      }));

      const counts: Record<number, number> = {};
      ((questionRes.data || []) as QuizQuestionCountRow[]).forEach((row) => {
        counts[row.quiz_id] = (counts[row.quiz_id] || 0) + 1;
      });

      setQuizzes(quizData);
      setQuestionCounts(counts);
      setClasses(classRes.data || []);
      setSubjects(subjectRes.data || []);
    } catch (err: any) {
      console.error("Failed to load quizzes:", err);
      setError(err?.message || "Failed to load quizzes.");
    } finally {
      setLoading(false);
      setReloading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      const title = quiz.title?.toLowerCase() || "";
      const description = quiz.description?.toLowerCase() || "";
      const className = quiz.class?.grade_name?.toLowerCase() || "";
      const subjectName = quiz.subject?.name?.toLowerCase() || "";
      const topicName = quiz.assessment_topics?.name?.toLowerCase() || "";
      const noteText = quiz.notes?.description?.toLowerCase() || "";
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        title.includes(term) ||
        description.includes(term) ||
        className.includes(term) ||
        subjectName.includes(term) ||
        topicName.includes(term) ||
        noteText.includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && quiz.is_active === true) ||
        (statusFilter === "draft" && !quiz.is_active);

      const matchesClass =
        classFilter === "all" || String(quiz.grade_id) === String(classFilter);

      const matchesSubject =
        subjectFilter === "all" || String(quiz.subject_id) === String(subjectFilter);

      const matchesType =
        typeFilter === "all" || String(quiz.quiz_type || "practice") === String(typeFilter);

      return matchesSearch && matchesStatus && matchesClass && matchesSubject && matchesType;
    });
  }, [quizzes, search, statusFilter, classFilter, subjectFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = quizzes.length;
    const active = quizzes.filter((q) => q.is_active).length;
    const draft = quizzes.filter((q) => !q.is_active).length;
    const totalQuestions = quizzes.reduce((sum, q) => sum + (questionCounts[q.id] || 0), 0);

    return { total, active, draft, totalQuestions };
  }, [quizzes, questionCounts]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl p-4 md:p-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quizzes</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage, review, and open quizzes for your classes.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadPageData(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
                  Refresh
                </button>

                <Link
                  href="/quizzes/create"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Create Quiz
                </Link>
              </div>
            </div>

            {error ? (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              </div>
            ) : null}

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Quizzes"
                value={stats.total}
                icon={<FileQuestion className="h-5 w-5" />}
              />
              <StatCard
                title="Active Quizzes"
                value={stats.active}
                icon={<CheckCircle2 className="h-5 w-5" />}
              />
              <StatCard
                title="Draft Quizzes"
                value={stats.draft}
                icon={<TimerReset className="h-5 w-5" />}
              />
              <StatCard
                title="Total Questions"
                value={stats.totalQuestions}
                icon={<BookOpen className="h-5 w-5" />}
              />
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by title, class, subject, topic..."
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <FilterSelect
                  label="Status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "draft", label: "Draft" },
                  ]}
                />

                <FilterSelect
                  label="Class"
                  value={classFilter}
                  onChange={setClassFilter}
                  options={[
                    { value: "all", label: "All Classes" },
                    ...classes.map((item) => ({
                      value: String(item.id),
                      label: item.grade_name,
                    })),
                  ]}
                />

                <FilterSelect
                  label="Subject"
                  value={subjectFilter}
                  onChange={setSubjectFilter}
                  options={[
                    { value: "all", label: "All Subjects" },
                    ...subjects.map((item) => ({
                      value: String(item.id),
                      label: item.name,
                    })),
                  ]}
                />

                <FilterSelect
                  label="Quiz Type"
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                    { value: "all", label: "All Types" },
                    { value: "practice", label: "Practice" },
                    { value: "revision", label: "Revision" },
                    { value: "class_test", label: "Class Test" },
                  ]}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 md:px-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Quiz List</h2>
                  <p className="text-sm text-slate-500">
                    {filteredQuizzes.length} quiz{filteredQuizzes.length === 1 ? "" : "es"} found
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="p-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                    Loading quizzes...
                  </div>
                </div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <FileQuestion className="mx-auto h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">No quizzes found</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Try adjusting your filters or create a new quiz.
                    </p>
                    <Link
                      href="/quizzes/create"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4" />
                      Create Quiz
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:px-6">
                          Quiz
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Class / Subject
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Details
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Updated
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 md:px-6">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredQuizzes.map((quiz) => {
                        const questionCount = questionCounts[quiz.id] || 0;

                        return (
                          <tr key={quiz.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-4 align-top md:px-6">
                              <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                                  <FileQuestion className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate font-semibold text-slate-900">
                                      {quiz.title}
                                    </p>
                                    <span
                                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getQuizTypeBadgeClass(
                                        quiz.quiz_type
                                      )}`}
                                    >
                                      {getQuizTypeLabel(quiz.quiz_type)}
                                    </span>
                                  </div>
                                  <p className="mt-1 line-clamp-2 max-w-md text-sm text-slate-500">
                                    {quiz.description || "No description"}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                    {quiz.assessment_topics?.name ? (
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                        Topic: {quiz.assessment_topics.name}
                                      </span>
                                    ) : null}
                                    {quiz.notes?.description ? (
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                        Note: {quiz.notes.description}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 align-top">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-900">
                                  {quiz.class?.grade_name || "—"}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {quiz.subject?.name || "—"}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-4 align-top">
                              <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-slate-400" />
                                  <span>{questionCount} questions</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-slate-400" />
                                  <span>{quiz.total_marks ?? 0} marks</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock3 className="h-4 w-4 text-slate-400" />
                                  <span>
                                    {quiz.time_limit_minutes
                                      ? `${quiz.time_limit_minutes} mins`
                                      : "No time limit"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 align-top">
                              <div className="space-y-2">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                    quiz.is_active
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {quiz.is_active ? "Active" : "Draft"}
                                </span>

                                <div className="space-y-1 text-xs text-slate-500">
                                  <p>
                                    Passing: {quiz.quiz_settings?.passing_score ?? 50}%
                                  </p>
                                  <p>
                                    Attempts: {quiz.quiz_settings?.max_attempts ?? 1}
                                  </p>
                                  <p>
                                    Retake: {quiz.quiz_settings?.allow_retake ? "Yes" : "No"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 align-top text-sm text-slate-600">
                              <div className="space-y-1">
                                <p>{formatDate(quiz.updated_at || quiz.created_at)}</p>
                                <p className="text-xs text-slate-400">
                                  Created: {formatDate(quiz.created_at)}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-4 align-top md:px-6">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Link
                                  href={`/quizzes/${quiz.id}`}
                                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Link>

                                <Link
                                  href={`/quizzes/${quiz.id}/edit`}
                                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </Link>

                                <Link
                                  href={`/quizzes/${quiz.id}/attempt`}
                                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                                >
                                  <PlayCircle className="h-4 w-4" />
                                  Open
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">{value}</h3>
        </div>
        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">{icon}</div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        <span className="inline-flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          {label}
        </span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
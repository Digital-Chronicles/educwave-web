"use client";

import Link from "next/link";
import {
  BookOpen,
  Clock3,
  FileQuestion,
  Plus,
  Search,
  Sparkles,
  Filter,
  ChevronDown,
  MoreVertical,
  Edit,
  Copy,
  Archive,
  Trash2,
  Eye,
  TrendingUp,
  Users,
  Award,
} from "lucide-react";
import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";

type QuizStatus = "active" | "draft" | "archived";

type Quiz = {
  id: string;
  title: string;
  subject: string;
  className: string;
  topic: string;
  questionsCount: number;
  timeLimitMinutes: number | null;
  status: QuizStatus;
  description: string;
  attemptsCount?: number;
  averageScore?: number;
};

const quizzes: Quiz[] = [
  {
    id: "1",
    title: "Introduction to Plants Quiz",
    subject: "Biology",
    className: "Senior One",
    topic: "Parts of a Plant",
    questionsCount: 10,
    timeLimitMinutes: 15,
    status: "active",
    description: "Practice quiz based on plant structure and functions.",
    attemptsCount: 24,
    averageScore: 78,
  },
  {
    id: "2",
    title: "Fractions Revision Quiz",
    subject: "Mathematics",
    className: "Primary Five",
    topic: "Fractions",
    questionsCount: 15,
    timeLimitMinutes: 20,
    status: "draft",
    description: "Revision quiz covering basic fractions and simplification.",
    attemptsCount: 0,
    averageScore: 0,
  },
  {
    id: "3",
    title: "Human Digestive System",
    subject: "Biology",
    className: "Senior Two",
    topic: "Digestion",
    questionsCount: 12,
    timeLimitMinutes: null,
    status: "archived",
    description: "Mixed quiz for digestive organs and functions.",
    attemptsCount: 56,
    averageScore: 72,
  },
];

const statusStyles: Record<QuizStatus, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  draft: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  archived: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

export default function QuizzesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | QuizStatus>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "score">("recent");

  const filteredQuizzes = useMemo(() => {
    let filtered = quizzes.filter((quiz) => {
      const matchesSearch =
        quiz.title.toLowerCase().includes(search.toLowerCase()) ||
        quiz.subject.toLowerCase().includes(search.toLowerCase()) ||
        quiz.className.toLowerCase().includes(search.toLowerCase()) ||
        quiz.topic.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" ? true : quiz.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort quizzes
    filtered.sort((a, b) => {
      if (sortBy === "popular") return (b.attemptsCount || 0) - (a.attemptsCount || 0);
      if (sortBy === "score") return (b.averageScore || 0) - (a.averageScore || 0);
      return b.id.localeCompare(a.id);
    });

    return filtered;
  }, [search, statusFilter, sortBy]);

  const stats = useMemo(() => {
    return {
      total: quizzes.length,
      active: quizzes.filter((q) => q.status === "active").length,
      draft: quizzes.filter((q) => q.status === "draft").length,
      archived: quizzes.filter((q) => q.status === "archived").length,
      totalAttempts: quizzes.reduce((sum, q) => sum + (q.attemptsCount || 0), 0),
      avgScore: Math.round(
        quizzes.reduce((sum, q) => sum + (q.averageScore || 0), 0) / quizzes.filter(q => q.averageScore).length
      ),
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl p-4 md:p-6">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
                    <Sparkles className="h-3.5 w-3.5" />
                    Quiz Module
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                    Quizzes
                  </h1>
                  <p className="mt-2 text-slate-500">
                    Create, manage, and analyze interactive quizzes for your learners
                  </p>
                </div>

                <Link
                  href="/quizzes/create"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <Plus className="h-4 w-4" />
                  Create New Quiz
                </Link>
              </div>

              {/* Stats Cards */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard label="Total Quizzes" value={stats.total} icon={FileQuestion} color="blue" />
                <StatCard label="Active" value={stats.active} icon={BookOpen} color="green" />
                <StatCard label="Draft" value={stats.draft} icon={Edit} color="amber" />
                <StatCard label="Total Attempts" value={stats.totalAttempts} icon={Users} color="purple" />
                <StatCard label="Avg Score" value={`${stats.avgScore}%`} icon={Award} color="emerald" />
              </div>
            </div>

            {/* Filters Bar */}
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, subject, class, or topic..."
                  className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | QuizStatus)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                  <option value="score">Highest Score</option>
                </select>

                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`rounded-md px-3 py-1.5 text-sm transition ${
                      viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`rounded-md px-3 py-1.5 text-sm transition ${
                      viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Quiz Grid/List */}
            {filteredQuizzes.length === 0 ? (
              <EmptyState onClear={() => setSearch("")} />
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredQuizzes.map((quiz) => (
                  <QuizCard key={quiz.id} quiz={quiz} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuizzes.map((quiz) => (
                  <QuizListItem key={quiz.id} quiz={quiz} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Subcomponents remain the same...
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-lg ${colors[color]} p-2`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function QuizCard({ quiz }: { quiz: Quiz }) {
  const status = statusStyles[quiz.status];
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:border-slate-300">
      {/* Status Badge */}
      <div className="absolute right-4 top-4">
        <div className={`flex items-center gap-1.5 rounded-full ${status.bg} px-2.5 py-1`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          <span className={`text-xs font-medium capitalize ${status.text}`}>{quiz.status}</span>
        </div>
      </div>

      {/* Content */}
      <div className="pr-20">
        <h3 className="text-lg font-semibold text-slate-900 line-clamp-1">{quiz.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{quiz.subject} • {quiz.className}</p>
        <p className="mt-3 text-sm text-slate-600 line-clamp-2">{quiz.description}</p>
      </div>

      {/* Stats Row */}
      <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-1.5">
          <FileQuestion className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-600">{quiz.questionsCount} questions</span>
        </div>
        {quiz.timeLimitMinutes && (
          <div className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-600">{quiz.timeLimitMinutes} min</span>
          </div>
        )}
        {quiz.averageScore > 0 && (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-green-600">{quiz.averageScore}% avg</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/quizzes/${quiz.id}`}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          View Details
        </Link>
        {quiz.status === "active" && (
          <Link
            href={`/quizzes/${quiz.id}/attempt`}
            className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Start Quiz
          </Link>
        )}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 z-10 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                <Edit className="h-3.5 w-3.5" /> Edit
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizListItem({ quiz }: { quiz: Quiz }) {
  const status = statusStyles[quiz.status];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-900">{quiz.title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}>
            {quiz.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{quiz.subject} • {quiz.className} • {quiz.topic}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>{quiz.questionsCount} questions</span>
          {quiz.timeLimitMinutes && <span>{quiz.timeLimitMinutes} min</span>}
          {quiz.attemptsCount > 0 && <span>{quiz.attemptsCount} attempts</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/quizzes/${quiz.id}`}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          View
        </Link>
        {quiz.status === "active" && (
          <Link
            href={`/quizzes/${quiz.id}/attempt`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
          >
            Start
          </Link>
        )}
        <Link
          href={`/quizzes/${quiz.id}/edit`}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <FileQuestion className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">No quizzes found</h3>
      <p className="mt-2 text-slate-500">Try adjusting your search or filters</p>
      <button
        onClick={onClear}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
      >
        Clear Filters
      </button>
    </div>
  );
}
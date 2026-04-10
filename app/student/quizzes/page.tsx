"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Filter,
  GraduationCap,
  ListChecks,
  Search,
  Sparkles,
  Trophy,
  TrendingUp,
  Zap,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  Star,
  Target,
  Timer,
  PlayCircle,
  Eye,
  Settings,
  SortAsc,
  SortDesc,
  Grid3x3,
  List,
  RefreshCw,
} from "lucide-react";

type ClassRow = {
  id: number;
  grade_name: string;
  class_teacher_id?: string | null;
};

// Raw type for Subject from Supabase (arrays for relations)
type SubjectRowRaw = {
  id: number;
  name: string;
  code?: string | null;
  grade_id: number | null;
  class: { id: number; grade_name: string }[] | null;
};

// Normalized Subject type (object for relation)
type SubjectRow = {
  id: number;
  name: string;
  code?: string | null;
  grade_id: number | null;
  class?: {
    id: number;
    grade_name: string;
  } | null;
};

type QuizSettingsRow = {
  passing_score: number | null;
  max_attempts: number | null;
  allow_retake: boolean | null;
};

// Raw types from Supabase (arrays for relations)
type QuizRowRaw = {
  id: number;
  title: string;
  description: string | null;
  subject_id: number | null;
  grade_id: number | null;
  time_limit_minutes: number | null;
  is_active: boolean | null;
  created_at?: string | null;
  subject: { id: number; name: string; code?: string | null }[] | null;
  class: { id: number; grade_name: string }[] | null;
  quiz_question: { id: number }[];
  quiz_settings?: QuizSettingsRow[] | QuizSettingsRow | null;
};

// Normalized types (objects for relations)
type QuizRow = {
  id: number;
  title: string;
  description: string | null;
  subject_id: number | null;
  grade_id: number | null;
  time_limit_minutes: number | null;
  is_active: boolean | null;
  created_at?: string | null;
  subject: { id: number; name: string; code?: string | null } | null;
  class: { id: number; grade_name: string } | null;
  quiz_question: { id: number }[];
  quiz_settings?: QuizSettingsRow[] | QuizSettingsRow | null;
};

type ViewMode = "grid" | "list";
type SortOption = "newest" | "oldest" | "title" | "questions" | "time";
type DifficultyFilter = "all" | "beginner" | "intermediate" | "advanced";
type TimeFilter = "all" | "short" | "medium" | "long";

type NormalizedQuiz = Omit<QuizRow, "quiz_settings"> & {
  quiz_settings: QuizSettingsRow | null;
};

// Helper function to extract first item from array or return null
function getFirstOrNull<T>(arr: T[] | null | undefined): T | null {
  if (!arr || !Array.isArray(arr)) return null;
  return arr[0] || null;
}

function normalizeQuizSettings(
  value: QuizRowRaw["quiz_settings"] | QuizRow["quiz_settings"]
): QuizSettingsRow | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function normalizeQuiz(quizRaw: QuizRowRaw): QuizRow {
  return {
    ...quizRaw,
    subject: getFirstOrNull(quizRaw.subject),
    class: getFirstOrNull(quizRaw.class),
    quiz_settings: quizRaw.quiz_settings,
  };
}

function normalizeSubject(subjectRaw: SubjectRowRaw): SubjectRow {
  return {
    ...subjectRaw,
    class: getFirstOrNull(subjectRaw.class),
  };
}

function getQuestionCount(quiz: NormalizedQuiz) {
  return quiz.quiz_question?.length ?? 0;
}

function getDifficultyKey(questionCount: number): Exclude<DifficultyFilter, "all"> {
  if (questionCount <= 5) return "beginner";
  if (questionCount <= 10) return "intermediate";
  return "advanced";
}

function getDifficultyMeta(questionCount: number) {
  const key = getDifficultyKey(questionCount);

  if (key === "beginner") {
    return {
      key,
      label: "Beginner",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: Star,
    };
  }

  if (key === "intermediate") {
    return {
      key,
      label: "Intermediate",
      color: "text-blue-700 bg-blue-50 border-blue-200",
      icon: Target,
    };
  }

  return {
    key,
    label: "Advanced",
    color: "text-purple-700 bg-purple-50 border-purple-200",
    icon: Trophy,
  };
}

function getTimeCategory(minutes: number | null): Exclude<TimeFilter, "all"> {
  const value = minutes ?? 0;
  if (value <= 15) return "short";
  if (value <= 30) return "medium";
  return "long";
}

function formatTime(minutes: number | null) {
  if (!minutes || minutes <= 0) return "No limit";
  return `${minutes} min`;
}

function getPassingScore(quiz: NormalizedQuiz) {
  return quiz.quiz_settings?.passing_score ?? 50;
}

function getMaxAttempts(quiz: NormalizedQuiz) {
  return quiz.quiz_settings?.max_attempts ?? 1;
}

function canRetake(quiz: NormalizedQuiz) {
  return quiz.quiz_settings?.allow_retake ?? false;
}

export default function StudentQuizzesPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [quizzes, setQuizzes] = useState<NormalizedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedQuiz, setSelectedQuiz] = useState<NormalizedQuiz | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const [classesRes, subjectsRes, quizzesRes] = await Promise.all([
        supabase
          .from("class")
          .select("id, grade_name, class_teacher_id")
          .order("grade_name", { ascending: true }),

        supabase
          .from("subject")
          .select(`
            id,
            name,
            code,
            grade_id,
            class:grade_id (
              id,
              grade_name
            )
          `)
          .order("name", { ascending: true }),

        supabase
          .from("quiz")
          .select(`
            id,
            title,
            description,
            subject_id,
            grade_id,
            time_limit_minutes,
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
            quiz_question(id),
            quiz_settings (
              passing_score,
              max_attempts,
              allow_retake
            )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      if (classesRes.error) throw classesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (quizzesRes.error) throw quizzesRes.error;

      // Transform raw subjects data to normalized format
      const rawSubjects = (subjectsRes.data || []) as unknown as SubjectRowRaw[];
      const normalizedSubjects: SubjectRow[] = rawSubjects.map(normalizeSubject);

      // Transform raw quiz data to normalized format
      const rawQuizzes = (quizzesRes.data || []) as unknown as QuizRowRaw[];
      const normalizedQuizzes: NormalizedQuiz[] = rawQuizzes.map((quiz) => {
        const normalized = normalizeQuiz(quiz);
        return {
          ...normalized,
          quiz_settings: normalizeQuizSettings(normalized.quiz_settings),
        };
      });

      setClasses((classesRes.data as ClassRow[]) ?? []);
      setSubjects(normalizedSubjects);
      setQuizzes(normalizedQuizzes);
    } catch (err: any) {
      console.error("Failed to load student quizzes:", err);
      setError(err?.message || "Failed to load quizzes. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSubjects = useMemo(() => {
    let result = [...subjects];

    if (gradeFilter) {
      result = result.filter(
        (subject) => String(subject.grade_id ?? "") === gradeFilter
      );
    }

    return result.sort((a, b) => {
      const aLabel = `${a.name} (${a.class?.grade_name ?? ""})`;
      const bLabel = `${b.name} (${b.class?.grade_name ?? ""})`;
      return aLabel.localeCompare(bLabel);
    });
  }, [subjects, gradeFilter]);

  const filteredQuizzes = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    const result = quizzes.filter((quiz) => {
      const haystack = [
        quiz.title ?? "",
        quiz.description ?? "",
        quiz.subject?.name ?? "",
        quiz.class?.grade_name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !searchTerm || haystack.includes(searchTerm);

      const matchesGrade = gradeFilter
        ? String(quiz.grade_id ?? "") === gradeFilter
        : true;

      const matchesSubject = subjectFilter
        ? String(quiz.subject_id ?? "") === subjectFilter
        : true;

      const questionCount = getQuestionCount(quiz);
      const matchesDifficulty =
        difficultyFilter === "all"
          ? true
          : getDifficultyKey(questionCount) === difficultyFilter;

      const matchesTime =
        timeFilter === "all"
          ? true
          : getTimeCategory(quiz.time_limit_minutes) === timeFilter;

      return (
        matchesSearch &&
        matchesGrade &&
        matchesSubject &&
        matchesDifficulty &&
        matchesTime
      );
    });

    return result.sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortBy) {
        case "newest":
        case "oldest":
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "questions":
          aValue = getQuestionCount(a);
          bValue = getQuestionCount(b);
          break;
        case "time":
          aValue = a.time_limit_minutes ?? 0;
          bValue = b.time_limit_minutes ?? 0;
          break;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === "asc"
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    });
  }, [
    quizzes,
    search,
    gradeFilter,
    subjectFilter,
    difficultyFilter,
    timeFilter,
    sortBy,
    sortOrder,
  ]);

  const activeFiltersCount = [
    search ? 1 : 0,
    gradeFilter ? 1 : 0,
    subjectFilter ? 1 : 0,
    difficultyFilter !== "all" ? 1 : 0,
    timeFilter !== "all" ? 1 : 0,
  ].reduce((sum, item) => sum + item, 0);

  const summaryStats = useMemo(() => {
    const total = quizzes.length;
    const short = quizzes.filter(
      (q) => getTimeCategory(q.time_limit_minutes) === "short"
    ).length;
    const medium = quizzes.filter(
      (q) => getTimeCategory(q.time_limit_minutes) === "medium"
    ).length;
    const advanced = quizzes.filter(
      (q) => getDifficultyKey(getQuestionCount(q)) === "advanced"
    ).length;

    return { total, short, medium, advanced };
  }, [quizzes]);

  const handleGradeChange = (value: string) => {
    setGradeFilter(value);
    setSubjectFilter("");
  };

  const clearFilters = () => {
    setSearch("");
    setGradeFilter("");
    setSubjectFilter("");
    setDifficultyFilter("all");
    setTimeFilter("all");
  };

  const handleStartQuiz = (quiz: NormalizedQuiz) => {
    router.push(`/student/quizzes/${quiz.id}`);
  };

  const handleQuickView = (quiz: NormalizedQuiz) => {
    setSelectedQuiz(quiz);
    setShowQuickView(true);
  };

  const closeQuickView = () => {
    setShowQuickView(false);
    setSelectedQuiz(null);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-30 blur-lg" />
              <div className="relative rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 p-3 text-white shadow-lg">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                Student Quizzes
              </h1>
              <p className="text-sm text-slate-500">
                Explore and test your knowledge with interactive quizzes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/student/notes"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm"
            >
              <BookOpen className="h-4 w-4" />
              Notes
            </Link>

            <button
              onClick={() => loadData(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 p-8 shadow-xl md:p-10">
          <div className="absolute inset-0 opacity-10" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              {summaryStats.total} Interactive Quizzes Available
            </div>

            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Test Your Knowledge
            </h2>

            <p className="mt-3 max-w-2xl text-base leading-relaxed text-cyan-50">
              Explore quizzes by grade, subject, difficulty level, and time
              commitment. Find the perfect challenge to improve your understanding.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HeroPill icon={GraduationCap} text={`${summaryStats.total} total quizzes`} />
              <HeroPill icon={Zap} text={`${summaryStats.short} short quizzes`} />
              <HeroPill icon={TrendingUp} text={`${summaryStats.medium} medium quizzes`} />
              <HeroPill icon={Trophy} text={`${summaryStats.advanced} advanced quizzes`} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className="flex w-full items-center justify-between p-5 text-left"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-cyan-600" />
              <span className="font-semibold text-slate-900">Filters & Search</span>
              {activeFiltersCount > 0 && (
                <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">
                  {activeFiltersCount} active
                </span>
              )}
            </div>

            <ChevronRight
              className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
                showFilters ? "rotate-90" : ""
              }`}
            />
          </button>

          {showFilters && (
            <div className="space-y-4 border-t border-slate-100 p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="relative md:col-span-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search quizzes by title or topic..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <select
                  value={gradeFilter}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="">All Grades</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.grade_name}
                    </option>
                  ))}
                </select>

                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  disabled={!gradeFilter}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {gradeFilter ? "All Subjects" : "Select grade first"}
                  </option>
                  {filteredSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} {subject.code ? `(${subject.code})` : ""}
                    </option>
                  ))}
                </select>

                <select
                  value={difficultyFilter}
                  onChange={(e) =>
                    setDifficultyFilter(e.target.value as DifficultyFilter)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">⭐ Beginner</option>
                  <option value="intermediate">🎯 Intermediate</option>
                  <option value="advanced">🏆 Advanced</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="all">Any Duration</option>
                  <option value="short">⏱️ Short (&lt;15 min)</option>
                  <option value="medium">⏰ Medium (15-30 min)</option>
                  <option value="long">⏲️ Long (&gt;30 min)</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Sort by Title</option>
                  <option value="questions">Sort by Questions</option>
                  <option value="time">Sort by Duration</option>
                </select>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSortOrder}
                    className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50"
                    title={sortOrder === "asc" ? "Ascending" : "Descending"}
                  >
                    {sortOrder === "asc" ? (
                      <SortAsc className="h-4 w-4" />
                    ) : (
                      <SortDesc className="h-4 w-4" />
                    )}
                  </button>

                  <div className="flex overflow-hidden rounded-xl border border-slate-200">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2.5 transition ${
                        viewMode === "grid"
                          ? "bg-cyan-50 text-cyan-600"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2.5 transition ${
                        viewMode === "list"
                          ? "bg-cyan-50 text-cyan-600"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      title="Clear all filters"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="rounded-xl bg-cyan-50 px-4 py-2 text-sm text-cyan-700">
                  <span className="font-semibold">{filteredQuizzes.length}</span> quizzes found
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 md:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-600" />
            <p className="mt-4 text-sm text-slate-500">Loading quizzes...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center shadow-sm">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
            <h3 className="mt-4 text-lg font-semibold text-red-800">
              Error Loading Quizzes
            </h3>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={() => loadData(true)}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <ClipboardList className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No quizzes found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {activeFiltersCount > 0
                ? "Try adjusting your filters to see more quizzes."
                : "Quizzes will appear here once they're published."}
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                <X className="h-4 w-4" />
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Available Quizzes
                </h3>
                <p className="text-sm text-slate-500">
                  Showing {filteredQuizzes.length} quiz
                  {filteredQuizzes.length === 1 ? "" : "zes"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Eye className="h-3.5 w-3.5" />
                <span>Click Preview to see details</span>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredQuizzes.map((quiz) => (
                  <QuizGridCard
                    key={quiz.id}
                    quiz={quiz}
                    onPreview={() => handleQuickView(quiz)}
                    onStart={() => handleStartQuiz(quiz)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuizzes.map((quiz) => (
                  <QuizListCard
                    key={quiz.id}
                    quiz={quiz}
                    onPreview={() => handleQuickView(quiz)}
                    onStart={() => handleStartQuiz(quiz)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showQuickView && selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 p-2.5 text-white">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Quiz Preview</h2>
                  <p className="text-sm text-slate-500">{selectedQuiz.title}</p>
                </div>
              </div>

              <button
                onClick={closeQuickView}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <PreviewInfoCard
                  icon={BookOpen}
                  label="Subject"
                  value={selectedQuiz.subject?.name || "General"}
                />
                <PreviewInfoCard
                  icon={GraduationCap}
                  label="Grade"
                  value={selectedQuiz.class?.grade_name || "All Grades"}
                />
                <PreviewInfoCard
                  icon={ListChecks}
                  label="Questions"
                  value={`${getQuestionCount(selectedQuiz)} questions`}
                />
                <PreviewInfoCard
                  icon={Timer}
                  label="Time Limit"
                  value={formatTime(selectedQuiz.time_limit_minutes)}
                />
              </div>

              {selectedQuiz.description && (
                <div className="rounded-xl bg-cyan-50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-cyan-900">
                    Description
                  </h4>
                  <p className="text-sm leading-relaxed text-cyan-800">
                    {selectedQuiz.description}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Settings className="h-4 w-4" />
                  Quiz Settings
                </h4>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Passing Score:</span>
                    <span className="ml-2 font-semibold text-cyan-600">
                      {getPassingScore(selectedQuiz)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Max Attempts:</span>
                    <span className="ml-2 font-semibold text-cyan-600">
                      {getMaxAttempts(selectedQuiz)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Retake Policy:</span>
                    <span className="ml-2 font-semibold text-cyan-600">
                      {canRetake(selectedQuiz) ? "Allowed" : "Not Allowed"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-200 pt-4">
                <button
                  onClick={closeQuickView}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    closeQuickView();
                    handleStartQuiz(selectedQuiz);
                  }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:from-cyan-700 hover:to-blue-700"
                >
                  <PlayCircle className="mr-1.5 inline h-4 w-4" />
                  Start Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroPill({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white">
      <Icon className="h-4 w-4" />
      <span>{text}</span>
    </div>
  );
}

function QuizGridCard({
  quiz,
  onPreview,
  onStart,
}: {
  quiz: NormalizedQuiz;
  onPreview: () => void;
  onStart: () => void;
}) {
  const questionCount = getQuestionCount(quiz);
  const difficulty = getDifficultyMeta(questionCount);
  const DifficultyIcon = difficulty.icon;

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 blur transition-opacity group-hover:opacity-20" />

      <div className="relative p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 p-3 text-white shadow-md">
            <ClipboardList className="h-5 w-5" />
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${difficulty.color}`}
          >
            <DifficultyIcon className="h-3 w-3" />
            {difficulty.label}
          </span>
        </div>

        <div>
          <h3 className="line-clamp-2 text-xl font-bold text-slate-900 transition-colors group-hover:text-cyan-700">
            {quiz.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              <BookOpen className="h-3 w-3" />
              {quiz.subject?.name ?? "General"}
            </span>

            {quiz.class?.grade_name && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                <GraduationCap className="h-3 w-3" />
                {quiz.class.grade_name}
              </span>
            )}
          </div>
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600">
          {quiz.description ||
            "No description provided. Click preview to learn more about this quiz."}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <StatMini
            icon={ListChecks}
            label="Questions"
            value={String(questionCount)}
          />
          <StatMini
            icon={Timer}
            label="Time"
            value={formatTime(quiz.time_limit_minutes)}
          />
          <StatMini
            icon={Target}
            label="Pass"
            value={`${getPassingScore(quiz)}%`}
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onPreview}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
          >
            <Eye className="mr-1.5 inline h-4 w-4" />
            Preview
          </button>
          <button
            onClick={onStart}
            className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-cyan-700 hover:to-blue-700 hover:shadow-md"
          >
            <PlayCircle className="mr-1.5 inline h-4 w-4" />
            Start
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-700">
            {canRetake(quiz)
              ? `You can retake this quiz up to ${getMaxAttempts(quiz)} times`
              : "This quiz can be taken only once"}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuizListCard({
  quiz,
  onPreview,
  onStart,
}: {
  quiz: NormalizedQuiz;
  onPreview: () => void;
  onStart: () => void;
}) {
  const questionCount = getQuestionCount(quiz);
  const difficulty = getDifficultyMeta(questionCount);
  const DifficultyIcon = difficulty.icon;

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 p-1.5 text-white">
              <ClipboardList className="h-4 w-4" />
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${difficulty.color}`}
            >
              <DifficultyIcon className="h-3 w-3" />
              {difficulty.label}
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-cyan-700">
            {quiz.title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {quiz.subject?.name ?? "General"}
            </span>
            {quiz.class?.grade_name && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {quiz.class.grade_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5" />
              {questionCount} questions
            </span>
            <span className="flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" />
              {formatTime(quiz.time_limit_minutes)}
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              Pass: {getPassingScore(quiz)}%
            </span>
          </div>

          {quiz.description && (
            <p className="mt-2 line-clamp-1 text-sm text-slate-600">
              {quiz.description}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onPreview}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
          >
            <Eye className="mr-1.5 inline h-4 w-4" />
            Preview
          </button>
          <button
            onClick={onStart}
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-cyan-700 hover:to-blue-700 hover:shadow-md"
          >
            <PlayCircle className="mr-1.5 inline h-4 w-4" />
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

function StatMini({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5 text-center transition group-hover:bg-cyan-50">
      <div className="flex items-center justify-center gap-1 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function PreviewInfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Icon className="h-4 w-4" />
        <span className="font-medium">{label}</span>
      </div>
      <p className="mt-1 text-slate-900">{value}</p>
    </div>
  );
}
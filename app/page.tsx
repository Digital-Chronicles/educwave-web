"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import {
  ArrowRight,
  BookOpen,
  BookText,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  School,
  Shield,
  Sparkles,
  Users,
  ChevronRight,
  Award,
  TrendingUp,
  Zap,
  Globe,
  BarChart3,
  Library,
  Star,
  PenTool,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [stats, setStats] = useState({
    notes: 0,
    quizzes: 0,
    subjects: 0,
    students: 0,
  });

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 6 && !submitting;
  }, [email, password, submitting]);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) router.replace("/dashboard");
    };

    checkSession();
  }, [router]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [notesRes, quizzesRes, subjectsRes, studentsRes] = await Promise.all([
          supabase.from("notes").select("*", { count: "exact", head: true }),
          supabase.from("quiz").select("*", { count: "exact", head: true }),
          supabase.from("subject").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
        ]);

        setStats({
          notes: notesRes.count ?? 0,
          quizzes: quizzesRes.count ?? 0,
          subjects: subjectsRes.count ?? 0,
          students: studentsRes.count ?? 0,
        });
      } catch (err) {
        console.error("Failed to load homepage stats:", err);
      }
    };

    loadStats();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  };

  const studentLinks = [
    {
      title: "Browse Notes",
      description:
        "Access comprehensive learning materials, subject summaries, and teacher-prepared notes.",
      href: "/student/notes",
      icon: BookText,
      badge: `${stats.notes} notes`,
      color: "blue",
    },
    {
      title: "Preview Quizzes",
      description:
        "Test your knowledge with interactive quizzes and practice assessments.",
      href: "/student/quizzes",
      icon: ClipboardList,
      badge: `${stats.quizzes} quizzes`,
      color: "emerald",
    },
  ];

  const featureCards = [
    {
      title: "Academic Management",
      description: "Comprehensive tools for managing curriculum, notes, and assessments.",
      icon: BookOpen,
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      title: "Student Engagement",
      description: "Interactive learning experiences that keep students motivated.",
      icon: Users,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      title: "Assessment Tools",
      description: "Create, manage, and evaluate quizzes with detailed analytics.",
      icon: Calendar,
      gradient: "from-purple-500 to-pink-600",
    },
    {
      title: "Enterprise Security",
      description: "Bank-grade encryption and secure access controls for peace of mind.",
      icon: Shield,
      gradient: "from-orange-500 to-red-600",
    },
  ];

  const metrics = [
    { label: "Active Students", value: stats.students, icon: Users, color: "blue" },
    { label: "Learning Resources", value: stats.notes, icon: Library, color: "emerald" },
    { label: "Assessment Items", value: stats.quizzes, icon: Award, color: "purple" },
    { label: "Subject Areas", value: stats.subjects, icon: Globe, color: "orange" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Enhanced Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200/20 bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 blur-lg opacity-30" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg">
                <School className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Educwave
              </h1>
              <p className="text-xs text-slate-500">Modern Education Platform</p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/student/notes"
              className="group rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
            >
              Notes
            </Link>
            <Link
              href="/student/quizzes"
              className="group rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
            >
              Quizzes
            </Link>
            <a
              href="#staff-login"
              className="ml-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
            >
              Staff Access
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section with Enhanced Design */}
        <section className="relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-r from-blue-200 to-blue-300 opacity-20 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-r from-emerald-200 to-teal-300 opacity-20 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-200 to-pink-300 opacity-10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-12 md:px-6 lg:grid lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-20">
            {/* Left side - Enhanced Content */}
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-2 text-sm font-medium text-blue-700 backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                Next-Generation Learning Platform
              </div>

              <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                Empower the future
                <span className="block bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  of education
                </span>
              </h2>

              <p className="mt-5 text-base leading-relaxed text-slate-600 md:text-lg">
                A comprehensive platform that bridges the gap between educators and
                learners. Streamline academic management while providing students with
                seamless access to knowledge.
              </p>

              {/* Metrics Dashboard */}
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="group rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm transition-all hover:shadow-lg"
                  >
                    <div className={`rounded-xl bg-${metric.color}-50 p-2 w-fit`}>
                      <metric.icon className={`h-5 w-5 text-${metric.color}-600`} />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900">
                      {metric.value.toLocaleString()}+
                    </p>
                    <p className="text-xs text-slate-500">{metric.label}</p>
                  </div>
                ))}
              </div>

              {/* Student Navigation Cards - Enhanced */}
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {studentLinks.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-transparent hover:shadow-xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative">
                      <div className="mb-4 flex items-start justify-between">
                        <div className={`rounded-xl bg-${item.color}-50 p-3`}>
                          <item.icon className={`h-6 w-6 text-${item.color}-600`} />
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {item.badge}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {item.description}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-600">
                        Access now
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side - Enhanced Login Card */}
            <div
              id="staff-login"
              className="mt-12 lg:mt-0 lg:flex lg:items-center lg:justify-end"
            >
              <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl backdrop-blur-sm">
                <div className="mb-8 text-center">
                  <div className="relative mx-auto mb-4 inline-flex">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 blur-lg opacity-30" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg">
                      <Shield className="h-8 w-8" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    Staff Portal
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Secure access for educators and administrators
                  </p>
                </div>

                {error && (
                  <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="staff@school.edu"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="text-sm font-medium text-slate-700"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="password"
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-12 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                      >
                        {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                      Remember me
                    </label>
                    <div className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Secure connection
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Student Access
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        Students can access learning materials without login. Use the
                        navigation cards above to explore notes and quizzes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Enhanced */}
        <section className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                <Star className="h-4 w-4" />
                Platform Capabilities
              </div>
              <h3 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
                Everything you need to succeed
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
                Comprehensive tools designed to enhance the educational experience
                for both educators and learners.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {featureCards.map((item) => (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:shadow-xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 transition-opacity group-hover:opacity-5`} />
                  <div className={`inline-flex rounded-xl bg-gradient-to-br ${item.gradient} p-3 text-white`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Student Quick Access - Enhanced */}
        <section className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                <Zap className="h-4 w-4 text-amber-500" />
                Quick Access
              </div>
              <h3 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
                Start learning instantly
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
                No account needed. Browse educational content and practice materials
                right away.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Link
                href="/student/notes"
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:border-blue-200 hover:shadow-xl"
              >
                <div className="absolute top-0 right-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 blur-2xl transition-opacity group-hover:opacity-10" />
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 text-white shadow-lg">
                    <BookText className="h-7 w-7" />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900">Student Notes</h4>
                  <p className="mt-3 text-base leading-relaxed text-slate-600">
                    Comprehensive learning materials, subject summaries, and
                    teacher-prepared notes organized by topic.
                  </p>
                  <div className="mt-6 flex items-center gap-2 font-semibold text-blue-600">
                    Browse library
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>

              <Link
                href="/student/quizzes"
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:border-emerald-200 hover:shadow-xl"
              >
                <div className="absolute top-0 right-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 opacity-0 blur-2xl transition-opacity group-hover:opacity-10" />
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white shadow-lg">
                    <Award className="h-7 w-7" />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900">Practice Quizzes</h4>
                  <p className="mt-3 text-base leading-relaxed text-slate-600">
                    Test your knowledge with interactive quizzes, track progress,
                    and identify areas for improvement.
                  </p>
                  <div className="mt-6 flex items-center gap-2 font-semibold text-emerald-600">
                    Start practicing
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="mt-16 text-center">
              <p className="text-sm font-medium text-slate-500">Trusted by educational institutions worldwide</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-8 opacity-60">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Secure Platform</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">GDPR Compliant</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">24/7 Support</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Enterprise Grade</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6 lg:px-8">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Educwave. All rights reserved.{" "}
            <a href="mailto:support@educwave.com" className="text-blue-600 hover:underline">
              support@educwave.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
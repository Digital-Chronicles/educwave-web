'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  LifeBuoy,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Wallet,
  FileText,
  Users,
  Settings,
  ShieldCheck,
  Mail,
  Phone,
  ExternalLink,
  BookOpen,
  MessageSquare,
  Bug,
} from 'lucide-react';

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  school_id: string | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function FAQItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full text-left rounded-2xl border transition overflow-hidden',
        open ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
      )}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="text-sm font-semibold text-slate-900">{q}</div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-500 transition',
            open ? 'rotate-180 text-blue-600' : ''
          )}
        />
      </div>

      {open && (
        <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">
          {a}
        </div>
      )}
    </button>
  );
}

export default function HelpPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [query, setQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) return router.replace('/');

        const uid = sess.session.user.id;

        const { data: p, error } = await supabase
          .from('profiles')
          .select('user_id,email,full_name,role,school_id')
          .eq('user_id', uid)
          .single();

        if (error) throw error;
        setProfile(p as any);
      } catch {
        // If profiles fails, still show page (don't block help)
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const quickLinks = [
    {
      title: 'Students',
      desc: 'Add, edit and manage student records.',
      href: '/students',
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: 'Academic Records',
      desc: 'Generate student report cards and results.',
      href: '/academics/student-report',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: 'Finance',
      desc: 'Manage tuition profiles and transactions.',
      href: '/finance/management',
      icon: <Wallet className="h-5 w-5" />,
    },
    {
      title: 'Assessments',
      desc: 'Create exams, enter marks, and review results.',
      href: '/assessments',
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      title: 'Settings',
      desc: 'School configuration, fees, and system setup.',
      href: '/settings',
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  const faqs = useMemo(
    () => [
      {
        q: 'How do I add a new student?',
        a:
          'Go to Students → Add Student. Fill in the student details and save. The registration ID is generated automatically based on your school and year of entry.',
      },
      {
        q: "How do I view a student's academic records?",
        a:
          'Open Students, then use "Academic Records" on a student. It will open the Student Report page where you can generate a single A4 report.',
      },
      {
        q: "How do I view a student's transaction records?",
        a:
          'Open Students, then click "Transactions". It opens Finance → Management filtered for that student (tuition profiles, payments, balances).',
      },
      {
        q: 'Why do I see "School Configuration Required"?',
        a:
          'Your user profile is not linked to a school (school_id is missing). Go to Settings and configure your school information to unlock all modules.',
      },
      {
        q: 'My PDF/Export looks different from the screen — how do I keep styling?',
        a:
          "Use print-friendly A4 styling (fixed page width, consistent fonts, avoid unsupported CSS like color functions). If you're using html2canvas, ensure it is installed and avoid CSS color formats that it cannot parse.",
      },
      {
        q: 'What should I do if a page fails to load?',
        a:
          'Check your internet connection, confirm you are logged in, and refresh the page. If it persists, send a screenshot + the exact error message to support.',
      },
    ],
    []
  );

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [faqs, query]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <AppShell />

        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
            <div className="px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <LifeBuoy className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Help Center
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Quick guides, common questions, and support contacts.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <div className="text-xs text-slate-600">
                    {loading ? (
                      <span className="animate-pulse">Checking session…</span>
                    ) : profile ? (
                      <span>
                        Logged in as: <span className="font-semibold text-slate-900">{profile.full_name || profile.email}</span>
                      </span>
                    ) : (
                      <span>Session: <span className="font-semibold text-slate-900">Active</span></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="mt-6 max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search help… (e.g. report, fees, student, export)"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left: Quick links */}
              <div className="xl:col-span-2 space-y-6">
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Quick Links</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Jump straight to common actions.
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      Premium UI • Simple workflow
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quickLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="group rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                              {l.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900">{l.title}</div>
                              <div className="text-sm text-slate-600 mt-1">{l.desc}</div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition mt-1" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* FAQ */}
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-slate-700" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">FAQs</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Click a question to expand.
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {filteredFaqs.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                        No matches for <span className="font-semibold">"{query}"</span>. Try another keyword.
                      </div>
                    ) : (
                      filteredFaqs.map((f, idx) => (
                        <FAQItem
                          key={f.q}
                          q={f.q}
                          a={f.a}
                          open={openIndex === idx}
                          onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Support */}
              <div className="space-y-6">
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Support</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Reach out when stuck.
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Mail className="h-4 w-4 text-slate-600" />
                        Email
                      </div>
                      <div className="mt-1 text-sm text-slate-700">support@yourdomain.com</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Phone className="h-4 w-4 text-slate-600" />
                        Phone
                      </div>
                      <div className="mt-1 text-sm text-slate-700">+256 7XX XXX XXX</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Bug className="h-4 w-4 text-slate-600" />
                        When reporting issues, send:
                      </div>
                      <ul className="mt-2 text-sm text-slate-700 list-disc pl-5 space-y-1">
                        <li>Screenshot of the error</li>
                        <li>Which page you were on</li>
                        <li>Student / term selected (if any)</li>
                        <li>The exact message shown</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold">Tip</div>
                      <div className="mt-2 text-sm text-white/90 leading-relaxed">
                        For best printing results, generate reports as a single A4 page and use
                        print-friendly styling (fixed widths, no animations).
                      </div>
                    </div>
                    <ExternalLink className="h-5 w-5 text-white/90" />
                  </div>

                  <Link
                    href="/academics/student-report"
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 text-sm font-semibold transition"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Open Student Report
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-10 text-xs text-slate-500">
              If you want, I can also create a small "Documentation" section that explains each module
              (Students, Academics, Finance, Assessments) with screenshots and step-by-step flows.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
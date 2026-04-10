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
  BookOpen,
  ClipboardList,
  FileText,
  Users,
  Settings,
  ShieldCheck,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Sparkles,
  CalendarDays,
  School,
  ArrowRight,
} from 'lucide-react';

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  school_id: string | null;
};

type HelpItem = {
  id: string;
  title: string;
  description: string;
  href?: string;
  category: 'getting_started' | 'workflow' | 'faq' | 'support';
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
        'w-full rounded-2xl border text-left transition overflow-hidden',
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
        <div className="px-5 pb-4 text-sm leading-relaxed text-slate-700">
          {a}
        </div>
      )}
    </button>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-100">
          {icon}
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
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
        if (!sess.session) {
          router.replace('/');
          return;
        }

        const uid = sess.session.user.id;

        const { data: p, error } = await supabase
          .from('profiles')
          .select('user_id,email,full_name,role,school_id')
          .eq('user_id', uid)
          .single();

        if (error) throw error;
        setProfile(p as ProfileRow);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const displayName = profile?.full_name || profile?.email || 'Teacher';

  const gettingStarted = [
    {
      id: 'gs-1',
      title: 'Check your class and subject assignments',
      description: 'Start by confirming the classes and subjects assigned to you in the Academics section.',
      href: '/academics',
      category: 'getting_started' as const,
    },
    {
      id: 'gs-2',
      title: 'Prepare your lesson plans',
      description: 'Create daily, weekly, termly, or yearly lesson plans before teaching begins.',
      href: '/academics/plans',
      category: 'getting_started' as const,
    },
    {
      id: 'gs-3',
      title: 'Review your students',
      description: 'Open the Students module to understand the learners you are teaching.',
      href: '/students',
      category: 'getting_started' as const,
    },
    {
      id: 'gs-4',
      title: 'Start assessments and marks entry',
      description: 'Create assessments, enter scores, and review performance records.',
      href: '/assessments',
      category: 'getting_started' as const,
    },
  ];

  const workflow = [
    {
      id: 'wf-1',
      title: 'Before class',
      description: 'Open lesson plans, confirm the topic, and check the class you will teach.',
      href: '/academics/plans',
      category: 'workflow' as const,
    },
    {
      id: 'wf-2',
      title: 'After teaching',
      description: 'Update notes, lesson coverage, or assessment preparation for the next lesson.',
      href: '/academics',
      category: 'workflow' as const,
    },
    {
      id: 'wf-3',
      title: 'After tests or exams',
      description: 'Enter marks, review performance trends, and prepare reports.',
      href: '/assessments',
      category: 'workflow' as const,
    },
    {
      id: 'wf-4',
      title: 'For report discussions',
      description: 'Use the student report area to check report cards and academic summaries.',
      href: '/academics/student-report',
      category: 'workflow' as const,
    },
  ];

  const quickLinks = [
    {
      title: 'Students',
      desc: 'View and manage student records.',
      href: '/students',
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: 'Academics',
      desc: 'Manage subjects, classes, terms, and exams.',
      href: '/academics',
      icon: <School className="h-5 w-5" />,
    },
    {
      title: 'Lesson Plans',
      desc: 'Create daily, weekly, termly, and yearly plans.',
      href: '/academics/plans',
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      title: 'Assessments',
      desc: 'Create assessments and enter marks.',
      href: '/assessments',
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      title: 'Reports',
      desc: 'Generate student academic reports.',
      href: '/academics/student-report',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: 'Settings',
      desc: 'Check school setup and user access.',
      href: '/settings',
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  const faqs = useMemo(
    () => [
      {
        q: 'How does a teacher get started on the system?',
        a: 'First confirm your class and subject assignments in Academics. Then prepare lesson plans, review your students, and use Assessments when you are ready to record marks.',
      },
      {
        q: 'Where do I create lesson plans?',
        a: 'Open the Lesson Plans page from Academics Plans. Use it to prepare daily, weekly, termly, or yearly plans before class.',
      },
      {
        q: 'How do I enter marks after a test?',
        a: 'Go to Assessments, select the correct class, subject, and exam setup, then enter or review marks there.',
      },
      {
        q: 'How do I check a student report card?',
        a: 'Open the Student Report page from the Academics area and choose the student, class, and term to generate the report.',
      },
      {
        q: 'Why do I see "School Configuration Required"?',
        a: 'Your user profile is not linked to a school. This must be fixed in Settings before modules can work properly.',
      },
      {
        q: 'What should I do if a page fails to load?',
        a: 'Refresh the page, confirm your internet connection, and sign in again if needed. If the problem continues, report the exact page and error message to support.',
      },
    ],
    []
  );

  const searchableItems: HelpItem[] = useMemo(
    () => [
      ...gettingStarted,
      ...workflow,
      ...faqs.map((f, index) => ({
        id: `faq-${index}`,
        title: f.q,
        description: f.a,
        category: 'faq' as const,
      })),
      {
        id: 'support-1',
        title: 'Need support?',
        description: 'Contact the school administrator or IT support when your role, subject allocation, or school link is incorrect.',
        category: 'support' as const,
      },
    ],
    [faqs]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchableItems;

    return searchableItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [query, searchableItems]);

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q)
    );
  }, [faqs, query]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <AppShell />

        <main className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <LifeBuoy className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Teacher Help Center
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                      Start quickly, teach confidently, and find support fast.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <div className="text-xs text-slate-600">
                    {loading ? (
                      <span className="animate-pulse">Checking session…</span>
                    ) : (
                      <span>
                        Signed in as{' '}
                        <span className="font-semibold text-slate-900">{displayName}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 max-w-3xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search help… e.g. lesson plan, marks, report, students"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 lg:px-8 py-8 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-sm">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
                  <Sparkles className="h-4 w-4" />
                  Teacher Onboarding
                </div>
                <h2 className="mt-4 text-2xl font-bold md:text-3xl">
                  Welcome{displayName ? `, ${String(displayName).split(' ')[0]}` : ''} — here is how to start
                </h2>
                <p className="mt-3 text-sm leading-6 text-blue-50 md:text-base">
                  Use this page to understand your first steps, daily workflow, and where to go when you need help.
                </p>
              </div>
            </div>

            {query.trim() ? (
              <SectionCard
                title="Search Results"
                subtitle={`${searchResults.length} matching item${searchResults.length === 1 ? '' : 's'}`}
                icon={<Search className="h-5 w-5" />}
              >
                {searchResults.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                    No help content matched <span className="font-semibold">"{query}"</span>.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                            <div className="mt-1 text-sm text-slate-600">{item.description}</div>
                          </div>
                          {item.href ? (
                            <Link
                              href={item.href}
                              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                              Open
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            ) : null}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <SectionCard
                  title="Getting Started"
                  subtitle="These are the first things every teacher should do."
                  icon={<CheckCircle2 className="h-5 w-5" />}
                >
                  <div className="grid gap-4">
                    {gettingStarted.map((item, index) => (
                      <Link
                        key={item.id}
                        href={item.href || '#'}
                        className="group rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900">{item.title}</div>
                            <div className="mt-1 text-sm text-slate-600">{item.description}</div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Teacher Daily Workflow"
                  subtitle="A simple way to use the system during normal school work."
                  icon={<CalendarDays className="h-5 w-5" />}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    {workflow.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href || '#'}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white transition"
                      >
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="mt-2 text-sm text-slate-600">{item.description}</div>
                      </Link>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Frequently Asked Questions"
                  subtitle="Quick answers to common teacher questions."
                  icon={<HelpCircle className="h-5 w-5" />}
                >
                  <div className="space-y-3">
                    {filteredFaqs.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                        No FAQ matches for <span className="font-semibold">"{query}"</span>.
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
                </SectionCard>
              </div>

              <div className="space-y-6">
                <SectionCard
                  title="Quick Links"
                  subtitle="Open the pages teachers use most."
                  icon={<GraduationCap className="h-5 w-5" />}
                >
                  <div className="grid gap-3">
                    {quickLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="group rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                            {l.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900">{l.title}</div>
                            <div className="mt-1 text-sm text-slate-600">{l.desc}</div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Common Problems"
                  subtitle="Things teachers usually need fixed quickly."
                  icon={<AlertTriangle className="h-5 w-5" />}
                >
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                      I cannot see my class or subject assignments.
                    </div>
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                      My account is not linked to the school.
                    </div>
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                      The reports or marks page is not loading correctly.
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Need More Help?"
                  subtitle="Use support when the issue is about access, assignments, or broken pages."
                  icon={<LifeBuoy className="h-5 w-5" />}
                >
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      Contact your school administrator first for subject, class, and role issues.
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      When reporting a problem, include the page name and the exact error message.
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push('/settings')}
                      className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
                    >
                      Open Settings / Support Area
                    </button>
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
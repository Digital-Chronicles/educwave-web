'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import { ArrowLeft, ClipboardList, Clock3, Search, AlertTriangle } from 'lucide-react';

type SchoolRow = { id: string; school_name: string };
type TeacherRow = { registration_id: string; first_name: string; last_name: string; school_id: string };

// Raw type from Supabase (arrays for relations)
type QuizRowRaw = {
  id: number;
  title: string;
  description: string | null;
  subject_id: number | null;
  grade_id: number | null;
  time_limit_minutes: number | null;
  total_marks: number | null;
  is_active: boolean | null;
  created_at: string | null;
  subject: { name: string }[] | null;
  grade: { grade_name: string }[] | null;
  quiz_question: { id: number }[] | null;
};

// Normalized type (objects for relations)
type QuizRow = {
  id: number;
  title: string;
  description: string | null;
  subject_id: number | null;
  grade_id: number | null;
  time_limit_minutes: number | null;
  total_marks: number | null;
  is_active: boolean | null;
  created_at: string | null;
  subject?: { name: string } | null;
  grade?: { grade_name: string } | null;
  quiz_question?: { id: number }[] | null;
};

// Helper function to extract first item from array or return null
function getFirstOrNull<T>(arr: T[] | null | undefined): T | null {
  if (!arr || !Array.isArray(arr)) return null;
  return arr[0] || null;
}

function normalizeQuiz(quizRaw: QuizRowRaw): QuizRow {
  return {
    ...quizRaw,
    subject: getFirstOrNull(quizRaw.subject),
    grade: getFirstOrNull(quizRaw.grade),
    quiz_question: quizRaw.quiz_question || [],
  };
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB');
}

export default function TeacherQuizzesClient() {
  const router = useRouter();
  const params = useParams<{ registration_id: string }>();
  const registrationId = useMemo(() => decodeURIComponent(params?.registration_id ?? ''), [params]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          router.replace('/');
          return;
        }

        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error('No authenticated user.');

        const { data: p } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('user_id', auth.user.id)
          .single();

        if (!p?.school_id) throw new Error('Your account is not linked to a school.');

        const { data: sch, error: schErr } = await supabase
          .from('general_information')
          .select('id, school_name')
          .eq('id', p.school_id)
          .single();

        if (schErr || !sch) throw new Error(schErr?.message || 'School not found.');
        setSchool(sch as SchoolRow);

        const { data: t, error: tErr } = await supabase
          .from('teachers')
          .select('registration_id, first_name, last_name, school_id')
          .eq('registration_id', registrationId)
          .eq('school_id', sch.id)
          .single();

        if (tErr || !t) throw new Error(tErr?.message || 'Teacher not found.');
        setTeacher(t as TeacherRow);

        const { data: rows, error: qErr } = await supabase
          .from('quiz')
          .select(`
            id,
            title,
            description,
            subject_id,
            grade_id,
            time_limit_minutes,
            total_marks,
            is_active,
            created_at,
            subject:subject_id (
              name
            ),
            grade:grade_id (
              grade_name
            ),
            quiz_question(id)
          `)
          .eq('school_id', sch.id)
          .eq('created_by_id', registrationId)
          .order('id', { ascending: false });

        if (qErr) throw qErr;

        // Transform raw quiz data to normalized format
        const rawQuizzes = (rows || []) as unknown as QuizRowRaw[];
        const normalizedQuizzes: QuizRow[] = rawQuizzes.map(normalizeQuiz);
        
        setQuizzes(normalizedQuizzes);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to load quizzes.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [registrationId, router]);

  const filteredQuizzes = useMemo(() => {
    const q = search.toLowerCase();
    return quizzes.filter((quiz) => {
      const hay = [
        quiz.title || '',
        quiz.description || '',
        quiz.subject?.name || '',
        quiz.grade?.grade_name || '',
      ]
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });
  }, [quizzes, search]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-600">Loading quizzes…</div>;
  }

  if (errorMsg || !teacher || !school) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex flex-1">
          <AppShell />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-lg w-full rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600 border border-amber-200">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Could not open quizzes page</h2>
                  <p className="mt-1 text-sm text-slate-600">{errorMsg || 'Unknown error.'}</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <AppShell />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <button
                onClick={() => router.push(`/teachers/${encodeURIComponent(registrationId)}`)}
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Teacher Profile
              </button>

              <h1 className="mt-3 text-2xl font-bold text-slate-900">
                {teacher.first_name} {teacher.last_name} — Quizzes
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {school.school_name} • {quizzes.length} quiz{quizzes.length === 1 ? '' : 'zes'}
              </p>

              <div className="mt-5 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search quizzes..."
                  className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-3 text-sm outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredQuizzes.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                  No quizzes found.
                </div>
              ) : (
                filteredQuizzes.map((quiz) => (
                  <div key={quiz.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{quiz.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {quiz.subject?.name || 'No subject'} • {quiz.grade?.grade_name || 'No class'}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          quiz.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {quiz.is_active ? 'Active' : 'Draft'}
                      </span>
                    </div>

                    {quiz.description ? (
                      <p className="mt-4 text-sm text-slate-700 line-clamp-3">{quiz.description}</p>
                    ) : null}

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Questions</div>
                        <div className="mt-1 font-bold text-slate-900">{quiz.quiz_question?.length ?? 0}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Time</div>
                        <div className="mt-1 font-bold text-slate-900">{quiz.time_limit_minutes || 0} min</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Created</div>
                        <div className="mt-1 font-bold text-slate-900">{formatDate(quiz.created_at)}</div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/quizzes/${quiz.id}`}
                        className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open Quiz
                      </Link>
                      <Link
                        href={`/quizzes/${quiz.id}/edit`}
                        className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
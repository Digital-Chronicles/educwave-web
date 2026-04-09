'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import { ArrowLeft, Calendar, Search, AlertTriangle } from 'lucide-react';

type SchoolRow = { id: string; school_name: string };
type TeacherRow = { registration_id: string; first_name: string; last_name: string; school_id: string };

// Raw type from Supabase (arrays for relations)
type ExamRowRaw = {
  id: number;
  date: string;
  duration_minutes: number;
  description: string | null;
  grade_id: number | null;
  subject_id: number;
  created: string;
  subject: { name: string; code: string | null }[] | null;
  grade: { grade_name: string }[] | null;
};

// Normalized type (objects for relations)
type ExamRow = {
  id: number;
  date: string;
  duration_minutes: number;
  description: string | null;
  grade_id: number | null;
  subject_id: number;
  created: string;
  subject?: { name: string; code: string | null } | null;
  grade?: { grade_name: string } | null;
};

// Helper function to extract first item from array or return null
function getFirstOrNull<T>(arr: T[] | null | undefined): T | null {
  if (!arr || !Array.isArray(arr)) return null;
  return arr[0] || null;
}

function normalizeExam(examRaw: ExamRowRaw): ExamRow {
  return {
    ...examRaw,
    subject: getFirstOrNull(examRaw.subject),
    grade: getFirstOrNull(examRaw.grade),
  };
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB');
}

export default function TeacherExamsClient() {
  const router = useRouter();
  const params = useParams<{ registration_id: string }>();
  const registrationId = useMemo(() => decodeURIComponent(params?.registration_id ?? ''), [params]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [exams, setExams] = useState<ExamRow[]>([]);
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

        const { data: rows, error: eErr } = await supabase
          .from('exam')
          .select(`
            id,
            date,
            duration_minutes,
            description,
            grade_id,
            subject_id,
            created,
            subject:subject_id (
              name,
              code
            ),
            grade:grade_id (
              grade_name
            )
          `)
          .eq('school_id', sch.id)
          .eq('created_by_id', registrationId)
          .order('date', { ascending: false });

        if (eErr) throw eErr;

        // Transform raw exam data to normalized format
        const rawExams = (rows || []) as unknown as ExamRowRaw[];
        const normalizedExams: ExamRow[] = rawExams.map(normalizeExam);
        
        setExams(normalizedExams);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to load exams.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [registrationId, router]);

  const filteredExams = useMemo(() => {
    const q = search.toLowerCase();
    return exams.filter((exam) => {
      const hay = [
        exam.subject?.name || '',
        exam.subject?.code || '',
        exam.grade?.grade_name || '',
        exam.description || '',
      ]
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });
  }, [exams, search]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-600">Loading exams…</div>;
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
                  <h2 className="text-lg font-bold text-slate-900">Could not open exams page</h2>
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
                {teacher.first_name} {teacher.last_name} — Exams
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {school.school_name} • {exams.length} exam{exams.length === 1 ? '' : 's'}
              </p>

              <div className="mt-5 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search exams..."
                  className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-3 text-sm outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredExams.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                  No exams found.
                </div>
              ) : (
                filteredExams.map((exam) => (
                  <div key={exam.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-4">
                        <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{exam.subject?.name || 'Exam'}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {exam.grade?.grade_name || 'No class'} • {exam.subject?.code || 'No code'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-slate-900">{formatDate(exam.date)}</div>
                        <div className="text-sm text-slate-500">{exam.duration_minutes} minutes</div>
                      </div>
                    </div>

                    {exam.description ? (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                        {exam.description}
                      </div>
                    ) : null}
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
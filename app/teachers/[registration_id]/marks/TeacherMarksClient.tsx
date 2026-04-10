'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft,
  FileBarChart2,
  BookOpen,
  Users,
  School,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  school_id: string | null;
};

type SchoolRow = {
  id: string;
  school_name: string;
};

type TeacherRow = {
  registration_id: string;
  first_name: string;
  last_name: string;
  school_id: string;
};

// Raw type from Supabase (arrays for relations)
type SubjectRowRaw = {
  id: number;
  name: string;
  code: string | null;
  grade_id: number | null;
  teacher_id: string | null;
  grade: { grade_name: string }[] | null;
};

// Normalized type (object for relation)
type SubjectRow = {
  id: number;
  name: string;
  code: string | null;
  grade_id: number | null;
  teacher_id: string | null;
  grade?: { grade_name: string } | null;
};

type QuestionRow = {
  id: number;
  subject_id: number | null;
  grade_id: number;
  max_score: number;
};

type ResultRow = {
  id: number;
  student_id: string;
  question_id: number | null;
  grade_id: number;
  exam_session_id: number | null;
  score: number;
};

// Helper function to extract first item from array or return null
function getFirstOrNull<T>(arr: T[] | null | undefined): T | null {
  if (!arr || !Array.isArray(arr)) return null;
  return arr[0] || null;
}

function normalizeSubject(subjectRaw: SubjectRowRaw): SubjectRow {
  return {
    ...subjectRaw,
    grade: getFirstOrNull(subjectRaw.grade),
  };
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

export default function TeacherMarksClient() {
  const router = useRouter();
  const params = useParams<{ registration_id: string }>();

  const registrationId = useMemo(() => {
    const raw = params?.registration_id ?? '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);

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
        if (!auth.user) throw new Error('No authenticated user found.');

        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id,email,full_name,role,school_id')
          .eq('user_id', auth.user.id)
          .single();

        if (pErr || !p) throw new Error(pErr?.message || 'Profile not found.');
        setProfile(p as ProfileRow);

        if (!p.school_id) throw new Error('Your account is not linked to a school.');

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

        const { data: subjectRows, error: subErr } = await supabase
          .from('subject')
          .select(`
            id,
            name,
            code,
            grade_id,
            teacher_id,
            grade:grade_id (
              grade_name
            )
          `)
          .eq('school_id', sch.id)
          .eq('teacher_id', registrationId)
          .order('name');

        if (subErr) throw subErr;
        
        // Transform raw subject data to normalized format
        const rawSubjects = (subjectRows || []) as unknown as SubjectRowRaw[];
        const normalizedSubjects: SubjectRow[] = rawSubjects.map(normalizeSubject);
        setSubjects(normalizedSubjects);

        const subjectIds = normalizedSubjects.map((s) => s.id);

        if (subjectIds.length === 0) {
          setQuestions([]);
          setResults([]);
          setLoading(false);
          return;
        }

        const { data: qRows, error: qErr } = await supabase
          .from('assessment_question')
          .select('id, subject_id, grade_id, max_score')
          .eq('school_id', sch.id)
          .in('subject_id', subjectIds);

        if (qErr) throw qErr;
        const questionData = (qRows as QuestionRow[]) || [];
        setQuestions(questionData);

        const questionIds = questionData.map((q) => q.id);
        if (questionIds.length === 0) {
          setResults([]);
          setLoading(false);
          return;
        }

        const { data: rRows, error: rErr } = await supabase
          .from('assessment_examresult')
          .select('id, student_id, question_id, grade_id, exam_session_id, score')
          .eq('school_id', sch.id)
          .in('question_id', questionIds);

        if (rErr) throw rErr;
        setResults((rRows as ResultRow[]) || []);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to load teacher marks.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [registrationId, router]);

  const questionMap = useMemo(() => {
    const map = new Map<number, QuestionRow>();
    questions.forEach((q) => map.set(q.id, q));
    return map;
  }, [questions]);

  const subjectStats = useMemo(() => {
    return subjects
      .map((subject) => {
        const subjectQuestions = questions.filter((q) => q.subject_id === subject.id);
        const subjectQuestionIds = new Set(subjectQuestions.map((q) => q.id));
        const subjectResults = results.filter((r) => r.question_id && subjectQuestionIds.has(r.question_id));

        const totalScore = subjectResults.reduce((sum, r) => sum + Number(r.score || 0), 0);
        const avgScore = subjectResults.length ? totalScore / subjectResults.length : 0;
        const students = new Set(subjectResults.map((r) => r.student_id)).size;

        return {
          subject,
          questions: subjectQuestions.length,
          results: subjectResults.length,
          students,
          avgScore: avgScore.toFixed(1),
        };
      })
      .filter((row) => {
        const hay = `${row.subject.name} ${row.subject.code || ''} ${row.subject.grade?.grade_name || ''}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      });
  }, [subjects, questions, results, search]);

  const totalStudents = useMemo(() => new Set(results.map((r) => r.student_id)).size, [results]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-600">Loading marks page…</div>
      </div>
    );
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
                  <h2 className="text-lg font-bold text-slate-900">Could not open marks page</h2>
                  <p className="mt-1 text-sm text-slate-600">{errorMsg || 'Unknown error.'}</p>
                  <button
                    onClick={() => router.push('/teachers')}
                    className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    Back to Teachers
                  </button>
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
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <button
                    onClick={() => router.push(`/teachers/${encodeURIComponent(registrationId)}`)}
                    className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Teacher Profile
                  </button>

                  <h1 className="mt-3 text-2xl font-bold text-slate-900">
                    {teacher.first_name} {teacher.last_name} — Marks Overview
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    {school.school_name} • {teacher.registration_id}
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
                  Teacher Subjects: <span className="font-semibold">{subjects.length}</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard title="Assigned Subjects" value={subjects.length} subtitle="Subjects linked to this teacher" />
                <StatCard title="Assessment Questions" value={questions.length} subtitle="Questions in assigned subjects" />
                <StatCard title="Marks Records" value={results.length} subtitle="Results tied to those questions" />
                <StatCard title="Students Covered" value={totalStudents} subtitle="Unique students in records" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by subject or class..."
                  className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-3 text-sm outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {subjectStats.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                  No marks data found for this teacher.
                </div>
              ) : (
                subjectStats.map((row) => (
                  <div key={row.subject.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{row.subject.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {row.subject.code || 'No code'} • {row.subject.grade?.grade_name || 'No class'}
                        </p>
                      </div>
                      <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Avg {row.avgScore}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Questions</div>
                        <div className="mt-1 font-bold text-slate-900">{row.questions}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Results</div>
                        <div className="mt-1 font-bold text-slate-900">{row.results}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Students</div>
                        <div className="mt-1 font-bold text-slate-900">{row.students}</div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href="/assessments"
                        className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open Assessments
                      </Link>
                      <Link
                        href="/assessments/percentage-entry"
                        className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Percentage Entry
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
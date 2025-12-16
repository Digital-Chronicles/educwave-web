'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  Filter,
  Loader2,
  Save,
  Search,
  Users,
  XCircle,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  school_id: string | null;
}

interface SchoolRow {
  id: string;
  school_name: string;
}

interface GradeRow {
  id: number;
  grade_name: string;
}

interface SubjectRow {
  id: number;
  name: string;
  grade_id: number | null;
  grade?: { grade_name: string } | null;
}

interface TermExamRow {
  id: number;
  term_name: 'TERM_1' | 'TERM_2' | 'TERM_3';
  year: number;
}

interface ExamSessionRow {
  id: number;
  term_id: number;
  exam_type: 'BOT' | 'MOT' | 'EOT';
  term?: { term_name: string; year: number } | null;
}

interface StudentRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  current_grade_id: number | null;
}

interface QuestionRow {
  id: number;
  question_number: string;
  topic_id: number | null;
  max_score: number;
  topic?: { name: string } | null;
}

type MarksMap = Record<string, Record<number, number | ''>>;

export default function MarksEntryPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Base data
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [termExams, setTermExams] = useState<TermExamRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);

  // Grid data
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [marks, setMarks] = useState<MarksMap>({});
  const [saving, setSaving] = useState(false);

  // Filters
  const [termExamId, setTermExamId] = useState('');
  const [examSessionId, setExamSessionId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // 1️⃣ Auth check
  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/');
        return;
      }

      setUserEmail(session.user.email ?? null);
      setAuthChecking(false);
    };

    run();
  }, [router]);

  // 2️⃣ Load profile + base data
  useEffect(() => {
    if (authChecking) return;

    const loadBase = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) {
        setErrorMsg(userErr.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setErrorMsg('Could not find authenticated user.');
        setLoading(false);
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, role, school_id')
        .eq('user_id', user.id)
        .single();

      if (pErr || !p) {
        setErrorMsg(pErr?.message || 'Profile not found.');
        setLoading(false);
        return;
      }

      const prof = p as ProfileRow;
      setProfile(prof);

      if (!prof.school_id) {
        setSchool(null);
        setLoading(false);
        return;
      }

      const { data: s, error: sErr } = await supabase
        .from('general_information')
        .select('id, school_name')
        .eq('id', prof.school_id)
        .single();

      if (sErr || !s) {
        setErrorMsg(sErr?.message || 'Failed to load your school information.');
        setLoading(false);
        return;
      }

      const schoolData = s as SchoolRow;
      setSchool(schoolData);

      try {
        const { data: gradeRows, error: gradesError } = await supabase
          .from('class')
          .select('id, grade_name')
          .eq('school_id', schoolData.id)
          .order('grade_name');

        if (gradesError) throw gradesError;
        setGrades((gradeRows ?? []) as GradeRow[]);

        const { data: subjectRows, error: subjectsError } = await supabase
          .from('subject')
          .select(
            `
            id,
            name,
            grade_id,
            grade:class ( grade_name )
          `
          )
          .eq('school_id', schoolData.id)
          .order('name');

        if (subjectsError) throw subjectsError;
        setSubjects((subjectRows ?? []) as unknown as SubjectRow[]);

        const { data: termRows, error: termError } = await supabase
          .from('term_exam_session')
          .select('id, term_name, year')
          .eq('school_id', schoolData.id)
          .order('year', { ascending: false })
          .order('term_name');

        if (termError) throw termError;
        setTermExams((termRows ?? []) as TermExamRow[]);

        // exam_session has term_id FK to term_exam_session
        const { data: examSessRows, error: examSessError } = await supabase
          .from('exam_session')
          .select(
            `
            id,
            term_id,
            exam_type,
            term:term_exam_session ( term_name, year )
          `
          )
          .eq('school_id', schoolData.id)
          .order('id', { ascending: false });

        if (examSessError) throw examSessError;
        setExamSessions((examSessRows ?? []) as unknown as ExamSessionRow[]);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load base data.');
      } finally {
        setLoading(false);
      }
    };

    loadBase();
  }, [authChecking]);

  // Derived
  const subjectsForGrade = useMemo(() => {
    if (!gradeId) return subjects;
    return subjects.filter((s) => s.grade_id === Number(gradeId));
  }, [subjects, gradeId]);

  const selectedExamSession = useMemo(() => {
    if (!examSessionId) return null;
    return examSessions.find((x) => x.id === Number(examSessionId)) ?? null;
  }, [examSessions, examSessionId]);

  // We require term + exam session + grade + subject.
  // Additionally, exam_session.term_id MUST match selected termExamId (to avoid mistakes)
  const canLoadGrid = useMemo(() => {
    if (!school?.id || !termExamId || !examSessionId || !gradeId || !subjectId) return false;
    if (!selectedExamSession) return false;
    return Number(termExamId) === Number(selectedExamSession.term_id);
  }, [school?.id, termExamId, examSessionId, gradeId, subjectId, selectedExamSession]);

  // 3️⃣ Load grid (students + questions)
  useEffect(() => {
    if (!school?.id) return;

    if (!canLoadGrid) {
      setStudents([]);
      setQuestions([]);
      setMarks({});
      return;
    }

    const run = async () => {
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const { data: studentRows, error: sErr } = await supabase
          .from('students')
          .select('registration_id, first_name, last_name, current_grade_id')
          .eq('school_id', school.id)
          .eq('current_grade_id', Number(gradeId))
          .order('first_name');

        if (sErr) throw sErr;

        // QUESTIONS are based on term_exam_id + exam_type_id (your assessment_question design)
        const { data: questionRows, error: qErr } = await supabase
          .from('assessment_question')
          .select(
            `
            id,
            question_number,
            topic_id,
            max_score,
            topic:assessment_topics ( name )
          `
          )
          .eq('school_id', school.id)
          .eq('grade_id', Number(gradeId))
          .eq('subject_id', Number(subjectId))
          .eq('term_exam_id', Number(termExamId))
          .eq('exam_type_id', Number(examSessionId))
          .order('id', { ascending: true });

        if (qErr) throw qErr;

        const st = (studentRows ?? []) as StudentRow[];
        const qs = (questionRows ?? []) as unknown as QuestionRow[];

        setStudents(st);
        setQuestions(qs);

        // init marks map
        const initial: MarksMap = {};
        for (const s of st) {
          initial[s.registration_id] = {};
          for (const q of qs) initial[s.registration_id][q.id] = '';
        }
        setMarks(initial);

        // Prefill existing marks (edit mode)
        const { data: existing, error: exErr } = await supabase
          .from('assessment_examresult')
          .select('student_id, question_id, score')
          .eq('school_id', school.id)
          .eq('exam_session_id', Number(examSessionId))
          .eq('grade_id', Number(gradeId))
          .eq('subject_id', Number(subjectId));

        if (exErr) throw exErr;

        if (existing?.length) {
          setMarks((prev) => {
            // structuredClone is supported in modern browsers; fallback manual clone:
            const copy: MarksMap = {};
            for (const sid of Object.keys(prev)) copy[sid] = { ...prev[sid] };

            for (const r of existing as any[]) {
              if (copy[r.student_id]?.[r.question_id] !== undefined) {
                copy[r.student_id][r.question_id] = r.score ?? '';
              }
            }
            return copy;
          });
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load marks grid.');
      }
    };

    run();
  }, [canLoadGrid, school?.id, termExamId, examSessionId, gradeId, subjectId]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      return name.includes(q) || s.registration_id.toLowerCase().includes(q);
    });
  }, [students, studentSearch]);

  // ✅ Totals alongside names
  const perStudentTotals = useMemo(() => {
    const totals: Record<string, { score: number; possible: number; percent: number }> = {};

    for (const st of filteredStudents) {
      let score = 0;
      let possible = 0;

      for (const q of questions) {
        const v = marks?.[st.registration_id]?.[q.id];
        const s = v === '' || v === undefined || v === null ? null : Number(v);
        if (s !== null && Number.isFinite(s)) score += s;
        possible += Number(q.max_score ?? 0);
      }

      const percent = possible > 0 ? (score / possible) * 100 : 0;
      totals[st.registration_id] = {
        score,
        possible,
        percent: Number(percent.toFixed(2)),
      };
    }

    return totals;
  }, [filteredStudents, questions, marks]);

  const totalCells = useMemo(
    () => filteredStudents.length * questions.length,
    [filteredStudents.length, questions.length]
  );

  const filledCells = useMemo(() => {
    let c = 0;
    for (const st of filteredStudents) {
      for (const q of questions) {
        const v = marks?.[st.registration_id]?.[q.id];
        if (v !== '' && v !== undefined && v !== null) c++;
      }
    }
    return c;
  }, [filteredStudents, questions, marks]);

  const setScore = (studentId: string, questionId: number, value: string) => {
    const num = value === '' ? '' : Number(value);
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [questionId]: num === '' ? '' : Number.isFinite(num) ? num : '',
      },
    }));
  };

  const handleSave = async () => {
    if (!school?.id) return;

    if (!canLoadGrid) {
      setErrorMsg('Select Term, Exam Session (matching term), Grade and Subject first.');
      return;
    }

    if (questions.length === 0) {
      setErrorMsg('No questions found for the selected filters.');
      return;
    }

    if (filteredStudents.length === 0) {
      setErrorMsg('No students found for that grade.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const rows: any[] = [];

      for (const st of filteredStudents) {
        for (const q of questions) {
          const v = marks?.[st.registration_id]?.[q.id];
          if (v === '' || v === undefined || v === null) continue;

          const max = Number(q.max_score ?? 0);
          const score = Number(v);

          if (Number.isNaN(score)) continue;

          if (score < 0 || score > max) {
            throw new Error(
              `Invalid score for ${st.first_name} ${st.last_name} (Q${q.question_number}). Must be 0 to ${max}.`
            );
          }

          rows.push({
            student_id: st.registration_id,
            question_id: q.id,
            grade_id: Number(gradeId),
            subject_id: Number(subjectId),
            topic_id: q.topic_id ?? null,
            exam_session_id: Number(examSessionId), // ✅ correct column
            score,
            max_possible: max,
            percentage: max > 0 ? Number(((score / max) * 100).toFixed(2)) : null,
            school_id: school.id,
          });
        }
      }

      if (rows.length === 0) {
        setErrorMsg('Nothing to save. Enter at least one mark.');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('assessment_examresult')
        .upsert(rows, {
          // ✅ must match UNIQUE constraint
          onConflict: 'school_id,student_id,question_id,exam_session_id',
        });

      if (error) throw error;

      setSuccessMsg(`Saved ${rows.length} marks successfully.`);
    } catch (err: any) {
      const msg = err?.message || 'Failed to save marks.';
      if (msg.toLowerCase().includes('onconflict') || msg.toLowerCase().includes('unique')) {
        setErrorMsg(
          'Upsert failed. Add this UNIQUE constraint: UNIQUE(school_id, student_id, question_id, exam_session_id).'
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading Marks Entry...</p>
        </div>
      </div>
    );
  }

  // No school configured
  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar userEmail={userEmail} />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                School Configuration Required
              </h3>
              <p className="text-gray-600 mb-6">
                Your account needs to be linked to a school before entering marks.
              </p>

              {errorMsg && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                  <p className="text-sm text-red-600">{errorMsg}</p>
                </div>
              )}

              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Settings
              </button>

              <p className="mt-4 text-xs text-gray-500">
                Signed in as <span className="font-medium">{userEmail ?? '—'}</span>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={userEmail} />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Link
                    href="/assessments"
                    className="hover:text-gray-700 inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Assessments
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-gray-700 font-medium">Enter Marks</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Marks Entry</h1>
                <p className="text-gray-600">
                  Enter and save marks for <span className="font-medium">{school.school_name}</span>
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !canLoadGrid}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Marks'}
              </button>
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <p className="text-sm text-green-700">{successMsg}</p>
              </div>
            )}

            {/* Filters card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <h2 className="font-semibold text-gray-900">Select Assessment</h2>
                </div>
                <div className="text-sm text-gray-500">
                  {termExamId && examSessionId && selectedExamSession && Number(termExamId) !== Number(selectedExamSession.term_id)
                    ? 'Exam Session does not match Term'
                    : canLoadGrid
                    ? 'Ready'
                    : 'Pick all fields'}
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Term Exam *</label>
                  <select
                    value={termExamId}
                    onChange={(e) => setTermExamId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select term</option>
                    {termExams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.term_name.replace('_', ' ')} {t.year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Session *</label>
                  <select
                    value={examSessionId}
                    onChange={(e) => setExamSessionId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select session</option>
                    {examSessions.map((es) => (
                      <option key={es.id} value={es.id}>
                        {es.exam_type}
                        {es.term ? ` — ${es.term.term_name.replace('_', ' ')} ${es.term.year}` : ''}
                      </option>
                    ))}
                  </select>
                  {termExamId &&
                    examSessionId &&
                    selectedExamSession &&
                    Number(termExamId) !== Number(selectedExamSession.term_id) && (
                      <p className="text-xs text-red-600 mt-2">
                        This exam session belongs to a different term. Pick the correct session.
                      </p>
                    )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade / Class *</label>
                  <select
                    value={gradeId}
                    onChange={(e) => {
                      setGradeId(e.target.value);
                      setSubjectId('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select grade</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.grade_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select subject</option>
                    {subjectsForGrade.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.grade?.grade_name ? ` (${s.grade.grade_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    {filteredStudents.length} Students
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{filteredStudents.length}</h3>
                <p className="text-sm text-gray-500">Students in selected grade</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <BookOpen className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                    {questions.length} Questions
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{questions.length}</h3>
                <p className="text-sm text-gray-500">Questions matched by filters</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                    {totalCells ? `${filledCells}/${totalCells}` : '—'}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {totalCells ? `${Math.round((filledCells / totalCells) * 100)}%` : '—'}
                </h3>
                <p className="text-sm text-gray-500">Marks filled (filtered view)</p>
              </div>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Enter Marks</h3>
                  <p className="text-sm text-gray-500">
                    Totals and percentage are shown next to each student name.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student name or reg no..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
                  />
                </div>
              </div>

              {!canLoadGrid ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  Select <span className="font-medium">Term</span>,{' '}
                  <span className="font-medium">Exam Session (matching term)</span>,{' '}
                  <span className="font-medium">Grade</span>, and <span className="font-medium">Subject</span> to
                  load the marks grid.
                </div>
              ) : questions.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  No questions found for the selected filters. Create questions first.
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  No students found (or search returned none).
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[340px]">
                          <div className="flex items-center justify-between gap-4">
                            <span>Student</span>
                            <div className="flex items-center gap-6 text-xs text-gray-500">
                              <span className="w-20 text-right">Total</span>
                              <span className="w-14 text-right">%</span>
                            </div>
                          </div>
                        </th>

                        {questions.map((q) => (
                          <th key={q.id} className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                            <div className="flex flex-col">
                              <span>Q{q.question_number}</span>
                              <span className="text-xs text-gray-500">
                                Max: {q.max_score}
                                {q.topic?.name ? ` • ${q.topic.name}` : ''}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {filteredStudents.map((st) => (
                        <tr key={st.registration_id} className="hover:bg-gray-50">
                          {/* Student + Total + % */}
                          <td className="py-3 px-4 sticky left-0 bg-white z-10 min-w-[340px]">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {st.first_name} {st.last_name}
                                </div>
                                <div className="text-xs text-gray-500">{st.registration_id}</div>
                              </div>

                              <div className="flex items-center gap-6">
                                <div className="w-20 text-right">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {perStudentTotals[st.registration_id]?.score ?? 0}
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    / {perStudentTotals[st.registration_id]?.possible ?? 0}
                                  </div>
                                </div>

                                <div className="w-14 text-right">
                                  <span
                                    className={`inline-flex items-center justify-end px-2 py-1 rounded-full text-xs font-medium ${
                                      (perStudentTotals[st.registration_id]?.percent ?? 0) >= 50
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-red-50 text-red-700'
                                    }`}
                                  >
                                    {(perStudentTotals[st.registration_id]?.percent ?? 0).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Marks cells */}
                          {questions.map((q) => {
                            const v = marks?.[st.registration_id]?.[q.id] ?? '';
                            const max = Number(q.max_score ?? 0);
                            const invalid = v !== '' && (Number(v) < 0 || Number(v) > max);

                            return (
                              <td key={q.id} className="py-3 px-4">
                                <input
                                  value={v}
                                  onChange={(e) => setScore(st.registration_id, q.id, e.target.value)}
                                  type="number"
                                  min={0}
                                  max={max}
                                  className={`w-24 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                                    invalid
                                      ? 'border-red-300 focus:ring-red-300'
                                      : 'border-gray-300 focus:ring-blue-500'
                                  }`}
                                  placeholder="—"
                                />
                                {invalid && <div className="text-xs text-red-600 mt-1">0–{max}</div>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-5 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-gray-600">
                  {canLoadGrid ? (
                    <>
                      Filled <span className="font-medium">{filledCells}</span> of{' '}
                      <span className="font-medium">{totalCells}</span> visible cells
                    </>
                  ) : (
                    '—'
                  )}
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !canLoadGrid}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Note: Exam Session must match the selected Term (we enforce this to avoid mixing data).
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

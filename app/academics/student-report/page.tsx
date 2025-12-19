'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  GraduationCap,
  Printer,
  TrendingUp,
  User,
  School,
  Hash,
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
  location?: string | null;
  contact_number?: string | null;
  email?: string | null;
  website?: string | null;
  school_badge?: string | null;
}

interface GradeRow {
  id: number;
  grade_name: string;
}

interface SubjectRow {
  id: number;
  name: string;
  grade_id: number | null;
}

interface TermExamRow {
  id: number;
  term_name: 'TERM_1' | 'TERM_2' | 'TERM_3';
  year: number;
  start_date: string;
  end_date: string;
}

interface ExamSessionRow {
  id: number;
  exam_type: 'BOT' | 'MOT' | 'EOT';
  term_id: number;
  term?: { term_name: string; year: number } | null;
  start_date: string;
  end_date: string;
}

interface StudentRow {
  registration_id: string;
  first_name: string;
  last_name: string;
}

interface QuestionRow {
  id: number;
  max_score: number;
  grade_id: number;
  subject_id: number | null;
}

interface ExamResultRow {
  id: number;
  student_id: string;
  question_id: number | null;
  grade_id: number;
  subject_id: number | null;
  exam_session_id: number | null;
  score: number;
}

interface ReportCardRow {
  id: number;
  class_teacher_comment: string | null;
  headteacher_comment: string | null;
  subject_comments: any | null;
}

/** -----------------------------------------
 * Helpers
 * ---------------------------------------- */
const fmtName = (s: StudentRow) => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim();

function termLabel(t?: TermExamRow | null) {
  if (!t) return '—';
  if (t.term_name === 'TERM_1') return `Term 1 • ${t.year}`;
  if (t.term_name === 'TERM_2') return `Term 2 • ${t.year}`;
  return `Term 3 • ${t.year}`;
}

function examTypeLabel(t: 'BOT' | 'MOT' | 'EOT') {
  if (t === 'BOT') return 'B.O.T';
  if (t === 'MOT') return 'M.O.T';
  return 'E.O.T';
}

// UNEB grading (simple)
function unebSubjectGrade(pct: number): number {
  if (pct >= 80) return 1;
  if (pct >= 70) return 2;
  if (pct >= 60) return 3;
  if (pct >= 50) return 4;
  if (pct >= 45) return 5;
  if (pct >= 40) return 6;
  if (pct >= 30) return 7;
  if (pct >= 20) return 8;
  return 9;
}

function unebGradeText(g: number) {
  if (g === 1) return 'D1';
  if (g === 2) return 'D2';
  if (g === 3) return 'C3';
  if (g === 4) return 'C4';
  if (g === 5) return 'P5';
  if (g === 6) return 'P6';
  return `F${g}`;
}

function unebDivisionFromAggregate(agg: number) {
  if (agg >= 4 && agg <= 12) return 'Division 1';
  if (agg >= 13 && agg <= 23) return 'Division 2';
  if (agg >= 24 && agg <= 29) return 'Division 3';
  if (agg >= 30 && agg <= 34) return 'Division 4';
  return 'U';
}

function subjectRemarkFromGrade(g: number) {
  if (g <= 2) return 'Excellent work.';
  if (g <= 4) return 'Good effort.';
  if (g <= 6) return 'Fair attempt.';
  return 'Weak. Improve.';
}

function overallRemark(pct: number) {
  if (pct >= 85) return 'Outstanding performance. Maintain the excellent effort.';
  if (pct >= 75) return 'Very good overall. With more focus, you can reach the top.';
  if (pct >= 60) return 'Average performance. Improve revision habits and class participation.';
  if (pct >= 50) return 'Below expectations. More practice is required across subjects.';
  return 'Weak overall performance. A serious improvement plan is required.';
}

function gradePillClass(txt: string) {
  if (txt.startsWith('D')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (txt.startsWith('C')) return 'bg-blue-50 text-blue-700 ring-blue-200';
  if (txt.startsWith('P')) return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-rose-50 text-rose-700 ring-rose-200';
}

function divisionPillClass(division: string) {
  if (division === 'Division 1') return 'bg-emerald-600';
  if (division === 'Division 2') return 'bg-blue-600';
  if (division === 'Division 3') return 'bg-amber-600';
  if (division === 'Division 4') return 'bg-orange-600';
  return 'bg-slate-600';
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function tinyToast(message: string) {
  const el = document.createElement('div');
  el.className =
    'fixed top-4 right-4 z-[9999] rounded-xl bg-slate-900 text-white px-4 py-3 shadow-2xl flex items-center gap-2';
  el.innerHTML = `<span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">✓</span><span class="text-sm">${message}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/** -----------------------------------------
 * Student Autocomplete
 * ---------------------------------------- */
function StudentAutocomplete({
  value,
  onChange,
  disabled,
  items,
  placeholder = 'Search student by name or Reg No…',
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  items: StudentRow[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => items.find((s) => s.registration_id === value) ?? null,
    [items, value]
  );

  useEffect(() => {
    if (selected) setQuery(`${fmtName(selected)} — ${selected.registration_id}`);
    else setQuery('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.registration_id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 25);
    return items
      .filter((s) => {
        const name = fmtName(s).toLowerCase();
        const reg = s.registration_id.toLowerCase();
        return name.includes(q) || reg.includes(q);
      })
      .slice(0, 25);
  }, [items, query]);

  return (
    <div className="relative">
      <div className="relative">
        <User className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50"
        />
        <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
      </div>

      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="max-h-72 overflow-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-600">No matches</div>
              ) : (
                filtered.map((s) => {
                  const isActive = s.registration_id === value;
                  return (
                    <button
                      key={s.registration_id}
                      type="button"
                      onClick={() => {
                        onChange(s.registration_id);
                        setOpen(false);
                      }}
                      className={[
                        'w-full text-left px-4 py-3 flex items-center justify-between gap-3',
                        'hover:bg-slate-50',
                        isActive ? 'bg-slate-50' : 'bg-white',
                      ].join(' ')}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{fmtName(s)}</div>
                        <div className="text-xs text-slate-500 truncate">{s.registration_id}</div>
                      </div>

                      {isActive && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** -----------------------------------------
 * Page
 * ---------------------------------------- */
export default function StudentReportPage() {
  const router = useRouter();
  const a4Ref = useRef<HTMLDivElement | null>(null);

  // Session
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Data
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [terms, setTerms] = useState<TermExamRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [results, setResults] = useState<ExamResultRow[]>([]);

  // UI
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedExamSessionId, setSelectedExamSessionId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [reportRowId, setReportRowId] = useState<number | null>(null);
  const [teacherComment, setTeacherComment] = useState('');
  const [headComment, setHeadComment] = useState('');
  const [savingComments, setSavingComments] = useState(false);

  /** Auth */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/');
        return;
      }
      setUserEmail(data.session.user.email ?? null);
      setAuthChecking(false);
    })();
  }, [router]);

  /** Profile + Setup */
  useEffect(() => {
    if (authChecking) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: userData, error: uErr } = await supabase.auth.getUser();
        if (uErr || !userData.user) throw new Error(uErr?.message || 'Could not load user.');

        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id')
          .eq('user_id', userData.user.id)
          .single();

        if (pErr || !p) throw new Error(pErr?.message || 'Profile not found.');
        const prof = p as ProfileRow;
        setProfile(prof);

        if (!prof.school_id) {
          setSchool(null);
          return;
        }

        const { data: s, error: sErr } = await supabase
          .from('general_information')
          .select('id, school_name, location, contact_number, email, website, school_badge')
          .eq('id', prof.school_id)
          .single();

        if (sErr || !s) throw new Error(sErr?.message || 'School settings not found.');
        const sch = s as SchoolRow;
        setSchool(sch);

        const [gradeRes, subjectRes, termRes, examSessRes] = await Promise.all([
          supabase.from('class').select('id, grade_name').eq('school_id', sch.id).order('grade_name'),
          supabase.from('subject').select('id, name, grade_id').eq('school_id', sch.id).order('name'),
          supabase
            .from('term_exam_session')
            .select('id, term_name, year, start_date, end_date')
            .eq('school_id', sch.id)
            .order('year', { ascending: false })
            .order('term_name'),
          supabase
            .from('exam_session')
            .select(`id, term_id, exam_type, start_date, end_date, term:term_exam_session ( term_name, year )`)
            .eq('school_id', sch.id)
            .order('id', { ascending: false }),
        ]);

        if (gradeRes.error) throw gradeRes.error;
        if (subjectRes.error) throw subjectRes.error;
        if (termRes.error) throw termRes.error;
        if (examSessRes.error) throw examSessRes.error;

        setGrades((gradeRes.data ?? []) as GradeRow[]);
        setSubjects((subjectRes.data ?? []) as SubjectRow[]);
        setTerms((termRes.data ?? []) as TermExamRow[]);
        setExamSessions((examSessRes.data ?? []) as unknown as ExamSessionRow[]);
      } catch (e: any) {
        setErrorMsg(e.message || 'Failed to load setup.');
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecking]);

  const selectedTerm = useMemo(
    () => (selectedTermId ? terms.find((t) => t.id === Number(selectedTermId)) ?? null : null),
    [terms, selectedTermId]
  );
  const selectedGrade = useMemo(
    () => (selectedGradeId ? grades.find((g) => g.id === Number(selectedGradeId)) ?? null : null),
    [grades, selectedGradeId]
  );
  const selectedExamSession = useMemo(
    () => (selectedExamSessionId ? examSessions.find((e) => e.id === Number(selectedExamSessionId)) ?? null : null),
    [examSessions, selectedExamSessionId]
  );

  const subjectsForGrade = useMemo(() => {
    if (!selectedGradeId) return [];
    return subjects.filter((s) => s.grade_id === Number(selectedGradeId));
  }, [subjects, selectedGradeId]);

  const examSessionsForTerm = useMemo(() => {
    if (!selectedTermId) return [];
    return examSessions.filter((es) => es.term_id === Number(selectedTermId));
  }, [examSessions, selectedTermId]);

  const canLoad = useMemo(
    () => Boolean(school?.id && selectedGradeId && selectedTermId && selectedExamSessionId),
    [school?.id, selectedGradeId, selectedTermId, selectedExamSessionId]
  );

  /** Fetch students + questions + results */
  useEffect(() => {
    if (!school?.id) return;

    (async () => {
      setErrorMsg(null);

      if (!canLoad) {
        setStudents([]);
        setQuestions([]);
        setResults([]);
        setSelectedStudentId('');
        setReportRowId(null);
        setTeacherComment('');
        setHeadComment('');
        return;
      }

      setLoading(true);
      try {
        const gradeId = Number(selectedGradeId);
        const termId = Number(selectedTermId);
        const examSessionId = Number(selectedExamSessionId);

        const studentsRes = await supabase
          .from('students')
          .select('registration_id, first_name, last_name')
          .eq('school_id', school.id)
          .eq('current_grade_id', gradeId)
          .order('first_name');

        if (studentsRes.error) throw studentsRes.error;

        const questionsRes = await supabase
          .from('assessment_question')
          .select('id, max_score, grade_id, subject_id')
          .eq('school_id', school.id)
          .eq('grade_id', gradeId)
          .eq('term_exam_id', termId)
          .eq('exam_type_id', examSessionId);

        if (questionsRes.error) throw questionsRes.error;

        const qRows = (questionsRes.data ?? []) as QuestionRow[];
        const qIds = qRows.map((q) => q.id);

        const resultsRes =
          qIds.length === 0
            ? { data: [], error: null }
            : await supabase
                .from('assessment_examresult')
                .select('id, student_id, question_id, grade_id, subject_id, exam_session_id, score')
                .eq('school_id', school.id)
                .eq('grade_id', gradeId)
                .eq('exam_session_id', examSessionId)
                .in('question_id', qIds);

        if ((resultsRes as any).error) throw (resultsRes as any).error;

        const stuRows = (studentsRes.data ?? []) as StudentRow[];
        setStudents(stuRows);
        setQuestions(qRows);
        setResults(((resultsRes as any).data ?? []) as ExamResultRow[]);

        if (!selectedStudentId && stuRows.length > 0) setSelectedStudentId(stuRows[0].registration_id);
      } catch (e: any) {
        setErrorMsg(e.message || 'Failed to load report data.');
        setStudents([]);
        setQuestions([]);
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school?.id, canLoad, selectedGradeId, selectedTermId, selectedExamSessionId]);

  const selectedStudent = useMemo(
    () => (selectedStudentId ? students.find((s) => s.registration_id === selectedStudentId) ?? null : null),
    [students, selectedStudentId]
  );

  /** Aggregations */
  const possiblePerSubject = useMemo(() => {
    const m = new Map<number, number>();
    for (const q of questions) {
      const sid = Number(q.subject_id ?? 0);
      if (!sid) continue;
      m.set(sid, (m.get(sid) ?? 0) + Number(q.max_score ?? 0));
    }
    return m;
  }, [questions]);

  const questionToSubject = useMemo(() => {
    const m = new Map<number, number>();
    for (const q of questions) {
      const sid = Number(q.subject_id ?? 0);
      if (!sid) continue;
      m.set(q.id, sid);
    }
    return m;
  }, [questions]);

  const totalsByStudent = useMemo(() => {
    const sum = new Map<string, Map<number, number>>();
    for (const r of results) {
      if (!r.question_id) continue;
      const sid = questionToSubject.get(Number(r.question_id));
      if (!sid) continue;
      if (!sum.has(r.student_id)) sum.set(r.student_id, new Map());
      const mm = sum.get(r.student_id)!;
      mm.set(sid, (mm.get(sid) ?? 0) + Number(r.score ?? 0));
    }
    return sum;
  }, [results, questionToSubject]);

  const subjectRowsForStudent = useMemo(() => {
    if (!selectedStudent) return [];
    const sidMap = totalsByStudent.get(selectedStudent.registration_id) ?? new Map();

    // Keep it compact for single A4 page: subject name + totals + UNEB grade only
    return subjectsForGrade.map((sub) => {
      const total = Number(sidMap.get(sub.id) ?? 0);
      const possible = Number(possiblePerSubject.get(sub.id) ?? 0);
      const pct = possible > 0 ? (total / possible) * 100 : 0;

      const g = unebSubjectGrade(pct);
      const txt = unebGradeText(g);

      return {
        subject_id: sub.id,
        subject_name: sub.name,
        total,
        possible,
        pct,
        uneb_grade: g,
        uneb_text: txt,
        remark: subjectRemarkFromGrade(g),
        pill: gradePillClass(txt),
      };
    });
  }, [selectedStudent, totalsByStudent, subjectsForGrade, possiblePerSubject]);

  const overall = useMemo(() => {
    if (!selectedStudent) return { total: 0, possible: 0, pct: 0 };
    const total = subjectRowsForStudent.reduce((a, r) => a + r.total, 0);
    const possible = subjectRowsForStudent.reduce((a, r) => a + r.possible, 0);
    const pct = possible > 0 ? (total / possible) * 100 : 0;
    return { total, possible, pct };
  }, [selectedStudent, subjectRowsForStudent]);

  const aggregateAndDivision = useMemo(() => {
    if (!selectedStudent) return { aggregate: 0, division: '—', pill: divisionPillClass('U') };
    const gradesArr = subjectRowsForStudent.map((r) => r.uneb_grade).filter((g) => Number.isFinite(g));
    const best4 = gradesArr.sort((a, b) => a - b).slice(0, 4);
    const aggregate = best4.reduce((a, g) => a + g, 0);
    const division = unebDivisionFromAggregate(aggregate);
    return { aggregate, division, pill: divisionPillClass(division) };
  }, [selectedStudent, subjectRowsForStudent]);

  const overallPositions = useMemo(() => {
    const rows = students
      .map((s) => {
        const m = totalsByStudent.get(s.registration_id) ?? new Map();
        let total = 0;
        for (const sub of subjectsForGrade) total += Number(m.get(sub.id) ?? 0);
        return { id: s.registration_id, total };
      })
      .sort((a, b) => b.total - a.total);

    const pos = new Map<string, number>();
    let currentPos = 1;
    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && rows[i].total < rows[i - 1].total) currentPos = i + 1;
      pos.set(rows[i].id, currentPos);
    }
    return pos;
  }, [students, totalsByStudent, subjectsForGrade]);

  const position = selectedStudent ? overallPositions.get(selectedStudent.registration_id) ?? '—' : '—';
  const noQuestions = canLoad && questions.length === 0;

  const canEditComments = useMemo(() => {
    const role = profile?.role;
    return role === 'ADMIN' || role === 'TEACHER' || role === 'ACADEMIC';
  }, [profile?.role]);

  /** Load saved comments */
  useEffect(() => {
    if (!school?.id || !selectedStudent || !canLoad) return;

    (async () => {
      setReportRowId(null);
      setTeacherComment('');
      setHeadComment('');

      const { data, error } = await supabase
        .from('student_report_cards')
        .select('id, class_teacher_comment, headteacher_comment, subject_comments')
        .eq('school_id', school.id)
        .eq('grade_id', Number(selectedGradeId))
        .eq('student_id', selectedStudent.registration_id)
        .eq('term_id', Number(selectedTermId))
        .eq('exam_session_id', Number(selectedExamSessionId))
        .maybeSingle();

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data) {
        const row = data as ReportCardRow;
        setReportRowId(row.id);
        setTeacherComment(row.class_teacher_comment ?? '');
        setHeadComment(row.headteacher_comment ?? '');
      } else {
        // compact default comment
        setTeacherComment(overallRemark(overall.pct));
        setHeadComment('');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school?.id, selectedStudentId, selectedGradeId, selectedTermId, selectedExamSessionId, canLoad]);

  /** Save comments */
  const saveComments = async () => {
    if (!school?.id || !selectedStudent || !canLoad) return;
    setSavingComments(true);
    setErrorMsg(null);

    try {
      const subjectCommentsJson = subjectRowsForStudent.reduce((acc: any, r) => {
        acc[r.subject_id] = {
          grade: r.uneb_text,
          pct: Number(r.pct.toFixed(1)),
        };
        return acc;
      }, {});

      const payload = {
        school_id: school.id,
        grade_id: Number(selectedGradeId),
        student_id: selectedStudent.registration_id,
        term_id: Number(selectedTermId),
        exam_session_id: Number(selectedExamSessionId),
        class_teacher_comment: teacherComment || null,
        headteacher_comment: headComment || null,
        subject_comments: subjectCommentsJson,
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      };

      const { data: u, error } = await supabase
        .from('student_report_cards')
        .upsert(payload, { onConflict: 'school_id,grade_id,student_id,term_id,exam_session_id' })
        .select('id')
        .single();

      if (error) throw error;
      setReportRowId((u as any).id);
      tinyToast('Saved');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save comments.');
    } finally {
      setSavingComments(false);
    }
  };

  /** Print / Export (native print, A4) */
  const printOrExport = () => {
    if (!selectedStudent || noQuestions) return;
    window.print();
  };

  /** -----------------------------------------
   * UI States
   * ---------------------------------------- */
  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="no-print">
          <Navbar userEmail={userEmail} onMenuClick={() => {}} />
        </div>
        <div className="md:hidden h-14 no-print" />

        <div className="mx-auto w-full max-w-[1600px]">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr]">
            <div className="hidden md:block no-print">
              <AppShell />
            </div>
            <main className="min-w-0 px-4 sm:px-6 lg:px-8 py-6">
              <div className="mx-auto w-full max-w-[1200px] space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="h-5 w-56 bg-slate-100 rounded" />
                  <div className="mt-2 h-4 w-96 bg-slate-100 rounded" />
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-24 rounded-2xl border border-slate-200 bg-slate-50" />
                    ))}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>

        <PrintCSS />
      </div>
    );
  }

  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="no-print">
          <Navbar userEmail={userEmail} onMenuClick={() => {}} />
        </div>
        <div className="md:hidden h-14 no-print" />

        <div className="mx-auto w-full max-w-[1600px]">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr]">
            <div className="hidden md:block no-print">
              <AppShell />
            </div>

            <main className="min-w-0 px-4 sm:px-6 lg:px-8 py-10">
              <div className="mx-auto max-w-xl">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
                  <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                    <School className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">School configuration required</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Link your account to a school to generate report cards.
                  </p>

                  {errorMsg && (
                    <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-left text-sm text-rose-800 flex gap-2">
                      <AlertCircle className="h-5 w-5 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    onClick={() => router.push('/settings')}
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
                  >
                    Go to settings
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>

        <PrintCSS />
      </div>
    );
  }

  const a4Title = selectedStudent
    ? `Report_${fmtName(selectedStudent).replaceAll(' ', '_')}_${termLabel(selectedTerm).replaceAll(' ', '_')}`
    : 'Student Report';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <div className="no-print">
        <Navbar userEmail={userEmail} onMenuClick={() => {}} />
      </div>
      <div className="md:hidden h-14 no-print" />

      <div className="mx-auto w-full max-w-[1600px]">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr]">
          {/* Sidebar */}
          <div className="hidden md:block no-print">
            <AppShell />
          </div>

          <main className="min-w-0 px-4 sm:px-6 lg:px-8 py-6">
            <div className="mx-auto w-full max-w-[1200px] space-y-6">
              {/* Top bar */}
              <div className="no-print flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Single-page A4 report
                  </div>
                  <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                    Student report card
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Export/print as a single A4 page. Choose “Save as PDF” in the print dialog.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={printOrExport}
                    disabled={!selectedStudent || noQuestions}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ring-inset transition
                      ${
                        !selectedStudent || noQuestions
                          ? 'bg-white text-slate-400 ring-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-800 ring-slate-200 hover:bg-slate-50'
                      }`}
                    title="Opens Print dialog. Choose Save as PDF to export."
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </button>

                  <button
                    onClick={printOrExport}
                    disabled={!selectedStudent || noQuestions}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition
                      ${
                        !selectedStudent || noQuestions
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="no-print rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">{errorMsg}</div>
                </div>
              )}

              {/* Filters */}
              <div className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Select class, term, exam session, then pick a student.
                    </p>
                  </div>

                  {selectedStudent && (
                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Position <span className="font-semibold text-slate-900">{position}</span> /{' '}
                      <span className="font-semibold text-slate-900">{students.length}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="relative">
                    <BookOpen className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={selectedGradeId}
                      onChange={(e) => {
                        setSelectedGradeId(e.target.value);
                        setSelectedTermId('');
                        setSelectedExamSessionId('');
                        setSelectedStudentId('');
                      }}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                    >
                      <option value="">Select class/grade</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.grade_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="relative">
                    <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={selectedTermId}
                      onChange={(e) => {
                        setSelectedTermId(e.target.value);
                        setSelectedExamSessionId('');
                        setSelectedStudentId('');
                      }}
                      disabled={!selectedGradeId}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50"
                    >
                      <option value="">{selectedGradeId ? 'Select term' : 'Select class first'}</option>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.term_name.replace('_', ' ')} {t.year}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="relative">
                    <BarChart3 className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={selectedExamSessionId}
                      onChange={(e) => setSelectedExamSessionId(e.target.value)}
                      disabled={!selectedTermId}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50"
                    >
                      <option value="">{selectedTermId ? 'Select exam session' : 'Select term first'}</option>
                      {examSessionsForTerm.map((es) => (
                        <option key={es.id} value={es.id}>
                          {examTypeLabel(es.exam_type)}
                          {es.term ? ` — ${es.term.term_name.replace('_', ' ')} ${es.term.year}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="mt-3">
                  <StudentAutocomplete
                    value={selectedStudentId}
                    onChange={setSelectedStudentId}
                    disabled={!canLoad || students.length === 0}
                    items={students}
                  />
                </div>

                {canLoad && questions.length === 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-3">
                    <AlertCircle className="h-5 w-5 mt-0.5" />
                    <div>
                      <div className="font-semibold">No assessment questions found</div>
                      <div className="text-amber-700">
                        Add assessment questions for this term/session to generate reports.
                      </div>
                      <button
                        onClick={() => router.push('/assessments')}
                        className="mt-3 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
                      >
                        Go to assessments
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* A4 Paper preview (single page) */}
              {!selectedStudent ? (
                <div className="no-print rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-slate-500" />
                  </div>
                  <div className="text-base font-semibold text-slate-900">Select a student</div>
                  <div className="mt-1 text-sm text-slate-600">Use the filters above to load a report.</div>
                </div>
              ) : noQuestions ? null : (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="no-print bg-slate-50 px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Preview (A4 • single page)
                    </div>
                    <div className="text-xs text-slate-500">{a4Title}</div>
                  </div>

                  <div className="flex justify-center bg-slate-50 p-4 sm:p-6">
                    {/* A4 paper */}
                    <div
                      ref={a4Ref}
                      className="bg-white shadow-sm print:shadow-none ring-1 ring-slate-200"
                      style={{ width: '210mm', height: '297mm' }}
                    >
                      <div className="h-full p-6">
                        {/* Top header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="h-14 w-14 rounded-2xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                              {school.school_badge ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={school.school_badge} alt="School badge" className="h-full w-full object-contain" />
                              ) : (
                                <School className="h-6 w-6 text-slate-500" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="text-lg font-semibold text-slate-900 truncate">{school.school_name}</div>
                              <div className="mt-1 text-[11px] text-slate-500 leading-4">
                                {school.location ? (
                                  <div className="flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    <span className="truncate">{school.location}</span>
                                  </div>
                                ) : null}
                                {school.contact_number ? <div>📞 {school.contact_number}</div> : null}
                                {school.email ? <div>✉️ {school.email}</div> : null}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Report Card
                            </div>
                            <div className="mt-1 text-[12px] font-semibold text-slate-900">
                              {termLabel(selectedTerm)} • {selectedExamSession ? examTypeLabel(selectedExamSession.exam_type) : '—'}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        {/* Student row */}
                        <div className="mt-4 grid grid-cols-12 gap-3">
                          <div className="col-span-7 rounded-2xl border border-slate-200 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Student</div>
                            <div className="mt-1 text-base font-semibold text-slate-900">{fmtName(selectedStudent)}</div>
                            <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                              <User className="h-4 w-4" /> {selectedStudent.registration_id}
                            </div>
                          </div>

                          <div className="col-span-5 rounded-2xl border border-slate-200 p-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Class</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">{selectedGrade?.grade_name ?? '—'}</div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  Position <span className="font-semibold text-slate-700">{position}</span>/{students.length}
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Division</div>
                                <div className="mt-1">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${aggregateAndDivision.pill}`}
                                  >
                                    <Award className="h-3.5 w-3.5 mr-1" />
                                    {aggregateAndDivision.division}
                                  </span>
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  Agg: <span className="font-semibold text-slate-700">{aggregateAndDivision.aggregate}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Subjects table (compact) */}
                        <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden">
                          <table className="w-full text-[12px]">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                                  Subject
                                </th>
                                <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                                  Score
                                </th>
                                <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                                  Out of
                                </th>
                                <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                                  %
                                </th>
                                <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                                  UNEB
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {subjectRowsForStudent.map((r) => (
                                <tr key={r.subject_id} className="border-t border-slate-100">
                                  <td className="px-4 py-2 font-semibold text-slate-900">{r.subject_name}</td>
                                  <td className="px-4 py-2 text-center font-semibold text-slate-900">{r.total}</td>
                                  <td className="px-4 py-2 text-center text-slate-600">{r.possible}</td>
                                  <td className="px-4 py-2 text-center font-semibold text-slate-900">{r.pct.toFixed(1)}</td>
                                  <td className="px-4 py-2 text-center">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${r.pill}`}
                                    >
                                      {r.uneb_text}
                                    </span>
                                  </td>
                                </tr>
                              ))}

                              <tr className="border-t border-slate-200 bg-slate-50">
                                <td className="px-4 py-2 font-semibold text-slate-900">Overall</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900">{overall.total}</td>
                                <td className="px-4 py-2 text-center text-slate-700">{overall.possible}</td>
                                <td className="px-4 py-2 text-center font-semibold text-slate-900">{overall.pct.toFixed(1)}</td>
                                <td className="px-4 py-2 text-center text-slate-600">—</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Comments + Summary (compact, single page) */}
                        <div className="mt-4 grid grid-cols-12 gap-3">
                          <div className="col-span-7 rounded-2xl border border-slate-200 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Class teacher comment
                            </div>
                            {canEditComments ? (
                              <textarea
                                value={teacherComment}
                                onChange={(e) => setTeacherComment(e.target.value)}
                                className="mt-2 w-full h-[90px] resize-none rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                placeholder="Write a comment…"
                              />
                            ) : (
                              <p className="mt-2 text-[12px] text-slate-700 whitespace-pre-wrap">{teacherComment || '—'}</p>
                            )}
                          </div>

                          <div className="col-span-5 rounded-2xl border border-slate-200 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Summary
                            </div>

                            <div className="mt-2 space-y-2 text-[12px] text-slate-700">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Overall %</span>
                                <span className="font-semibold text-slate-900">{overall.pct.toFixed(1)}%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-slate-900" style={{ width: `${clamp(overall.pct, 0, 100)}%` }} />
                              </div>

                              <div className="mt-2 text-[11px] text-slate-500">General remark</div>
                              <div className="text-[12px] font-semibold text-slate-900 leading-4">
                                {overallRemark(overall.pct)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-12 gap-3">
                          <div className="col-span-7 rounded-2xl border border-slate-200 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Head teacher comment
                            </div>
                            {canEditComments ? (
                              <textarea
                                value={headComment}
                                onChange={(e) => setHeadComment(e.target.value)}
                                className="mt-2 w-full h-[70px] resize-none rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                placeholder="Write a comment…"
                              />
                            ) : (
                              <p className="mt-2 text-[12px] text-slate-700 whitespace-pre-wrap">{headComment || '—'}</p>
                            )}
                          </div>

                          <div className="col-span-5 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Report ID</div>
                              <div className="mt-1 font-mono text-[12px] font-semibold text-slate-900">
                                {reportRowId ? `RC-${reportRowId}` : `RC-${selectedStudent.registration_id}`}
                              </div>
                            </div>

                            {canEditComments && (
                              <button
                                onClick={saveComments}
                                disabled={savingComments}
                                className={`mt-3 inline-flex items-center justify-center rounded-xl px-4 py-2 text-[12px] font-semibold transition
                                  ${savingComments ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                              >
                                {savingComments ? 'Saving…' : 'Save comments'}
                              </button>
                            )}

                            <div className="mt-3 text-[10px] text-slate-500">
                              Generated by {school.school_name}. Printed copies should be stamped.
                            </div>
                          </div>
                        </div>

                        {/* Footer line */}
                        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{school.website ? school.website : '—'}</span>
                          <span>Powered by EducWave</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="no-print h-10" />
            </div>
          </main>
        </div>
      </div>

      <PrintCSS />
    </div>
  );
}

/** Print CSS (A4 single page) */
function PrintCSS() {
  return (
    <style jsx global>{`
      @page {
        size: A4 portrait;
        margin: 0mm;
      }

      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        html,
        body {
          background: white !important;
        }

        .no-print {
          display: none !important;
        }

        /* Ensure only the A4 paper prints */
        .ring-slate-200 {
          box-shadow: none !important;
        }
      }
    `}</style>
  );
}

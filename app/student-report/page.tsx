'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  Printer,
  School,
  User,
  Wand2,
  Sparkles,
  TrendingUp,
  Target,
  Filter,
  BarChart3,
  Clock,
  GraduationCap,
  Edit,
  Save,
  RefreshCw,
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
}

interface StudentRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
}

interface QuestionRow {
  id: number;
  max_score: number;
  grade_id: number;
  subject_id: number | null;
  exam_type_id: number;
}

interface ExamResultRow {
  id: number;
  student_id: string;
  question_id: number | null;
  grade_id: number;
  exam_session_id: number | null;
  score: number;
}

interface TeacherJoinRow {
  initials: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface SubjectTeacherAssignmentRow {
  subject_id: number;
  teacher_user_id: string;
  teachers?: TeacherJoinRow[] | null;
}

const fmtName = (s: StudentRow) => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim();

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function termLabel(t?: TermExamRow | null) {
  if (!t) return '—';
  const tn = t.term_name === 'TERM_1' ? 'Term 1' : t.term_name === 'TERM_2' ? 'Term 2' : 'Term 3';
  return `${tn} ${t.year}`;
}

function examTypeLabel(t: 'BOT' | 'MOT' | 'EOT') {
  if (t === 'BOT') return 'BOT';
  if (t === 'MOT') return 'MOT';
  return 'EOT';
}

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

function worsenDivisionOnce(div: string) {
  if (div === 'Division 1') return 'Division 2';
  if (div === 'Division 2') return 'Division 3';
  if (div === 'Division 3') return 'Division 4';
  return 'U';
}

function gradePillClass(txt: string) {
  if (txt.startsWith('D')) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (txt.startsWith('C')) return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (txt.startsWith('P')) return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-rose-50 text-rose-700 border border-rose-200';
}

function divisionPillClass(division: string) {
  if (division === 'Division 1') return 'bg-emerald-600';
  if (division === 'Division 2') return 'bg-blue-600';
  if (division === 'Division 3') return 'bg-amber-600';
  if (division === 'Division 4') return 'bg-orange-600';
  return 'bg-slate-600';
}

function gradeColor(pct: number) {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 60) return 'text-blue-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

function overallRemark(pct: number) {
  if (pct >= 85) return 'Outstanding performance. Maintain the excellent effort.';
  if (pct >= 75) return 'Very good overall. With more focus, you can reach the top.';
  if (pct >= 60) return 'Average performance. Improve revision habits and class participation.';
  if (pct >= 50) return 'Below expectations. More practice is required across subjects.';
  return 'Weak overall performance. A serious improvement plan is required.';
}

function stableHash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pickStable(list: string[], key: string) {
  if (!list.length) return '';
  return list[stableHash(key) % list.length];
}

function perfBand(pct: number) {
  if (pct >= 85) return 'excellent';
  if (pct >= 70) return 'very_good';
  if (pct >= 60) return 'good';
  if (pct >= 50) return 'fair';
  return 'poor';
}

function subjectFocus(subjectName: string) {
  const s = subjectName.toLowerCase();
  if (s.includes('english')) {
    return {
      strengths: ['comprehension', 'grammar', 'composition', 'spelling'],
      improve: ['read daily', 'write compositions', 'grammar drills', 'build vocabulary'],
    };
  }
  if (s.includes('math')) {
    return {
      strengths: ['problem solving', 'accuracy', 'speed', 'number work'],
      improve: ['practice daily', 'show working', 'master basics', 'attempt challenging questions'],
    };
  }
  if (s.includes('science')) {
    return {
      strengths: ['concept understanding', 'practical knowledge', 'interpretation', 'application'],
      improve: ['revise key topics', 'draw & label', 'attempt past papers', 'understand processes'],
    };
  }
  if (s.includes('social') || s.includes('sst')) {
    return {
      strengths: ['content recall', 'map work', 'interpretation', 'explanation'],
      improve: ['read regularly', 'write full answers', 'practice maps', 'revise consistently'],
    };
  }
  return {
    strengths: ['understanding', 'consistency', 'focus', 'effort'],
    improve: ['revise', 'practice', 'consult teacher', 'manage time'],
  };
}

function autoSubjectComment(subjectName: string, termPct: number, stableKey: string) {
  const band = perfBand(termPct);
  const p = Math.round(termPct);
  const focus = subjectFocus(subjectName);

  const excellent = [
    `${subjectName}: Excellent (${p}%). Keep it up.`,
    `${subjectName}: Outstanding (${p}%). Maintain.`,
    `Excellent ${subjectName} (${p}%).`,
  ];

  const veryGood = [
    `${subjectName}: Very good (${p}%).`,
    `${subjectName}: Strong (${p}%). Keep going.`,
    `Good ${subjectName} (${p}%).`,
  ];

  const good = [
    `${subjectName}: Satisfactory (${p}%).`,
    `${subjectName}: Average (${p}%). Improve.`,
    `Fair ${subjectName} (${p}%).`,
  ];

  const fair = [
    `${subjectName}: Below average (${p}%).`,
    `${subjectName}: Needs work (${p}%).`,
    `${subjectName} needs attention (${p}%).`,
  ];

  const poor = [
    `${subjectName}: Poor (${p}%).`,
    `${subjectName}: Weak (${p}%).`,
    `${subjectName} needs help (${p}%).`,
  ];

  const pool =
    band === 'excellent'
      ? excellent
      : band === 'very_good'
        ? veryGood
        : band === 'good'
          ? good
          : band === 'fair'
            ? fair
            : poor;

  return pickStable(pool, stableKey + band);
}

function autoClassTeacherComment(overallPct: number, division: string) {
  const p = Math.round(overallPct);
  const band = perfBand(overallPct);

  const pools: Record<string, string[]> = {
    excellent: [`Excellent (${p}%, ${division}).`, `Outstanding (${p}%, ${division}).`],
    very_good: [`Very good (${p}%, ${division}).`, `Good work (${p}%, ${division}).`],
    good: [`Satisfactory (${p}%, ${division}).`, `Average (${p}%, ${division}).`],
    fair: [`Needs improvement (${p}%, ${division}).`, `Below expectations (${p}%, ${division}).`],
    poor: [`Unsatisfactory (${p}%, ${division}).`, `Poor (${p}%, ${division}).`],
  };

  return pickStable(pools[band] ?? pools.poor, `${division}|${p}|class`);
}

function autoHeadTeacherComment(overallPct: number, division: string) {
  const p = Math.round(overallPct);
  const band = perfBand(overallPct);

  const pools: Record<string, string[]> = {
    excellent: [`Excellent (${p}%, ${division}).`, `Outstanding (${p}%, ${division}).`],
    very_good: [`Well done (${p}%, ${division}).`, `Good (${p}%, ${division}).`],
    good: [`Fair (${p}%, ${division}).`, `Average (${p}%, ${division}).`],
    fair: [`Needs improvement (${p}%, ${division}).`, `Below standard (${p}%, ${division}).`],
    poor: [`Poor (${p}%, ${division}).`, `Unsatisfactory (${p}%, ${division}).`],
  };

  return pickStable(pools[band] ?? pools.poor, `${division}|${p}|head`);
}

function tinyToast(message: string) {
  const el = document.createElement('div');
  el.className =
    'fixed top-4 right-4 z-[9999] rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 shadow-2xl flex items-center gap-2 no-print animate-in slide-in-from-right-10 duration-300';
  el.innerHTML = `<span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">✓</span><span class="text-sm">${message}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function teacherDisplayName(t?: TeacherJoinRow | null) {
  if (!t) return '';
  return `${t.initials ?? ''} ${t.first_name ?? ''} ${t.last_name ?? ''}`.trim();
}

function buildLocalKey(schoolId: string, gradeId: string, termId: string, studentId: string) {
  return `student_report_comments::${schoolId}::${gradeId}::${termId}::${studentId}`;
}

type LocalCommentsPayload = {
  subjectComments: Record<number, string>;
  classTeacherComment: string;
  headTeacherComment: string;
};

function analyzePerformance(subjectRows: any[]) {
  const bestSubject = subjectRows.reduce((best, current) => 
    current.termPct > best.termPct ? current : best
  );
  
  const worstSubject = subjectRows.reduce((worst, current) => 
    current.termPct < worst.termPct ? current : worst
  );

  const strengths = subjectRows.filter(s => s.termPct >= 70);
  const improvements = subjectRows.filter(s => s.termPct < 50);

  return {
    bestSubject,
    worstSubject,
    strengthCount: strengths.length,
    improvementCount: improvements.length,
  };
}

export default function StudentReportPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [terms, setTerms] = useState<TermExamRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [results, setResults] = useState<ExamResultRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [subjectComments, setSubjectComments] = useState<Record<number, string>>({});
  const [classTeacherComment, setClassTeacherComment] = useState('');
  const [headTeacherComment, setHeadTeacherComment] = useState('');

  const [subjectTeacherById, setSubjectTeacherById] = useState<Record<number, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
          setLoading(false);
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
          supabase.from('exam_session').select('id, term_id, exam_type').eq('school_id', sch.id).order('id'),
        ]);

        if (gradeRes.error) throw gradeRes.error;
        if (subjectRes.error) throw subjectRes.error;
        if (termRes.error) throw termRes.error;
        if (examSessRes.error) throw examSessRes.error;

        setGrades((gradeRes.data ?? []) as GradeRow[]);
        setSubjects((subjectRes.data ?? []) as SubjectRow[]);
        setTerms((termRes.data ?? []) as TermExamRow[]);
        setExamSessions((examSessRes.data ?? []) as ExamSessionRow[]);
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

  const subjectsForGrade = useMemo(() => {
    if (!selectedGradeId) return [];
    return subjects.filter((s) => s.grade_id === Number(selectedGradeId));
  }, [subjects, selectedGradeId]);

  const examSessionsForTerm = useMemo(() => {
    if (!selectedTermId) return [];
    return examSessions
      .filter((es) => es.term_id === Number(selectedTermId))
      .sort((a, b) => {
        const ord = (x: ExamSessionRow['exam_type']) => (x === 'BOT' ? 1 : x === 'MOT' ? 2 : 3);
        return ord(a.exam_type) - ord(b.exam_type);
      });
  }, [examSessions, selectedTermId]);

  const canLoad = useMemo(() => Boolean(school?.id && selectedGradeId && selectedTermId), [school?.id, selectedGradeId, selectedTermId]);
  const sessions = examSessionsForTerm;
  const noSessions = canLoad && sessions.length === 0;

  useEffect(() => {
    if (!school?.id) return;

    (async () => {
      setErrorMsg(null);

      if (!canLoad) {
        setStudents([]);
        setQuestions([]);
        setResults([]);
        setSelectedStudentId('');
        setSubjectComments({});
        setClassTeacherComment('');
        setHeadTeacherComment('');
        return;
      }

      setLoading(true);
      try {
        const gradeId = Number(selectedGradeId);
        const termId = Number(selectedTermId);
        const sessionIds = examSessionsForTerm.map((s) => s.id);

        const studentsRes = await supabase
          .from('students')
          .select('registration_id, first_name, last_name, date_of_birth, gender')
          .eq('school_id', school.id)
          .eq('current_grade_id', gradeId)
          .order('first_name');

        if (studentsRes.error) throw studentsRes.error;

        const questionsRes =
          sessionIds.length === 0
            ? { data: [], error: null }
            : await supabase
                .from('assessment_question')
                .select('id, max_score, grade_id, subject_id, exam_type_id')
                .eq('school_id', school.id)
                .eq('grade_id', gradeId)
                .eq('term_exam_id', termId)
                .in('exam_type_id', sessionIds);

        if ((questionsRes as any).error) throw (questionsRes as any).error;

        const qRows = ((questionsRes as any).data ?? []) as QuestionRow[];
        const qIds = qRows.map((q) => q.id);

        const resultsRes =
          qIds.length === 0
            ? { data: [], error: null }
            : await supabase
                .from('assessment_examresult')
                .select('id, student_id, question_id, grade_id, exam_session_id, score')
                .eq('school_id', school.id)
                .eq('grade_id', gradeId)
                .in('exam_session_id', sessionIds)
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
  }, [school?.id, canLoad, selectedGradeId, selectedTermId, examSessionsForTerm.length]);

  const selectedStudent = useMemo(
    () => (selectedStudentId ? students.find((s) => s.registration_id === selectedStudentId) ?? null : null),
    [students, selectedStudentId]
  );

  useEffect(() => {
    if (!school?.id || !selectedGradeId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('subject_teacher_assignments')
          .select('subject_id, teacher_user_id, teachers:teacher_user_id ( initials, first_name, last_name )')
          .eq('school_id', school.id)
          .eq('grade_id', Number(selectedGradeId));

        if (error) return;

        const rows = (data ?? []) as SubjectTeacherAssignmentRow[];
        const map: Record<number, string> = {};
        for (const r of rows) {
          const teacher = r.teachers?.[0];
          map[r.subject_id] = teacherDisplayName(teacher);
        }
        setSubjectTeacherById(map);
      } catch {
        // ignore
      }
    })();
  }, [school?.id, selectedGradeId]);

  const possibleBySessionSubject = useMemo(() => {
    const map = new Map<number, Map<number, number>>();
    for (const q of questions) {
      const subjectId = Number(q.subject_id ?? 0);
      if (!subjectId) continue;
      const sess = Number(q.exam_type_id);
      if (!map.has(sess)) map.set(sess, new Map());
      const mm = map.get(sess)!;
      mm.set(subjectId, (mm.get(subjectId) ?? 0) + Number(q.max_score ?? 0));
    }
    return map;
  }, [questions]);

  const questionToSessionSubject = useMemo(() => {
    const m = new Map<number, { sessionId: number; subjectId: number }>();
    for (const q of questions) {
      const subjectId = Number(q.subject_id ?? 0);
      if (!subjectId) continue;
      m.set(q.id, { sessionId: Number(q.exam_type_id), subjectId });
    }
    return m;
  }, [questions]);

  const totalsByStudentSessionSubject = useMemo(() => {
    const map = new Map<string, Map<number, Map<number, number>>>();
    for (const r of results) {
      if (!r.question_id || !r.exam_session_id) continue;
      const meta = questionToSessionSubject.get(Number(r.question_id));
      if (!meta) continue;

      const studentId = r.student_id;
      const sessionId = Number(r.exam_session_id);
      const subjectId = meta.subjectId;

      if (!map.has(studentId)) map.set(studentId, new Map());
      const bySess = map.get(studentId)!;

      if (!bySess.has(sessionId)) bySess.set(sessionId, new Map());
      const bySub = bySess.get(sessionId)!;

      bySub.set(subjectId, (bySub.get(subjectId) ?? 0) + Number(r.score ?? 0));
    }
    return map;
  }, [results, questionToSessionSubject]);

  const subjectRowsForStudent = useMemo(() => {
    if (!selectedStudent) return [];
    const sMap = totalsByStudentSessionSubject.get(selectedStudent.registration_id) ?? new Map();

    return subjectsForGrade.map((sub) => {
      const perSession = sessions.map((sess) => {
        const totalsForSess = sMap.get(sess.id) ?? new Map();
        const total = Number(totalsForSess.get(sub.id) ?? 0);
        const possible = Number((possibleBySessionSubject.get(sess.id)?.get(sub.id) ?? 0) as number);
        const pct = possible > 0 ? (total / possible) * 100 : 0;
        return { sessionId: sess.id, exam_type: sess.exam_type, total, possible, pct };
      });

      const valid = perSession.filter((x) => x.possible > 0);
      const totalAll = valid.reduce((a, x) => a + x.total, 0);
      const possibleAll = valid.reduce((a, x) => a + x.possible, 0);
      const termPct = possibleAll > 0 ? (totalAll / possibleAll) * 100 : 0;

      const g = unebSubjectGrade(termPct);
      const txt = unebGradeText(g);

      return {
        subject_id: sub.id,
        subject_name: sub.name,
        perSession,
        termPct,
        grade_text: txt,
        pill: gradePillClass(txt),
        colorClass: gradeColor(termPct),
      };
    });
  }, [selectedStudent, subjectsForGrade, sessions, totalsByStudentSessionSubject, possibleBySessionSubject]);

  const overall = useMemo(() => {
    if (!selectedStudent) return { pct: 0 };
    const valid = subjectRowsForStudent.map((r) => r.termPct).filter((x) => Number.isFinite(x) && x > 0);
    const pct = valid.length ? valid.reduce((a, x) => a + x, 0) / valid.length : 0;
    return { pct };
  }, [selectedStudent, subjectRowsForStudent]);

  const aggregateAndDivision = useMemo(() => {
    if (!selectedStudent) return { aggregate: 0, division: '—', pill: divisionPillClass('U') };

    const gradesArr = subjectRowsForStudent.map((r) => unebSubjectGrade(r.termPct)).sort((a, b) => a - b);
    const best4 = gradesArr.slice(0, 4);
    const aggregate = best4.reduce((a, g) => a + g, 0);

    let division = unebDivisionFromAggregate(aggregate);

    const english = subjectRowsForStudent.find((r) => r.subject_name.toLowerCase().includes('english'));
    const math = subjectRowsForStudent.find(
      (r) => r.subject_name.toLowerCase().includes('math') || r.subject_name.toLowerCase().includes('mathematics')
    );

    const englishF9 = english?.grade_text === 'F9';
    const mathF9 = math?.grade_text === 'F9';

    if (englishF9 && mathF9) division = worsenDivisionOnce(division);

    return { aggregate, division, pill: divisionPillClass(division) };
  }, [selectedStudent, subjectRowsForStudent]);

  const performanceAnalysis = useMemo(() => {
    if (!selectedStudent) return null;
    return analyzePerformance(subjectRowsForStudent);
  }, [selectedStudent, subjectRowsForStudent]);

  const canEditComments = useMemo(() => {
    const role = profile?.role;
    return role === 'ADMIN' || role === 'TEACHER' || role === 'ACADEMIC';
  }, [profile?.role]);

  useEffect(() => {
    if (!school?.id || !selectedStudent || !selectedGradeId || !selectedTermId) return;

    const key = buildLocalKey(school.id, selectedGradeId, selectedTermId, selectedStudent.registration_id);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LocalCommentsPayload;

      if (parsed?.subjectComments) setSubjectComments(parsed.subjectComments);
      if (typeof parsed?.classTeacherComment === 'string') setClassTeacherComment(parsed.classTeacherComment);
      if (typeof parsed?.headTeacherComment === 'string') setHeadTeacherComment(parsed.headTeacherComment);
    } catch {
      // ignore
    }
  }, [school?.id, selectedStudentId, selectedGradeId, selectedTermId]);

  useEffect(() => {
    if (!school?.id || !selectedStudent || !selectedGradeId || !selectedTermId) return;

    const key = buildLocalKey(school.id, selectedGradeId, selectedTermId, selectedStudent.registration_id);
    const payload: LocalCommentsPayload = { subjectComments, classTeacherComment, headTeacherComment };

    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [school?.id, selectedStudentId, selectedGradeId, selectedTermId, subjectComments, classTeacherComment, headTeacherComment]);

  useEffect(() => {
    if (!selectedStudent || subjectRowsForStudent.length === 0) return;

    setSubjectComments((prev) => {
      const next = { ...prev };
      for (const r of subjectRowsForStudent) {
        const existing = (next[r.subject_id] ?? '').trim();
        if (!existing) {
          const stableKey = `${selectedStudent.registration_id}|${selectedTermId}|${r.subject_id}`;
          next[r.subject_id] = autoSubjectComment(r.subject_name, r.termPct, stableKey);
        }
      }
      return next;
    });
  }, [selectedStudentId, selectedTermId, subjectRowsForStudent]);

  useEffect(() => {
    if (!selectedStudent) return;
    const div = aggregateAndDivision.division || '—';
    const pct = Number.isFinite(overall.pct) ? overall.pct : 0;

    setClassTeacherComment((prev) => (prev.trim() ? prev : autoClassTeacherComment(pct, div)));
    setHeadTeacherComment((prev) => (prev.trim() ? prev : autoHeadTeacherComment(pct, div)));
  }, [selectedStudentId, overall.pct, aggregateAndDivision.division]);

  const autoFillAllComments = () => {
    if (!selectedStudent) return;

    setSubjectComments(() => {
      const next: Record<number, string> = {};
      for (const r of subjectRowsForStudent) {
        const stableKey = `${selectedStudent.registration_id}|${selectedTermId}|${r.subject_id}`;
        next[r.subject_id] = autoSubjectComment(r.subject_name, r.termPct, stableKey);
      }
      return next;
    });

    const div = aggregateAndDivision.division || '—';
    const pct = Number.isFinite(overall.pct) ? overall.pct : 0;
    setClassTeacherComment(autoClassTeacherComment(pct, div));
    setHeadTeacherComment(autoHeadTeacherComment(pct, div));

    tinyToast('Auto-filled comments');
  };

  const clearFrontEndComments = () => {
    setSubjectComments({});
    setClassTeacherComment('');
    setHeadTeacherComment('');
    tinyToast('Cleared comments');
  };

  const printOrExport = () => {
    if (!selectedStudent) return;
    window.print();
  };

  const handleRefresh = async () => {
    if (!school?.id || !selectedGradeId || !selectedTermId) return;
    
    setRefreshing(true);
    try {
      const gradeId = Number(selectedGradeId);
      const termId = Number(selectedTermId);
      const sessionIds = examSessionsForTerm.map((s) => s.id);

      const [studentsRes, questionsRes] = await Promise.all([
        supabase
          .from('students')
          .select('registration_id, first_name, last_name, date_of_birth, gender')
          .eq('school_id', school.id)
          .eq('current_grade_id', gradeId)
          .order('first_name'),
        sessionIds.length === 0
          ? { data: [], error: null }
          : supabase
              .from('assessment_question')
              .select('id, max_score, grade_id, subject_id, exam_type_id')
              .eq('school_id', school.id)
              .eq('grade_id', gradeId)
              .eq('term_exam_id', termId)
              .in('exam_type_id', sessionIds),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if ((questionsRes as any).error) throw (questionsRes as any).error;

      const qRows = ((questionsRes as any).data ?? []) as QuestionRow[];
      const qIds = qRows.map((q) => q.id);

      const resultsRes =
        qIds.length === 0
          ? { data: [], error: null }
          : await supabase
              .from('assessment_examresult')
              .select('id, student_id, question_id, grade_id, exam_session_id, score')
              .eq('school_id', school.id)
              .eq('grade_id', gradeId)
              .in('exam_session_id', sessionIds)
              .in('question_id', qIds);

      if ((resultsRes as any).error) throw (resultsRes as any).error;

      const stuRows = (studentsRes.data ?? []) as StudentRow[];
      setStudents(stuRows);
      setQuestions(qRows);
      setResults(((resultsRes as any).data ?? []) as ExamResultRow[]);

      tinyToast('Data refreshed successfully');
    } catch (e: any) {
      setErrorMsg('Failed to refresh data: ' + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading report card...</p>
        </div>
      </div>
    );
  }

  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6">
            <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center mt-10">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <School className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">School Configuration Required</h3>
              <p className="text-gray-600 mb-6">
                Your account must be linked to a school before you can generate report cards.
              </p>
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Settings
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Student Report Card</h1>
                  <p className="text-gray-600 mt-1">Generate academic performance reports</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing || !selectedStudent}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  
                  {canEditComments && (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700"
                    >
                      {isEditing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                      {isEditing ? 'Save' : 'Edit'}
                    </button>
                  )}
                  
                  <button
                    onClick={printOrExport}
                    disabled={!selectedStudent || noSessions}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${!selectedStudent || noSessions
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>
              
              {/* Filters - Always Visible */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade/Class</label>
                    <select
                      value={selectedGradeId}
                      onChange={(e) => {
                        setSelectedGradeId(e.target.value);
                        setSelectedTermId('');
                        setSelectedStudentId('');
                      }}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                    <select
                      value={selectedTermId}
                      onChange={(e) => {
                        setSelectedTermId(e.target.value);
                        setSelectedStudentId('');
                      }}
                      disabled={!selectedGradeId}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    >
                      <option value="">{selectedGradeId ? 'Select term' : 'Select grade first'}</option>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.term_name.replace('_', ' ')} {t.year}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={!canLoad || students.length === 0}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    >
                      <option value="">
                        {canLoad ? (students.length ? 'Select student' : 'No students found') : 'Select grade + term first'}
                      </option>
                      {students.map((s) => (
                        <option key={s.registration_id} value={s.registration_id}>
                          {fmtName(s)} ({s.registration_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {selectedStudent && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span>Selected: <span className="font-semibold text-gray-900">{fmtName(selectedStudent)}</span></span>
                      <span className="mx-2">•</span>
                      <span>Class: <span className="font-semibold text-gray-900">{selectedGrade?.grade_name || '—'}</span></span>
                      <span className="mx-2">•</span>
                      <span>Term: <span className="font-semibold text-gray-900">{termLabel(selectedTerm)}</span></span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={autoFillAllComments}
                        disabled={!selectedStudent || noSessions}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                      >
                        <Wand2 className="w-4 h-4" />
                        Auto Comments
                      </button>
                      <button
                        onClick={clearFrontEndComments}
                        disabled={!selectedStudent || noSessions}
                        className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 disabled:text-gray-400"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {errorMsg && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Main Content */}
            {!selectedStudent ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Student</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Choose a grade, term, and student from the filters above to generate their academic report card.
                </p>
              </div>
            ) : noSessions ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
                  <FileText className="h-10 w-10 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exam Sessions Found</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  Create exam sessions for this term to generate comprehensive report cards.
                </p>
                <button
                  onClick={() => router.push('/academics/exam-sessions')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Create Exam Sessions
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Performance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Overall %</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{overall.pct.toFixed(1)}%</p>
                      </div>
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Division</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white ${aggregateAndDivision.pill}`}>
                            {aggregateAndDivision.division}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Aggregate: {aggregateAndDivision.aggregate}</p>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <Award className="h-6 w-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Best Subject</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1 truncate">
                          {performanceAnalysis?.bestSubject?.subject_name || '—'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {performanceAnalysis?.bestSubject?.termPct.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-2 bg-green-50 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Performance</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {performanceAnalysis?.strengthCount || 0} strong
                        </p>
                        <p className="text-sm text-gray-600">
                          {performanceAnalysis?.improvementCount || 0} need improvement
                        </p>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <Target className="h-6 w-6 text-amber-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                  <div className="print-page">
                    <div className="print-inner">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center gap-3">
                          {school.school_badge ? (
                            <img 
                              src={school.school_badge} 
                              alt="School badge" 
                              className="h-12 w-12 object-contain"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                              <School className="h-6 w-6 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <h2 className="text-lg font-bold text-gray-900">{school.school_name}</h2>
                            <p className="text-xs text-gray-600">
                              {school.location && <span className="mr-3">{school.location}</span>}
                              {school.contact_number && <span>📞 {school.contact_number}</span>}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            TERM REPORT
                          </div>
                          <p className="text-sm font-bold text-gray-900 mt-1">{termLabel(selectedTerm)}</p>
                          <p className="text-xs text-gray-600">
                            {new Date().toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Student Info */}
                      <div className="mb-6 grid grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Student Information</p>
                          <p className="text-sm font-bold text-gray-900">{fmtName(selectedStudent)}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            ID: {selectedStudent.registration_id}
                            {selectedStudent.gender && <span className="ml-2">• {selectedStudent.gender}</span>}
                          </p>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Academic Information</p>
                          <p className="text-sm font-bold text-gray-900">{selectedGrade?.grade_name || '—'}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-700">Overall:</span>
                            <span className="text-sm font-bold text-gray-900">{overall.pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Subjects Table with Comments on the Right */}
                      <div className="mb-6">
                        <p className="text-sm font-bold text-gray-900 mb-3">Subject Performance</p>
                        
                        <div className="space-y-3">
                          {subjectRowsForStudent.map((r) => (
                            <div key={r.subject_id} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="grid grid-cols-12 gap-0">
                                {/* Subject Name and Scores */}
                                <div className="col-span-5 p-3 border-r border-gray-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-gray-900">{r.subject_name}</p>
                                    <span className={`inline-flex items-center justify-center rounded px-2 py-1 text-xs font-bold ${r.pill}`}>
                                      {r.grade_text}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {r.perSession.map((ps) => (
                                      <div key={ps.sessionId} className="text-center">
                                        <p className="text-xs text-gray-500">{examTypeLabel(ps.exam_type)}</p>
                                        <p className={`text-sm font-medium ${ps.possible > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                          {ps.possible > 0 ? `${ps.pct.toFixed(0)}%` : '—'}
                                        </p>
                                      </div>
                                    ))}
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500">Term</p>
                                      <p className={`text-sm font-bold ${r.colorClass}`}>
                                        {r.termPct.toFixed(0)}%
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Comment Section */}
                                <div className="col-span-7 p-3 bg-gray-50">
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                      <textarea
                                        value={subjectComments[r.subject_id] ?? ''}
                                        onChange={(e) =>
                                          setSubjectComments((prev) => ({
                                            ...prev,
                                            [r.subject_id]: e.target.value,
                                          }))
                                        }
                                        disabled={!isEditing}
                                        className="w-full bg-transparent text-sm text-gray-700 outline-none disabled:text-gray-600 placeholder:text-gray-400 whitespace-pre-wrap break-words resize-none min-h-[60px]"
                                        placeholder="Teacher comments..."
                                        rows={3}
                                      />
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">Teacher</p>
                                      <p className="text-xs font-medium text-gray-700 mt-1">{subjectTeacherById[r.subject_id] || '—'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Head Teacher's Comment - Always Visible */}
                      <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Head Teacher's Comment</p>
                        <textarea
                          value={headTeacherComment}
                          onChange={(e) => setHeadTeacherComment(e.target.value)}
                          disabled={!isEditing}
                          className="w-full bg-transparent text-sm text-gray-700 outline-none disabled:text-gray-600 placeholder:text-gray-400 whitespace-pre-wrap break-words resize-none"
                          placeholder="Head teacher's comments..."
                          rows={3}
                        />
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500">Signature: _________________________</p>
                        </div>
                      </div>

                      {/* Class Teacher's Comment */}
                      <div className="mb-6 border border-gray-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Class Teacher's Comment</p>
                        <textarea
                          value={classTeacherComment}
                          onChange={(e) => setClassTeacherComment(e.target.value)}
                          disabled={!isEditing}
                          className="w-full bg-transparent text-sm text-gray-700 outline-none disabled:text-gray-600 placeholder:text-gray-400 whitespace-pre-wrap break-words resize-none"
                          placeholder="Class teacher's comments..."
                          rows={3}
                        />
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500">Signature: _________________________</p>
                        </div>
                      </div>

                      {/* General Remarks */}
                      <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-blue-50">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">General Remarks</p>
                        <p className="text-sm text-gray-800">
                          {overallRemark(overall.pct)}
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div>
                            <span>{school.website || school.email || 'Official School Report'}</span>
                          </div>
                          <div>
                            <span>Generated by EducWave</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <PrintCSS />
    </div>
  );
}

function PrintCSS() {
  return (
    <style jsx global>{`
      /* A4 page size - Single page */
      .print-page {
        width: 210mm;
        min-height: 297mm;
        max-height: 297mm;
        background: #fff;
        margin: 0 auto;
        overflow: hidden;
        position: relative;
      }

      .print-inner {
        padding: 15mm 15mm 10mm 15mm;
        height: 100%;
        box-sizing: border-box;
      }

      /* Ensure content fits within A4 */
      .print-inner > * {
        max-width: 180mm;
        margin-left: auto;
        margin-right: auto;
      }

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
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          width: 210mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          overflow: hidden !important;
        }

        body * {
          visibility: hidden;
        }

        .print-page, .print-page * {
          visibility: visible;
        }

        .print-page {
          position: absolute;
          left: 0;
          top: 0;
          width: 210mm !important;
          height: 297mm !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
          overflow: hidden !important;
        }

        .print-inner {
          padding: 15mm 15mm 10mm 15mm !important;
          height: 297mm !important;
          overflow: hidden !important;
        }

        /* Prevent page breaks inside critical elements */
        table {
          page-break-inside: avoid !important;
        }

        tr {
          page-break-inside: avoid !important;
        }

        /* Hide non-print elements */
        .no-print {
          display: none !important;
        }

        /* Ensure textareas print as normal text */
        textarea {
          border: none !important;
          background: transparent !important;
          resize: none !important;
          overflow: hidden !important;
          color: #000 !important;
        }

        /* Print preview adjustments */
        @media print and (color) {
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      }

      /* Screen preview */
      @media screen {
        .print-page {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          background: white;
          margin: 0 auto;
          overflow: auto;
        }

        .print-inner {
          min-height: 297mm;
        }
      }
    `}</style>
  );
}
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  Award,
  BookOpen,
  Download,
  FileText,
  Printer,
  School,
  User,
  Wand2,
  TrendingUp,
  Target,
  Filter,
  BarChart3,
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
  lin_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  profile_picture_url?: string | null;
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

interface SubjectRowWithDetails {
  subject_id: number;
  subject_name: string;
  perSession: Array<{
    sessionId: number;
    exam_type: 'BOT' | 'MOT' | 'EOT';
    total: number;
    possible: number;
    pct: number;
  }>;
  termPct: number;
  grade_text: string;
  pill: string;
  colorClass: string;
}

// Helper functions
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
  return t;
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

// SHORT COMMENT FUNCTIONS
function getSubjectComment(gradeText: string, pct: number): string {
  const shortComments: Record<string, string[]> = {
    D1: [
      'Excellent work.',
      'Outstanding.',
      'Exceptional.',
    ],
    D2: [
      'Very good.',
      'Strong performance.',
      'Well done.',
    ],
    C3: [
      'Good effort.',
      'Satisfactory.',
      'Average.',
    ],
    C4: [
      'Needs improvement.',
      'Can do better.',
      'Below average.',
    ],
    P5: [
      'Poor.',
      'Needs help.',
      'Very weak.',
    ],
    P6: [
      'Failed.',
      'Critical.',
      'Poor performance.',
    ],
    F7: [
      'Failed badly.',
      'No understanding.',
    ],
    F8: [
      'Complete failure.',
      'Zero grasp.',
    ],
    F9: [
      'Total failure.',
      'Failed completely.',
    ],
  };

  const gradeKey = gradeText.startsWith('D') ? 'D1' : 
                   gradeText.startsWith('C') ? 'C3' : 
                   gradeText.startsWith('P') ? 'P5' : 'F7';
  
  const comments = shortComments[gradeKey as keyof typeof shortComments] || shortComments.C3;
  return pickStable(comments, `${gradeText}${pct}`);
}

function getClassTeacherComment(pct: number, division: string, studentName: string): string {
  const band = perfBand(pct);
  const roundPct = Math.round(pct);
  
  const templates: Record<string, string[]> = {
    excellent: [
      `${studentName} excelled. ${division}.`,
      `Top performance. ${division}.`,
      `Excellent work. ${division}.`,
    ],
    very_good: [
      `${studentName} did well. ${division}.`,
      `Good performance. ${division}.`,
      `Strong work. ${division}.`,
    ],
    good: [
      `${studentName} was average. ${division}.`,
      `Satisfactory. ${division}.`,
      `Fair effort. ${division}.`,
    ],
    fair: [
      `${studentName} needs to improve. ${division}.`,
      `Below expectations. ${division}.`,
      `Weak performance. ${division}.`,
    ],
    poor: [
      `${studentName} failed. ${division}.`,
      `Very poor. ${division}.`,
      `Unsatisfactory. ${division}.`,
    ],
  };

  return pickStable(templates[band] || templates.good, `${studentName}${division}${roundPct}`);
}

function getHeadTeacherComment(pct: number, division: string): string {
  const band = perfBand(pct);
  
  const templates: Record<string, string[]> = {
    excellent: [
      'Excellent achievement.',
      'Outstanding performance.',
      'Top student.',
    ],
    very_good: [
      'Very good work.',
      'Strong performance.',
      'Commendable effort.',
    ],
    good: [
      'Satisfactory results.',
      'Average performance.',
      'Fair achievement.',
    ],
    fair: [
      'Needs improvement.',
      'Below standard.',
      'Weak results.',
    ],
    poor: [
      'Poor performance.',
      'Unsatisfactory.',
      'Failed standards.',
    ],
  };

  return pickStable(templates[band] || templates.good, `${division}${pct}`);
}

function getOverallRemark(pct: number, division: string): string {
  const band = perfBand(pct);
  const roundPct = Math.round(pct);
  
  const remarks: Record<string, string[]> = {
    excellent: [
      `Excellent! ${division} (${roundPct}%).`,
      `Outstanding! ${division}.`,
      `Top performer! ${division}.`,
    ],
    very_good: [
      `Very good! ${division} (${roundPct}%).`,
      `Strong work! ${division}.`,
      `Well done! ${division}.`,
    ],
    good: [
      `Satisfactory. ${division} (${roundPct}%).`,
      `Average. ${division}.`,
      `Fair. ${division}.`,
    ],
    fair: [
      `Needs improvement. ${division} (${roundPct}%).`,
      `Below expectations. ${division}.`,
      `Weak. ${division}.`,
    ],
    poor: [
      `Poor performance. ${division} (${roundPct}%).`,
      `Failed standards. ${division}.`,
      `Very weak. ${division}.`,
    ],
  };

  return pickStable(remarks[band] || remarks.good, `${division}${pct}`);
}

function tinyToast(message: string) {
  const el = document.createElement('div');
  el.className = 'fixed top-4 right-4 z-50 rounded-lg bg-gray-900 text-white px-4 py-2 text-sm';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function teacherDisplayName(t?: TeacherJoinRow | null) {
  if (!t) return '';
  return `${t.initials ?? ''} ${t.first_name ?? ''} ${t.last_name ?? ''}`.trim();
}

function buildLocalKey(schoolId: string, gradeId: string, termId: string, studentId: string) {
  return `report_comments::${schoolId}::${gradeId}::${termId}::${studentId}`;
}

type LocalCommentsPayload = {
  subjectComments: Record<number, string>;
  classTeacherComment: string;
  headTeacherComment: string;
};

function analyzePerformance(subjectRows: SubjectRowWithDetails[]) {
  if (subjectRows.length === 0) return null;
  
  const bestSubject = subjectRows.reduce((best, current) => 
    current.termPct > best.termPct ? current : best
  );
  
  const worstSubject = subjectRows.reduce((worst, current) => 
    current.termPct < worst.termPct ? current : worst
  );

  const strengths = subjectRows.filter(s => s.termPct >= 70);
  const improvements = subjectRows.filter(s => s.termPct < 50);

  return {
    bestSubject: bestSubject.subject_name,
    worstSubject: worstSubject.subject_name,
    bestSubjectGrade: bestSubject.grade_text,
    worstSubjectGrade: worstSubject.grade_text,
    strengthCount: strengths.length,
    improvementCount: improvements.length,
  };
}

export default function StudentReportPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
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

  // Auth check
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/');
        return;
      }
      setAuthChecking(false);
    })();
  }, [router]);

  // Load profile and school data
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

        if (sErr || !s) throw new Error(sErr?.message || 'School not found.');
        setSchool(s as SchoolRow);

        // Load all data in parallel
        const [gradeRes, subjectRes, termRes, examSessRes] = await Promise.all([
          supabase.from('class').select('id, grade_name').eq('school_id', s.id).order('grade_name'),
          supabase.from('subject').select('id, name, grade_id').eq('school_id', s.id).order('name'),
          supabase
            .from('term_exam_session')
            .select('id, term_name, year, start_date, end_date')
            .eq('school_id', s.id)
            .order('year', { ascending: false })
            .order('term_name'),
          supabase.from('exam_session').select('id, term_id, exam_type').eq('school_id', s.id).order('id'),
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

  // Derived values
  const selectedTerm = useMemo(() => 
    selectedTermId ? terms.find(t => t.id === Number(selectedTermId)) ?? null : null,
    [terms, selectedTermId]
  );

  const selectedGrade = useMemo(() => 
    selectedGradeId ? grades.find(g => g.id === Number(selectedGradeId)) ?? null : null,
    [grades, selectedGradeId]
  );

  const subjectsForGrade = useMemo(() => {
    if (!selectedGradeId) return [];
    return subjects.filter(s => s.grade_id === Number(selectedGradeId));
  }, [subjects, selectedGradeId]);

  const examSessionsForTerm = useMemo(() => {
    if (!selectedTermId) return [];
    return examSessions
      .filter(es => es.term_id === Number(selectedTermId))
      .sort((a, b) => {
        const ord = (x: ExamSessionRow['exam_type']) => (x === 'BOT' ? 1 : x === 'MOT' ? 2 : 3);
        return ord(a.exam_type) - ord(b.exam_type);
      });
  }, [examSessions, selectedTermId]);

  const canLoad = useMemo(() => 
    Boolean(school?.id && selectedGradeId && selectedTermId), 
    [school?.id, selectedGradeId, selectedTermId]
  );

  const sessions = examSessionsForTerm;
  const noSessions = canLoad && sessions.length === 0;

  // Load students, questions, results
  useEffect(() => {
    if (!school?.id) return;

    (async () => {
      setErrorMsg(null);

      if (!canLoad) {
        setStudents([]);
        setQuestions([]);
        setResults([]);
        setSelectedStudentId('');
        return;
      }

      setLoading(true);
      try {
        const gradeId = Number(selectedGradeId);
        const termId = Number(selectedTermId);
        const sessionIds = examSessionsForTerm.map(s => s.id);

        // Load students
        const studentsRes = await supabase
          .from('students')
          .select('registration_id, lin_id, first_name, last_name, date_of_birth, gender, profile_picture_url')
          .eq('school_id', school.id)
          .eq('current_grade_id', gradeId)
          .order('first_name');

        if (studentsRes.error) throw studentsRes.error;

        // Load questions
        const questionsRes = sessionIds.length === 0
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
        const qIds = qRows.map(q => q.id);

        // Load results
        const resultsRes = qIds.length === 0
          ? { data: [], error: null }
          : await supabase
              .from('assessment_examresult')
              .select('id, student_id, question_id, grade_id, exam_session_id, score')
              .eq('school_id', school.id)
              .eq('grade_id', gradeId)
              .in('exam_session_id', sessionIds)
              .in('question_id', qIds);

        if ((resultsRes as any).error) throw (resultsRes as any).error;

        setStudents((studentsRes.data ?? []) as StudentRow[]);
        setQuestions(qRows);
        setResults(((resultsRes as any).data ?? []) as ExamResultRow[]);

        if (!selectedStudentId && studentsRes.data && studentsRes.data.length > 0) {
          setSelectedStudentId(studentsRes.data[0].registration_id);
        }
      } catch (e: any) {
        setErrorMsg(e.message || 'Failed to load data.');
        setStudents([]);
        setQuestions([]);
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [school?.id, canLoad, selectedGradeId, selectedTermId, examSessionsForTerm.length]);

  const selectedStudent = useMemo(() => 
    selectedStudentId ? students.find(s => s.registration_id === selectedStudentId) ?? null : null,
    [students, selectedStudentId]
  );

  // Load subject teachers
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

  // Calculate possible scores by session and subject
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

  // Map question to session and subject
  const questionToSessionSubject = useMemo(() => {
    const m = new Map<number, { sessionId: number; subjectId: number }>();
    for (const q of questions) {
      const subjectId = Number(q.subject_id ?? 0);
      if (!subjectId) continue;
      m.set(q.id, { sessionId: Number(q.exam_type_id), subjectId });
    }
    return m;
  }, [questions]);

  // Calculate totals by student, session, subject
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

  // Prepare subject rows for selected student
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

      const valid = perSession.filter(x => x.possible > 0);
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

  // Calculate overall percentage
  const overall = useMemo(() => {
    if (!selectedStudent) return { pct: 0 };
    const valid = subjectRowsForStudent.map(r => r.termPct).filter(x => Number.isFinite(x) && x > 0);
    const pct = valid.length ? valid.reduce((a, x) => a + x, 0) / valid.length : 0;
    return { pct };
  }, [selectedStudent, subjectRowsForStudent]);

  // Calculate aggregate and division
  const aggregateAndDivision = useMemo(() => {
    if (!selectedStudent) return { aggregate: 0, division: '—', pill: divisionPillClass('U') };

    const gradesArr = subjectRowsForStudent.map(r => unebSubjectGrade(r.termPct)).sort((a, b) => a - b);
    const best4 = gradesArr.slice(0, 4);
    const aggregate = best4.reduce((a, g) => a + g, 0);
    const division = unebDivisionFromAggregate(aggregate);

    return { 
      aggregate, 
      division, 
      pill: divisionPillClass(division),
      best4Count: best4.length
    };
  }, [selectedStudent, subjectRowsForStudent]);

  // Performance analysis
  const performanceAnalysis = useMemo(() => {
    if (!selectedStudent || subjectRowsForStudent.length === 0) return null;
    return analyzePerformance(subjectRowsForStudent);
  }, [selectedStudent, subjectRowsForStudent]);

  const canEditComments = useMemo(() => {
    const role = profile?.role;
    return role === 'ADMIN' || role === 'TEACHER' || role === 'ACADEMIC';
  }, [profile?.role]);

  // Load saved comments
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

  // Save comments
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

  // Auto-generate subject comments
  useEffect(() => {
    if (!selectedStudent || subjectRowsForStudent.length === 0) return;

    setSubjectComments((prev) => {
      const next = { ...prev };
      for (const r of subjectRowsForStudent) {
        const existing = (next[r.subject_id] ?? '').trim();
        if (!existing) {
          const pct = Math.round(r.termPct);
          next[r.subject_id] = getSubjectComment(r.grade_text, pct);
        }
      }
      return next;
    });
  }, [selectedStudentId, subjectRowsForStudent]);

  // Auto-generate class and head teacher comments
  useEffect(() => {
    if (!selectedStudent) return;
    
    const studentName = fmtName(selectedStudent);
    const div = aggregateAndDivision.division || '—';
    const pct = Number.isFinite(overall.pct) ? overall.pct : 0;

    setClassTeacherComment((prev) => 
      prev.trim() ? prev : getClassTeacherComment(pct, div, studentName)
    );
    
    setHeadTeacherComment((prev) => 
      prev.trim() ? prev : getHeadTeacherComment(pct, div)
    );
  }, [selectedStudentId, overall.pct, aggregateAndDivision.division]);

  // Action handlers
  const autoFillAllComments = () => {
    if (!selectedStudent) return;

    setSubjectComments(() => {
      const next: Record<number, string> = {};
      for (const r of subjectRowsForStudent) {
        const pct = Math.round(r.termPct);
        next[r.subject_id] = getSubjectComment(r.grade_text, pct);
      }
      return next;
    });

    const studentName = fmtName(selectedStudent);
    const div = aggregateAndDivision.division || '—';
    const pct = Number.isFinite(overall.pct) ? overall.pct : 0;

    setClassTeacherComment(getClassTeacherComment(pct, div, studentName));
    setHeadTeacherComment(getHeadTeacherComment(pct, div));

    tinyToast('Auto-filled comments');
  };

  const clearAllComments = () => {
    setSubjectComments({});
    setClassTeacherComment('');
    setHeadTeacherComment('');
    tinyToast('Cleared all comments');
  };

  const printReport = () => {
    if (!selectedStudent) return;
    window.print();
  };

  const handleRefresh = async () => {
    if (!school?.id || !selectedGradeId || !selectedTermId) return;
    
    setRefreshing(true);
    try {
      const gradeId = Number(selectedGradeId);
      const termId = Number(selectedTermId);
      const sessionIds = examSessionsForTerm.map(s => s.id);

      const [studentsRes, questionsRes] = await Promise.all([
        supabase
          .from('students')
          .select('registration_id, lin_id, first_name, last_name, date_of_birth, gender, profile_picture_url')
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
      const qIds = qRows.map(q => q.id);

      const resultsRes = qIds.length === 0
        ? { data: [], error: null }
        : await supabase
            .from('assessment_examresult')
            .select('id, student_id, question_id, grade_id, exam_session_id, score')
            .eq('school_id', school.id)
            .eq('grade_id', gradeId)
            .in('exam_session_id', sessionIds)
            .in('question_id', qIds);

      if ((resultsRes as any).error) throw (resultsRes as any).error;

      setStudents((studentsRes.data ?? []) as StudentRow[]);
      setQuestions(qRows);
      setResults(((resultsRes as any).data ?? []) as ExamResultRow[]);

      tinyToast('Data refreshed');
    } catch (e: any) {
      setErrorMsg('Refresh failed: ' + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Loading state
  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // No school configured
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No School</h3>
              <p className="text-gray-600 mb-6">
                Link your account to a school first.
              </p>
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Settings
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const overallRemark = selectedStudent ? 
    getOverallRemark(overall.pct, aggregateAndDivision.division) : 
    '';

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
                  <h1 className="text-2xl font-bold text-gray-900">Report Card</h1>
                  <p className="text-gray-600 mt-1">Academic performance report</p>
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
                    onClick={printReport}
                    disabled={!selectedStudent || noSessions}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
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
              
              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
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
                        {canLoad ? (students.length ? 'Select student' : 'No students') : 'Select grade + term'}
                      </option>
                      {students.map((s) => (
                        <option key={s.registration_id} value={s.registration_id}>
                          {fmtName(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {selectedStudent && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span>Student: <span className="font-semibold text-gray-900">{fmtName(selectedStudent)}</span></span>
                      <span className="mx-2">•</span>
                      <span>Class: <span className="font-semibold text-gray-900">{selectedGrade?.grade_name || '—'}</span></span>
                      <span className="mx-2">•</span>
                      <span>Term: <span className="font-semibold text-gray-900">{termLabel(selectedTerm)}</span></span>
                      <span className="mx-2">•</span>
                      <span>LIN: <span className="font-semibold text-gray-900">{selectedStudent.lin_id || '—'}</span></span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={autoFillAllComments}
                        disabled={!selectedStudent || noSessions}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                      >
                        <Wand2 className="w-4 h-4" />
                        Auto
                      </button>
                      <button
                        onClick={clearAllComments}
                        disabled={!selectedStudent || noSessions}
                        className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400"
                      >
                        Clear
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Student</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Choose a grade, term, and student to generate report.
                </p>
              </div>
            ) : noSessions ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
                  <FileText className="h-10 w-10 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exams</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  Create exam sessions for this term.
                </p>
                <button
                  onClick={() => router.push('/academics/exam-sessions')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Create Exams
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Performance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Overall</p>
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
                          {performanceAnalysis?.bestSubject || '—'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {performanceAnalysis?.bestSubjectGrade || '—'}
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
                        <p className="text-sm text-gray-500">Subjects</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {subjectRowsForStudent.length} total
                        </p>
                        <p className="text-sm text-gray-600">
                          {performanceAnalysis?.strengthCount || 0} strong
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
                              alt="School" 
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
                            REPORT CARD
                          </div>
                          <p className="text-sm font-bold text-gray-900 mt-1">{termLabel(selectedTerm)}</p>
                          <p className="text-xs text-gray-600">
                            {new Date().toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>

                      {/* Student Info with Profile Picture */}
                      <div className="mb-6 grid grid-cols-3 gap-4">
                        <div className="col-span-2 border border-gray-200 rounded-lg p-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Student Info</p>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-bold text-gray-900">{fmtName(selectedStudent)}</p>
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-600">
                                  ID: <span className="font-semibold">{selectedStudent.registration_id}</span>
                                </p>
                                <p className="text-xs text-gray-600">
                                  LIN: <span className="font-semibold">{selectedStudent.lin_id || '—'}</span>
                                </p>
                                {selectedStudent.gender && (
                                  <p className="text-xs text-gray-600">
                                    Gender: <span className="font-semibold">{selectedStudent.gender}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                            {selectedStudent.profile_picture_url ? (
                              <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                                <img 
                                  src={selectedStudent.profile_picture_url} 
                                  alt="Student" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <User className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Academic</p>
                          <p className="text-sm font-bold text-gray-900">{selectedGrade?.grade_name || '—'}</p>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-700">Overall:</span>
                              <span className="text-sm font-bold text-gray-900">{overall.pct.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-700">Division:</span>
                              <span className={`text-xs font-bold px-2 py-1 rounded text-white ${aggregateAndDivision.pill}`}>
                                {aggregateAndDivision.division}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Subjects Table */}
                      <div className="mb-6">
                        <p className="text-sm font-bold text-gray-900 mb-3">Subjects</p>
                        
                        <div className="space-y-2">
                          {subjectRowsForStudent.map((r) => (
                            <div key={r.subject_id} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="grid grid-cols-12 gap-0">
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
                                        className="w-full bg-transparent text-sm text-gray-700 outline-none disabled:text-gray-600 placeholder:text-gray-400 whitespace-pre-wrap break-words resize-none min-h-[40px]"
                                        placeholder="Comment..."
                                        rows={1}
                                      />
                                    </div>
                                    <div className="text-right min-w-[80px]">
                                      <p className="text-xs text-gray-500">Teacher</p>
                                      <p className="text-xs font-medium text-gray-700 mt-1 truncate">
                                        {subjectTeacherById[r.subject_id] || '—'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Comments Section */}
                      <div className="space-y-4">
                        {/* Head Teacher */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Head Teacher</p>
                          <textarea
                            value={headTeacherComment}
                            onChange={(e) => setHeadTeacherComment(e.target.value)}
                            disabled={!isEditing}
                            className="w-full bg-transparent text-sm text-gray-700 outline-none disabled:text-gray-600 placeholder:text-gray-400 whitespace-pre-wrap break-words resize-none"
                            placeholder="Head teacher comment..."
                            rows={1}
                          />
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500">Signature: ________________</p>
                          </div>
                        </div>

                        {/* Class Teacher */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Class Teacher</p>
                          <textarea
                            value={classTeacherComment}
                            onChange={(e) => setClassTeacherComment(e.target.value)}
                            disabled={!isEditing}
                            className="w-full bg-transparent text-sm text-gray-700 outline-none disabled:text-gray-600 placeholder:text-gray-400 whitespace-pre-wrap break-words resize-none"
                            placeholder="Class teacher comment..."
                            rows={1}
                          />
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500">Signature: ________________</p>
                          </div>
                        </div>

                        {/* General Remarks */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Remarks</p>
                          <p className="text-sm text-gray-800">
                            {overallRemark}
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-4 mt-6 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div>
                            <span>{school.website || school.email || 'Official Report'}</span>
                          </div>
                          <div>
                            <span>Generated on {new Date().toLocaleDateString('en-GB')}</span>
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
      .print-page {
        width: 210mm;
        min-height: 297mm;
        background: #fff;
        margin: 0 auto;
        overflow: hidden;
      }

      .print-inner {
        padding: 15mm 15mm 10mm 15mm;
        box-sizing: border-box;
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

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          width: 210mm !important;
          min-height: 297mm !important;
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
          box-shadow: none !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
        }

        .no-print {
          display: none !important;
        }

        textarea {
          border: none !important;
          background: transparent !important;
          resize: none !important;
          overflow: hidden !important;
          color: #000 !important;
        }
      }

      @media screen {
        .print-page {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          background: white;
          margin: 0 auto;
          overflow: auto;
        }
      }
    `}</style>
  );
}
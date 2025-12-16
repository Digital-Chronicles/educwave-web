'use client';

import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  FileText,
  BarChart3,
  Search,
  Filter,
  Calendar,
  Printer,
  Target,
  TrendingUp,
  TrendingDown,
  X,
  ChevronRight,
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

interface TopicRow {
  id: number;
  name: string;
  grade_id: number;
  subject_id: number;
  grade?: { grade_name: string } | null;
  subject?: { name: string } | null;
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
  question_number: string;
  max_score: number;
  topic_id: number | null;
  grade_id: number;
  subject_id: number | null;
  term_exam_id?: number | null;
  exam_type_id?: number | null; // (your assessment_question likely uses this name)
  topic?: { name: string } | null;
}

interface ExamResultRow {
  id: number;
  student_id: string;
  question_id: number | null;
  grade_id: number;
  subject_id: number | null;
  topic_id: number | null;
  exam_session_id: number | null; // ✅ correct in your schema
  score: number;
  max_possible: number;
  total_score: number | null;
  percentage: number | null;
}

type TabKey = 'matrix' | 'topics';

const fullName = (s: StudentRow) => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim();

export default function AssessmentMarksPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('matrix');

  // Base data
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [terms, setTerms] = useState<TermExamRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);

  // Working data (filtered load)
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [results, setResults] = useState<ExamResultRow[]>([]);

  // Filters
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>(''); // term_exam_session.id
  const [selectedExamSessionId, setSelectedExamSessionId] = useState<string>(''); // exam_session.id

  const [studentSearch, setStudentSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');

  // Printing
  const printRef = useRef<HTMLDivElement | null>(null);

  // 1) Auth
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

  // 2) Load profile + school + base catalog (grades/subjects/topics/terms/exams)
  useEffect(() => {
    if (authChecking) return;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

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
        const [gradeRes, subjectRes, topicRes, termRes, examSessRes] = await Promise.all([
          supabase.from('class').select('id, grade_name').eq('school_id', schoolData.id).order('grade_name'),
          supabase
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
            .order('name'),
          supabase
            .from('assessment_topics')
            .select(
              `
              id,
              name,
              grade_id,
              subject_id,
              grade:class ( grade_name ),
              subject:subject ( name )
            `
            )
            .eq('school_id', schoolData.id)
            .order('name'),
          supabase
            .from('term_exam_session')
            .select('id, term_name, year, start_date, end_date')
            .eq('school_id', schoolData.id)
            .order('year', { ascending: false })
            .order('term_name'),
          supabase
            .from('exam_session')
            .select(
              `
              id,
              term_id,
              exam_type,
              start_date,
              end_date,
              term:term_exam_session ( term_name, year )
            `
            )
            .eq('school_id', schoolData.id)
            .order('id', { ascending: false }),
        ]);

        if (gradeRes.error) throw gradeRes.error;
        if (subjectRes.error) throw subjectRes.error;
        if (topicRes.error) throw topicRes.error;
        if (termRes.error) throw termRes.error;
        if (examSessRes.error) throw examSessRes.error;

        setGrades((gradeRes.data ?? []) as GradeRow[]);
        setSubjects((subjectRes.data ?? []) as unknown as SubjectRow[]);
        setTopics((topicRes.data ?? []) as unknown as TopicRow[]);
        setTerms((termRes.data ?? []) as TermExamRow[]);
        setExamSessions((examSessRes.data ?? []) as unknown as ExamSessionRow[]);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load assessment setup.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authChecking]);

  // Helpers
  const subjectsForSelectedGrade = useMemo(() => {
    if (!selectedGradeId) return subjects;
    return subjects.filter((s) => s.grade_id === Number(selectedGradeId));
  }, [subjects, selectedGradeId]);

  const examSessionsForSelectedTerm = useMemo(() => {
    if (!selectedTermId) return examSessions;
    return examSessions.filter((es) => es.term_id === Number(selectedTermId));
  }, [examSessions, selectedTermId]);

  const canLoadMatrix = useMemo(() => {
    return Boolean(school?.id && selectedGradeId && selectedSubjectId && selectedTermId && selectedExamSessionId);
  }, [school?.id, selectedGradeId, selectedSubjectId, selectedTermId, selectedExamSessionId]);

  // 3) Load matrix data (students, questions, results) after filters
  useEffect(() => {
    if (!school?.id) return;

    const loadMatrix = async () => {
      setErrorMsg(null);

      // Clear when filters incomplete
      if (!canLoadMatrix) {
        setStudents([]);
        setQuestions([]);
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const gradeId = Number(selectedGradeId);
        const subjectId = Number(selectedSubjectId);
        const termId = Number(selectedTermId);
        const examSessionId = Number(selectedExamSessionId);

        // Students for grade
        const studentsRes = await supabase
          .from('students')
          .select('registration_id, first_name, last_name')
          .eq('school_id', school.id)
          .eq('current_grade_id', gradeId)
          .order('first_name');

        if (studentsRes.error) throw studentsRes.error;

        // Questions for grade + subject + term + exam session
        // NOTE: your assessment_question table wasn't posted, but your earlier code uses term_exam_id & exam_type_id.
        // We'll filter on those if they exist. If your column names differ, tell me and I'll adjust.
        const questionsRes = await supabase
          .from('assessment_question')
          .select('id, question_number, max_score, topic_id, grade_id, subject_id')
          .eq('school_id', school.id)
          .eq('grade_id', gradeId)
          .eq('subject_id', subjectId)
          .eq('term_exam_id', termId)
          .eq('exam_type_id', examSessionId)
          .order('id', { ascending: true });

        if (questionsRes.error) throw questionsRes.error;

        const qRows = (questionsRes.data ?? []) as QuestionRow[];

        // Results (question-level) for this grade/subject/session
        // ✅ correct column: exam_session_id
        const resultsRes = await supabase
          .from('assessment_examresult')
          .select(
            'id, student_id, question_id, grade_id, subject_id, topic_id, exam_session_id, score, max_possible, total_score, percentage'
          )
          .eq('school_id', school.id)
          .eq('grade_id', gradeId)
          .eq('subject_id', subjectId)
          .eq('exam_session_id', examSessionId)
          .not('question_id', 'is', null);

        if (resultsRes.error) throw resultsRes.error;

        setStudents((studentsRes.data ?? []) as StudentRow[]);
        setQuestions(qRows);
        setResults((resultsRes.data ?? []) as ExamResultRow[]);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load marks matrix.');
        setStudents([]);
        setQuestions([]);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    loadMatrix();
  }, [school?.id, canLoadMatrix, selectedGradeId, selectedSubjectId, selectedTermId, selectedExamSessionId]);

  // ---------- MATRIX COMPUTATIONS ----------
  const studentById = useMemo(() => {
    const m = new Map<string, StudentRow>();
    for (const s of students) m.set(s.registration_id, s);
    return m;
  }, [students]);

  const studentQuestionScore = useMemo(() => {
    const map = new Map<string, Map<number, number>>();
    for (const r of results) {
      if (!r.question_id) continue;
      if (!map.has(r.student_id)) map.set(r.student_id, new Map());
      map.get(r.student_id)!.set(r.question_id, Number(r.score ?? 0));
    }
    return map;
  }, [results]);

  const totalPossible = useMemo(() => {
    return questions.reduce((a, q) => a + Number(q.max_score ?? 0), 0);
  }, [questions]);

  const studentTotals = useMemo(() => {
    const totals = new Map<string, { total: number; pct: number }>();
    for (const s of students) {
      const qs = studentQuestionScore.get(s.registration_id);
      let total = 0;
      for (const q of questions) total += Number(qs?.get(q.id) ?? 0);
      const pct = totalPossible > 0 ? (total / totalPossible) * 100 : 0;
      totals.set(s.registration_id, { total, pct });
    }
    return totals;
  }, [students, questions, studentQuestionScore, totalPossible]);

  const questionAverages = useMemo(() => {
    const sums = new Map<number, { sum: number; count: number }>();

    for (const s of students) {
      const qs = studentQuestionScore.get(s.registration_id);
      if (!qs) continue;
      for (const q of questions) {
        const v = qs.get(q.id);
        if (v === undefined) continue;
        const cur = sums.get(q.id) ?? { sum: 0, count: 0 };
        cur.sum += Number(v ?? 0);
        cur.count += 1;
        sums.set(q.id, cur);
      }
    }

    const avg = new Map<number, number>();
    for (const [qid, v] of sums.entries()) {
      avg.set(qid, v.count > 0 ? v.sum / v.count : 0);
    }
    return avg;
  }, [students, questions, studentQuestionScore]);

  // Positions (with ties like classic marksheet: 1,1,3...)
  const positions = useMemo(() => {
    const rows = students
      .map((s) => {
        const t = studentTotals.get(s.registration_id) ?? { total: 0, pct: 0 };
        return { id: s.registration_id, total: t.total, pct: t.pct };
      })
      .sort((a, b) => b.total - a.total);

    const posMap = new Map<string, number>();
    let currentPos = 1;
    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && rows[i].total < rows[i - 1].total) {
        currentPos = i + 1;
      }
      posMap.set(rows[i].id, currentPos);
    }
    return posMap;
  }, [students, studentTotals]);

  // Filtered students for display
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const nm = fullName(s).toLowerCase();
      return nm.includes(q) || s.registration_id.toLowerCase().includes(q);
    });
  }, [students, studentSearch]);

  // ---------- TOPIC STUDENT INSIGHTS ----------
  const topicNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of topics) m.set(t.id, t.name);
    return m;
  }, [topics]);

  const topicStudentInsights = useMemo(() => {
    // topicId -> studentId -> {scoreSum, maxSum}
    const map = new Map<number, Map<string, { s: number; m: number }>>();

    for (const stu of students) {
      const sq = studentQuestionScore.get(stu.registration_id);
      if (!sq) continue;

      for (const q of questions) {
        if (!q.topic_id) continue;
        const v = Number(sq.get(q.id) ?? 0);

        if (!map.has(q.topic_id)) map.set(q.topic_id, new Map());
        const tmap = map.get(q.topic_id)!;

        const cur = tmap.get(stu.registration_id) ?? { s: 0, m: 0 };
        cur.s += v;
        cur.m += Number(q.max_score ?? 0);
        tmap.set(stu.registration_id, cur);
      }
    }

    // Build named result
    const out: Array<{
      topicId: number;
      topicName: string;
      top: Array<{ student_id: string; pct: number; total: number; max: number }>;
      bottom: Array<{ student_id: string; pct: number; total: number; max: number }>;
      avgPct: number;
    }> = [];

    for (const [topicId, tmap] of map.entries()) {
      const rows = Array.from(tmap.entries()).map(([student_id, v]) => {
        const pct = v.m > 0 ? (v.s / v.m) * 100 : 0;
        return { student_id, total: v.s, max: v.m, pct };
      });

      rows.sort((a, b) => b.pct - a.pct);

      const avgPct =
        rows.length > 0 ? rows.reduce((a, r) => a + r.pct, 0) / Math.max(rows.length, 1) : 0;

      out.push({
        topicId,
        topicName: topicNameById.get(topicId) ?? `Topic #${topicId}`,
        top: rows.slice(0, 3),
        bottom: rows.slice(-3).reverse(),
        avgPct,
      });
    }

    // search filter
    const q = topicSearch.trim().toLowerCase();
    const filtered = q ? out.filter((x) => x.topicName.toLowerCase().includes(q)) : out;

    // sort best first
    filtered.sort((a, b) => b.avgPct - a.avgPct);

    return filtered;
  }, [students, questions, studentQuestionScore, topicNameById, topicSearch]);

  // Printing (matrix only)
  const handlePrintMatrix = () => {
    if (!printRef.current) return;

    const html = `
      <html>
        <head>
          <title>Assessment Results Matrix</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1,h2,h3 { margin: 0; }
            .muted { color: #6b7280; font-size: 12px; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
            .center { text-align: center; }
            .red { background: #fee2e2; color: #991b1b; font-weight: 700; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `;

    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  // ---------- UI STATES ----------
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading Marks Analysis...</p>
        </div>
      </div>
    );
  }

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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">School Configuration Required</h3>
              <p className="text-gray-600 mb-6">
                Your account needs to be linked to a school before accessing Mark Analysis.
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

  // ---------- RENDER: MATRIX ----------
  const renderResultsMatrix = () => {
    if (!canLoadMatrix) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Filters to View Matrix</h3>
          <p className="text-sm text-gray-500">
            Choose Grade, Subject, Term, and Exam Session to load the results matrix.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Results Matrix</h3>
            <p className="text-sm text-gray-500">
              Scores per question with totals & percentages. Below-average question scores are highlighted in red.
            </p>
          </div>

          <button
            onClick={handlePrintMatrix}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" />
            Print Matrix
          </button>
        </div>

        {/* Printable only area */}
        <div ref={printRef} className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-gray-900">{school.school_name} — Assessment Matrix</div>
              <div className="text-xs text-gray-500 mt-1">
                Total Possible: <span className="font-medium">{totalPossible}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Generated: <span className="font-medium">{new Date().toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[980px] w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Student</th>
                  {questions.map((q) => (
                    <th key={q.id} className="text-center py-3 px-2 text-xs font-semibold text-gray-700">
                      {q.question_number}
                      <div className="text-[10px] text-gray-400">/{q.max_score}</div>
                    </th>
                  ))}
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700">Total</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700">%</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700">Pos</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((s) => {
                  const sq = studentQuestionScore.get(s.registration_id);
                  const t = studentTotals.get(s.registration_id) ?? { total: 0, pct: 0 };
                  const pos = positions.get(s.registration_id) ?? 0;

                  return (
                    <tr key={s.registration_id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-sm text-gray-900">{fullName(s)}</div>
                        <div className="text-xs text-gray-500">{s.registration_id}</div>
                      </td>

                      {questions.map((q) => {
                        const score = Number(sq?.get(q.id) ?? 0);
                        const avg = Number(questionAverages.get(q.id) ?? 0);
                        const belowAvg = avg > 0 && score < avg;

                        return (
                          <td
                            key={q.id}
                            className={`text-center py-3 px-2 text-sm ${
                              belowAvg ? 'bg-red-50 text-red-700 font-semibold' : 'text-gray-900'
                            }`}
                            title={avg > 0 ? `Class avg: ${avg.toFixed(2)}` : 'No average yet'}
                          >
                            {score}
                          </td>
                        );
                      })}

                      <td className="text-center py-3 px-3 text-sm font-semibold text-gray-900">{t.total}</td>
                      <td className="text-center py-3 px-3 text-sm font-semibold text-blue-700">
                        {t.pct.toFixed(1)}%
                      </td>
                      <td className="text-center py-3 px-3 text-sm font-semibold text-gray-900">{pos || '—'}</td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={questions.length + 4} className="py-10 text-center text-sm text-gray-500">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Red cells mean the student scored below the class average for that question.
          </div>
        </div>
      </div>
    );
  };

  // ---------- RENDER: TOPIC STUDENT INSIGHTS ----------
  const renderTopicInsights = () => {
    if (!canLoadMatrix) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Load Results First</h3>
          <p className="text-sm text-gray-500">
            Select Grade, Subject, Term, and Exam Session to calculate topic insights.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Topic Student Insights</h3>
              <p className="text-sm text-gray-500">Top and bottom performers per topic</p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search topics..."
              />
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {topicStudentInsights.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-500">No topic performance yet.</div>
          ) : (
            topicStudentInsights.slice(0, 12).map((t) => (
              <div key={t.topicId} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                  <div className="font-medium text-gray-900">{t.topicName}</div>
                  <div className="text-xs text-gray-500">
                    Avg: <span className="font-semibold text-gray-900">{t.avgPct.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <div className="text-xs font-semibold text-green-700">Top</div>
                    </div>

                    <div className="space-y-2">
                      {t.top.length === 0 ? (
                        <div className="text-xs text-gray-500">—</div>
                      ) : (
                        t.top.map((x, i) => {
                          const s = studentById.get(x.student_id);
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <div className="text-sm text-gray-900 truncate">
                                {s ? fullName(s) : x.student_id}
                              </div>
                              <div className="text-xs font-semibold text-green-700">{x.pct.toFixed(1)}%</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <div className="text-xs font-semibold text-red-700">Bottom</div>
                    </div>

                    <div className="space-y-2">
                      {t.bottom.length === 0 ? (
                        <div className="text-xs text-gray-500">—</div>
                      ) : (
                        t.bottom.map((x, i) => {
                          const s = studentById.get(x.student_id);
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <div className="text-sm text-gray-900 truncate">
                                {s ? fullName(s) : x.student_id}
                              </div>
                              <div className="text-xs font-semibold text-red-700">{x.pct.toFixed(1)}%</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={userEmail} />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Marks Analysis</h1>
                  <p className="text-gray-600">Results matrix and topic insights for {school.school_name}</p>
                </div>

                <button
                  onClick={() => router.push('/assessments')}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                >
                  Back to Assessments <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
                    <p className="text-xs text-gray-500">Choose Grade, Subject, Term and Exam Session.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Filter className="w-4 h-4" />
                    Matrix loads only when all filters are selected.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                    value={selectedGradeId}
                    onChange={(e) => {
                      setSelectedGradeId(e.target.value);
                      setSelectedSubjectId('');
                      setSelectedTermId('');
                      setSelectedExamSessionId('');
                      setStudentSearch('');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Grade</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.grade_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      setSelectedTermId('');
                      setSelectedExamSessionId('');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!selectedGradeId}
                  >
                    <option value="">{selectedGradeId ? 'Select Subject' : 'Select grade first'}</option>
                    {subjectsForSelectedGrade.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedTermId}
                    onChange={(e) => {
                      setSelectedTermId(e.target.value);
                      setSelectedExamSessionId('');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!selectedGradeId || !selectedSubjectId}
                  >
                    <option value="">
                      {selectedGradeId && selectedSubjectId ? 'Select Term' : 'Select grade & subject first'}
                    </option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.term_name.replace('_', ' ')} {t.year}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedExamSessionId}
                    onChange={(e) => setSelectedExamSessionId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!selectedTermId}
                  >
                    <option value="">{selectedTermId ? 'Select Exam Session' : 'Select term first'}</option>
                    {examSessionsForSelectedTerm.map((es) => (
                      <option key={es.id} value={es.id}>
                        {es.exam_type} {es.term ? `- ${es.term.term_name.replace('_', ' ')} ${es.term.year}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search student name or reg no..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!canLoadMatrix}
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {selectedExamSessionId ? (
                      <span>
                        Loaded session ID: <span className="font-medium text-gray-900">{selectedExamSessionId}</span>
                      </span>
                    ) : (
                      <span>Select an exam session to load results</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-6 flex items-center gap-1 border-b border-gray-200">
                {(['matrix', 'topics'] as TabKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setActiveTab(k)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === k
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {k === 'matrix' ? 'Results Matrix' : 'Topic Student Insights'}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            )}

            {/* Content */}
            {activeTab === 'matrix' && (
              <div className="space-y-6">
                {renderResultsMatrix()}
              </div>
            )}

            {activeTab === 'topics' && (
              <div className="space-y-6">
                {renderTopicInsights()}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

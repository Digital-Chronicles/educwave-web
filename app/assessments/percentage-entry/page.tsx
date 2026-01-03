'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft,
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

interface ClassRow {
  id: number;
  grade_name: string;
}

interface SubjectRow {
  id: number;
  name: string;
  grade_id: number | null;
}

interface TermExamSessionRow {
  id: number;
  term_name: 'TERM_1' | 'TERM_2' | 'TERM_3';
  year: number;
}

// Fixed interface to handle array response
interface ExamSessionRow {
  id: number;
  term_id: number;
  exam_type: 'BOT' | 'MOT' | 'EOT';
  term?: { term_name: string; year: number }[] | null; // Changed to array
}

// Helper interface for parsed data
interface ParsedExamSession {
  id: number;
  term_id: number;
  exam_type: 'BOT' | 'MOT' | 'EOT';
  term_name: string;
  term_year: number;
}

interface StudentRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  current_grade_id: number | null;
}

interface PlaceholderQuestionRow {
  id: number;
  question_number: string;
  max_score: number;
}

type PercentMap = Record<string, number | ''>;

export default function PercentageEntryPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [termSessions, setTermSessions] = useState<TermExamSessionRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);
  const [parsedExamSessions, setParsedExamSessions] = useState<ParsedExamSession[]>([]);

  const [termExamId, setTermExamId] = useState('');
  const [examSessionId, setExamSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [placeholderQuestion, setPlaceholderQuestion] = useState<PlaceholderQuestionRow | null>(null);

  const [percent, setPercent] = useState<PercentMap>({});
  const [saving, setSaving] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/');
        return;
      }

      setUserEmail(session.user.email ?? null);
      setAuthChecking(false);
    })();
  }, [router]);

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
      setProfile(p as ProfileRow);

      if (!p.school_id) {
        setLoading(false);
        return;
      }

      const { data: sch, error: sErr } = await supabase
        .from('general_information')
        .select('id, school_name')
        .eq('id', p.school_id)
        .single();

      if (sErr || !sch) {
        setErrorMsg(sErr?.message || 'School not found in general_information.');
        setLoading(false);
        return;
      }
      setSchool(sch as SchoolRow);

      const [classRes, subjRes, termRes, sessionRes] = await Promise.all([
        supabase.from('class').select('id, grade_name').eq('school_id', sch.id).order('id'),
        supabase.from('subject').select('id, name, grade_id').eq('school_id', sch.id).order('name'),
        supabase
          .from('term_exam_session')
          .select('id, term_name, year')
          .eq('school_id', sch.id)
          .order('id', { ascending: false }),
        supabase
          .from('exam_session')
          .select('id, term_id, exam_type, term:term_exam_session(term_name, year)')
          .eq('school_id', sch.id)
          .order('id', { ascending: false }),
      ]);

      if (classRes.error) setErrorMsg(classRes.error.message);
      if (subjRes.error) setErrorMsg(subjRes.error.message);
      if (termRes.error) setErrorMsg(termRes.error.message);
      if (sessionRes.error) setErrorMsg(sessionRes.error.message);

      setClasses((classRes.data ?? []) as ClassRow[]);
      setSubjects((subjRes.data ?? []) as SubjectRow[]);
      setTermSessions((termRes.data ?? []) as TermExamSessionRow[]);
      
      // Handle the exam sessions with array term data
      const sessionData = (sessionRes.data ?? []) as ExamSessionRow[];
      setExamSessions(sessionData);

      // Parse the exam sessions to flatten the term array
      const parsedSessions: ParsedExamSession[] = sessionData.map(session => ({
        id: session.id,
        term_id: session.term_id,
        exam_type: session.exam_type,
        term_name: session.term?.[0]?.term_name || '',
        term_year: session.term?.[0]?.year || 0
      }));
      setParsedExamSessions(parsedSessions);

      setLoading(false);
    };

    loadBase();
  }, [authChecking]);

  const selectedExamSession = useMemo(() => {
    if (!examSessionId) return null;
    return parsedExamSessions.find((x) => Number(x.id) === Number(examSessionId)) ?? null;
  }, [parsedExamSessions, examSessionId]);

  const canLoad = useMemo(() => {
    if (!school?.id) return false;
    if (!termExamId || !examSessionId || !classId || !subjectId) return false;
    if (!selectedExamSession) return false;
    return Number(termExamId) === Number(selectedExamSession.term_id);
  }, [school?.id, termExamId, examSessionId, classId, subjectId, selectedExamSession]);

  const subjectsForClass = useMemo(() => {
    if (!classId) return subjects;
    return subjects.filter((s) => Number(s.grade_id ?? 0) === Number(classId));
  }, [subjects, classId]);

  useEffect(() => {
    if (!canLoad || !school?.id) {
      setStudents([]);
      setPlaceholderQuestion(null);
      setPercent({});
      return;
    }

    const run = async () => {
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const { data: st, error: sErr } = await supabase
          .from('students')
          .select('registration_id, first_name, last_name, current_grade_id')
          .eq('school_id', school.id)
          .eq('current_grade_id', Number(classId))
          .order('first_name');

        if (sErr) throw sErr;

        const studentsList = (st ?? []) as StudentRow[];
        setStudents(studentsList);

        const initial: PercentMap = {};
        for (const s of studentsList) initial[s.registration_id] = '';
        setPercent(initial);

        let { data: pq, error: qErr } = await supabase
          .from('assessment_question')
          .select('id, question_number, max_score')
          .eq('school_id', school.id)
          .eq('term_exam_id', Number(termExamId))
          .eq('grade_id', Number(classId))
          .eq('subject_id', Number(subjectId))
          .in('question_number', ['PERCENTAGE', 'PERCENT', 'PCT'])
          .order('id', { ascending: true })
          .limit(1);

        if (qErr) throw qErr;

        let found = (pq?.[0] ?? null) as PlaceholderQuestionRow | null;

        if (!found) {
          const { data: topicRows, error: tErr } = await supabase
            .from('assessment_topics')
            .select('id')
            .eq('school_id', school.id)
            .eq('grade_id', Number(classId))
            .eq('subject_id', Number(subjectId))
            .order('id', { ascending: true })
            .limit(1);

          if (tErr) throw tErr;

          const topicId = topicRows?.[0]?.id;
          if (!topicId) {
            throw new Error(
              'Cannot auto-create PERCENTAGE placeholder: no topic found for this class & subject. Create at least 1 topic first.'
            );
          }

          const payload = {
            term_exam_id: Number(termExamId),
            exam_type_id: Number(examSessionId),
            question_number: 'PERCENTAGE',
            topic_id: Number(topicId),
            grade_id: Number(classId),
            subject_id: Number(subjectId),
            max_score: 100,
            school_id: school.id,
          };

          const { data: created, error: cErr } = await supabase
            .from('assessment_question')
            .upsert(payload, {
              onConflict: 'term_exam_id,question_number,grade_id,subject_id',
            })
            .select('id, question_number, max_score')
            .single();

          if (cErr) throw cErr;

          found = created as PlaceholderQuestionRow;
        }

        setPlaceholderQuestion(found);

        if (found?.id) {
          const { data: existing, error: exErr } = await supabase
            .from('assessment_examresult')
            .select('student_id, percentage, score')
            .eq('school_id', school.id)
            .eq('exam_session_id', Number(examSessionId))
            .eq('grade_id', Number(classId))
            .eq('subject_id', Number(subjectId))
            .eq('question_id', Number(found.id));

          if (exErr) throw exErr;

          if (existing?.length) {
            setPercent((prev) => {
              const next = { ...prev };
              for (const r of existing as any[]) {
                const v = r.percentage ?? r.score ?? '';
                if (next[r.student_id] !== undefined) next[r.student_id] = v === null ? '' : Number(v);
              }
              return next;
            });
          }
        }
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to load percentage entry.');
      }
    };

    run();
  }, [canLoad, school?.id, termExamId, examSessionId, classId, subjectId]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      return name.includes(q) || s.registration_id.toLowerCase().includes(q);
    });
  }, [students, studentSearch]);

  const setPct = (studentId: string, value: string) => {
    const v = value === '' ? '' : Number(value);
    setPercent((prev) => ({
      ...prev,
      [studentId]: v === '' ? '' : Number.isFinite(v) ? v : '',
    }));
  };

  const handleSave = async () => {
    if (!school?.id) return;

    if (!canLoad) {
      setErrorMsg('Select Term, Exam Session (matching term), Class and Subject first.');
      return;
    }

    if (!placeholderQuestion?.id) {
      setErrorMsg('Placeholder question could not be created. Check topics for this class & subject.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const rows: any[] = [];

      for (const st of filteredStudents) {
        const v = percent?.[st.registration_id];
        if (v === '' || v === undefined || v === null) continue;

        const pct = Number(v);
        if (!Number.isFinite(pct)) continue;

        if (pct < 0 || pct > 100) {
          throw new Error(`Invalid percentage for ${st.registration_id}. Must be between 0 and 100.`);
        }

        rows.push({
          student_id: st.registration_id,
          question_id: Number(placeholderQuestion.id),
          grade_id: Number(classId),
          subject_id: Number(subjectId),
          topic_id: null,
          exam_session_id: Number(examSessionId),
          score: Math.round(pct),
          total_score: null,
          max_possible: 100,
          percentage: Number(pct.toFixed(2)),
          school_id: school.id,
        });
      }

      if (rows.length === 0) {
        setErrorMsg('Nothing to save. Enter at least one percentage.');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('assessment_examresult').upsert(rows, {
        onConflict: 'school_id,student_id,question_id,exam_session_id',
      });

      if (error) throw error;

      setSuccessMsg(`Saved ${rows.length} percentage entries successfully.`);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to save percentages.');
    } finally {
      setSaving(false);
    }
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading Percentage Entry...</p>
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
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">School Configuration Required</h3>
              <p className="text-gray-600 mb-6">
                Your account needs to be linked to a school before you can enter marks.
              </p>
              <button
                onClick={() => router.push('/management/school-settings')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Configure School Settings
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

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Link href="/assessments" className="hover:text-gray-700 inline-flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" />
                    Assessments
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-gray-700 font-medium">Percentage Entry</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Percentage Entry</h1>
                <p className="text-gray-600">
                  Quick entry when teachers don't have time for question-by-question marks.
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !canLoad || !placeholderQuestion?.id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Percentages'}
              </button>
            </div>

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

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <h2 className="font-semibold text-gray-900">Select Assessment</h2>
                </div>
                <div className="text-sm text-gray-500">{canLoad ? 'Ready' : 'Pick all fields'}</div>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Term *</label>
                  <select
                    value={termExamId}
                    onChange={(e) => setTermExamId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select term</option>
                    {termSessions.map((t) => (
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
                    {parsedExamSessions.map((es) => (
                      <option key={es.id} value={es.id}>
                        {es.exam_type} {es.term_name ? ` — ${es.term_name.replace('_', ' ')} ${es.term_year}` : ''}
                      </option>
                    ))}
                  </select>

                  {termExamId &&
                    examSessionId &&
                    selectedExamSession &&
                    Number(termExamId) !== Number(selectedExamSession.term_id) && (
                      <p className="text-xs text-red-600 mt-2">This session belongs to a different term.</p>
                    )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                  <select
                    value={classId}
                    onChange={(e) => {
                      setClassId(e.target.value);
                      setSubjectId('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select class</option>
                    {classes.map((g) => (
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
                    {subjectsForClass.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {canLoad && (
                <div className="px-5 pb-5">
                  {placeholderQuestion?.id ? (
                    <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                      Placeholder question ready: <span className="font-semibold">{placeholderQuestion.question_number}</span>{' '}
                      (Max {placeholderQuestion.max_score}). Percentages will be saved under this question.
                    </div>
                  ) : (
                    <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      Preparing placeholder question...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{filteredStudents.length} student(s)</span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search name or reg no..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
                  />
                </div>
              </div>

              {!canLoad ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  Select Term, Exam Session (matching term), Class and Subject.
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">No students found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 min-w-[320px]">Student</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 w-[220px]">
                          Percentage (0–100)
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {filteredStudents.map((st) => {
                        const v = percent?.[st.registration_id] ?? '';
                        const invalid = v !== '' && (Number(v) < 0 || Number(v) > 100);

                        return (
                          <tr key={st.registration_id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900">
                                {st.first_name} {st.last_name}
                              </div>
                              <div className="text-xs text-gray-500">{st.registration_id}</div>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                value={v}
                                onChange={(e) => setPct(st.registration_id, e.target.value)}
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                disabled={!placeholderQuestion?.id}
                                className={`w-44 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 disabled:opacity-60 ${
                                  invalid ? 'border-red-300 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-500'
                                }`}
                                placeholder="—"
                              />
                              {invalid && <div className="text-xs text-red-600 mt-1">Must be 0–100</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-5 border-t border-gray-200 flex items-center justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving || !canLoad || !placeholderQuestion?.id}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Percentages'}
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              This page auto-creates a <span className="font-medium">PERCENTAGE</span> placeholder question (max 100) if missing,
              then saves values in <span className="font-medium">assessment_examresult</span> for the selected exam session.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
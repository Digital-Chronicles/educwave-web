'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Loader2,
  Save,
  Search,
  Upload,
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
  start_date: string;
  end_date: string;
}

// Fixed interface to handle array response
interface ExamSessionRow {
  id: number;
  term_id: number;
  exam_type: 'BOT' | 'MOT' | 'EOT';
  start_date: string;
  end_date: string;
  term?: { term_name: string; year: number }[] | null;
}

// Helper type for parsed term data
interface ExamSessionWithTerm {
  id: number;
  term_id: number;
  exam_type: 'BOT' | 'MOT' | 'EOT';
  start_date: string;
  end_date: string;
  term_name: string;
  term_year: number;
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

/** CSV helpers */
function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^\uFEFF/, '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = (cols[j] ?? '').trim();
    rows.push(row);
  }

  return { headers, rows };
}

export default function MarksEntryPage() {
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
  const [parsedExamSessions, setParsedExamSessions] = useState<ExamSessionWithTerm[]>([]);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [marks, setMarks] = useState<MarksMap>({});
  const [saving, setSaving] = useState(false);

  const [termExamId, setTermExamId] = useState('');
  const [examSessionId, setExamSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErrs, setImportErrs] = useState<string[]>([]);

  // Auth check
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

  // Load profile + school + base lists
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
          .select('id, term_name, year, start_date, end_date')
          .eq('school_id', sch.id)
          .order('id', { ascending: false }),
        supabase
          .from('exam_session')
          .select('id, term_id, exam_type, start_date, end_date, term:term_exam_session(term_name, year)')
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
      const parsedSessions: ExamSessionWithTerm[] = sessionData.map(session => ({
        id: session.id,
        term_id: session.term_id,
        exam_type: session.exam_type,
        start_date: session.start_date,
        end_date: session.end_date,
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

  const canLoadGrid = useMemo(() => {
    if (!termExamId || !examSessionId || !classId || !subjectId) return false;
    if (!selectedExamSession) return false;
    return Number(termExamId) === Number(selectedExamSession.term_id);
  }, [termExamId, examSessionId, classId, subjectId, selectedExamSession]);

  // Filter subjects by subject.grade_id
  const subjectsForClass = useMemo(() => {
    if (!classId) return subjects;
    return subjects.filter((s) => Number(s.grade_id ?? 0) === Number(classId));
  }, [subjects, classId]);

  // Load grid
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
      setImportMsg(null);
      setImportErrs([]);

      try {
        const { data: studentRows, error: sErr } = await supabase
          .from('students')
          .select('registration_id, first_name, last_name, current_grade_id')
          .eq('school_id', school.id)
          .eq('current_grade_id', Number(classId))
          .order('first_name');

        if (sErr) throw sErr;

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
          .eq('grade_id', Number(classId))
          .eq('subject_id', Number(subjectId))
          .eq('term_exam_id', Number(termExamId))
          .eq('exam_type_id', Number(examSessionId))
          .order('id', { ascending: true });

        if (qErr) throw qErr;

        const st = (studentRows ?? []) as StudentRow[];
        const qs = (questionRows ?? []) as unknown as QuestionRow[];

        setStudents(st);
        setQuestions(qs);

        const initial: MarksMap = {};
        for (const s of st) {
          initial[s.registration_id] = {};
          for (const q of qs) initial[s.registration_id][q.id] = '';
        }
        setMarks(initial);

        const { data: existing, error: exErr } = await supabase
          .from('assessment_examresult')
          .select('student_id, question_id, score')
          .eq('school_id', school.id)
          .eq('exam_session_id', Number(examSessionId))
          .eq('grade_id', Number(classId))
          .eq('subject_id', Number(subjectId));

        if (exErr) throw exErr;

        if (existing?.length) {
          setMarks((prev) => {
            const copy: MarksMap = {};
            for (const sid of Object.keys(prev)) copy[sid] = { ...(prev[sid] || {}) };

            for (const r of existing as any[]) {
              if (copy?.[r.student_id]?.[r.question_id] !== undefined) {
                copy[r.student_id][r.question_id] = r.score ?? '';
              }
            }
            return copy;
          });
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to load marks grid.');
      }
    };

    run();
  }, [canLoadGrid, school?.id, termExamId, examSessionId, classId, subjectId]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      return name.includes(q) || s.registration_id.toLowerCase().includes(q);
    });
  }, [students, studentSearch]);

  const totalCells = useMemo(() => filteredStudents.length * questions.length, [filteredStudents.length, questions.length]);

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
      setErrorMsg('Select Term, Exam Session (matching term), Class and Subject first.');
      return;
    }
    if (questions.length === 0) {
      setErrorMsg('No questions found for the selected filters.');
      return;
    }
    if (filteredStudents.length === 0) {
      setErrorMsg('No students found for that class.');
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
            grade_id: Number(classId),
            subject_id: Number(subjectId),
            topic_id: q.topic_id ?? null,
            exam_session_id: Number(examSessionId),
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

      const { error } = await supabase.from('assessment_examresult').upsert(rows, {
        onConflict: 'school_id,student_id,question_id,exam_session_id',
      });

      if (error) throw error;

      setSuccessMsg(`Saved ${rows.length} marks successfully.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  const downloadCSVTemplate = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setImportMsg(null);
    setImportErrs([]);

    if (!canLoadGrid || !questions.length) {
      setErrorMsg('Load the grid first so we can generate the correct CSV template.');
      return;
    }

    const qHeaders = questions.map((q) => `Q${q.question_number}`);
    const headers = ['registration_id', ...qHeaders];
    const sample = ['2019/PCS/001', ...questions.map(() => '')];

    const csv = [headers.join(','), sample.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'marks_import_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCSVImport = async (file: File) => {
    if (!school?.id) return;

    if (!canLoadGrid) {
      setErrorMsg('Select Term, Exam Session (matching term), Class and Subject first.');
      return;
    }

    if (!questions.length || !students.length) {
      setErrorMsg('Load the grid first (students and questions) before importing.');
      return;
    }

    setImporting(true);
    setImportMsg(null);
    setImportErrs([]);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      if (!headers.length) throw new Error('CSV has no headers or rows.');

      const idHeader =
        headers.find((h) => h.toLowerCase() === 'registration_id') ||
        headers.find((h) => h.toLowerCase() === 'student_id');

      if (!idHeader) throw new Error('CSV must include "registration_id" (or "student_id") column.');

      const qMap = new Map<string, QuestionRow>();
      for (const q of questions) qMap.set(`Q${String(q.question_number).trim()}`.toUpperCase(), q);

      const studentSet = new Set(students.map((s) => s.registration_id));

      let applied = 0;
      let skipped = 0;
      const errs: string[] = [];

      setMarks((prev) => {
        const next: MarksMap = {};
        for (const sid of Object.keys(prev)) next[sid] = { ...(prev[sid] || {}) };

        rows.forEach((r, idx) => {
          const rowNo = idx + 2;
          const studentId = (r[idHeader] ?? '').trim();

          if (!studentId) {
            skipped++;
            errs.push(`Row ${rowNo}: Missing registration_id`);
            return;
          }

          if (!studentSet.has(studentId)) {
            skipped++;
            errs.push(`Row ${rowNo}: Student not found in this class -> ${studentId}`);
            return;
          }

          if (!next[studentId]) next[studentId] = {};

          for (const h of headers) {
            if (h === idHeader) continue;

            const key = h.trim().toUpperCase();
            const q = qMap.get(key);
            if (!q) continue;

            const raw = (r[h] ?? '').trim();
            if (raw === '') continue;

            const score = Number(raw);
            if (!Number.isFinite(score)) {
              skipped++;
              errs.push(`Row ${rowNo}: ${h} invalid number "${raw}"`);
              continue;
            }

            const max = Number(q.max_score ?? 0);
            if (score < 0 || score > max) {
              skipped++;
              errs.push(`Row ${rowNo}: ${h} score ${score} out of range (0–${max})`);
              continue;
            }

            next[studentId][q.id] = score;
            applied++;
          }
        });

        return next;
      });

      setImportErrs(errs);
      setImportMsg(
        `Import completed: applied ${applied} marks. ${
          skipped ? `Skipped ${skipped} cells/rows (open details below).` : 'No errors.'
        }`
      );
    } catch (e: any) {
      setErrorMsg(e?.message || 'CSV import failed.');
    } finally {
      setImporting(false);
    }
  };

  // Loading
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-gray-200"></div>
            <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-900">Loading Marks Entry</p>
            <p className="text-sm text-gray-500 mt-1">Preparing your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  // No school configured
  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* FIXED: Removed userEmail prop from Navbar */}
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">School Configuration Required</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Your account needs to be linked to a school before you can enter marks.
                </p>
                <button
                  onClick={() => router.push('/management/school-settings')}
                  className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
                >
                  <FileText className="w-5 h-5" />
                  Configure School Settings
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* FIXED: Removed userEmail prop from Navbar */}
      <Navbar />

      <div className="flex">
        <AppShell />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <Link 
                      href="/assessments" 
                      className="hover:text-blue-600 inline-flex items-center gap-1 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Assessments
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-blue-600 font-medium">Enter Marks</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
                      <BookOpen className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">Marks Entry</h1>
                      <p className="text-gray-600 mt-1">
                        For <span className="font-semibold text-blue-600">{school.school_name}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !canLoadGrid}
                  className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {saving ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div className="p-5 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl shadow-sm flex items-start gap-3 animate-fadeIn">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-sm text-red-800 font-medium flex-1">{errorMsg}</p>
              </div>
            )}

            {successMsg && (
              <div className="p-5 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-2xl shadow-sm flex items-start gap-3 animate-fadeIn">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-green-800 font-medium flex-1">{successMsg}</p>
              </div>
            )}

            {importMsg && (
              <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-800 font-medium">{importMsg}</p>
                </div>
                {importErrs.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-sm cursor-pointer text-blue-700 font-medium hover:text-blue-800 inline-flex items-center gap-2">
                      View skipped rows/cells ({importErrs.length})
                      <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="mt-3 p-4 bg-white rounded-lg border border-blue-100 max-h-64 overflow-auto">
                      <ul className="space-y-2">
                        {importErrs.slice(0, 100).map((x, i) => (
                          <li key={i} className="text-xs text-gray-700 p-2 bg-gray-50 rounded">
                            • {x}
                          </li>
                        ))}
                        {importErrs.length > 100 && (
                          <li className="text-xs text-gray-500 italic">
                            • ...and {importErrs.length - 100} more errors
                          </li>
                        )}
                      </ul>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 rounded-lg">
                      <Filter className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Select Assessment</h2>
                      <p className="text-sm text-gray-500">Choose the assessment parameters to load the marks grid</p>
                    </div>
                  </div>

                  <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                    <div className="text-sm font-medium text-blue-700">
                      {termExamId &&
                      examSessionId &&
                      selectedExamSession &&
                      Number(termExamId) !== Number(selectedExamSession.term_id)
                        ? '⚠️ Session-Term Mismatch'
                        : canLoadGrid
                          ? '✅ Ready to Load'
                          : 'Select all fields'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Term <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={termExamId}
                    onChange={(e) => setTermExamId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all hover:border-gray-300"
                  >
                    <option value="" className="text-gray-400">Select term</option>
                    {termSessions.map((t) => (
                      <option key={t.id} value={t.id} className="py-2">
                        {t.term_name.replace('_', ' ')} {t.year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Exam Session <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={examSessionId}
                    onChange={(e) => setExamSessionId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all hover:border-gray-300"
                  >
                    <option value="" className="text-gray-400">Select session</option>
                    {parsedExamSessions.map((es) => (
                      <option key={es.id} value={es.id} className="py-2">
                        {es.exam_type} — {es.term_name.replace('_', ' ')} {es.term_year}
                      </option>
                    ))}
                  </select>

                  {termExamId &&
                    examSessionId &&
                    selectedExamSession &&
                    Number(termExamId) !== Number(selectedExamSession.term_id) && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-700 font-medium">
                          ⚠️ This exam session belongs to a different term. Please select the correct session.
                        </p>
                      </div>
                    )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => {
                      setClassId(e.target.value);
                      setSubjectId('');
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all hover:border-gray-300"
                  >
                    <option value="" className="text-gray-400">Select class</option>
                    {classes.map((g) => (
                      <option key={g.id} value={g.id} className="py-2">
                        {g.grade_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    disabled={!classId}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" className="text-gray-400">Select subject</option>
                    {subjectsForClass.map((s) => (
                      <option key={s.id} value={s.id} className="py-2">
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {!classId && (
                    <p className="text-xs text-gray-500 mt-1">Select a class first</p>
                  )}
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Marks Entry Grid</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-900">{filteredStudents.length}</span> students
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-900">{questions.length}</span> questions
                        </span>
                      </div>
                      <div className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                        <span className="text-sm font-medium text-blue-700">
                          {filledCells}/{totalCells} cells filled
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                      <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search student name or reg no..."
                        className="pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-72 transition-all"
                      />
                    </div>

                    <div className="h-8 border-l border-gray-300"></div>

                    <button
                      onClick={downloadCSVTemplate}
                      disabled={!canLoadGrid || questions.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-3 border-2 border-gray-200 bg-white rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-all"
                      type="button"
                    >
                      <Download className="w-4 h-4" />
                      Template CSV
                    </button>

                    <label
                      className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                        importing || !canLoadGrid 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      {importing ? 'Importing...' : 'Import CSV'}
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        disabled={importing || !canLoadGrid}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          handleCSVImport(f);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {!canLoadGrid ? (
                <div className="p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center">
                    <Filter className="w-10 h-10 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Select Assessment Parameters</h4>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Choose Term, Exam Session (matching term), Class and Subject to load the marks grid.
                  </p>
                </div>
              ) : questions.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl flex items-center justify-center">
                    <FileText className="w-10 h-10 text-yellow-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Questions Found</h4>
                  <p className="text-gray-600 max-w-md mx-auto">
                    No questions found for the selected filters. Please create questions first in the assessment setup.
                  </p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-100 to-red-50 rounded-2xl flex items-center justify-center">
                    <Users className="w-10 h-10 text-red-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Students Found</h4>
                  <p className="text-gray-600 max-w-md mx-auto">
                    No students found for the selected class (or search returned none).
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="text-left py-4 px-6 text-sm font-bold text-gray-900 sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10 min-w-[280px] border-r border-gray-200">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Student Information
                            </div>
                          </th>
                          {questions.map((q) => (
                            <th key={q.id} className="text-left py-4 px-6 text-sm font-bold text-gray-900 border-b border-gray-200">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">Q{q.question_number}</span>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                    Max: {q.max_score}
                                  </span>
                                </div>
                                {q.topic?.name && (
                                  <span className="text-xs text-gray-500 font-normal truncate max-w-[120px]">
                                    {q.topic.name}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map((st) => (
                          <tr key={st.registration_id} className="hover:bg-gradient-to-r from-blue-50/30 to-blue-50/10 transition-colors">
                            <td className="py-4 px-6 sticky left-0 bg-white z-10 min-w-[280px] border-r border-gray-200">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                                  <span className="text-sm font-semibold text-blue-600">
                                    {st.first_name[0]}{st.last_name[0]}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {st.first_name} {st.last_name}
                                  </div>
                                  <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded inline-block mt-1">
                                    {st.registration_id}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {questions.map((q) => {
                              const v = marks?.[st.registration_id]?.[q.id] ?? '';
                              const max = Number(q.max_score ?? 0);
                              const invalid = v !== '' && (Number(v) < 0 || Number(v) > max);

                              return (
                                <td key={q.id} className="py-4 px-6">
                                  <div className="relative">
                                    <input
                                      value={v}
                                      onChange={(e) => setScore(st.registration_id, q.id, e.target.value)}
                                      type="number"
                                      min={0}
                                      max={max}
                                      className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                                        invalid 
                                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50' 
                                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100 hover:border-gray-300'
                                      }`}
                                      placeholder="Enter mark"
                                    />
                                    {invalid && (
                                      <div className="absolute -bottom-6 left-0 text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                                        0–{max} only
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{filledCells}</span> of{' '}
                        <span className="font-semibold text-gray-900">{totalCells}</span> cells filled
                        {filledCells > 0 && totalCells > 0 && (
                          <span className="ml-2 px-2 py-1 bg-gradient-to-r from-green-50 to-green-100 text-green-700 font-medium rounded-lg">
                            {Math.round((filledCells / totalCells) * 100)}% complete
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            // Reset all marks
                            setMarks(prev => {
                              const newMarks: MarksMap = {};
                              for (const student of filteredStudents) {
                                newMarks[student.registration_id] = {};
                                for (const q of questions) {
                                  newMarks[student.registration_id][q.id] = '';
                                }
                              }
                              return newMarks;
                            });
                          }}
                          disabled={filledCells === 0}
                          className="px-4 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all"
                        >
                          Clear All
                        </button>
                        
                        <button
                          onClick={handleSave}
                          disabled={saving || !canLoadGrid || filledCells === 0}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-5 h-5" />
                              Save Marks ({filledCells} entries)
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Note */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-200 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Note: Exam Session must match the selected Term to ensure data integrity.
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    This prevents mixing marks across different terms and sessions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
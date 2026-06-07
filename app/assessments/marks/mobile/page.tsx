'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Save,
  School,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
type ExamType = 'BOT' | 'MOT' | 'EOT';
type TermName = 'TERM_1' | 'TERM_2' | 'TERM_3';
type PercentageMap = Record<string, number | ''>;

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

interface TeacherRow {
  registration_id: string;
}

interface ClassRow {
  id: number;
  grade_name: string;
}

interface SubjectRow {
  id: number;
  name: string;
  grade_id: number | null;
  teacher_id: string | null;
}

interface TermRow {
  id: number;
  term_name: TermName;
  year: number;
}

interface RawExamSessionRow {
  id: number;
  term_id: number;
  exam_type: ExamType;
  term?: { term_name: TermName; year: number }[] | { term_name: TermName; year: number } | null;
}

interface ExamSessionRow {
  id: number;
  term_id: number;
  exam_type: ExamType;
  term_name: TermName | '';
  term_year: number;
}

interface StudentRow {
  registration_id: string;
  first_name: string;
  last_name: string;
}

interface PlaceholderQuestion {
  id: number;
  max_score: number;
}

interface ExistingPercentageRow {
  student_id: string;
  percentage: number | null;
  score: number | null;
}

type SavePercentageRow = {
  student_id: string;
  question_id: number;
  grade_id: number;
  subject_id: number;
  topic_id: number | null;
  exam_session_id: number;
  score: number;
  total_score: null;
  max_possible: number;
  percentage: number;
  school_id: string;
};

function getFirst<T>(value: T[] | T | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatTerm(term: TermName | '') {
  return term ? term.replace('_', ' ') : 'Term';
}

function studentName(student: StudentRow) {
  return `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function MobilePercentageEntryPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [placeholderQuestion, setPlaceholderQuestion] = useState<PlaceholderQuestion | null>(null);
  const [percentages, setPercentages] = useState<PercentageMap>({});

  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [examSessionId, setExamSessionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/');
        return;
      }

      setAuthChecking(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (authChecking) return;

    const loadBaseData = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) throw userErr;
        if (!user) throw new Error('Could not find authenticated user.');

        const { data: profileRow, error: profileErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id')
          .eq('user_id', user.id)
          .single();

        if (profileErr || !profileRow) {
          throw new Error(profileErr?.message || 'Profile not found.');
        }

        const profileData = profileRow as ProfileRow;

        if (!profileData.school_id) {
          throw new Error('Your account is not linked to a school.');
        }

        const { data: schoolRow, error: schoolErr } = await supabase
          .from('general_information')
          .select('id, school_name')
          .eq('id', profileData.school_id)
          .single();

        if (schoolErr || !schoolRow) {
          throw new Error(schoolErr?.message || 'School not found.');
        }

        const schoolData = schoolRow as SchoolRow;
        setSchool(schoolData);

        let teacherData: TeacherRow | null = null;
        if (profileData.role === 'TEACHER') {
          const { data: teacherRow, error: teacherErr } = await supabase
            .from('teachers')
            .select('registration_id')
            .eq('user_id', user.id)
            .eq('school_id', schoolData.id)
            .single();

          if (teacherErr || !teacherRow) {
            throw new Error(teacherErr?.message || 'Teacher record not found.');
          }

          teacherData = teacherRow as TeacherRow;
          setTeacher(teacherData);
        }

        const [classRes, subjectRes, termRes, sessionRes] = await Promise.all([
          supabase.from('class').select('id, grade_name').eq('school_id', schoolData.id).order('grade_name'),
          supabase
            .from('subject')
            .select('id, name, grade_id, teacher_id')
            .eq('school_id', schoolData.id)
            .order('name'),
          supabase
            .from('term_exam_session')
            .select('id, term_name, year')
            .eq('school_id', schoolData.id)
            .order('year', { ascending: false })
            .order('term_name'),
          supabase
            .from('exam_session')
            .select('id, term_id, exam_type, term:term_exam_session(term_name, year)')
            .eq('school_id', schoolData.id)
            .order('id', { ascending: false }),
        ]);

        if (classRes.error) throw classRes.error;
        if (subjectRes.error) throw subjectRes.error;
        if (termRes.error) throw termRes.error;
        if (sessionRes.error) throw sessionRes.error;

        const allSubjects = (subjectRes.data ?? []) as SubjectRow[];
        const visibleSubjects =
          profileData.role === 'TEACHER' && teacherData
            ? allSubjects.filter((subject) => subject.teacher_id === teacherData.registration_id)
            : allSubjects;

        const parsedSessions = ((sessionRes.data ?? []) as RawExamSessionRow[]).map((session) => {
          const term = getFirst(session.term);
          return {
            id: session.id,
            term_id: session.term_id,
            exam_type: session.exam_type,
            term_name: term?.term_name ?? '',
            term_year: term?.year ?? 0,
          };
        });

        setClasses((classRes.data ?? []) as ClassRow[]);
        setSubjects(visibleSubjects);
        setTerms((termRes.data ?? []) as TermRow[]);
        setExamSessions(parsedSessions);
      } catch (err: unknown) {
        setErrorMsg(getErrorMessage(err, 'Failed to load percentage entry.'));
      } finally {
        setLoading(false);
      }
    };

    loadBaseData();
  }, [authChecking]);

  const subjectsForClass = useMemo(() => {
    if (!classId) return [];
    return subjects.filter((subject) => Number(subject.grade_id ?? 0) === Number(classId));
  }, [subjects, classId]);

  const examSessionsForTerm = useMemo(() => {
    if (!termId) return [];
    return examSessions.filter((session) => Number(session.term_id) === Number(termId));
  }, [examSessions, termId]);

  const selectedClass = useMemo(
    () => classes.find((item) => Number(item.id) === Number(classId)) ?? null,
    [classes, classId]
  );

  const selectedSubject = useMemo(
    () => subjects.find((item) => Number(item.id) === Number(subjectId)) ?? null,
    [subjects, subjectId]
  );

  const selectedSession = useMemo(
    () => examSessions.find((item) => Number(item.id) === Number(examSessionId)) ?? null,
    [examSessions, examSessionId]
  );

  const canLoadStudents = Boolean(school?.id && classId && termId && examSessionId && subjectId);

  useEffect(() => {
    if (!school?.id || !canLoadStudents) {
      setStudents([]);
      setPlaceholderQuestion(null);
      setPercentages({});
      return;
    }

    const ensurePercentageQuestion = async () => {
      const gradeId = Number(classId);
      const subject = Number(subjectId);
      const term = Number(termId);
      const session = Number(examSessionId);

      const { data: existingQuestion, error: questionErr } = await supabase
        .from('assessment_question')
        .select('id, question_number, max_score')
        .eq('school_id', school.id)
        .eq('term_exam_id', term)
        .eq('grade_id', gradeId)
        .eq('subject_id', subject)
        .in('question_number', ['PERCENTAGE', 'PERCENT', 'PCT'])
        .order('id', { ascending: true })
        .limit(1);

      if (questionErr) throw questionErr;

      const found = existingQuestion?.[0] as PlaceholderQuestion | undefined;
      if (found?.id) return found;

      const { data: topicRows, error: topicErr } = await supabase
        .from('assessment_topics')
        .select('id')
        .eq('school_id', school.id)
        .eq('grade_id', gradeId)
        .eq('subject_id', subject)
        .order('id', { ascending: true })
        .limit(1);

      if (topicErr) throw topicErr;

      let topicId = topicRows?.[0]?.id as number | undefined;
      if (!topicId) {
        const { data: newTopic, error: createTopicErr } = await supabase
          .from('assessment_topics')
          .insert({
            school_id: school.id,
            grade_id: gradeId,
            subject_id: subject,
            name: 'General Assessment',
          })
          .select('id')
          .single();

        if (createTopicErr) throw createTopicErr;
        topicId = newTopic.id as number;
      }

      const { data: created, error: createQuestionErr } = await supabase
        .from('assessment_question')
        .upsert(
          {
            term_exam_id: term,
            exam_type_id: session,
            question_number: 'PERCENTAGE',
            topic_id: Number(topicId),
            grade_id: gradeId,
            subject_id: subject,
            max_score: 100,
            school_id: school.id,
          },
          {
            onConflict: 'term_exam_id,question_number,grade_id,subject_id',
          }
        )
        .select('id, max_score')
        .single();

      if (createQuestionErr) throw createQuestionErr;
      return created as PlaceholderQuestion;
    };

    const loadStudentsAndPercentages = async () => {
      setStudentLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const gradeId = Number(classId);
        const subject = Number(subjectId);
        const session = Number(examSessionId);

        const [studentRes, question] = await Promise.all([
          supabase
            .from('students')
            .select('registration_id, first_name, last_name')
            .eq('school_id', school.id)
            .eq('current_grade_id', gradeId)
            .order('first_name'),
          ensurePercentageQuestion(),
        ]);

        if (studentRes.error) throw studentRes.error;

        const studentRows = (studentRes.data ?? []) as StudentRow[];
        const initialPercentages: PercentageMap = {};

        for (const student of studentRows) {
          initialPercentages[student.registration_id] = '';
        }

        const { data: existing, error: existingErr } = await supabase
          .from('assessment_examresult')
          .select('student_id, percentage, score')
          .eq('school_id', school.id)
          .eq('exam_session_id', session)
          .eq('grade_id', gradeId)
          .eq('subject_id', subject)
          .eq('question_id', Number(question.id));

        if (existingErr) throw existingErr;

        for (const row of (existing ?? []) as ExistingPercentageRow[]) {
          const value = row.percentage ?? row.score ?? '';
          if (initialPercentages[row.student_id] !== undefined) {
            initialPercentages[row.student_id] = value === '' ? '' : Number(value);
          }
        }

        setStudents(studentRows);
        setPlaceholderQuestion(question);
        setPercentages(initialPercentages);
      } catch (err: unknown) {
        setErrorMsg(getErrorMessage(err, 'Failed to load students and percentages.'));
      } finally {
        setStudentLoading(false);
      }
    };

    loadStudentsAndPercentages();
  }, [school?.id, canLoadStudents, classId, termId, examSessionId, subjectId]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;

    return students.filter((student) => {
      const haystack = `${studentName(student)} ${student.registration_id}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [students, studentSearch]);

  const filledCount = useMemo(() => {
    return students.filter((student) => {
      const value = percentages[student.registration_id];
      return value !== '' && value !== undefined && value !== null;
    }).length;
  }, [students, percentages]);

  const progress = students.length > 0 ? Math.round((filledCount / students.length) * 100) : 0;

  const setPercentage = (studentId: string, rawValue: string) => {
    const value = rawValue === '' ? '' : Number(rawValue);
    setPercentages((current) => ({
      ...current,
      [studentId]: value === '' || Number.isFinite(value) ? value : '',
    }));
  };

  const handleSave = async () => {
    if (!school?.id || !canLoadStudents || !placeholderQuestion?.id) {
      setErrorMsg('Select class, term, exam, and subject first.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const rows: SavePercentageRow[] = [];

      for (const student of students) {
        const value = percentages[student.registration_id];
        if (value === '' || value === undefined || value === null) continue;

        const percentage = Number(value);
        if (!Number.isFinite(percentage)) continue;

        if (percentage < 0 || percentage > 100) {
          throw new Error(`${studentName(student)} has an invalid percentage. Use 0 to 100.`);
        }

        rows.push({
          student_id: student.registration_id,
          question_id: Number(placeholderQuestion.id),
          grade_id: Number(classId),
          subject_id: Number(subjectId),
          topic_id: null,
          exam_session_id: Number(examSessionId),
          score: percentage,
          total_score: null,
          max_possible: 100,
          percentage: Number(percentage.toFixed(2)),
          school_id: school.id,
        });
      }

      if (rows.length === 0) {
        setErrorMsg('Enter at least one percentage before saving.');
        return;
      }

      const { error } = await supabase.from('assessment_examresult').upsert(rows, {
        onConflict: 'school_id,student_id,question_id,exam_session_id',
      });

      if (error) throw error;

      setSuccessMsg(`Saved ${rows.length} percentage entries.`);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, 'Failed to save percentages.'));
    } finally {
      setSaving(false);
    }
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" />
          <p className="mt-4 text-sm text-slate-300">Opening mobile percentage entry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link
            href="/assessments"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200"
            aria-label="Back to assessments"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-white">Mobile Percentage Entry</h1>
            <p className="truncate text-xs text-slate-400">
              {school?.school_name ?? 'School'}{teacher ? ' - teacher mode' : ''}
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !canLoadStudents || filledCount === 0}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-cyan-400 px-4 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 pb-28 pt-4">
        {errorMsg && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-red-200">
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-200">
              Dismiss
            </button>
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Choose assessment</h2>
              <p className="text-xs text-slate-400">Then enter each student&apos;s total percentage.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <School className="h-3.5 w-3.5" />
                Class
              </span>
              <div className="relative">
                <select
                  value={classId}
                  onChange={(event) => {
                    setClassId(event.target.value);
                    setSubjectId('');
                  }}
                  className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-slate-900 px-4 pr-10 text-sm text-white outline-none focus:border-cyan-300"
                >
                  <option value="">Pick class</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.grade_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <BookOpen className="h-3.5 w-3.5" />
                Term
              </span>
              <div className="relative">
                <select
                  value={termId}
                  onChange={(event) => {
                    setTermId(event.target.value);
                    setExamSessionId('');
                  }}
                  className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-slate-900 px-4 pr-10 text-sm text-white outline-none focus:border-cyan-300"
                >
                  <option value="">Pick term</option>
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {formatTerm(term.term_name)} {term.year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Exam</span>
              <div className="relative">
                <select
                  value={examSessionId}
                  onChange={(event) => setExamSessionId(event.target.value)}
                  disabled={!termId}
                  className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-slate-900 px-4 pr-10 text-sm text-white outline-none focus:border-cyan-300 disabled:opacity-50"
                >
                  <option value="">{termId ? 'Pick exam' : 'Pick term first'}</option>
                  {examSessionsForTerm.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.exam_type} - {formatTerm(session.term_name)} {session.term_year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Subject</span>
              <div className="relative">
                <select
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  disabled={!classId}
                  className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-slate-900 px-4 pr-10 text-sm text-white outline-none focus:border-cyan-300 disabled:opacity-50"
                >
                  <option value="">{classId ? 'Pick subject' : 'Pick class first'}</option>
                  {subjectsForClass.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[11px] text-slate-400">Students</div>
            <div className="mt-1 text-xl font-bold text-white">{students.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[11px] text-slate-400">Filled</div>
            <div className="mt-1 text-xl font-bold text-white">{filledCount}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[11px] text-slate-400">Progress</div>
            <div className="mt-1 text-xl font-bold text-cyan-200">{progress}%</div>
          </div>
        </section>

        {canLoadStudents && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">
                  {selectedClass?.grade_name ?? 'Class'} - {selectedSubject?.name ?? 'Subject'}
                </h2>
                <p className="truncate text-xs text-slate-400">
                  {selectedSession?.exam_type ?? 'Exam'} total percentages, {filledCount}/{students.length} entered
                </p>
              </div>
              <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-cyan-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search student..."
                className="h-11 w-full rounded-2xl border border-white/10 bg-slate-900 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
              />
            </div>
          </section>
        )}

        {!canLoadStudents ? (
          <section className="rounded-3xl border border-dashed border-white/15 p-8 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-500" />
            <h2 className="mt-4 text-base font-semibold text-white">Start with the selectors above</h2>
            <p className="mt-2 text-sm text-slate-400">
              Pick class, term, exam, and subject to load the students for total percentage entry.
            </p>
          </section>
        ) : studentLoading ? (
          <section className="rounded-3xl border border-white/10 p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" />
            <p className="mt-3 text-sm text-slate-400">Loading students...</p>
          </section>
        ) : filteredStudents.length === 0 ? (
          <section className="rounded-3xl border border-white/10 p-8 text-center">
            <Search className="mx-auto h-9 w-9 text-slate-500" />
            <p className="mt-3 text-sm text-slate-400">No student matches that search.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {filteredStudents.map((student, index) => {
              const value = percentages[student.registration_id] ?? '';
              const invalid = value !== '' && (Number(value) < 0 || Number(value) > 100);

              return (
                <article
                  key={student.registration_id}
                  className="rounded-3xl border border-white/10 bg-white/[0.05] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-200">
                          {index + 1}
                        </span>
                        <h3 className="truncate text-base font-semibold text-white">{studentName(student)}</h3>
                      </div>
                      <p className="mt-1 truncate pl-9 text-xs text-slate-400">{student.registration_id}</p>
                    </div>

                    <label className="w-32 shrink-0">
                      <span className="sr-only">Percentage for {studentName(student)}</span>
                      <div className="relative">
                        <input
                          value={value}
                          onChange={(event) => setPercentage(student.registration_id, event.target.value)}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={100}
                          step="0.01"
                          placeholder="0"
                          className={cn(
                            'h-14 w-full rounded-2xl border bg-slate-900 px-3 pr-9 text-center text-xl font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300',
                            invalid ? 'border-red-400' : 'border-white/10'
                          )}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                          %
                        </span>
                      </div>
                      <span className={cn('mt-1 block text-right text-[11px]', invalid ? 'text-red-300' : 'text-slate-500')}>
                        {invalid ? '0 to 100' : 'Total'}
                      </span>
                    </label>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate-400">
              {filledCount}/{students.length} percentages entered
            </p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !canLoadStudents || filledCount === 0}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

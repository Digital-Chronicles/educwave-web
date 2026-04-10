'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  BookText,
  CalendarDays,
  ClipboardList,
  FileBarChart2,
  FileText,
  IdCard,
  Mail,
  School,
  Sparkles,
  User,
  Users,
  Wallet,
  AlertTriangle,
  ExternalLink,
  Pencil,
  Clock3,
  Plus,
  Eye,
  ChevronRight,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

type Role = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT' | string;

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  school_id: string | null;
  created_at?: string;
  updated_at?: string;
}

interface SchoolRow {
  id: string;
  school_name: string;
  location?: string | null;
  contact_number?: string | null;
  email?: string | null;
}

interface TeacherRow {
  registration_id: string;
  user_id: string;
  initials: string | null;
  first_name: string;
  last_name: string;
  gender: string | null;
  year_of_entry: string;
  profile_picture_url: string | null;
  school_id: string;
  registered_by: string | null;
  created_at?: string | null;
  email?: string | null;
}

// Raw type from Supabase (arrays for relations)
interface SubjectRowRaw {
  id: number;
  name: string;
  code: string | null;
  grade_id: number | null;
  teacher_id: string | null;
  school_id: string | null;
  grade: { grade_name: string }[] | null;
  curriculum: { name: string }[] | null;
}

interface NoteRowRaw {
  id: number;
  description: string | null;
  subject_id: number | null;
  grade_id: number | null;
  created_by_id: string | null;
  created: string;
  subject: { name: string }[] | null;
  grade: { grade_name: string }[] | null;
}

interface QuizRowRaw {
  id: number;
  title: string;
  subject_id: number;
  grade_id: number;
  created_by_id: string | null;
  created_at: string | null;
  time_limit_minutes: number | null;
  total_marks: number | null;
  is_active: boolean | null;
  subject: { name: string }[] | null;
  grade: { grade_name: string }[] | null;
}

interface ExamRowRaw {
  id: number;
  subject_id: number;
  grade_id: number | null;
  created_by_id: string | null;
  date: string;
  duration_minutes: number;
  description: string | null;
  created: string;
  subject: { name: string; code: string | null }[] | null;
  grade: { grade_name: string }[] | null;
}

// Normalized types (objects for relations)
interface SubjectRow {
  id: number;
  name: string;
  code: string | null;
  grade_id: number | null;
  teacher_id: string | null;
  school_id: string | null;
  grade?: { grade_name: string } | null;
  curriculum?: { name: string } | null;
}

interface NoteRow {
  id: number;
  description: string | null;
  subject_id: number | null;
  grade_id: number | null;
  created_by_id: string | null;
  created: string;
  subject?: { name: string } | null;
  grade?: { grade_name: string } | null;
}

interface QuizRow {
  id: number;
  title: string;
  subject_id: number;
  grade_id: number;
  created_by_id: string | null;
  created_at: string | null;
  time_limit_minutes: number | null;
  total_marks: number | null;
  is_active: boolean | null;
  subject?: { name: string } | null;
  grade?: { grade_name: string } | null;
}

interface ExamRow {
  id: number;
  subject_id: number;
  grade_id: number | null;
  created_by_id: string | null;
  date: string;
  duration_minutes: number;
  description: string | null;
  created: string;
  subject?: { name: string; code: string | null } | null;
  grade?: { grade_name: string } | null;
}

interface MarksStatRow {
  id: number;
  subject_id: number | null;
  grade_id: number | null;
  score: number | null;
  exam_session_id: number | null;
}

interface CurrentEmploymentRow {
  id: number;
  teacher_id: string;
  school_id: string | null;
  position: string;
  department: string;
}

interface PayrollInformationRow {
  id: number;
  teacher_id: string;
  school_id: string | null;
  salary: number;
  bank_name: string;
  account_number: string;
  tax_identification_number: string;
  nssf_number: string;
  payment_frequency: string;
}

interface NextOfKinRow {
  id: number;
  teacher_id: string;
  school_id: string | null;
  name: string;
  relationship: string;
  contact_number: string;
  address: string;
}

// Helper function to extract first item from array or return null
function getFirstOrNull<T>(arr: T[] | null | undefined): T | null {
  if (!arr || !Array.isArray(arr)) return null;
  return arr[0] || null;
}

function normalizeSubject(subjectRaw: SubjectRowRaw): SubjectRow {
  return {
    ...subjectRaw,
    grade: getFirstOrNull(subjectRaw.grade),
    curriculum: getFirstOrNull(subjectRaw.curriculum),
  };
}

function normalizeNote(noteRaw: NoteRowRaw): NoteRow {
  return {
    ...noteRaw,
    subject: getFirstOrNull(noteRaw.subject),
    grade: getFirstOrNull(noteRaw.grade),
  };
}

function normalizeQuiz(quizRaw: QuizRowRaw): QuizRow {
  return {
    ...quizRaw,
    subject: getFirstOrNull(quizRaw.subject),
    grade: getFirstOrNull(quizRaw.grade),
  };
}

function normalizeExam(examRaw: ExamRowRaw): ExamRow {
  return {
    ...examRaw,
    subject: getFirstOrNull(examRaw.subject),
    grade: getFirstOrNull(examRaw.grade),
  };
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function moneyUGX(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `UGX ${Number(n).toLocaleString()}`;
}

function initialsOf(first?: string | null, last?: string | null) {
  const a = (first?.[0] || '').toUpperCase();
  const b = (last?.[0] || '').toUpperCase();
  return (a + b) || '—';
}

function roleBadge(role?: string | null) {
  switch ((role || '').toUpperCase()) {
    case 'ADMIN':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'FINANCE':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'ACADEMIC':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'TEACHER':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone = 'blue',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: 'blue' | 'emerald' | 'purple' | 'orange' | 'gray';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
          {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
        </div>
        <div className={`rounded-xl border p-2.5 ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 text-right break-words">{value}</div>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
  tone = 'blue',
  primary = false,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone?: 'blue' | 'emerald' | 'purple' | 'orange' | 'gray';
  primary?: boolean;
}) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    purple: 'border-purple-100 bg-purple-50 text-purple-700',
    orange: 'border-orange-100 bg-orange-50 text-orange-700',
    gray: 'border-gray-200 bg-gray-50 text-gray-700',
  };

  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        primary ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-900' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-xl border p-2.5 ${
            primary ? 'bg-white/10 border-white/15 text-white' : tones[tone]
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`font-semibold ${primary ? 'text-white' : 'text-gray-900'}`}>{title}</div>
          <div className={`mt-1 text-sm ${primary ? 'text-slate-200' : 'text-gray-600'}`}>
            {description}
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 mt-1 ${primary ? 'text-white/70' : 'text-gray-400 group-hover:text-blue-600'}`} />
      </div>
    </Link>
  );
}

function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  title: string;
  subtitle: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {actionLabel}
          <ExternalLink className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

export default function TeacherDetailClient() {
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

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myProfile, setMyProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<Pick<ProfileRow, 'email' | 'full_name' | 'role'> | null>(null);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [marksStats, setMarksStats] = useState<MarksStatRow[]>([]);

  const [employment, setEmployment] = useState<CurrentEmploymentRow | null>(null);
  const [payroll, setPayroll] = useState<PayrollInformationRow | null>(null);
  const [nextOfKin, setNextOfKin] = useState<NextOfKinRow | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/');
        return;
      }
      setAuthChecking(false);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (authChecking) return;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;

        if (!authUser?.id) {
          throw new Error('Could not find authenticated user.');
        }

        const { data: myP, error: myPErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id, created_at, updated_at')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (myPErr || !myP) {
          throw new Error(myPErr?.message || 'Your profile is missing.');
        }

        const currentProfile = myP as ProfileRow;
        setMyProfile(currentProfile);

        if (!currentProfile.school_id) {
          throw new Error('Your account is not linked to a school.');
        }

        const { data: sch, error: schErr } = await supabase
          .from('general_information')
          .select('id, school_name, location, contact_number, email')
          .eq('id', currentProfile.school_id)
          .single();

        if (schErr || !sch) {
          throw new Error(schErr?.message || 'Failed to load school.');
        }

        setSchool(sch as SchoolRow);

        const { data: t, error: tErr } = await supabase
          .from('teachers')
          .select(
            'registration_id, user_id, initials, first_name, last_name, gender, year_of_entry, profile_picture_url, school_id, registered_by, created_at'
          )
          .eq('registration_id', registrationId)
          .eq('school_id', sch.id)
          .single();

        if (tErr || !t) {
          throw new Error(tErr?.message || 'Teacher not found.');
        }

        const teacherRow = t as TeacherRow;
        setTeacher(teacherRow);

        const [
          profileBitsRes,
          subjectsRes,
          notesRes,
          quizzesRes,
          examsRes,
          employmentRes,
          payrollRes,
          kinRes,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('email, full_name, role')
            .eq('user_id', teacherRow.user_id)
            .maybeSingle(),

          supabase
            .from('subject')
            .select(`
              id,
              name,
              code,
              grade_id,
              teacher_id,
              school_id,
              grade:class(grade_name),
              curriculum:curriculum(name)
            `)
            .eq('school_id', sch.id)
            .eq('teacher_id', teacherRow.registration_id)
            .order('name'),

          supabase
            .from('notes')
            .select(`
              id,
              description,
              subject_id,
              grade_id,
              created_by_id,
              created,
              subject:subject(name),
              grade:class(grade_name)
            `)
            .eq('school_id', sch.id)
            .eq('created_by_id', teacherRow.registration_id)
            .order('id', { ascending: false }),

          supabase
            .from('quiz')
            .select(`
              id,
              title,
              subject_id,
              grade_id,
              created_by_id,
              created_at,
              time_limit_minutes,
              total_marks,
              is_active,
              subject:subject(name),
              grade:class(grade_name)
            `)
            .eq('school_id', sch.id)
            .eq('created_by_id', teacherRow.registration_id)
            .order('id', { ascending: false }),

          supabase
            .from('exam')
            .select(`
              id,
              subject_id,
              grade_id,
              created_by_id,
              date,
              duration_minutes,
              description,
              created,
              subject:subject(name, code),
              grade:class(grade_name)
            `)
            .eq('school_id', sch.id)
            .eq('created_by_id', teacherRow.registration_id)
            .order('date', { ascending: false }),

          supabase
            .from('current_employment')
            .select('id, teacher_id, school_id, position, department')
            .eq('teacher_id', teacherRow.registration_id)
            .maybeSingle(),

          supabase
            .from('payroll_information')
            .select('id, teacher_id, school_id, salary, bank_name, account_number, tax_identification_number, nssf_number, payment_frequency')
            .eq('teacher_id', teacherRow.registration_id)
            .maybeSingle(),

          supabase
            .from('next_of_kin')
            .select('id, teacher_id, school_id, name, relationship, contact_number, address')
            .eq('teacher_id', teacherRow.registration_id)
            .maybeSingle(),
        ]);

        setTeacherProfile((profileBitsRes.data as any) ?? null);
        
        // Transform raw data to normalized format
        const rawSubjects = (subjectsRes.data || []) as unknown as SubjectRowRaw[];
        const normalizedSubjects: SubjectRow[] = rawSubjects.map(normalizeSubject);
        setSubjects(normalizedSubjects);

        const rawNotes = (notesRes.data || []) as unknown as NoteRowRaw[];
        const normalizedNotes: NoteRow[] = rawNotes.map(normalizeNote);
        setNotes(normalizedNotes);

        const rawQuizzes = (quizzesRes.data || []) as unknown as QuizRowRaw[];
        const normalizedQuizzes: QuizRow[] = rawQuizzes.map(normalizeQuiz);
        setQuizzes(normalizedQuizzes);

        const rawExams = (examsRes.data || []) as unknown as ExamRowRaw[];
        const normalizedExams: ExamRow[] = rawExams.map(normalizeExam);
        setExams(normalizedExams);

        setEmployment((employmentRes.data as any) ?? null);
        setPayroll((payrollRes.data as any) ?? null);
        setNextOfKin((kinRes.data as any) ?? null);

        const teacherSubjectIds = normalizedSubjects.map((s) => s.id);

        if (teacherSubjectIds.length > 0) {
          const { data: markRows, error: markErr } = await supabase
            .from('assessment_examresult')
            .select('id, subject_id, grade_id, score, exam_session_id')
            .eq('school_id', sch.id)
            .in('subject_id', teacherSubjectIds);

          if (!markErr) {
            setMarksStats((markRows as any) ?? []);
          }
        } else {
          setMarksStats([]);
        }
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to load teacher profile.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authChecking, registrationId]);

  const fullName = useMemo(() => {
    if (!teacher) return '';
    return `${teacher.first_name} ${teacher.last_name}`.trim();
  }, [teacher]);

  const avatarText = useMemo(() => {
    if (!teacher) return '—';
    return teacher.initials || initialsOf(teacher.first_name, teacher.last_name);
  }, [teacher]);

  const marksCount = marksStats.length;

  const avgScore = useMemo(() => {
    if (!marksStats.length) return null;
    const valid = marksStats
      .map((x) => Number(x.score ?? 0))
      .filter((x) => Number.isFinite(x));
    if (!valid.length) return null;
    return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
  }, [marksStats]);

  const isAdmin = (myProfile?.role || '').toUpperCase() === 'ADMIN';
  const isTeacherSelf =
    (myProfile?.role || '').toUpperCase() === 'TEACHER' &&
    myProfile?.user_id &&
    teacher?.user_id &&
    myProfile.user_id === teacher.user_id;

  const canCreateTeachingContent = isAdmin || isTeacherSelf;

  const teacherBase = `/teachers/${encodeURIComponent(registrationId)}`;

  const quickLinks = {
    marks: `${teacherBase}/marks`,
    notes: `${teacherBase}/notes`,
    quizzes: `${teacherBase}/quizzes`,
    exams: `${teacherBase}/exams`,
    createNote: '/notes/create',
    createQuiz: '/quizzes/create',
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-blue-600 to-orange-400 animate-pulse mb-4" />
          <p className="text-sm text-gray-700">Loading teacher profile…</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !teacher || !school) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50 flex flex-col">
        <Navbar />
        <div className="flex flex-1">
          <AppShell />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-orange-50 border border-orange-200">
                  <AlertTriangle className="text-orange-600" size={18} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">Couldn’t open teacher profile</h2>
                  <p className="text-sm text-gray-600 mt-1">{errorMsg || 'Unknown error.'}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => router.back()}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={() => router.push('/teachers')}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm hover:from-blue-700 hover:to-blue-800"
                    >
                      Teachers List
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <AppShell />

        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* Hero */}
          <div className="relative overflow-hidden border-b border-gray-200 bg-white">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50" />
            <div className="relative p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => router.push('/teachers')}
                    className="mt-1 p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition"
                    title="Back"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-orange-400 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                      {avatarText}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">{fullName}</h1>

                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${roleBadge(teacherProfile?.role || 'TEACHER')}`}>
                          {teacherProfile?.role || 'TEACHER'}
                        </span>

                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                          {employment?.position || 'Teacher'}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700">
                        <span className="inline-flex items-center gap-2">
                          <IdCard size={16} className="text-blue-700" />
                          {teacher.registration_id}
                        </span>

                        <span className="inline-flex items-center gap-2">
                          <School size={16} className="text-blue-700" />
                          {school.school_name}
                        </span>

                        <span className="inline-flex items-center gap-2">
                          <CalendarDays size={16} className="text-orange-600" />
                          Year of entry: {teacher.year_of_entry || '—'}
                        </span>
                      </div>

                      {teacherProfile?.email ? (
                        <div className="mt-3 inline-flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={15} />
                          {teacherProfile.email}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {canCreateTeachingContent && (
                    <>
                      <Link
                        href={quickLinks.createNote}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition"
                      >
                        <Plus size={16} />
                        Add Note
                      </Link>

                      <Link
                        href={quickLinks.createQuiz}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 text-sm font-semibold hover:bg-purple-100 transition"
                      >
                        <Plus size={16} />
                        Add Quiz
                      </Link>
                    </>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold shadow-sm hover:from-blue-700 hover:to-blue-800 transition"
                      onClick={() => router.push(`/teachers/${encodeURIComponent(teacher.registration_id)}/edit`)}
                    >
                      <Pencil size={16} />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <StatCard
                  title="Assigned Subjects"
                  value={subjects.length}
                  subtitle="Subjects under this teacher"
                  icon={<BookOpen size={18} />}
                  tone="blue"
                />
                <StatCard
                  title="Notes Created"
                  value={notes.length}
                  subtitle="Teaching materials shared"
                  icon={<BookText size={18} />}
                  tone="emerald"
                />
                <StatCard
                  title="Quizzes Created"
                  value={quizzes.length}
                  subtitle="Revision & class tests"
                  icon={<ClipboardList size={18} />}
                  tone="purple"
                />
                <StatCard
                  title="Exams Created"
                  value={exams.length}
                  subtitle="Scheduled assessments"
                  icon={<FileText size={18} />}
                  tone="orange"
                />
                <StatCard
                  title="Marks Records"
                  value={marksCount}
                  subtitle={avgScore ? `Avg score ${avgScore}` : 'Subject-based results'}
                  icon={<FileBarChart2 size={18} />}
                  tone="gray"
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                {/* Overview */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <SectionHeader
                    title="Teacher Overview"
                    subtitle="Profile details and work summary."
                  />

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-gray-200 p-5 bg-gradient-to-b from-white to-blue-50/30">
                      <div className="flex items-center gap-2 mb-4">
                        <User size={16} className="text-blue-700" />
                        <h4 className="font-semibold text-gray-900">Identity</h4>
                      </div>
                      <InfoLine label="Full Name" value={fullName} />
                      <InfoLine label="Registration ID" value={teacher.registration_id} />
                      <InfoLine label="Gender" value={teacher.gender || '—'} />
                      <InfoLine label="Email" value={teacherProfile?.email || '—'} />
                      <InfoLine label="Role" value={teacherProfile?.role || 'TEACHER'} />
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-5 bg-gradient-to-b from-white to-orange-50/30">
                      <div className="flex items-center gap-2 mb-4">
                        <BadgeCheck size={16} className="text-orange-700" />
                        <h4 className="font-semibold text-gray-900">Work Profile</h4>
                      </div>
                      <InfoLine label="Department" value={employment?.department || '—'} />
                      <InfoLine label="Position" value={employment?.position || 'Teacher'} />
                      <InfoLine label="Year of Entry" value={teacher.year_of_entry || '—'} />
                      <InfoLine label="School" value={school.school_name} />
                      <InfoLine label="Created" value={formatDate(teacher.created_at)} />
                    </div>
                  </div>
                </div>

                {/* Main Actions */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <SectionHeader
                    title="Teacher Work Hub"
                    subtitle="Easy actions for teaching, content creation, and performance review."
                  />

                  <div className="p-6 space-y-6">
                    {canCreateTeachingContent && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <Sparkles size={16} className="text-slate-700" />
                          <h4 className="font-semibold text-gray-900">Create & Manage Content</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ActionCard
                            href={quickLinks.createNote}
                            title="Add New Note"
                            description="Create a lesson note, attach files, and share learning materials."
                            icon={<BookText size={18} />}
                            tone="emerald"
                            primary
                          />
                          <ActionCard
                            href={quickLinks.createQuiz}
                            title="Create Quiz"
                            description="Build a new quiz for revision, practice, or class testing."
                            icon={<ClipboardList size={18} />}
                            tone="purple"
                            primary
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-slate-700" />
                        <h4 className="font-semibold text-gray-900">Review & Navigation</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ActionCard
                          href={quickLinks.marks}
                          title="Marks & Performance"
                          description="Review marks records and subject performance linked to this teacher."
                          icon={<FileBarChart2 size={18} />}
                          tone="blue"
                        />
                        <ActionCard
                          href={quickLinks.notes}
                          title="View Notes"
                          description="Browse all notes created by this teacher in one place."
                          icon={<BookText size={18} />}
                          tone="emerald"
                        />
                        <ActionCard
                          href={quickLinks.quizzes}
                          title="View Quizzes"
                          description="See quizzes created by this teacher and manage them more easily."
                          icon={<ClipboardList size={18} />}
                          tone="purple"
                        />
                        <ActionCard
                          href={quickLinks.exams}
                          title="View Exams"
                          description="Review exams created by this teacher and their schedules."
                          icon={<FileText size={18} />}
                          tone="orange"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assigned Subjects */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <SectionHeader
                    title="Assigned Subjects"
                    subtitle="Subjects currently linked to this teacher."
                    actionHref="/academics"
                    actionLabel="Open Academics"
                  />

                  <div className="p-6">
                    {subjects.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                        No subjects assigned yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {subjects.map((subject) => (
                          <div
                            key={subject.id}
                            className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-gray-900">{subject.name}</div>
                                <div className="mt-1 text-sm text-gray-600">
                                  {subject.code || 'No code'} • {subject.grade?.grade_name || 'No class'}
                                </div>
                              </div>
                              <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                {subject.curriculum?.name || 'No curriculum'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Work */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <SectionHeader
                    title="Recent Work"
                    subtitle="Latest notes, quizzes, and exams."
                  />

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <BookText size={16} className="text-emerald-600" />
                          <h4 className="font-semibold text-gray-900">Recent Notes</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {canCreateTeachingContent && (
                            <Link
                              href={quickLinks.createNote}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                            >
                              <Plus size={12} />
                              New
                            </Link>
                          )}
                          <Link
                            href={quickLinks.notes}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                          >
                            <Eye size={12} />
                            View all
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {notes.slice(0, 5).map((note) => (
                          <div key={note.id} className="rounded-xl border border-gray-200 p-3">
                            <div className="font-medium text-gray-900">{note.description || 'Untitled Note'}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              {note.subject?.name || '—'} • {note.grade?.grade_name || '—'}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">{formatDate(note.created)}</div>
                          </div>
                        ))}
                        {notes.length === 0 && (
                          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                            No notes yet.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ClipboardList size={16} className="text-purple-600" />
                          <h4 className="font-semibold text-gray-900">Recent Quizzes</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {canCreateTeachingContent && (
                            <Link
                              href={quickLinks.createQuiz}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-800"
                            >
                              <Plus size={12} />
                              New
                            </Link>
                          )}
                          <Link
                            href={quickLinks.quizzes}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                          >
                            <Eye size={12} />
                            View all
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {quizzes.slice(0, 5).map((quiz) => (
                          <div key={quiz.id} className="rounded-xl border border-gray-200 p-3">
                            <div className="font-medium text-gray-900">{quiz.title}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              {quiz.subject?.name || '—'} • {quiz.grade?.grade_name || '—'}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                              <Clock3 size={12} />
                              {quiz.time_limit_minutes || 0} min • {quiz.total_marks || 0} marks
                            </div>
                          </div>
                        ))}
                        {quizzes.length === 0 && (
                          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                            No quizzes yet.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-orange-600" />
                          <h4 className="font-semibold text-gray-900">Recent Exams</h4>
                        </div>
                        <Link
                          href={quickLinks.exams}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                        >
                          <Eye size={12} />
                          View all
                        </Link>
                      </div>

                      <div className="space-y-3">
                        {exams.slice(0, 5).map((exam) => (
                          <div key={exam.id} className="rounded-xl border border-gray-200 p-3">
                            <div className="font-medium text-gray-900">{exam.subject?.name || 'Exam'}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              {exam.grade?.grade_name || '—'} • {exam.duration_minutes} mins
                            </div>
                            <div className="mt-1 text-xs text-gray-400">{formatDate(exam.date)}</div>
                          </div>
                        ))}
                        {exams.length === 0 && (
                          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                            No exams yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <SectionHeader
                    title="Contact & School"
                    subtitle="School and profile contact details."
                  />
                  <div className="p-6">
                    <InfoLine label="School" value={school.school_name} />
                    <InfoLine label="Location" value={school.location || '—'} />
                    <InfoLine label="School Email" value={school.email || '—'} />
                    <InfoLine label="Contact" value={school.contact_number || '—'} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <SectionHeader
                    title="Employment"
                    subtitle="Current work assignment details."
                  />
                  <div className="p-6">
                    <InfoLine label="Department" value={employment?.department || '—'} />
                    <InfoLine label="Position" value={employment?.position || '—'} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <SectionHeader
                    title="Payroll"
                    subtitle="Financial details available in the profile."
                  />
                  <div className="p-6">
                    <InfoLine label="Salary" value={moneyUGX(payroll?.salary)} />
                    <InfoLine label="Bank" value={payroll?.bank_name || '—'} />
                    <InfoLine label="Frequency" value={payroll?.payment_frequency || '—'} />
                    <InfoLine label="Account No." value={payroll?.account_number || '—'} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <SectionHeader
                    title="Next of Kin"
                    subtitle="Emergency and relation details."
                  />
                  <div className="p-6">
                    <InfoLine label="Name" value={nextOfKin?.name || '—'} />
                    <InfoLine label="Relationship" value={nextOfKin?.relationship || '—'} />
                    <InfoLine label="Contact" value={nextOfKin?.contact_number || '—'} />
                    <InfoLine label="Address" value={nextOfKin?.address || '—'} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <SectionHeader
                    title="Quick Teacher Links"
                    subtitle="Useful teacher pages."
                  />
                  <div className="p-4 space-y-3">
                    <Link
                      href="/teachers"
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Users size={16} className="text-blue-600" />
                        Teachers List
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>

                    <Link
                      href={quickLinks.marks}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileBarChart2 size={16} className="text-purple-600" />
                        Marks Overview
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>

                    <Link
                      href={quickLinks.notes}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <BookText size={16} className="text-emerald-600" />
                        Teacher Notes
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>

                    <Link
                      href={quickLinks.quizzes}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <ClipboardList size={16} className="text-orange-600" />
                        Teacher Quizzes
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>

                    <Link
                      href={quickLinks.exams}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-blue-600" />
                        Teacher Exams
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>

                    {canCreateTeachingContent && (
                      <>
                        <Link
                          href={quickLinks.createNote}
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <Plus size={16} className="text-emerald-600" />
                            Add Note
                          </div>
                          <ChevronRight size={16} className="text-gray-400" />
                        </Link>

                        <Link
                          href={quickLinks.createQuiz}
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <Plus size={16} className="text-purple-600" />
                            Add Quiz
                          </div>
                          <ChevronRight size={16} className="text-gray-400" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
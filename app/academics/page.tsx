'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  BookOpen,
  Calendar,
  Layers,
  Users,
  FileText,
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

type UUID = string;

// ===== Types (match your DB) =====
interface ProfileRow {
  user_id: UUID;
  email: string | null;
  full_name: string | null;
  role: 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
  school_id: UUID | null;
  created_at: string;
  updated_at: string;
}

interface SchoolRow {
  id: UUID;
  school_name: string;
}

interface GradeRow {
  id: number;
  grade_name: string;
  school_id: UUID | null;
}

interface CurriculumRow {
  id: number;
  name: string;
  objectives: string;
  learning_outcomes: string;
  school_id: UUID | null;
}

interface TeacherRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  user_id?: UUID | null;
  school_id: UUID;
}

interface SubjectRow {
  id: number;
  name: string;
  code: string | null;
  grade_id: number | null;
  curriculum_id: number | null;
  description?: string | null;
  teacher_id?: string | null; // teachers.registration_id
  school_id: UUID | null;
  grade?: { grade_name: string } | null;
  teacher?: { first_name: string; last_name: string } | null;
  curriculum?: { name: string } | null;
}

interface ExamRow {
  id: number;
  date: string;
  duration_minutes: number;
  description: string | null;
  grade_id: number | null;
  subject_id: number;
  created: string;
  school_id: UUID | null;
  created_by_id?: UUID | null; // ✅ now auth uid (profiles.user_id) if your DB column is uuid
  subject?: { name: string; code: string | null } | null;
  grade?: { grade_name: string } | null;
}

// Terms & Sessions
type TermName = 'TERM_1' | 'TERM_2' | 'TERM_3';
type ExamType = 'BOT' | 'MOT' | 'EOT';

interface TermRow {
  id: number;
  term_name: TermName;
  year: number;
  start_date: string;
  end_date: string;
  created_by_id: UUID; // ✅ profiles.user_id (auth uid)
  school_id: UUID | null;
  created: string;
  updated: string;
}

interface ExamSessionRow {
  id: number;
  term_id: number;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  created_by_id: UUID | null; // ✅ profiles.user_id (auth uid)
  school_id: UUID | null;
  created: string;
  updated: string;
  term?: TermRow | null;
}

// ===== UI helpers =====
function chipClass(color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray' | 'yellow') {
  const map: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return map[color];
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
}

function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export default function AcademicsPage() {
  const router = useRouter();

  // Auth + Profile
  const [authChecking, setAuthChecking] = useState(true);
  const [authUser, setAuthUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'subjects' | 'exams' | 'curriculum' | 'terms'>(
    'overview'
  );
  const [search, setSearch] = useState('');

  // Data
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [curricula, setCurricula] = useState<CurriculumRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [sessions, setSessions] = useState<ExamSessionRow[]>([]);

  // Modals
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Forms
  const [gradeForm, setGradeForm] = useState({ name: '' });
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: '',
    grade_id: '',
    curriculum_id: '',
    teacher_id: '',
  });
  const [examForm, setExamForm] = useState({
    subject_id: '',
    grade_id: '',
    date: '',
    duration: '',
    description: '',
  });
  const [curriculumForm, setCurriculumForm] = useState({
    name: '',
    objectives: '',
    learning_outcomes: '',
  });
  const [termForm, setTermForm] = useState({
    term_name: 'TERM_1' as TermName,
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
  });
  const [sessionForm, setSessionForm] = useState({
    term_id: '',
    exam_type: 'BOT' as ExamType,
    start_date: '',
    end_date: '',
  });

  const showSuccess = (message: string) => {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const showError = (message: string) => {
    setErrorMsg(message);
    setTimeout(() => setErrorMsg(null), 6000);
  };

  const resetForms = () => {
    setGradeForm({ name: '' });
    setSubjectForm({ name: '', code: '', description: '', grade_id: '', curriculum_id: '', teacher_id: '' });
    setExamForm({ subject_id: '', grade_id: '', date: '', duration: '', description: '' });
    setCurriculumForm({ name: '', objectives: '', learning_outcomes: '' });
    setTermForm({ term_name: 'TERM_1', year: new Date().getFullYear(), start_date: '', end_date: '' });
    setSessionForm({ term_id: '', exam_type: 'BOT', start_date: '', end_date: '' });
  };

  // ✅ Stable IDs for useEffect deps (prevents “changed size between renders” bugs)
  const schoolId: UUID | null = profile?.school_id ?? null;
  const userId: UUID | null = authUser?.id ?? null;

  // ===================== AUTH + PROFILE =====================
  useEffect(() => {
    const boot = async () => {
      try {
        setAuthChecking(true);
        setErrorMsg(null);

        const { data: sessRes, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;

        const session = sessRes.session;
        if (!session) {
          router.replace('/');
          return;
        }

        setAuthUser(session.user);

        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profErr) throw profErr;

        if (!prof) {
          setProfile(null);
          setSchool(null);
          setErrorMsg('User account not found in profiles.');
          return;
        }

        setProfile(prof as ProfileRow);

        if (!prof.school_id) {
          setSchool(null);
          return;
        }

        const { data: sch, error: schErr } = await supabase
          .from('general_information')
          .select('id, school_name')
          .eq('id', prof.school_id)
          .maybeSingle();

        if (schErr) throw schErr;

        if (!sch) {
          setSchool(null);
          setErrorMsg('School record not found in general_information.');
          return;
        }

        setSchool(sch as SchoolRow);
      } catch (e: any) {
        console.error('Boot failed:', e);
        setErrorMsg(e?.message || 'Failed to load user data.');
      } finally {
        setAuthChecking(false);
      }
    };

    boot();
  }, [router]);

  // ===================== LOAD ACADEMIC DATA =====================
  useEffect(() => {
    const load = async () => {
      if (!schoolId) return;

      setLoading(true);
      setErrorMsg(null);

      try {
        // Use Promise.allSettled so page still loads even if one query fails
        const results = await Promise.allSettled([
          supabase.from('class').select('*').eq('school_id', schoolId).order('grade_name'),
          supabase
            .from('subject')
            .select(`*, grade:class (grade_name), teacher:teachers (first_name, last_name), curriculum:curriculum (name)`)
            .eq('school_id', schoolId)
            .order('name'),
          supabase
            .from('exam')
            .select(`*, subject:subject (name, code), grade:class (grade_name)`)
            .eq('school_id', schoolId)
            .order('date', { ascending: false })
            .limit(50),
          supabase.from('curriculum').select('*').eq('school_id', schoolId).order('name'),
          supabase
            .from('teachers')
            .select('registration_id, first_name, last_name, email, user_id, school_id')
            .eq('school_id', schoolId)
            .order('first_name'),
          supabase
            .from('term_exam_session')
            .select('*')
            .eq('school_id', schoolId)
            .order('year', { ascending: false })
            .order('term_name'),
          supabase
            .from('exam_session')
            .select(`*, term:term_exam_session (*)`)
            .eq('school_id', schoolId)
            .order('start_date', { ascending: false }),
        ]);

        const pick = <T,>(idx: number) =>
          results[idx].status === 'fulfilled' ? (results[idx] as PromiseFulfilledResult<any>).value : null;

        const g = pick<GradeRow[]>(0);
        const s = pick<SubjectRow[]>(1);
        const e = pick<ExamRow[]>(2);
        const c = pick<CurriculumRow[]>(3);
        const t = pick<TeacherRow[]>(4);
        const tr = pick<TermRow[]>(5);
        const ss = pick<ExamSessionRow[]>(6);

        if (g?.data) setGrades(g.data as GradeRow[]);
        if (s?.data) setSubjects(s.data as any);
        if (e?.data) setExams(e.data as any);
        if (c?.data) setCurricula(c.data as CurriculumRow[]);
        if (t?.data) setTeachers(t.data as TeacherRow[]);
        if (tr?.data) setTerms(tr.data as any);
        if (ss?.data) setSessions(ss.data as any);

        // show warning if any failed
        const failures = results
          .map((r, i) => ({ r, i }))
          .filter(x => x.r.status === 'rejected')
          .map(x => x.i);

        if (failures.length) {
          console.warn('Some academic requests failed:', failures);
        }
      } catch (e: any) {
        console.error('load failed:', e);
        setErrorMsg(e?.message || 'Failed to load academic data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [schoolId]); // ✅ constant length dependency array

  // ===================== Create handlers =====================
  const handleCreateGrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    if (!gradeForm.name.trim()) return showError('Grade name is required.');

    setSaving('grade');
    try {
      const { data, error } = await supabase
        .from('class')
        .insert({ grade_name: gradeForm.name.trim(), school_id: schoolId })
        .select()
        .single();

      if (error) throw error;

      setGrades(prev => [...prev, data as GradeRow].sort((a, b) => a.grade_name.localeCompare(b.grade_name)));
      setShowGradeModal(false);
      resetForms();
      showSuccess('Grade created successfully!');
    } catch (e: any) {
      showError(e?.message || 'Failed to create grade.');
    } finally {
      setSaving(null);
    }
  };

  const handleCreateSubject = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    if (!subjectForm.name.trim()) return showError('Subject name is required.');
    if (!subjectForm.grade_id) return showError('Grade is required.');

    setSaving('subject');
    try {
      const { data, error } = await supabase
        .from('subject')
        .insert({
          name: subjectForm.name.trim(),
          code: subjectForm.code.trim() || null,
          description: subjectForm.description.trim() || null,
          grade_id: Number(subjectForm.grade_id),
          curriculum_id: subjectForm.curriculum_id ? Number(subjectForm.curriculum_id) : null,
          teacher_id: subjectForm.teacher_id || null,
          school_id: schoolId,
        })
        .select(`*, grade:class (grade_name), teacher:teachers (first_name, last_name), curriculum:curriculum (name)`)
        .single();

      if (error) throw error;

      setSubjects(prev => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
      setShowSubjectModal(false);
      resetForms();
      showSuccess('Subject created successfully!');
    } catch (e: any) {
      showError(e?.message || 'Failed to create subject.');
    } finally {
      setSaving(null);
    }
  };

  const handleCreateExam = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    if (!examForm.subject_id || !examForm.grade_id || !examForm.date || !examForm.duration) {
      return showError('Subject, grade, date and duration are required.');
    }

    setSaving('exam');
    try {
      const { data, error } = await supabase
        .from('exam')
        .insert({
          subject_id: Number(examForm.subject_id),
          grade_id: Number(examForm.grade_id),
          date: examForm.date,
          duration_minutes: Number(examForm.duration),
          description: examForm.description.trim() || null,
          created_by_id: userId || null, // ✅ now auth uid if your column supports it
          school_id: schoolId,
        })
        .select(`*, subject:subject (name, code), grade:class (grade_name)`)
        .single();

      if (error) throw error;

      setExams(prev => [data as any, ...prev]);
      setShowExamModal(false);
      resetForms();
      showSuccess('Exam scheduled successfully!');
    } catch (e: any) {
      showError(e?.message || 'Failed to schedule exam.');
    } finally {
      setSaving(null);
    }
  };

  const handleCreateCurriculum = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    if (!curriculumForm.name.trim()) return showError('Curriculum name is required.');

    setSaving('curriculum');
    try {
      const { data, error } = await supabase
        .from('curriculum')
        .insert({
          name: curriculumForm.name.trim(),
          objectives: curriculumForm.objectives.trim(),
          learning_outcomes: curriculumForm.learning_outcomes.trim(),
          school_id: schoolId,
        })
        .select()
        .single();

      if (error) throw error;

      setCurricula(prev => [...prev, data as CurriculumRow].sort((a, b) => a.name.localeCompare(b.name)));
      setShowCurriculumModal(false);
      resetForms();
      showSuccess('Curriculum created successfully!');
    } catch (e: any) {
      showError(e?.message || 'Failed to create curriculum.');
    } finally {
      setSaving(null);
    }
  };

  // ✅ Terms: created_by_id = auth uid (profiles.user_id)
  const handleCreateTerm = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    if (!termForm.start_date || !termForm.end_date) return showError('Start date and end date are required.');
    if (new Date(termForm.start_date) > new Date(termForm.end_date)) return showError('Start date cannot be after end date.');
    if (!userId) return showError('Not authenticated.');

    setSaving('term');
    try {
      const { data, error } = await supabase
        .from('term_exam_session')
        .insert({
          term_name: termForm.term_name,
          year: termForm.year,
          start_date: termForm.start_date,
          end_date: termForm.end_date,
          created_by_id: userId, // ✅ auth uid
          school_id: schoolId,
        })
        .select()
        .single();

      if (error) throw error;

      setTerms(prev => [data as any, ...prev]);
      setShowTermModal(false);
      resetForms();
      showSuccess('Term created successfully!');
    } catch (e: any) {
      showError(e?.message || 'Failed to create term.');
    } finally {
      setSaving(null);
    }
  };

  // ✅ Sessions: created_by_id = auth uid (profiles.user_id)
  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    if (!sessionForm.term_id || !sessionForm.start_date || !sessionForm.end_date) {
      return showError('Term, start date and end date are required.');
    }
    if (new Date(sessionForm.start_date) > new Date(sessionForm.end_date)) return showError('Start date cannot be after end date.');
    if (!userId) return showError('Not authenticated.');

    setSaving('session');
    try {
      const { data, error } = await supabase
        .from('exam_session')
        .insert({
          term_id: Number(sessionForm.term_id),
          exam_type: sessionForm.exam_type,
          start_date: sessionForm.start_date,
          end_date: sessionForm.end_date,
          created_by_id: userId, // ✅ auth uid
          school_id: schoolId,
        })
        .select(`*, term:term_exam_session (*)`)
        .single();

      if (error) throw error;

      setSessions(prev => [data as any, ...prev]);
      setShowSessionModal(false);
      resetForms();
      showSuccess('Exam session created successfully!');
    } catch (e: any) {
      showError(e?.message || 'Failed to create exam session.');
    } finally {
      setSaving(null);
    }
  };

  // ===================== Filters =====================
  const filteredGrades = useMemo(() => {
    const q = search.toLowerCase();
    return grades.filter(g => g.grade_name.toLowerCase().includes(q));
  }, [grades, search]);

  const filteredSubjects = useMemo(() => {
    const q = search.toLowerCase();
    return subjects.filter(s => {
      return (
        s.name.toLowerCase().includes(q) ||
        (s.code || '').toLowerCase().includes(q) ||
        (s.grade?.grade_name || '').toLowerCase().includes(q)
      );
    });
  }, [subjects, search]);

  const filteredExams = useMemo(() => {
    const q = search.toLowerCase();
    return exams.filter(e => {
      return (
        (e.subject?.name || '').toLowerCase().includes(q) ||
        (e.grade?.grade_name || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)
      );
    });
  }, [exams, search]);

  const filteredTerms = useMemo(() => {
    const q = search.toLowerCase();
    return terms.filter(t => t.term_name.toLowerCase().includes(q) || String(t.year).includes(q));
  }, [terms, search]);

  // ===================== Guards =====================
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!profile || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">School Configuration Required</h3>
              <p className="text-gray-600 mb-6">
                {!profile ? 'User account not found in profiles.' : 'Your account is not linked to a school.'}
              </p>
              <button
                onClick={() => router.push('/settings')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Configure School Settings
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ===================== UI pieces =====================
  const renderHeader = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academics Management</h1>
          <p className="text-gray-600 mt-2">Manage grades, subjects, curriculum, exams, and terms for {school.school_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Academic Year</p>
            <p className="text-lg font-semibold text-blue-600">{getCurrentAcademicYear()}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 overflow-x-auto pb-1">
          {[
            { key: 'overview', label: 'Overview', icon: BookOpen },
            { key: 'grades', label: 'Grades', icon: Users },
            { key: 'subjects', label: 'Subjects', icon: BookOpen },
            { key: 'exams', label: 'Exams', icon: Calendar },
            { key: 'curriculum', label: 'Curriculum', icon: Layers },
            { key: 'terms', label: 'Terms & Sessions', icon: ShieldCheck },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'bg-white border-t border-x border-gray-200 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  const renderAlerts = () => (
    <>
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600 flex-1">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700 flex-1">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );

  const renderSearchBar = (placeholder: string) => (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <button
        type="button"
        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
      >
        <Filter className="w-4 h-4" />
        Filter
      </button>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Grades" value={grades.length} icon={Users} color="blue" description="Classes registered" />
        <StatCard title="Subjects" value={subjects.length} icon={BookOpen} color="green" description="Active subjects" />
        <StatCard title="Exams" value={exams.length} icon={Calendar} color="purple" description="Scheduled exams" />
        <StatCard title="Curriculum" value={curricula.length} icon={Layers} color="orange" description="Frameworks" />
        <StatCard title="Terms" value={terms.length} icon={ShieldCheck} color="yellow" description="Academic terms" />
        <StatCard title="Sessions" value={sessions.length} icon={FileText} color="red" description="Exam sessions" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <ActionButton onClick={() => setShowGradeModal(true)} label="Add Grade" icon={Plus} color="gray" />
          <ActionButton onClick={() => setShowSubjectModal(true)} label="Add Subject" icon={Plus} color="green" />
          <ActionButton onClick={() => setShowExamModal(true)} label="Schedule Exam" icon={Plus} color="purple" />
          <ActionButton onClick={() => setShowTermModal(true)} label="Create Term" icon={Plus} color="blue" />
          <ActionButton onClick={() => setShowSessionModal(true)} label="Add Session" icon={Plus} color="orange" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Exams</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {exams.slice(0, 5).map(exam => (
            <div key={exam.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{exam.subject?.name}</h4>
                    <p className="text-sm text-gray-500">
                      {exam.grade?.grade_name} • {exam.duration_minutes} minutes
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatDate(exam.date)}</p>
                  <p className="text-sm text-gray-500">{exam.description || 'No description'}</p>
                </div>
              </div>
            </div>
          ))}
          {exams.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No exams scheduled yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderGrades = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Grades / Classes</h3>
          <p className="text-sm text-gray-500">Manage all classes in {school.school_name}</p>
        </div>
        <ActionButton onClick={() => setShowGradeModal(true)} label="Add Grade" icon={Plus} color="gray" compact />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          {renderSearchBar('Search grades...')}
          <span className="text-sm text-gray-500">{filteredGrades.length} grades</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredGrades.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No grades found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredGrades.map(grade => {
              const gradeSubjects = subjects.filter(s => s.grade_id === grade.id);
              const gradeExams = exams.filter(e => e.grade_id === grade.id);

              return (
                <div key={grade.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-7 h-7 text-blue-600" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('blue')}`}>
                      {gradeSubjects.length} subjects
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-lg mb-2">{grade.grade_name}</h4>
                  <div className="text-sm text-gray-500 mb-4">Grade ID: {grade.id}</div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{gradeExams.length}</div>
                      <div className="text-gray-500">Exams</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button type="button" className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderSubjects = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Subjects</h3>
          <p className="text-sm text-gray-500">Manage all subjects and assignments</p>
        </div>
        <ActionButton onClick={() => setShowSubjectModal(true)} label="Add Subject" icon={Plus} color="green" compact />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          {renderSearchBar('Search subjects...')}
          <span className="text-sm text-gray-500">{filteredSubjects.length} subjects</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No subjects found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Subject</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Code</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Grade</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Teacher</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Curriculum</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSubjects.map(subject => (
                  <tr key={subject.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{subject.name}</div>
                          {subject.description && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">{subject.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('gray')}`}>
                        {subject.code || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {subject.grade ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('blue')}`}>
                          {subject.grade.grade_name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {subject.teacher ? (
                        <div className="text-sm text-gray-900">
                          {subject.teacher.first_name} {subject.teacher.last_name}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">{subject.curriculum?.name || '—'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button type="button" className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button type="button" className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button type="button" className="p-2 hover:bg-gray-100 rounded-lg text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderExams = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Exams</h3>
          <p className="text-sm text-gray-500">Schedule and manage all exams</p>
        </div>
        <ActionButton onClick={() => setShowExamModal(true)} label="Schedule Exam" icon={Plus} color="purple" compact />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          {renderSearchBar('Search exams...')}
          <span className="text-sm text-gray-500">{filteredExams.length} exams</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No exams found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredExams.map(exam => (
              <div key={exam.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">{exam.subject?.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('blue')}`}>
                          {exam.grade?.grade_name || '—'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('purple')}`}>
                          {exam.duration_minutes} min
                        </span>
                        <span className="text-sm text-gray-500">{exam.subject?.code || 'No code'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 text-lg">{formatDate(exam.date)}</div>
                    <div className="text-sm text-gray-500">Scheduled on {formatDate(exam.created)}</div>
                  </div>
                </div>
                {exam.description && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{exam.description}</p>
                  </div>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500">Created by: {exam.created_by_id || 'System'}</div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                      View Details
                    </button>
                    <button type="button" className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      Edit Exam
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCurriculum = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Curriculum</h3>
          <p className="text-sm text-gray-500">Manage frameworks and learning outcomes</p>
        </div>
        <ActionButton onClick={() => setShowCurriculumModal(true)} label="Add Curriculum" icon={Plus} color="orange" compact />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))
        ) : curricula.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No curriculum frameworks added yet</p>
          </div>
        ) : (
          curricula.map(c => {
            const subjectCount = subjects.filter(s => s.curriculum_id === c.id).length;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Layers className="w-6 h-6 text-orange-600" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('orange')}`}>
                      {subjectCount} subjects
                    </span>
                  </div>

                  <h4 className="font-semibold text-gray-900 text-lg mb-2">{c.name}</h4>

                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Objectives</h5>
                    <p className="text-sm text-gray-600 line-clamp-3">{c.objectives}</p>
                  </div>

                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Learning Outcomes</h5>
                    <p className="text-sm text-gray-600 line-clamp-3">{c.learning_outcomes}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">Curriculum Framework</div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="p-2 hover:bg-gray-100 rounded-lg">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button type="button" className="p-2 hover:bg-gray-100 rounded-lg">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderTerms = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Terms & Exam Sessions</h3>
          <p className="text-sm text-gray-500">Define term dates and exam sessions (BOT/MOT/EOT)</p>
        </div>
        <div className="flex items-center gap-3">
          <ActionButton onClick={() => setShowTermModal(true)} label="Add Term" icon={Plus} color="blue" compact />
          <ActionButton onClick={() => setShowSessionModal(true)} label="Add Session" icon={Plus} color="orange" compact />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          {renderSearchBar('Search by year or term...')}
          <div className="text-sm text-gray-500">
            {terms.length} terms • {sessions.length} sessions
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredTerms.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="mb-4">No terms created yet</p>
            <button
              type="button"
              onClick={() => setShowTermModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create your first Term
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTerms.map(term => {
              const termSessions = sessions.filter(s => s.term_id === term.id);
              return (
                <div key={term.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Calendar className="w-7 h-7 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {term.term_name.replace('_', ' ')} • {term.year}
                        </h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-gray-500">
                            {formatDate(term.start_date)} → {formatDate(term.end_date)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('blue')}`}>
                            {termSessions.length} sessions
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSessionForm(prev => ({ ...prev, term_id: String(term.id) }));
                        setShowSessionModal(true);
                      }}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Session
                    </button>
                  </div>

                  {termSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      No exam sessions added for this term
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {termSessions.map(session => (
                        <div key={session.id} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                session.exam_type === 'BOT'
                                  ? chipClass('blue')
                                  : session.exam_type === 'MOT'
                                  ? chipClass('purple')
                                  : chipClass('orange')
                              }`}
                            >
                              {session.exam_type}
                            </span>
                            <button type="button" className="p-1 hover:bg-gray-100 rounded-lg">
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Start:</span>
                              <span className="font-medium">{formatDate(session.start_date)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">End:</span>
                              <span className="font-medium">{formatDate(session.end_date)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ===================== Main Render =====================
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderHeader()}
            {renderAlerts()}

            {loading && activeTab !== 'overview' ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading academic data...</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'grades' && renderGrades()}
                {activeTab === 'subjects' && renderSubjects()}
                {activeTab === 'exams' && renderExams()}
                {activeTab === 'curriculum' && renderCurriculum()}
                {activeTab === 'terms' && renderTerms()}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <GradeModal
        isOpen={showGradeModal}
        onClose={() => setShowGradeModal(false)}
        onSubmit={handleCreateGrade}
        form={gradeForm}
        onChange={setGradeForm}
        loading={saving === 'grade'}
      />

      <SubjectModal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        onSubmit={handleCreateSubject}
        form={subjectForm}
        onChange={setSubjectForm}
        loading={saving === 'subject'}
        grades={grades}
        curricula={curricula}
        teachers={teachers}
      />

      <ExamModal
        isOpen={showExamModal}
        onClose={() => setShowExamModal(false)}
        onSubmit={handleCreateExam}
        form={examForm}
        onChange={setExamForm}
        loading={saving === 'exam'}
        subjects={subjects}
        grades={grades}
      />

      <CurriculumModal
        isOpen={showCurriculumModal}
        onClose={() => setShowCurriculumModal(false)}
        onSubmit={handleCreateCurriculum}
        form={curriculumForm}
        onChange={setCurriculumForm}
        loading={saving === 'curriculum'}
      />

      <TermModal
        isOpen={showTermModal}
        onClose={() => setShowTermModal(false)}
        onSubmit={handleCreateTerm}
        form={termForm}
        onChange={setTermForm}
        loading={saving === 'term'}
      />

      <SessionModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSubmit={handleCreateSession}
        form={sessionForm}
        onChange={setSessionForm}
        loading={saving === 'session'}
        terms={terms}
      />
    </div>
  );
}

// ===================== Helper components =====================
interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray' | 'yellow';
  description: string;
}

const StatCard = ({ title, value, icon: Icon, color, description }: StatCardProps) => {
  const bgColor = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    gray: 'bg-gray-100 text-gray-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  }[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bgColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full border ${chipClass(color)}`}>{value}</span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
};

interface ActionButtonProps {
  onClick: () => void;
  label: string;
  icon: any;
  color: 'gray' | 'green' | 'purple' | 'blue' | 'orange';
  compact?: boolean;
}

const ActionButton = ({ onClick, label, icon: Icon, color, compact = false }: ActionButtonProps) => {
  const colors = {
    gray: 'bg-gray-900 hover:bg-gray-800',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
  }[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${colors} text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
        compact ? 'px-4 py-2.5 text-sm' : 'px-5 py-3 font-medium'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
};

// ===================== Modals =====================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  loading: boolean;
}

interface GradeModalProps extends ModalProps {
  form: { name: string };
  onChange: (form: { name: string }) => void;
}

const GradeModal = ({ isOpen, onClose, onSubmit, form, onChange, loading }: GradeModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add New Grade</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Grade Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => onChange({ name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="P1, S2, Grade 10..."
              disabled={loading}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Grade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SubjectModalProps extends ModalProps {
  form: {
    name: string;
    code: string;
    description: string;
    grade_id: string;
    curriculum_id: string;
    teacher_id: string;
  };
  onChange: (form: any) => void;
  grades: GradeRow[];
  curricula: CurriculumRow[];
  teachers: TeacherRow[];
}

const SubjectModal = ({ isOpen, onClose, onSubmit, form, onChange, loading, grades, curricula, teachers }: SubjectModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add New Subject</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => onChange({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Mathematics, English, Science..."
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Code</label>
              <input
                type="text"
                value={form.code}
                onChange={e => onChange({ ...form, code: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="MATH-P5, ENG-S1..."
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade / Class *</label>
              <select
                value={form.grade_id}
                onChange={e => onChange({ ...form, grade_id: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={loading}
              >
                <option value="">Select grade</option>
                {grades.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.grade_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Curriculum</label>
              <select
                value={form.curriculum_id}
                onChange={e => onChange({ ...form, curriculum_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={loading}
              >
                <option value="">Not set</option>
                {curricula.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teacher (Optional)</label>
              <select
                value={form.teacher_id}
                onChange={e => onChange({ ...form, teacher_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={loading}
              >
                <option value="">Not assigned</option>
                {teachers.map(t => (
                  <option key={t.registration_id} value={t.registration_id}>
                    {t.first_name} {t.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={e => onChange({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Subject description..."
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ExamModalProps extends ModalProps {
  form: {
    subject_id: string;
    grade_id: string;
    date: string;
    duration: string;
    description: string;
  };
  onChange: (form: any) => void;
  subjects: SubjectRow[];
  grades: GradeRow[];
}

const ExamModal = ({ isOpen, onClose, onSubmit, form, onChange, loading, subjects, grades }: ExamModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Schedule New Exam</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
              <select
                value={form.subject_id}
                onChange={e => onChange({ ...form, subject_id: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={loading}
              >
                <option value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.grade?.grade_name ? `(${s.grade.grade_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade *</label>
              <select
                value={form.grade_id}
                onChange={e => onChange({ ...form, grade_id: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={loading}
              >
                <option value="">Select grade</option>
                {grades.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.grade_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => onChange({ ...form, date: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes) *</label>
              <input
                type="number"
                value={form.duration}
                onChange={e => onChange({ ...form, duration: e.target.value })}
                required
                min={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="60"
                disabled={loading}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={e => onChange({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Exam instructions, topics covered..."
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Scheduling...' : 'Schedule Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface CurriculumModalProps extends ModalProps {
  form: { name: string; objectives: string; learning_outcomes: string };
  onChange: (form: any) => void;
}

const CurriculumModal = ({ isOpen, onClose, onSubmit, form, onChange, loading }: CurriculumModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add New Curriculum</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Curriculum Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => onChange({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Lower Primary, UNEB, Cambridge..."
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Objectives *</label>
              <textarea
                value={form.objectives}
                onChange={e => onChange({ ...form, objectives: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Curriculum objectives and goals..."
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Learning Outcomes *</label>
              <textarea
                value={form.learning_outcomes}
                onChange={e => onChange({ ...form, learning_outcomes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Expected learning outcomes..."
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Curriculum'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TermModalProps extends ModalProps {
  form: { term_name: TermName; year: number; start_date: string; end_date: string };
  onChange: (form: any) => void;
}

const TermModal = ({ isOpen, onClose, onSubmit, form, onChange, loading }: TermModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Create Term</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Term *</label>
              <select
                value={form.term_name}
                onChange={e => onChange({ ...form, term_name: e.target.value as TermName })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="TERM_1">TERM 1</option>
                <option value="TERM_2">TERM 2</option>
                <option value="TERM_3">TERM 3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
              <input
                type="number"
                value={form.year}
                onChange={e => onChange({ ...form, year: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => onChange({ ...form, start_date: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => onChange({ ...form, end_date: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Term'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SessionModalProps extends ModalProps {
  form: { term_id: string; exam_type: ExamType; start_date: string; end_date: string };
  onChange: (form: any) => void;
  terms: TermRow[];
}

const SessionModal = ({ isOpen, onClose, onSubmit, form, onChange, loading, terms }: SessionModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Create Exam Session</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Term *</label>
              <select
                value={form.term_id}
                onChange={e => onChange({ ...form, term_id: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={loading}
              >
                <option value="">Select term</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.term_name.replace('_', ' ')} - {t.year} ({formatDate(t.start_date)} → {formatDate(t.end_date)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type *</label>
                <select
                  value={form.exam_type}
                  onChange={e => onChange({ ...form, exam_type: e.target.value as ExamType })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  disabled={loading}
                >
                  <option value="BOT">BOT (Beginning of Term)</option>
                  <option value="MOT">MOT (Middle of Term)</option>
                  <option value="EOT">EOT (End of Term)</option>
                </select>
              </div>

              <div />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => onChange({ ...form, start_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => onChange({ ...form, end_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

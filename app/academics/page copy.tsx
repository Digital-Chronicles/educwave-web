'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

// Import components
import { AcademicsHeader } from '@/components/academics/ui/AcademicsHeader';
import { OverviewTab } from '@/components/academics/OverviewTab';
import { GradesTab } from '@/components/academics/GradesTab';
import { SubjectsTab } from '@/components/academics/SubjectsTab';
import { ExamsTab } from '@/components/academics/ExamsTab';
import { CurriculumTab } from '@/components/academics/CurriculumTab';
import { TermsTab } from '@/components/academics/TermsTab';

// Import modals
import { GradeModal } from '@/components/academics/modals/GradeModal';
import { SubjectModal } from '@/components/academics/modals/SubjectModal';
import { ExamModal } from '@/components/academics/modals/ExamModal';
import { CurriculumModal } from '@/components/academics/modals/CurriculumModal';
import { TermModal } from '@/components/academics/modals/TermModal';
import { SessionModal } from '@/components/academics/modals/SessionModal';

// Import types
import {
  ProfileRow,
  SchoolRow,
  GradeRow,
  SubjectRow,
  ExamRow,
  CurriculumRow,
  TeacherRow,
  TermRow,
  ExamSessionRow,
  TermName,
  ExamType,
} from '@/components/academics/types';

// Helper functions
function chipClass(color: string) {
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
  const month = now.getMonth();
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
  const [activeTab, setActiveTab] = useState('overview');
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

  // ===== AUTH + PROFILE =====
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

  // ===== LOAD ACADEMIC DATA =====
  useEffect(() => {
    const load = async () => {
      if (!profile?.school_id || !school?.id) return;

      setLoading(true);
      try {
        const results = await Promise.allSettled([
          supabase.from('class').select('*').eq('school_id', school.id).order('grade_name'),
          supabase
            .from('subject')
            .select(`*, grade:class (grade_name), teacher:teachers (first_name, last_name), curriculum:curriculum (name)`)
            .eq('school_id', school.id)
            .order('name'),
          supabase
            .from('exam')
            .select(`*, subject:subject (name, code), grade:class (grade_name)`)
            .eq('school_id', school.id)
            .order('date', { ascending: false })
            .limit(50),
          supabase.from('curriculum').select('*').eq('school_id', school.id).order('name'),
          supabase
            .from('teachers')
            .select('registration_id, first_name, last_name, email, user_id, school_id')
            .eq('school_id', school.id)
            .order('first_name'),
          supabase.from('term_exam_session').select('*').eq('school_id', school.id).order('year', { ascending: false }).order('term_name'),
          supabase.from('exam_session').select(`*, term:term_exam_session (*)`).eq('school_id', school.id).order('start_date', { ascending: false }),
        ]);

        const pick = <T,>(idx: number) => (results[idx].status === 'fulfilled' ? (results[idx] as any).value : null);

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

        const errors = results
          .filter(r => r.status === 'rejected')
          .map(r => (r as PromiseRejectedResult).reason);
        if (errors.length) console.warn('Some academic requests failed:', errors);
      } catch (e: any) {
        console.error('load failed:', e);
        setErrorMsg(e?.message || 'Failed to load academic data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profile?.school_id, school?.id]);

  // ===== FK-safe created_by_id =====
  const getCurrentTeacherRegistrationId = (): string | null => {
    if (authUser?.id && teachers.length) {
      const t = teachers.find(x => (x.user_id || '').toLowerCase() === String(authUser.id).toLowerCase());
      if (t?.registration_id) return t.registration_id;
    }
    return null;
  };

  // ===== Create handlers =====
  const handleCreateGrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;

    if (!gradeForm.name.trim()) return showError('Grade name is required.');

    setSaving('grade');
    try {
      const { data, error } = await supabase
        .from('class')
        .insert({ grade_name: gradeForm.name.trim(), school_id: school.id })
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
    if (!school?.id) return;

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
          school_id: school.id,
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
    if (!school?.id) return;

    if (!examForm.subject_id || !examForm.grade_id || !examForm.date || !examForm.duration) {
      return showError('Subject, grade, date and duration are required.');
    }

    setSaving('exam');
    try {
      const teacherRegId = getCurrentTeacherRegistrationId();
      const { data, error } = await supabase
        .from('exam')
        .insert({
          subject_id: Number(examForm.subject_id),
          grade_id: Number(examForm.grade_id),
          date: examForm.date,
          duration_minutes: Number(examForm.duration),
          description: examForm.description.trim() || null,
          created_by_id: teacherRegId || null,
          school_id: school.id,
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
    if (!school?.id) return;

    if (!curriculumForm.name.trim()) return showError('Curriculum name is required.');

    setSaving('curriculum');
    try {
      const { data, error } = await supabase
        .from('curriculum')
        .insert({
          name: curriculumForm.name.trim(),
          objectives: curriculumForm.objectives.trim(),
          learning_outcomes: curriculumForm.learning_outcomes.trim(),
          school_id: school.id,
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

  const handleCreateTerm = async (e: FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;

    if (!termForm.start_date || !termForm.end_date) return showError('Start date and end date are required.');
    if (new Date(termForm.start_date) > new Date(termForm.end_date)) return showError('Start date cannot be after end date.');

    const teacherRegId = getCurrentTeacherRegistrationId();
    if (!teacherRegId) return showError('Your account is not linked to a Teacher. Cannot create a Term.');

    setSaving('term');
    try {
      const { data, error } = await supabase
        .from('term_exam_session')
        .insert({
          term_name: termForm.term_name,
          year: termForm.year,
          start_date: termForm.start_date,
          end_date: termForm.end_date,
          created_by_id: teacherRegId,
          school_id: school.id,
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

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;

    if (!sessionForm.term_id || !sessionForm.start_date || !sessionForm.end_date) {
      return showError('Term, start date and end date are required.');
    }
    if (new Date(sessionForm.start_date) > new Date(sessionForm.end_date)) return showError('Start date cannot be after end date.');

    const teacherRegId = getCurrentTeacherRegistrationId();
    if (!teacherRegId) return showError('Your account is not linked to a Teacher. Cannot create an Exam Session.');

    setSaving('session');
    try {
      const { data, error } = await supabase
        .from('exam_session')
        .insert({
          term_id: Number(sessionForm.term_id),
          exam_type: sessionForm.exam_type,
          start_date: sessionForm.start_date,
          end_date: sessionForm.end_date,
          created_by_id: teacherRegId,
          school_id: school.id,
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

  const handleSelectTermForSession = (termId: number) => {
    setSessionForm(prev => ({ ...prev, term_id: String(termId) }));
    setShowSessionModal(true);
  };

  // Render alerts
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

  // Loading / Guard
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <AcademicsHeader
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              schoolName={school.school_name}
              academicYear={getCurrentAcademicYear()}
            />
            
            {renderAlerts()}

            {loading && activeTab !== 'overview' ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading academic data...</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <OverviewTab
                    grades={grades}
                    subjects={subjects}
                    exams={exams}
                    curricula={curricula}
                    terms={terms}
                    sessions={sessions}
                    onShowGradeModal={() => setShowGradeModal(true)}
                    onShowSubjectModal={() => setShowSubjectModal(true)}
                    onShowExamModal={() => setShowExamModal(true)}
                    onShowTermModal={() => setShowTermModal(true)}
                    onShowSessionModal={() => setShowSessionModal(true)}
                    formatDate={formatDate}
                  />
                )}
                
                {activeTab === 'grades' && (
                  <GradesTab
                    grades={grades}
                    subjects={subjects}
                    exams={exams}
                    loading={loading}
                    search={search}
                    onSearchChange={setSearch}
                    onShowGradeModal={() => setShowGradeModal(true)}
                    chipClass={chipClass}
                  />
                )}
                
                {activeTab === 'subjects' && (
                  <SubjectsTab
                    subjects={subjects}
                    loading={loading}
                    search={search}
                    onSearchChange={setSearch}
                    onShowSubjectModal={() => setShowSubjectModal(true)}
                    chipClass={chipClass}
                  />
                )}
                
                {activeTab === 'exams' && (
                  <ExamsTab
                    exams={exams}
                    loading={loading}
                    search={search}
                    onSearchChange={setSearch}
                    onShowExamModal={() => setShowExamModal(true)}
                    chipClass={chipClass}
                    formatDate={formatDate}
                  />
                )}
                
                {activeTab === 'curriculum' && (
                  <CurriculumTab
                    curricula={curricula}
                    subjects={subjects}
                    loading={loading}
                    search={search}
                    onSearchChange={setSearch}
                    onShowCurriculumModal={() => setShowCurriculumModal(true)}
                    chipClass={chipClass}
                  />
                )}
                
                {activeTab === 'terms' && (
                  <TermsTab
                    terms={terms}
                    sessions={sessions}
                    loading={loading}
                    search={search}
                    onSearchChange={setSearch}
                    onShowTermModal={() => setShowTermModal(true)}
                    onShowSessionModal={() => setShowSessionModal(true)}
                    chipClass={chipClass}
                    formatDate={formatDate}
                    onSelectTermForSession={handleSelectTermForSession}
                  />
                )}
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
'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import {
  FileText,
  BookOpen,
  Users,
  BarChart3,
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Tag,
  Target,
  CheckCircle,
  TrendingUp,
  X,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
type TabKey = 'overview' | 'topics' | 'questions' | 'performance';

interface ProfileRow {
  user_id: string; // uuid
  email: string | null;
  full_name: string | null;
  role: AppRole;
  school_id: string | null; // uuid
}

interface SchoolRow {
  id: string; // uuid
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
}

interface ExamSessionRow {
  id: number;
  exam_type: 'BOT' | 'MOT' | 'EOT';
  term?: { term_name: string; year: number } | null;
}

interface QuestionRow {
  id: number;
  term_exam_id: number;
  exam_type_id: number;
  question_number: string;
  topic_id: number;
  grade_id: number;
  subject_id: number;
  max_score: number;
  term_exam?: { term_name: string; year: number } | null;
  exam_type?: {
    exam_type: string;
    term?: { term_name: string; year: number } | null;
  } | null;
  topic?: { name: string } | null;
  grade?: { grade_name: string } | null;
  subject?: { name: string } | null;
}

export default function AssessmentsPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Data
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [termExams, setTermExams] = useState<TermExamRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);

  const [totalGrades, setTotalGrades] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [totalTopics, setTotalTopics] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [overallAverage, setOverallAverage] = useState<number | null>(null);

  // Filters + Search
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [topicSearch, setTopicSearch] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Modals
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // Topic form
  const [topicName, setTopicName] = useState('');
  const [topicGradeId, setTopicGradeId] = useState('');
  const [topicSubjectId, setTopicSubjectId] = useState('');
  const [savingTopic, setSavingTopic] = useState(false);

  // Question form
  const [questionTermExamId, setQuestionTermExamId] = useState('');
  const [questionExamSessionId, setQuestionExamSessionId] = useState('');
  const [questionGradeId, setQuestionGradeId] = useState('');
  const [questionSubjectId, setQuestionSubjectId] = useState('');
  const [questionTopicId, setQuestionTopicId] = useState('');
  const [questionNumber, setQuestionNumber] = useState('1');
  const [questionMaxScore, setQuestionMaxScore] = useState('5');
  const [savingQuestion, setSavingQuestion] = useState(false);

  // 1️⃣ Auth check
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

  // 2️⃣ Load data after auth
  useEffect(() => {
    if (authChecking) return;

    const loadData = async () => {
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

      // ✅ Load profile by auth uid
      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, role, school_id')
        .eq('user_id', user.id)
        .single();

      if (pErr || !p) {
        setErrorMsg(
          pErr?.message ||
          'Profile not found. (If this user existed before the trigger, insert a profile row.)'
        );
        setLoading(false);
        return;
      }

      const prof = p as ProfileRow;
      setProfile(prof);

      if (!prof.school_id) {
        // keep school null so UI shows configuration required
        setSchool(null);
        setLoading(false);
        return;
      }

      // ✅ Load school
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
        // Grades
        const { data: gradeRows, error: gradesError } = await supabase
          .from('class')
          .select('id, grade_name')
          .eq('school_id', schoolData.id)
          .order('grade_name');

        if (gradesError) throw gradesError;
        setGrades((gradeRows ?? []) as GradeRow[]);
        setTotalGrades(gradeRows?.length ?? 0);

        // Subjects
        const { data: subjectRows, error: subjectsError } = await supabase
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
          .order('name');

        if (subjectsError) throw subjectsError;
        setSubjects((subjectRows ?? []) as unknown as SubjectRow[]);
        setTotalSubjects(subjectRows?.length ?? 0);

        // Topics
        const { data: topicRows, error: topicsError } = await supabase
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
          .order('name');

        if (topicsError) throw topicsError;
        setTopics((topicRows ?? []) as unknown as TopicRow[]);
        setTotalTopics(topicRows?.length ?? 0);

        // Questions (recent 30)
        const {
          data: questionRows,
          error: questionsError,
          count: questionsCountVal,
        } = await supabase
          .from('assessment_question')
          .select(
            `
            id,
            term_exam_id,
            exam_type_id,
            question_number,
            topic_id,
            grade_id,
            subject_id,
            max_score,
            term_exam:term_exam_session ( term_name, year ),
            exam_type:exam_session (
              exam_type,
              term:term_exam_session ( term_name, year )
            ),
            topic:assessment_topics ( name ),
            grade:class ( grade_name ),
            subject:subject ( name )
          `,
            { count: 'exact' }
          )
          .eq('school_id', schoolData.id)
          .order('id', { ascending: false })
          .limit(30);

        if (questionsError) throw questionsError;
        setQuestions((questionRows ?? []) as unknown as QuestionRow[]);
        setTotalQuestions(questionsCountVal ?? questionRows?.length ?? 0);

        // Term exams
        const { data: termRows, error: termError } = await supabase
          .from('term_exam_session')
          .select('id, term_name, year')
          .eq('school_id', schoolData.id)
          .order('year', { ascending: false })
          .order('term_name');

        if (termError) throw termError;
        setTermExams((termRows ?? []) as TermExamRow[]);

        // Exam sessions
        const { data: examSessRows, error: examSessError } = await supabase
          .from('exam_session')
          .select(
            `
            id,
            exam_type,
            term:term_exam_session ( term_name, year )
          `
          )
          .eq('school_id', schoolData.id)
          .order('id', { ascending: false });

        if (examSessError) throw examSessError;
        setExamSessions((examSessRows ?? []) as ExamSessionRow[]);

        // Results stats
        const { data: resultRows, error: resultsError } = await supabase
          .from('assessment_examresult')
          .select('score, max_possible')
          .eq('school_id', schoolData.id);

        if (resultsError) throw resultsError;
        setTotalResults(resultRows?.length ?? 0);

        if (resultRows && resultRows.length > 0) {
          let totalScore = 0;
          let totalPossible = 0;
          for (const r of resultRows as any[]) {
            totalScore += r.score ?? 0;
            totalPossible += r.max_possible ?? 0;
          }
          const pct = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
          setOverallAverage(Number(pct.toFixed(2)));
        } else {
          setOverallAverage(null);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load assessment data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authChecking]);

  // Derived
  const subjectsForSelectedGrade = useMemo(() => {
    if (!selectedGradeId) return subjects;
    return subjects.filter((s) => s.grade_id === Number(selectedGradeId));
  }, [subjects, selectedGradeId]);

  const subjectsForTopicGrade = useMemo(() => {
    if (!topicGradeId) return subjects;
    return subjects.filter((s) => s.grade_id === Number(topicGradeId));
  }, [subjects, topicGradeId]);

  const topicsForQuestion = useMemo(() => {
    if (questionGradeId && questionSubjectId) {
      return topics.filter(
        (t) => t.grade_id === Number(questionGradeId) && t.subject_id === Number(questionSubjectId)
      );
    }
    return topics;
  }, [topics, questionGradeId, questionSubjectId]);

  const filteredTopics = useMemo(() => {
    const q = topicSearch.trim().toLowerCase();
    return topics.filter((t) => {
      const gOk = selectedGradeId ? t.grade_id === Number(selectedGradeId) : true;
      const sOk = selectedSubjectId ? t.subject_id === Number(selectedSubjectId) : true;
      const searchOk =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.subject?.name ?? '').toLowerCase().includes(q) ||
        (t.grade?.grade_name ?? '').toLowerCase().includes(q);
      return gOk && sOk && searchOk;
    });
  }, [topics, selectedGradeId, selectedSubjectId, topicSearch]);

  const filteredQuestions = useMemo(() => {
    const q = questionSearch.trim().toLowerCase();
    return questions.filter((x) => {
      const gOk = selectedGradeId ? x.grade_id === Number(selectedGradeId) : true;
      const sOk = selectedSubjectId ? x.subject_id === Number(selectedSubjectId) : true;
      const searchOk =
        !q ||
        `${x.question_number}`.toLowerCase().includes(q) ||
        (x.topic?.name ?? '').toLowerCase().includes(q) ||
        (x.subject?.name ?? '').toLowerCase().includes(q) ||
        (x.grade?.grade_name ?? '').toLowerCase().includes(q) ||
        (x.term_exam?.term_name ?? '').toLowerCase().includes(q) ||
        `${x.term_exam?.year ?? ''}`.toLowerCase().includes(q) ||
        (x.exam_type?.exam_type ?? '').toLowerCase().includes(q);
      return gOk && sOk && searchOk;
    });
  }, [questions, selectedGradeId, selectedSubjectId, questionSearch]);

  // ➕ Create Topic
  const handleCreateTopic = async (e: FormEvent) => {
    e.preventDefault();
    if (!school) return;

    if (!topicName.trim() || !topicGradeId || !topicSubjectId) {
      setErrorMsg('Topic name, grade and subject are required.');
      return;
    }

    setSavingTopic(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('assessment_topics')
        .insert({
          name: topicName.trim(),
          grade_id: Number(topicGradeId),
          subject_id: Number(topicSubjectId),
          school_id: school.id,
        })
        .select(
          `
          id,
          name,
          grade_id,
          subject_id,
          grade:class ( grade_name ),
          subject:subject ( name )
        `
        );

      if (error) throw error;

      const newTopic = (data ?? [])[0] as TopicRow;
      setTopics((prev) => [...prev, newTopic]);
      setTotalTopics((prev) => prev + 1);

      setTopicName('');
      setTopicGradeId('');
      setTopicSubjectId('');
      setShowTopicModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create topic.');
    } finally {
      setSavingTopic(false);
    }
  };

  // ➕ Create Question
  const handleCreateQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!school) return;

    if (
      !questionTermExamId ||
      !questionExamSessionId ||
      !questionGradeId ||
      !questionSubjectId ||
      !questionTopicId ||
      !questionNumber ||
      !questionMaxScore
    ) {
      setErrorMsg('All fields are required for creating a question.');
      return;
    }

    setSavingQuestion(true);
    setErrorMsg(null);

    try {
      const payload = {
        term_exam_id: Number(questionTermExamId),
        exam_type_id: Number(questionExamSessionId),
        grade_id: Number(questionGradeId),
        subject_id: Number(questionSubjectId),
        topic_id: Number(questionTopicId),
        question_number: questionNumber.trim(),
        max_score: Number(questionMaxScore),
        school_id: school.id,
      };

      const { data, error } = await supabase
        .from('assessment_question')
        .insert(payload)
        .select(
          `
          id,
          term_exam_id,
          exam_type_id,
          question_number,
          topic_id,
          grade_id,
          subject_id,
          max_score,
          term_exam:term_exam_session ( term_name, year ),
          exam_type:exam_session (
            exam_type,
            term:term_exam_session ( term_name, year )
          ),
          topic:assessment_topics ( name ),
          grade:class ( grade_name ),
          subject:subject ( name )
        `
        );

      if (error) throw error;

      const newQuestion = (data ?? [])[0] as QuestionRow;
      setQuestions((prev) => [newQuestion, ...prev]);
      setTotalQuestions((prev) => prev + 1);

      setQuestionTermExamId('');
      setQuestionExamSessionId('');
      setQuestionGradeId('');
      setQuestionSubjectId('');
      setQuestionTopicId('');
      setQuestionNumber('1');
      setQuestionMaxScore('5');
      setShowQuestionModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create question.');
    } finally {
      setSavingQuestion(false);
    }
  };

  // Loading state
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading Assessments...</p>
        </div>
      </div>
    );
  }

  // No school configured
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                School Configuration Required
              </h3>
              <p className="text-gray-600 mb-6">
                Your account needs to be linked to a school before accessing the Assessments module.
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

  // UI helpers
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {totalTopics} Total
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">Topics</h3>
          <p className="text-sm text-gray-500">Assessment topics mapped to subjects</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              {totalQuestions} Total
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">Questions</h3>
          <p className="text-sm text-gray-500">Exam questions in the system</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
              {totalResults} Total
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">Results</h3>
          <p className="text-sm text-gray-500">Recorded exam scores</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Questions</h3>
                <p className="text-sm text-gray-500">Latest questions added</p>
              </div>
              <button
                onClick={() => setActiveTab('questions')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All →
              </button>
            </div>
          </div>
          <div className="p-5">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No questions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuestions.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Question {q.question_number}</h4>
                        <p className="text-sm text-gray-500">
                          {q.topic?.name} • {q.subject?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{q.max_score} pts</div>
                      <div className="text-xs text-gray-500">Max score</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
                <p className="text-sm text-gray-500">Overall assessment statistics</p>
              </div>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Average Score</span>
                  <span className="text-lg font-bold text-blue-600">
                    {overallAverage !== null ? `${overallAverage}%` : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${overallAverage || 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Grades</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{totalGrades}</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Subjects</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{totalSubjects}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Questions per subject</span>
                  <span className="text-sm font-medium text-gray-900">
                    ~{Math.round(totalQuestions / Math.max(totalSubjects, 1))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTopics = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Assessment Topics</h3>
          <p className="text-sm text-gray-500">Manage topics mapped to specific grades and subjects</p>
        </div>
        <button
          onClick={() => setShowTopicModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Topic
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder="Search topics..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>

              <select
                value={selectedGradeId}
                onChange={(e) => {
                  setSelectedGradeId(e.target.value);
                  setSelectedSubjectId('');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Grades</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.grade_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Subjects</option>
                {subjectsForSelectedGrade.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.grade?.grade_name ? `(${s.grade.grade_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Topic</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Subject</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grade</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Questions</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTopics.map((topic) => {
                const topicQuestions = questions.filter((q) => q.topic_id === topic.id);
                return (
                  <tr key={topic.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Tag className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{topic.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-900">{topic.subject?.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {topic.grade?.grade_name}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-gray-900">{topicQuestions.length}</div>
                      <div className="text-xs text-gray-500">Questions</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded" title="View">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Delete">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTopics.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-gray-500">
                    No topics found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Exam Questions</h3>
          <p className="text-sm text-gray-500">Manage structured questions for assessments</p>
        </div>
        <button
          onClick={() => setShowQuestionModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  placeholder="Search questions..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>

              <select
                value={selectedGradeId}
                onChange={(e) => {
                  setSelectedGradeId(e.target.value);
                  setSelectedSubjectId('');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Grades</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.grade_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Subjects</option>
                {subjectsForSelectedGrade.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.grade?.grade_name ? `(${s.grade.grade_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                <Calendar className="w-4 h-4" />
                By Term
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Question</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Topic</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grade</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Term</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Max Score</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredQuestions.map((question) => (
                <tr key={question.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Question {question.question_number}
                        </div>
                        <div className="text-xs text-gray-500">{question.subject?.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-900">{question.topic?.name}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {question.grade?.grade_name}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-900">
                      {question.term_exam
                        ? `${question.term_exam.term_name.replace('_', ' ')} ${question.term_exam.year}`
                        : '—'}
                    </div>
                    <div className="text-xs text-gray-500">{question.exam_type?.exam_type}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm font-medium text-gray-900">{question.max_score}</div>
                    <div className="text-xs text-gray-500">points</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded" title="View">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Delete">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredQuestions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                    No questions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Performance Analytics</h3>
        <p className="text-sm text-gray-500">Track assessment performance across grades and subjects</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-gray-900">Overall Average</h4>
              <p className="text-sm text-gray-500">Across all assessments</p>
            </div>
            <Target className="w-8 h-8 text-blue-600" />
          </div>
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {overallAverage !== null ? `${overallAverage}%` : 'N/A'}
            </div>
            <div className="text-sm text-gray-500">Average Score</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-gray-900">Completed Assessments</h4>
              <p className="text-sm text-gray-500">Total results recorded</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-green-600 mb-2">{totalResults}</div>
            <div className="text-sm text-gray-500">Results Recorded</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-gray-900">Question Coverage</h4>
              <p className="text-sm text-gray-500">Questions per subject</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {Math.round(totalQuestions / Math.max(totalSubjects, 1))}
            </div>
            <div className="text-sm text-gray-500">Average per Subject</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={userEmail} />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Assessment Management</h1>
                  <p className="text-gray-600">
                    Manage topics, questions, and performance analytics for {school.school_name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/assessments/marks/new"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                  >
                    <FileText className="w-4 h-4" />
                    Enter Marks
                  </Link>

                  <Link
                    href="/assessments/marks"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Marks Analysis
                  </Link>


                  <button
                    onClick={() => setShowTopicModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                    New Topic
                  </button>

                  <button
                    onClick={() => setShowQuestionModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    New Question
                  </button>
                </div>

              </div>

              <div className="flex items-center gap-1 border-b border-gray-200">
                {(['overview', 'topics', 'questions', 'performance'] as TabKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setActiveTab(k)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === k
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {k === 'overview'
                      ? 'Overview'
                      : k === 'topics'
                        ? 'Topics'
                        : k === 'questions'
                          ? 'Questions'
                          : 'Performance'}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            )}

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'topics' && renderTopics()}
            {activeTab === 'questions' && renderQuestions()}
            {activeTab === 'performance' && renderPerformance()}
          </div>
        </main>
      </div>

      {/* Topic Modal */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add New Topic</h3>
              <button
                onClick={() => setShowTopicModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Topic Name *</label>
                <input
                  type="text"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Fractions, Nouns, Photosynthesis..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade / Class *</label>
                <select
                  value={topicGradeId}
                  onChange={(e) => {
                    setTopicGradeId(e.target.value);
                    setTopicSubjectId('');
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <select
                  value={topicSubjectId}
                  onChange={(e) => setTopicSubjectId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select subject</option>
                  {subjectsForTopicGrade.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.grade?.grade_name ? `(${s.grade.grade_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTopic}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingTopic ? 'Creating...' : 'Create Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add New Question</h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Term Exam *</label>
                <select
                  value={questionTermExamId}
                  onChange={(e) => setQuestionTermExamId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select term</option>
                  {termExams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.term_name.replace('_', ' ')} {t.year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Type / Session *
                </label>
                <select
                  value={questionExamSessionId}
                  onChange={(e) => setQuestionExamSessionId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select session</option>
                  {examSessions.map((es) => (
                    <option key={es.id} value={es.id}>
                      {es.exam_type} {es.term ? `- ${es.term.term_name.replace('_', ' ')} ${es.term.year}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade / Class *</label>
                <select
                  value={questionGradeId}
                  onChange={(e) => {
                    setQuestionGradeId(e.target.value);
                    setQuestionSubjectId('');
                    setQuestionTopicId('');
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <select
                  value={questionSubjectId}
                  onChange={(e) => {
                    setQuestionSubjectId(e.target.value);
                    setQuestionTopicId('');
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select subject</option>
                  {(questionGradeId ? subjects.filter((s) => s.grade_id === Number(questionGradeId)) : subjects).map(
                    (s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.grade?.grade_name ? `(${s.grade.grade_name})` : ''}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Topic *</label>
                <select
                  value={questionTopicId}
                  onChange={(e) => setQuestionTopicId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select topic</option>
                  {topicsForQuestion.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Number *</label>
                <input
                  type="text"
                  value={questionNumber}
                  onChange={(e) => setQuestionNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1, 2a, 3b..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Score *</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={questionMaxScore}
                  onChange={(e) => setQuestionMaxScore(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingQuestion ? 'Creating...' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

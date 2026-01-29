'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
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
  Calendar,
  Tag,
  Target,
  CheckCircle,
  TrendingUp,
  X,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
type TabKey = 'overview' | 'topics' | 'questions' | 'performance';

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
  code: string | null;
  description: string;
  grade_id: number | null;
  curriculum_id: number;
  school_id: string | null;
  teacher_id: string | null;
  grade?: { grade_name: string }[] | null;
}

interface TopicRow {
  id: number;
  name: string;
  grade_id: number;
  subject_id: number;
  school_id?: string;
  grade?: { grade_name: string }[] | null;
  subject?: { name: string }[] | null;
}

interface TermExamRow {
  id: number;
  term_name: 'TERM_1' | 'TERM_2' | 'TERM_3';
  year: number;
}

interface ExamSessionRow {
  id: number;
  exam_type: 'BOT' | 'MOT' | 'EOT';
  term_id: number;
  term?: { term_name: string; year: number }[] | null;
}

interface ParsedExamSession {
  id: number;
  exam_type: 'BOT' | 'MOT' | 'EOT';
  term_name: string;
  term_year: number;
  term_id: number;
}

interface QuestionRow {
  id: number;
  term_exam_id: number;
  exam_type_id: number;
  question_number: string;
  topic_id: number;
  grade_id: number;
  subject_id: number | null;
  max_score: number;
  school_id?: string;
  term_exam?: { term_name: string; year: number }[] | null;
  exam_type?: Array<{
    exam_type: string;
    term?: { term_name: string; year: number }[] | null;
  }> | null;
  topic?: { name: string }[] | null;
  grade?: { grade_name: string }[] | null;
  subject?: { name: string }[] | null;
}

// Modal Types
type ModalMode = 'create' | 'edit';
type EntityType = 'topic' | 'question';

interface ModalState {
  type: EntityType;
  mode: ModalMode;
  isOpen: boolean;
  data: Record<string, any>;
}

// Pagination state interface
interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export default function AssessmentsPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [errorMsg, setErrorMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [termExams, setTermExams] = useState<TermExamRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);
  const [parsedExamSessions, setParsedExamSessions] = useState<ParsedExamSession[]>([]);

  const [totalGrades, setTotalGrades] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [totalTopics, setTotalTopics] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [overallAverage, setOverallAverage] = useState<number | null>(null);

  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [topicSearch, setTopicSearch] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Pagination states
  const [topicsPagination, setTopicsPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  });

  const [questionsPagination, setQuestionsPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  });

  // Modal State
  const [modalState, setModalState] = useState<ModalState>({
    type: 'topic',
    mode: 'create',
    isOpen: false,
    data: {},
  });

  // Message Handler
  const showMessage = (type: 'error' | 'success', text: string) => {
    setErrorMsg({ type, text });
    setTimeout(() => setErrorMsg(null), 4000);
  };

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
        showMessage('error', userErr.message);
        setLoading(false);
        return;
      }

      if (!user) {
        showMessage('error', 'Could not find authenticated user.');
        setLoading(false);
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, role, school_id')
        .eq('user_id', user.id)
        .single();

      if (pErr || !p) {
        showMessage('error',
          pErr?.message ||
          'Profile not found. (If this user existed before the trigger, insert a profile row.)'
        );
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
        showMessage('error', sErr?.message || 'Failed to load your school information.');
        setLoading(false);
        return;
      }

      const schoolData = s as SchoolRow;
      setSchool(schoolData);

      try {
        // Load grades (classes)
        const { data: gradeRows, error: gradesError } = await supabase
          .from('class')
          .select('id, grade_name')
          .eq('school_id', schoolData.id)
          .order('grade_name');

        if (gradesError) throw gradesError;
        setGrades((gradeRows ?? []) as GradeRow[]);
        setTotalGrades(gradeRows?.length ?? 0);

        // Load subjects with their grade information
        const { data: subjectRows, error: subjectsError } = await supabase
          .from('subject')
          .select(
            `
            id,
            name,
            code,
            description,
            grade_id,
            curriculum_id,
            school_id,
            teacher_id,
            grade:class ( grade_name )
          `
          )
          .eq('school_id', schoolData.id)
          .order('name');

        if (subjectsError) throw subjectsError;
        setSubjects((subjectRows ?? []) as unknown as SubjectRow[]);
        setTotalSubjects(subjectRows?.length ?? 0);

        // Load topics with pagination
        await loadTopics(1, topicsPagination.pageSize);

        // Load questions with pagination
        await loadQuestions(1, questionsPagination.pageSize);

        // Load term exams
        const { data: termRows, error: termError } = await supabase
          .from('term_exam_session')
          .select('id, term_name, year')
          .eq('school_id', schoolData.id)
          .order('year', { ascending: false })
          .order('term_name');

        if (termError) throw termError;
        setTermExams((termRows ?? []) as TermExamRow[]);

        // Load exam sessions with their term information
        const { data: examSessRows, error: examSessError } = await supabase
          .from('exam_session')
          .select(
            `
            id,
            exam_type,
            term_id,
            term:term_exam_session ( term_name, year )
          `
          )
          .eq('school_id', schoolData.id)
          .order('id', { ascending: false });

        if (examSessError) throw examSessError;
        
        const sessionData = (examSessRows ?? []) as ExamSessionRow[];
        setExamSessions(sessionData);

        // Parse exam sessions for easier display
        const parsedSessions: ParsedExamSession[] = sessionData.map(session => ({
          id: session.id,
          exam_type: session.exam_type,
          term_name: session.term?.[0]?.term_name || '',
          term_year: session.term?.[0]?.year || 0,
          term_id: session.term_id
        }));
        setParsedExamSessions(parsedSessions);

        // Load assessment results for statistics
        const { data: resultRows, error: resultsError } = await supabase
          .from('assessment_examresult')
          .select('score, max_possible')
          .eq('school_id', schoolData.id);

        if (resultsError) throw resultsError;
        setTotalResults(resultRows?.length ?? 0);

        // Calculate overall average
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
        showMessage('error', err.message || 'Failed to load assessment data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authChecking]);

  // Function to load topics with pagination
  const loadTopics = async (page: number, pageSize: number, searchTerm = '', gradeId = '', subjectId = '') => {
    if (!school) return;

    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('assessment_topics')
        .select(
          `
          id,
          name,
          grade_id,
          subject_id,
          school_id,
          grade:class ( grade_name ),
          subject:subject ( name )
        `,
          { count: 'exact' }
        )
        .eq('school_id', school.id);

      // Apply filters
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,subject.name.ilike.%${searchTerm}%,class.grade_name.ilike.%${searchTerm}%`);
      }
      if (gradeId) {
        query = query.eq('grade_id', Number(gradeId));
      }
      if (subjectId) {
        query = query.eq('subject_id', Number(subjectId));
      }

      const { data: topicRows, error: topicsError, count } = await query
        .order('name')
        .range(from, to);

      if (topicsError) throw topicsError;
      
      setTopics((topicRows ?? []) as unknown as TopicRow[]);
      setTotalTopics(count || 0);
      setTopicsPagination({
        page,
        pageSize,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      });
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to load topics.');
    } finally {
      setLoading(false);
    }
  };

  // Function to load questions with pagination
  const loadQuestions = async (page: number, pageSize: number, searchTerm = '', gradeId = '', subjectId = '') => {
    if (!school) return;

    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
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
          school_id,
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
        .eq('school_id', school.id);

      // Apply filters
      if (searchTerm) {
        query = query.or(`
          question_number.ilike.%${searchTerm}%,
          assessment_topics.name.ilike.%${searchTerm}%,
          subject.name.ilike.%${searchTerm}%,
          class.grade_name.ilike.%${searchTerm}%,
          term_exam_session.term_name.ilike.%${searchTerm}%
        `);
      }
      if (gradeId) {
        query = query.eq('grade_id', Number(gradeId));
      }
      if (subjectId) {
        query = query.eq('subject_id', Number(subjectId));
      }

      const { data: questionRows, error: questionsError, count } = await query
        .order('id', { ascending: false })
        .range(from, to);

      if (questionsError) throw questionsError;
      
      setQuestions((questionRows ?? []) as unknown as QuestionRow[]);
      setTotalQuestions(count || 0);
      setQuestionsPagination({
        page,
        pageSize,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      });
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  };

  // Handle page change for topics
  const handleTopicsPageChange = (newPage: number) => {
    setTopicsPagination(prev => ({ ...prev, page: newPage }));
    loadTopics(newPage, topicsPagination.pageSize, topicSearch, selectedGradeId, selectedSubjectId);
  };

  // Handle page change for questions
  const handleQuestionsPageChange = (newPage: number) => {
    setQuestionsPagination(prev => ({ ...prev, page: newPage }));
    loadQuestions(newPage, questionsPagination.pageSize, questionSearch, selectedGradeId, selectedSubjectId);
  };

  // Handle page size change
  const handlePageSizeChange = (type: 'topics' | 'questions', newSize: number) => {
    if (type === 'topics') {
      setTopicsPagination(prev => ({ ...prev, pageSize: newSize, page: 1 }));
      loadTopics(1, newSize, topicSearch, selectedGradeId, selectedSubjectId);
    } else {
      setQuestionsPagination(prev => ({ ...prev, pageSize: newSize, page: 1 }));
      loadQuestions(1, newSize, questionSearch, selectedGradeId, selectedSubjectId);
    }
  };

  // Handle delete topic
  const handleDeleteTopic = async (topicId: number) => {
    if (!confirm('Are you sure you want to delete this topic? This will also delete all related questions.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('assessment_topics')
        .delete()
        .eq('id', topicId)
        .eq('school_id', school?.id);

      if (error) throw error;

      showMessage('success', 'Topic deleted successfully');
      await loadTopics(topicsPagination.page, topicsPagination.pageSize, topicSearch, selectedGradeId, selectedSubjectId);
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to delete topic.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete question
  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('assessment_question')
        .delete()
        .eq('id', questionId)
        .eq('school_id', school?.id);

      if (error) throw error;

      showMessage('success', 'Question deleted successfully');
      await loadQuestions(questionsPagination.page, questionsPagination.pageSize, questionSearch, selectedGradeId, selectedSubjectId);
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to delete question.');
    } finally {
      setLoading(false);
    }
  };

  const subjectsForSelectedGrade = useMemo(() => {
    if (!selectedGradeId) return subjects;
    return subjects.filter((s) => s.grade_id === Number(selectedGradeId));
  }, [subjects, selectedGradeId]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'topics') {
        loadTopics(1, topicsPagination.pageSize, topicSearch, selectedGradeId, selectedSubjectId);
      } else if (activeTab === 'questions') {
        loadQuestions(1, questionsPagination.pageSize, questionSearch, selectedGradeId, selectedSubjectId);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [topicSearch, questionSearch, selectedGradeId, selectedSubjectId, activeTab]);

  // Pagination Component
  const PaginationControls = ({ pagination, onPageChange, onPageSizeChange, type }: {
    pagination: PaginationState;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    type: 'topics' | 'questions';
  }) => {
    const startItem = (pagination.page - 1) * pagination.pageSize + 1;
    const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-700">
            Showing <span className="font-semibold">{startItem}-{endItem}</span> of{' '}
            <span className="font-semibold">{pagination.totalItems}</span> {type}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Show:</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(1)}
            disabled={pagination.page === 1}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1 mx-2">
            <span className="px-3 py-1 text-sm font-medium text-gray-700">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
          </div>

          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => onPageChange(pagination.totalPages)}
            disabled={pagination.page >= pagination.totalPages}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  // Modal Handlers
  const openCreateModal = (type: EntityType) => {
    const defaultData = {
      topic: { name: '', grade_id: '', subject_id: '' },
      question: { 
        term_exam_id: '', 
        exam_type_id: '', 
        grade_id: '', 
        subject_id: '', 
        topic_id: '', 
        question_number: '1', 
        max_score: '5' 
      },
    };
    
    setModalState({
      type,
      mode: 'create',
      isOpen: true,
      data: defaultData[type],
    });
  };

  const openEditModal = (type: EntityType, entity: any) => {
    setModalState({
      type,
      mode: 'edit',
      isOpen: true,
      data: { ...entity },
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const updateModalData = (field: string, value: any) => {
    setModalState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value,
      },
    }));
  };

  // Subjects for topic modal
  const subjectsForTopicModal = useMemo(() => {
    if (!modalState.data.grade_id) return subjects;
    return subjects.filter((s) => s.grade_id === Number(modalState.data.grade_id));
  }, [subjects, modalState.data.grade_id]);

  // Subjects for question modal
  const subjectsForQuestionModal = useMemo(() => {
    if (!modalState.data.grade_id) return subjects;
    return subjects.filter((s) => s.grade_id === Number(modalState.data.grade_id));
  }, [subjects, modalState.data.grade_id]);

  // Topics for question modal
  const topicsForQuestionModal = useMemo(() => {
    if (modalState.data.grade_id && modalState.data.subject_id) {
      return topics.filter(
        (t) => t.grade_id === Number(modalState.data.grade_id) && 
               t.subject_id === Number(modalState.data.subject_id)
      );
    }
    return topics;
  }, [topics, modalState.data.grade_id, modalState.data.subject_id]);

  // Save Handler
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!school) return;

    setSaving(true);
    try {
      const { type, mode, data } = modalState;

      switch (type) {
        case 'topic': {
          if (!data.name.trim() || !data.grade_id || !data.subject_id) {
            showMessage('error', 'Topic name, grade and subject are required.');
            return;
          }

          const payload = {
            name: data.name.trim(),
            grade_id: Number(data.grade_id),
            subject_id: Number(data.subject_id),
            school_id: school.id,
          };

          if (mode === 'create') {
            const { error } = await supabase
              .from('assessment_topics')
              .insert(payload);

            if (error) throw error;
            
            showMessage('success', 'Topic created successfully');
          } else {
            const { error } = await supabase
              .from('assessment_topics')
              .update(payload)
              .eq('id', data.id);

            if (error) throw error;
            
            showMessage('success', 'Topic updated successfully');
          }
          
          // Refresh topics with current pagination
          await loadTopics(topicsPagination.page, topicsPagination.pageSize, topicSearch, selectedGradeId, selectedSubjectId);
          break;
        }

        case 'question': {
          if (
            !data.term_exam_id ||
            !data.exam_type_id ||
            !data.grade_id ||
            !data.subject_id ||
            !data.topic_id ||
            !data.question_number ||
            !data.max_score
          ) {
            showMessage('error', 'All fields are required for creating a question.');
            return;
          }

          const payload = {
            term_exam_id: Number(data.term_exam_id),
            exam_type_id: Number(data.exam_type_id),
            grade_id: Number(data.grade_id),
            subject_id: Number(data.subject_id),
            topic_id: Number(data.topic_id),
            question_number: data.question_number.trim(),
            max_score: Number(data.max_score),
            school_id: school.id,
          };

          if (mode === 'create') {
            const { error } = await supabase
              .from('assessment_question')
              .insert(payload);

            if (error) throw error;
            
            showMessage('success', 'Question created successfully');
          } else {
            const { error } = await supabase
              .from('assessment_question')
              .update(payload)
              .eq('id', data.id);

            if (error) throw error;
            
            showMessage('success', 'Question updated successfully');
          }
          
          // Refresh questions with current pagination
          await loadQuestions(questionsPagination.page, questionsPagination.pageSize, questionSearch, selectedGradeId, selectedSubjectId);
          break;
        }
      }

      closeModal();
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Render Modal
  const renderModal = () => {
    if (!modalState.isOpen) return null;

    const { type, mode, data } = modalState;
    const isTopic = type === 'topic';
    const title = `${mode === 'create' ? 'Create' : 'Edit'} ${isTopic ? 'Topic' : 'Question'}`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className={`bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto ${
          isTopic ? 'w-full max-w-md' : 'w-full max-w-2xl'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-5 sticky top-0 bg-white">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                isTopic ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {isTopic ? <Tag className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">
                  {mode === 'create' ? 'Add new to the system' : 'Update existing details'}
                </p>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="rounded-xl p-2 hover:bg-gray-100 transition-colors"
              disabled={saving}
              type="button"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-6">
            <div className="space-y-6">
              {isTopic ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Topic Name *
                    </label>
                    <input
                      type="text"
                      value={data.name || ''}
                      onChange={(e) => updateModalData('name', e.target.value)}
                      required
                      maxLength={100}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 transition-all"
                      placeholder="Fractions, Nouns, Photosynthesis..."
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Grade / Class *
                    </label>
                    <select
                      value={data.grade_id || ''}
                      onChange={(e) => {
                        updateModalData('grade_id', e.target.value);
                        updateModalData('subject_id', '');
                      }}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 transition-all"
                      disabled={saving}
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
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Subject *
                    </label>
                    <select
                      value={data.subject_id || ''}
                      onChange={(e) => updateModalData('subject_id', e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 transition-all"
                      disabled={saving}
                    >
                      <option value="">Select subject</option>
                      {subjectsForTopicModal.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.grade?.[0]?.grade_name ? `(${s.grade[0].grade_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Term Exam *
                    </label>
                    <select
                      value={data.term_exam_id || ''}
                      onChange={(e) => updateModalData('term_exam_id', e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                      disabled={saving}
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
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Exam Type / Session *
                    </label>
                    <select
                      value={data.exam_type_id || ''}
                      onChange={(e) => updateModalData('exam_type_id', e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                      disabled={saving}
                    >
                      <option value="">Select session</option>
                      {parsedExamSessions.map((es) => (
                        <option key={es.id} value={es.id}>
                          {es.exam_type} {es.term_name ? `- ${es.term_name.replace('_', ' ')} ${es.term_year}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Grade / Class *
                    </label>
                    <select
                      value={data.grade_id || ''}
                      onChange={(e) => {
                        updateModalData('grade_id', e.target.value);
                        updateModalData('subject_id', '');
                        updateModalData('topic_id', '');
                      }}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                      disabled={saving}
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
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Subject *
                    </label>
                    <select
                      value={data.subject_id || ''}
                      onChange={(e) => {
                        updateModalData('subject_id', e.target.value);
                        updateModalData('topic_id', '');
                      }}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                      disabled={saving}
                    >
                      <option value="">Select subject</option>
                      {subjectsForQuestionModal.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.grade?.[0]?.grade_name ? `(${s.grade[0].grade_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Topic *
                    </label>
                    <select
                      value={data.topic_id || ''}
                      onChange={(e) => updateModalData('topic_id', e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                      disabled={saving}
                    >
                      <option value="">Select topic</option>
                      {topicsForQuestionModal.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Question Number *
                    </label>
                    <input
                      type="text"
                      value={data.question_number || ''}
                      onChange={(e) => updateModalData('question_number', e.target.value)}
                      required
                      maxLength={100}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                      placeholder="1, 2a, 3b..."
                      disabled={saving}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Maximum Score *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={data.max_score || ''}
                      onChange={(e) => updateModalData('max_score', e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                      disabled={saving}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all hover:border-gray-400"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all ${
                  saving ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg'
                } ${
                  isTopic ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <Loader2 className="absolute -top-2 -right-2 h-6 w-6 animate-spin text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-600">Loading assessments dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                School Configuration Required
              </h3>
              <p className="text-gray-600 mb-8">
                Your account needs to be linked to a school before accessing the Assessments module.
              </p>

              <button
                onClick={() => router.push('/settings')}
                className="rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all"
              >
                Go to Settings
              </button>

              <p className="mt-6 text-xs text-gray-500">
                Signed in as <span className="font-semibold">{userEmail ?? '—'}</span>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Topics', value: totalTopics, icon: Tag, color: 'bg-gradient-to-br from-blue-500 to-blue-600', textColor: 'text-blue-600' },
          { label: 'Questions', value: totalQuestions, icon: FileText, color: 'bg-gradient-to-br from-emerald-500 to-emerald-600', textColor: 'text-emerald-600' },
          { label: 'Results', value: totalResults, icon: BarChart3, color: 'bg-gradient-to-br from-purple-500 to-purple-600', textColor: 'text-purple-600' },
          { label: 'Grades', value: totalGrades, icon: Users, color: 'bg-gradient-to-br from-amber-500 to-amber-600', textColor: 'text-amber-600' },
          { label: 'Subjects', value: totalSubjects, icon: BookOpen, color: 'bg-gradient-to-br from-cyan-500 to-cyan-600', textColor: 'text-cyan-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className={`h-12 w-12 rounded-xl ${stat.color} text-white flex items-center justify-center shadow-md`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Questions */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Recent Questions</h3>
                <p className="text-sm text-gray-600">Latest questions added</p>
              </div>
              <button
                onClick={() => setActiveTab('questions')}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                View All →
              </button>
            </div>
          </div>
          <div className="p-6">
            {questions.slice(0, 5).length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No questions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Question {q.question_number}</h4>
                        <p className="text-sm text-gray-500">
                          {q.topic?.[0]?.name} • {q.subject?.[0]?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{q.max_score} pts</div>
                        <div className="text-xs text-gray-500">Max score</div>
                      </div>
                      <button
                        onClick={() => openEditModal('question', q)}
                        className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit question"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Performance Overview */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Performance Overview</h3>
                <p className="text-sm text-gray-600">Overall assessment statistics</p>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Average Score</span>
                  <span className="text-xl font-bold text-blue-600">
                    {overallAverage !== null ? `${overallAverage}%` : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full"
                    style={{ width: `${overallAverage || 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700">Grades</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{totalGrades}</div>
                </div>

                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700">Subjects</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{totalSubjects}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Questions per subject</span>
                  <span className="text-sm font-semibold text-gray-900">
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Assessment Topics</h3>
          <p className="text-sm text-gray-500">Manage topics mapped to specific grades and subjects</p>
        </div>
        <button
          onClick={() => openCreateModal('topic')}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Topic
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              placeholder="Search topics..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <select
            value={selectedGradeId}
            onChange={(e) => {
              setSelectedGradeId(e.target.value);
              setSelectedSubjectId('');
            }}
            className="px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
            className="px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">All Subjects</option>
            {subjectsForSelectedGrade.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.grade?.[0]?.grade_name ? `(${s.grade[0].grade_name})` : ''}
              </option>
            ))}
          </select>

          <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-all">
            <Filter className="h-4 w-4" />
            More Filters
          </button>
        </div>
      </div>

      {/* Topics Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
              <tr>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Topic
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Subject
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Grade
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Questions
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topics.map((topic) => {
                const topicQuestions = questions.filter((q) => q.topic_id === topic.id);
                return (
                  <tr key={topic.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Tag className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{topic.name}</div>
                          <div className="text-xs text-gray-500 mt-1">ID: {topic.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{topic.subject?.[0]?.name}</div>
                        <div className="text-xs text-gray-500">Subject ID: {topic.subject_id}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-1">
                          {topic.grade?.[0]?.grade_name}
                        </span>
                        <div className="text-xs text-gray-500">Grade ID: {topic.grade_id}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-gray-900">{topicQuestions.length}</div>
                        <div className="text-xs text-gray-500">Questions</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal('topic', topic)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit topic"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          title="Delete topic"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {topics.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Tag className="h-12 w-12 text-gray-300" />
                      <div>
                        <p className="text-sm font-semibold text-gray-700">No topics found</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {topicSearch || selectedGradeId || selectedSubjectId 
                            ? 'Try changing your filters' 
                            : 'Create your first topic to get started'}
                        </p>
                      </div>
                      {!topicSearch && !selectedGradeId && !selectedSubjectId && (
                        <button
                          onClick={() => openCreateModal('topic')}
                          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add First Topic
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination for Topics */}
        {topicsPagination.totalItems > 0 && (
          <PaginationControls
            pagination={topicsPagination}
            onPageChange={handleTopicsPageChange}
            onPageSizeChange={(size) => handlePageSizeChange('topics', size)}
            type="topics"
          />
        )}
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Exam Questions</h3>
          <p className="text-sm text-gray-500">Manage structured questions for assessments</p>
        </div>
        <button
          onClick={() => openCreateModal('question')}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Question
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <select
            value={selectedGradeId}
            onChange={(e) => {
              setSelectedGradeId(e.target.value);
              setSelectedSubjectId('');
            }}
            className="px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-3 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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
            className="px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-3 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="">All Subjects</option>
            {subjectsForSelectedGrade.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.grade?.[0]?.grade_name ? `(${s.grade[0].grade_name})` : ''}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-all flex-1">
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-all flex-1">
              <Calendar className="h-4 w-4" />
              Term
            </button>
          </div>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
              <tr>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Question
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Topic & Subject
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Grade
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Term & Session
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Max Score
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {questions.map((question) => (
                <tr key={question.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          Question {question.question_number}
                        </div>
                        <div className="text-xs text-gray-500">ID: {question.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{question.topic?.[0]?.name}</div>
                      <div className="text-xs text-gray-500">
                        {question.subject?.[0]?.name} (ID: {question.subject_id || 'N/A'})
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-1">
                        {question.grade?.[0]?.grade_name}
                      </span>
                      <div className="text-xs text-gray-500">Grade ID: {question.grade_id}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <div className="text-sm text-gray-900">
                        {question.term_exam?.[0]
                          ? `${question.term_exam[0].term_name.replace('_', ' ')} ${question.term_exam[0].year}`
                          : '—'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {question.exam_type?.[0]?.exam_type} (Session ID: {question.exam_type_id})
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-gray-900">{question.max_score}</div>
                      <div className="text-xs text-gray-500">pts</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal('question', question)}
                        className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                        title="Edit question"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                        title="Delete question"
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {questions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="h-12 w-12 text-gray-300" />
                      <div>
                        <p className="text-sm font-semibold text-gray-700">No questions found</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {questionSearch || selectedGradeId || selectedSubjectId 
                            ? 'Try changing your filters' 
                            : 'Create your first question to get started'}
                        </p>
                      </div>
                      {!questionSearch && !selectedGradeId && !selectedSubjectId && (
                        <button
                          onClick={() => openCreateModal('question')}
                          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add First Question
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination for Questions */}
        {questionsPagination.totalItems > 0 && (
          <PaginationControls
            pagination={questionsPagination}
            onPageChange={handleQuestionsPageChange}
            onPageSizeChange={(size) => handlePageSizeChange('questions', size)}
            type="questions"
          />
        )}
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-gray-900">Performance Analytics</h3>
        <p className="text-sm text-gray-500">Track assessment performance across grades and subjects</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-bold text-gray-900">Overall Average</h4>
              <p className="text-sm text-gray-500">Across all assessments</p>
            </div>
            <Target className="h-10 w-10 text-blue-600" />
          </div>
          <div className="text-center py-6">
            <div className="text-5xl font-bold text-blue-600 mb-3">
              {overallAverage !== null ? `${overallAverage}%` : 'N/A'}
            </div>
            <div className="text-sm text-gray-500">Average Score</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-bold text-gray-900">Completed Assessments</h4>
              <p className="text-sm text-gray-500">Total results recorded</p>
            </div>
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <div className="text-center py-6">
            <div className="text-5xl font-bold text-emerald-600 mb-3">{totalResults}</div>
            <div className="text-sm text-gray-500">Results Recorded</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-bold text-gray-900">Question Coverage</h4>
              <p className="text-sm text-gray-500">Questions per subject</p>
            </div>
            <BarChart3 className="h-10 w-10 text-purple-600" />
          </div>
          <div className="text-center py-6">
            <div className="text-5xl font-bold text-purple-600 mb-3">
              {Math.round(totalQuestions / Math.max(totalSubjects, 1))}
            </div>
            <div className="text-sm text-gray-500">Average per Subject</div>
          </div>
        </div>
      </div>

      {/* Database Schema Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h4 className="text-lg font-bold text-gray-900 mb-6">Database Schema Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-xl p-6">
            <h5 className="font-semibold text-blue-700 mb-3">Topics Table Structure</h5>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>assessment_topics</strong>: Stores assessment topics</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>Foreign Keys</strong>: grade_id → class.id, subject_id → subject.id</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>Cascade Delete</strong>: Topics deleted when grade/subject is deleted</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-emerald-50 rounded-xl p-6">
            <h5 className="font-semibold text-emerald-700 mb-3">Questions Table Structure</h5>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span><strong>assessment_question</strong>: Stores exam questions</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span><strong>Foreign Keys</strong>: term_exam_id, exam_type_id, topic_id, grade_id, subject_id</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span><strong>Unique Constraint</strong>: term_exam_id + question_number + grade_id + subject_id</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <div className="flex">
        <AppShell />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Assessment Management</h1>
                  <p className="text-gray-600 mt-2">
                    Manage topics, questions, and performance analytics for {school.school_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Topics: {totalTopics}</span>
                    <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded">Questions: {totalQuestions}</span>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">Results: {totalResults}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/assessments/marks/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-all"
                  >
                    <FileText className="h-4 w-4" />
                    Enter Marks
                  </Link>

                  <Link
                    href="/assessments/percentage-entry/"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-all"
                  >
                    <FileText className="h-4 w-4" />
                    Enter Percentages
                  </Link>

                  <Link
                    href="/assessments/marks"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-all"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Analysis
                  </Link>

                  <button
                    onClick={() => openCreateModal('topic')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    New Topic
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                  {(['overview', 'topics', 'questions', 'performance'] as TabKey[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setActiveTab(k)}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
                        activeTab === k
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50'
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
            </div>

            {/* Message Display */}
            {errorMsg && (
              <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 animate-in slide-in-from-top-4 ${
                errorMsg.type === 'success'
                  ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-25 text-emerald-900'
                  : 'border-red-200 bg-gradient-to-r from-red-50 to-red-25 text-red-900'
              }`}>
                {errorMsg.type === 'success' ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                )}
                <div className="flex-1 text-sm font-medium">{errorMsg.text}</div>
                <button
                  onClick={() => setErrorMsg(null)}
                  className="rounded p-1 hover:bg-white/40 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Content Area */}
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'topics' && renderTopics()}
            {activeTab === 'questions' && renderQuestions()}
            {activeTab === 'performance' && renderPerformance()}
          </div>
        </main>
      </div>

      {/* Single Modal for both Topics and Questions */}
      {renderModal()}
    </div>
  );
}
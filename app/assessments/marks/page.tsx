'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
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
  ChevronRight,
  AlertTriangle,
  PieChart,
  LineChart,
  Award,
  Users,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Info,
  Eye,
  Activity,
  Brain,
  Medal,
  Zap,
  Clock,
  Sparkles,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  GraduationCap,
  School,
  Percent,
  ChartNoAxesColumn,
  UsersRound,
  ListChecks,
  Star,
  Trophy,
  Flame,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Download,
  ArrowUpRight,
  Shield,
  BarChart,
  ChartLine,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  RadialLinearScale,
} from 'chart.js';
// Import Radar as RadarChart to avoid naming conflict with lucide-react's Radar
import { Bar, Pie, Line, Radar as RadarChart, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  RadialLinearScale
);

// ==================== TYPES ====================
type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
type TabKey = 'matrix' | 'topics' | 'charts' | 'stats';
type ChartType = 'bar' | 'line' | 'radar';

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
  exam_type_id?: number | null;
  topic?: { name: string } | null;
}

interface ExamResultRow {
  id: number;
  student_id: string;
  question_id: number | null;
  grade_id: number;
  subject_id: number | null;
  topic_id: number | null;
  exam_session_id: number | null;
  score: number;
  max_possible: number;
  total_score: number | null;
  percentage: number | null;
}

interface GradeInfo {
  grade: string;
  color: string;
  bg: string;
  label: string;
  range: string;
}

interface TopicPerformanceDetail {
  topicId: number;
  topicName: string;
  avgScore: number;
  totalStudents: number;
  passed: number;
  failed: number;
  passRate: number;
  failRate: number;
  topPerformers: Array<{ student_id: string; pct: number; name: string }>;
  bottomPerformers: Array<{ student_id: string; pct: number; name: string }>;
  scoreDistribution: { range: string; count: number; percentage: number }[];
  difficulty: 'easy' | 'medium' | 'hard';
}

// ==================== UTILITY FUNCTIONS ====================
const fullName = (s: StudentRow): string => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim();

const getGradeInfo = (percentage: number): GradeInfo => {
  if (percentage >= 80) return { grade: 'A', color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Excellent', range: '80-100%' };
  if (percentage >= 70) return { grade: 'B', color: 'text-blue-700', bg: 'bg-blue-100', label: 'Good', range: '70-79%' };
  if (percentage >= 60) return { grade: 'C', color: 'text-amber-700', bg: 'bg-amber-100', label: 'Satisfactory', range: '60-69%' };
  if (percentage >= 50) return { grade: 'D', color: 'text-orange-700', bg: 'bg-orange-100', label: 'Pass', range: '50-59%' };
  return { grade: 'F', color: 'text-red-700', bg: 'bg-red-100', label: 'Fail', range: '0-49%' };
};

const formatPercentage = (value: number, decimals: number = 1): string => {
  return value.toFixed(decimals);
};

const calculateMean = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
};

const calculateMedian = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const calculateMode = (numbers: number[]): number[] => {
  if (numbers.length === 0) return [];
  const freq = new Map<number, number>();
  numbers.forEach(n => freq.set(n, (freq.get(n) || 0) + 1));
  let maxFreq = 0;
  let modes: number[] = [];
  for (const [num, count] of freq.entries()) {
    if (count > maxFreq) {
      maxFreq = count;
      modes = [num];
    } else if (count === maxFreq) {
      modes.push(num);
    }
  }
  return modes;
};

const calculateStdDev = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  const mean = calculateMean(numbers);
  const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
  return Math.sqrt(variance);
};

const calculatePercentile = (numbers: number[], percentile: number): number => {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

const calculateIQR = (numbers: number[]): number => {
  const q1 = calculatePercentile(numbers, 25);
  const q3 = calculatePercentile(numbers, 75);
  return q3 - q1;
};

// ==================== UI COMPONENTS ====================
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color?: string;
  trend?: number;
}> = ({ title, value, icon: Icon, color = 'blue', trend }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className={`p-2.5 rounded-xl bg-${color}-50 group-hover:scale-110 transition-transform`}>
        <Icon size={20} className={`text-${color}-500`} />
      </div>
    </div>
  </div>
);

const SectionCard: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, children, icon, action, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow ${className}`}>
    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon && <div className="text-gray-400">{icon}</div>}
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {action && action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const MetricBadge: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color = 'blue' }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className={`font-semibold text-${color}-600`}>{value}</span>
  </div>
);

const FilterSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}> = ({ value, onChange, options, placeholder, disabled, icon }) => (
  <div className="relative">
    {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full p-2.5 ${icon ? 'pl-9' : 'pl-3'} pr-8 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-400 appearance-none cursor-pointer`}
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
  </div>
);

// ==================== MAIN COMPONENT ====================
export default function AssessmentMarksPage() {
  const router = useRouter();

  // State
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('matrix');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [selectedTopicForDetails, setSelectedTopicForDetails] = useState<number | null>(null);

  // Data
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [terms, setTerms] = useState<TermExamRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [results, setResults] = useState<ExamResultRow[]>([]);

  // Filters
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedExamSessionId, setSelectedExamSessionId] = useState<string>('');

  // UI State
  const [studentSearch, setStudentSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  // ==================== AUTHENTICATION ====================
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      setAuthChecking(false);
    };
    checkAuth();
  }, [router]);

  // ==================== LOAD SCHOOL DATA ====================
  useEffect(() => {
    if (authChecking) return;

    const loadSchoolData = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
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
        setErrorMsg(sErr?.message || 'Failed to load school information.');
        setLoading(false);
        return;
      }

      setSchool(s as SchoolRow);

      try {
        const [gradeRes, subjectRes, topicRes, termRes, examSessRes] = await Promise.all([
          supabase.from('class').select('id, grade_name').eq('school_id', prof.school_id).order('grade_name'),
          supabase.from('subject').select('id, name, grade_id, grade:class(grade_name)').eq('school_id', prof.school_id).order('name'),
          supabase.from('assessment_topics').select('id, name, grade_id, subject_id, grade:class(grade_name), subject:subject(name)').eq('school_id', prof.school_id).order('name'),
          supabase.from('term_exam_session').select('id, term_name, year, start_date, end_date').eq('school_id', prof.school_id).order('year', { ascending: false }),
          supabase.from('exam_session').select('id, term_id, exam_type, start_date, end_date, term:term_exam_session(term_name, year)').eq('school_id', prof.school_id).order('id', { ascending: false }),
        ]);

        if (gradeRes.error) throw gradeRes.error;
        if (subjectRes.error) throw subjectRes.error;
        if (topicRes.error) throw topicRes.error;
        if (termRes.error) throw termRes.error;
        if (examSessRes.error) throw examSessRes.error;

        setGrades(gradeRes.data || []);
        setSubjects(subjectRes.data || []);
        setTopics(topicRes.data || []);
        setTerms(termRes.data || []);
        setExamSessions(examSessRes.data || []);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load assessment setup.');
      } finally {
        setLoading(false);
      }
    };

    loadSchoolData();
  }, [authChecking]);

  // ==================== LOAD ASSESSMENT DATA ====================
  const canLoadMatrix = useMemo(() => {
    return Boolean(school?.id && selectedGradeId && selectedSubjectId && selectedTermId && selectedExamSessionId);
  }, [school?.id, selectedGradeId, selectedSubjectId, selectedTermId, selectedExamSessionId]);

  useEffect(() => {
    if (!school?.id || !canLoadMatrix) {
      setStudents([]);
      setQuestions([]);
      setResults([]);
      return;
    }

    const loadAssessmentData = async () => {
      setLoading(true);
      try {
        const gradeId = Number(selectedGradeId);
        const subjectId = Number(selectedSubjectId);
        const termId = Number(selectedTermId);
        const examSessionId = Number(selectedExamSessionId);

        const [studentsRes, questionsRes, resultsRes] = await Promise.all([
          supabase.from('students').select('registration_id, first_name, last_name').eq('school_id', school.id).eq('current_grade_id', gradeId).order('first_name'),
          supabase.from('assessment_question').select('id, question_number, max_score, topic_id, grade_id, subject_id').eq('school_id', school.id).eq('grade_id', gradeId).eq('subject_id', subjectId).eq('term_exam_id', termId).eq('exam_type_id', examSessionId).order('id'),
          supabase.from('assessment_examresult').select('id, student_id, question_id, grade_id, subject_id, topic_id, exam_session_id, score, max_possible, total_score, percentage').eq('school_id', school.id).eq('grade_id', gradeId).eq('subject_id', subjectId).eq('exam_session_id', examSessionId).not('question_id', 'is', null),
        ]);

        if (studentsRes.error) throw studentsRes.error;
        if (questionsRes.error) throw questionsRes.error;
        if (resultsRes.error) throw resultsRes.error;

        setStudents(studentsRes.data || []);
        setQuestions(questionsRes.data || []);
        setResults(resultsRes.data || []);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load assessment data.');
      } finally {
        setLoading(false);
      }
    };

    loadAssessmentData();
  }, [school?.id, canLoadMatrix, selectedGradeId, selectedSubjectId, selectedTermId, selectedExamSessionId]);

  // ==================== DATA PROCESSING ====================
  const subjectsForSelectedGrade = useMemo(() => {
    if (!selectedGradeId) return subjects;
    return subjects.filter(s => s.grade_id === Number(selectedGradeId));
  }, [subjects, selectedGradeId]);

  const examSessionsForSelectedTerm = useMemo(() => {
    if (!selectedTermId) return examSessions;
    return examSessions.filter(es => es.term_id === Number(selectedTermId));
  }, [examSessions, selectedTermId]);

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
    const totals = new Map<string, { total: number; pct: number; grade: string; gradeInfo: GradeInfo }>();
    for (const s of students) {
      const qs = studentQuestionScore.get(s.registration_id);
      let total = 0;
      for (const q of questions) total += Number(qs?.get(q.id) ?? 0);
      const pct = totalPossible > 0 ? (total / totalPossible) * 100 : 0;
      const gradeInfo = getGradeInfo(pct);
      totals.set(s.registration_id, { total, pct, grade: gradeInfo.grade, gradeInfo });
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
        cur.sum += v;
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

  const positions = useMemo(() => {
    const rows = students.map(s => {
      const t = studentTotals.get(s.registration_id) ?? { total: 0, pct: 0 };
      return { id: s.registration_id, total: t.total, pct: t.pct };
    }).sort((a, b) => b.total - a.total);
    const posMap = new Map<string, number>();
    let currentPos = 1;
    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && rows[i].total < rows[i - 1].total) currentPos = i + 1;
      posMap.set(rows[i].id, currentPos);
    }
    return posMap;
  }, [students, studentTotals]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => fullName(s).toLowerCase().includes(q) || s.registration_id.toLowerCase().includes(q));
  }, [students, studentSearch]);

  const studentById = useMemo(() => {
    const map = new Map<string, StudentRow>();
    for (const s of students) map.set(s.registration_id, s);
    return map;
  }, [students]);

  const topicNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of topics) map.set(t.id, t.name);
    return map;
  }, [topics]);

  // ==================== ENHANCED TOPIC PERFORMANCE ====================
  const topicPerformanceDetails = useMemo((): TopicPerformanceDetail[] => {
    const topicData = new Map<number, {
      studentScores: Map<string, { total: number; max: number; pct: number }>;
    }>();

    for (const stu of students) {
      const sq = studentQuestionScore.get(stu.registration_id);
      if (!sq) continue;
      
      for (const q of questions) {
        if (!q.topic_id) continue;
        const score = Number(sq.get(q.id) ?? 0);
        const maxScore = Number(q.max_score ?? 0);
        
        if (!topicData.has(q.topic_id)) {
          topicData.set(q.topic_id, { studentScores: new Map() });
        }
        
        const topic = topicData.get(q.topic_id)!;
        const existing = topic.studentScores.get(stu.registration_id) || { total: 0, max: 0, pct: 0 };
        existing.total += score;
        existing.max += maxScore;
        existing.pct = existing.max > 0 ? (existing.total / existing.max) * 100 : 0;
        topic.studentScores.set(stu.registration_id, existing);
      }
    }

    const results: TopicPerformanceDetail[] = [];
    
    for (const [topicId, data] of topicData.entries()) {
      const studentEntries = Array.from(data.studentScores.entries());
      const totalStudents = studentEntries.length;
      
      const passed = studentEntries.filter(([, scores]) => scores.pct >= 50).length;
      const failed = totalStudents - passed;
      const passRate = totalStudents > 0 ? (passed / totalStudents) * 100 : 0;
      const failRate = totalStudents > 0 ? (failed / totalStudents) * 100 : 0;
      
      const avgScore = studentEntries.length > 0 
        ? studentEntries.reduce((sum, [, scores]) => sum + scores.pct, 0) / studentEntries.length 
        : 0;
      
      const sortedStudents = [...studentEntries].sort((a, b) => b[1].pct - a[1].pct);
      const topPerformers = sortedStudents.slice(0, 5).map(([student_id, scores]) => ({
        student_id,
        pct: scores.pct,
        name: studentById.get(student_id) ? fullName(studentById.get(student_id)!) : student_id,
      }));
      
      const bottomPerformers = sortedStudents.slice(-5).reverse().map(([student_id, scores]) => ({
        student_id,
        pct: scores.pct,
        name: studentById.get(student_id) ? fullName(studentById.get(student_id)!) : student_id,
      }));
      
      const ranges = [
        { range: '0-49%', min: 0, max: 49, count: 0 },
        { range: '50-59%', min: 50, max: 59, count: 0 },
        { range: '60-69%', min: 60, max: 69, count: 0 },
        { range: '70-79%', min: 70, max: 79, count: 0 },
        { range: '80-100%', min: 80, max: 100, count: 0 },
      ];
      
      for (const [, scores] of studentEntries) {
        for (const range of ranges) {
          if (scores.pct >= range.min && scores.pct <= range.max) {
            range.count++;
            break;
          }
        }
      }
      
      const scoreDistribution = ranges.map(r => ({
        range: r.range,
        count: r.count,
        percentage: totalStudents > 0 ? (r.count / totalStudents) * 100 : 0,
      }));
      
      let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
      if (avgScore >= 70) difficulty = 'easy';
      else if (avgScore < 50) difficulty = 'hard';
      
      results.push({
        topicId,
        topicName: topicNameById.get(topicId) || `Topic ${topicId}`,
        avgScore,
        totalStudents,
        passed,
        failed,
        passRate,
        failRate,
        topPerformers,
        bottomPerformers,
        scoreDistribution,
        difficulty,
      });
    }
    
    const q = topicSearch.trim().toLowerCase();
    let filtered = q ? results.filter(t => t.topicName.toLowerCase().includes(q)) : results;
    filtered = filtered.sort((a, b) => b.passRate - a.passRate);
    
    return filtered;
  }, [students, questions, studentQuestionScore, topicNameById, studentById, topicSearch]);

  // ==================== STATISTICS ====================
  const allScores = useMemo(() => Array.from(studentTotals.values()).map(t => t.pct), [studentTotals]);

  const statistics = useMemo(() => {
    if (allScores.length === 0) return null;
    return {
      count: allScores.length,
      mean: calculateMean(allScores),
      median: calculateMedian(allScores),
      mode: calculateMode(allScores),
      stdDev: calculateStdDev(allScores),
      variance: Math.pow(calculateStdDev(allScores), 2),
      min: Math.min(...allScores),
      max: Math.max(...allScores),
      range: Math.max(...allScores) - Math.min(...allScores),
      q1: calculatePercentile(allScores, 25),
      q3: calculatePercentile(allScores, 75),
      iqr: calculateIQR(allScores),
      skewness: (calculateMean(allScores) - calculateMedian(allScores)) / (calculateStdDev(allScores) || 1),
      coefficientOfVariation: (calculateStdDev(allScores) / (calculateMean(allScores) || 1)) * 100,
    };
  }, [allScores]);

  // ==================== GRADE DISTRIBUTION ====================
  const gradeDistribution = useMemo(() => {
    const gradeLabels = ['A', 'B', 'C', 'D', 'F'];
    const counts = [0, 0, 0, 0, 0];
    for (const student of students) {
      const t = studentTotals.get(student.registration_id);
      if (t) {
        switch (t.grade) {
          case 'A': counts[0]++; break;
          case 'B': counts[1]++; break;
          case 'C': counts[2]++; break;
          case 'D': counts[3]++; break;
          case 'F': counts[4]++; break;
        }
      }
    }
    const total = counts.reduce((a, b) => a + b, 0);
    return { labels: gradeLabels, counts, total };
  }, [students, studentTotals]);

  // ==================== QUESTION PERFORMANCE ====================
  const questionPerformance = useMemo(() => {
    const labels = questions.map(q => `Q${q.question_number}`);
    const averages = questions.map(q => {
      const avg = questionAverages.get(q.id) || 0;
      return (avg / q.max_score) * 100;
    });
    return { labels, averages };
  }, [questions, questionAverages]);

  // ==================== TOPIC PERFORMANCE ====================
  const topicPerformance = useMemo(() => {
    const topicData = new Map<number, { total: number; count: number; scores: number[]; min: number; max: number }>();
    for (const q of questions) {
      if (!q.topic_id) continue;
      const avg = questionAverages.get(q.id) || 0;
      const pct = (avg / q.max_score) * 100;
      const current = topicData.get(q.topic_id) || { total: 0, count: 0, scores: [], min: 100, max: 0 };
      current.total += pct;
      current.count += 1;
      current.scores.push(pct);
      current.min = Math.min(current.min, pct);
      current.max = Math.max(current.max, pct);
      topicData.set(q.topic_id, current);
    }
    const topicsList = Array.from(topicData.entries()).map(([id, data]) => ({
      name: topicNameById.get(id) || `Topic ${id}`,
      avg: data.total / data.count,
      stdDev: calculateStdDev(data.scores),
      min: data.min,
      max: data.max,
    }));
    topicsList.sort((a, b) => b.avg - a.avg);
    return {
      labels: topicsList.map(t => t.name.length > 20 ? t.name.substring(0, 20) + '...' : t.name),
      averages: topicsList.map(t => t.avg),
      stdDevs: topicsList.map(t => t.stdDev),
      mins: topicsList.map(t => t.min),
      maxs: topicsList.map(t => t.max),
      fullNames: topicsList.map(t => t.name),
    };
  }, [questions, questionAverages, topicNameById]);

  // ==================== TOP STUDENTS ====================
  const topStudents = useMemo(() => {
    return filteredStudents
      .map(s => ({ name: fullName(s), id: s.registration_id, pct: studentTotals.get(s.registration_id)?.pct || 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 10);
  }, [filteredStudents, studentTotals]);

  // ==================== PERFORMANCE CATEGORIES ====================
  const performanceCategories = useMemo(() => {
    const categories = { excellent: 0, good: 0, satisfactory: 0, pass: 0, fail: 0 };
    for (const student of students) {
      const pct = studentTotals.get(student.registration_id)?.pct || 0;
      if (pct >= 80) categories.excellent++;
      else if (pct >= 70) categories.good++;
      else if (pct >= 60) categories.satisfactory++;
      else if (pct >= 50) categories.pass++;
      else categories.fail++;
    }
    const total = students.length;
    return {
      excellent: { count: categories.excellent, pct: total > 0 ? (categories.excellent / total) * 100 : 0 },
      good: { count: categories.good, pct: total > 0 ? (categories.good / total) * 100 : 0 },
      satisfactory: { count: categories.satisfactory, pct: total > 0 ? (categories.satisfactory / total) * 100 : 0 },
      pass: { count: categories.pass, pct: total > 0 ? (categories.pass / total) * 100 : 0 },
      fail: { count: categories.fail, pct: total > 0 ? (categories.fail / total) * 100 : 0 },
    };
  }, [students, studentTotals]);

  const passRate = performanceCategories.pass.pct + performanceCategories.satisfactory.pct + performanceCategories.good.pct + performanceCategories.excellent.pct;

  // ==================== CHART DATA ====================
  const gradeDistributionChartData = {
    labels: gradeDistribution.labels,
    datasets: [{ label: 'Number of Students', data: gradeDistribution.counts, backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'], borderWidth: 0, borderRadius: 8 }],
  };

  const questionPerformanceChartData = {
    labels: questionPerformance.labels,
    datasets: [{ label: 'Average Score (%)', data: questionPerformance.averages, backgroundColor: 'rgba(59, 130, 246, 0.7)', borderRadius: 8 }],
  };

  const topicPerformanceChartData = {
    labels: topicPerformance.labels,
    datasets: [{
      label: 'Average Score (%)',
      data: topicPerformance.averages,
      backgroundColor: topicPerformance.averages.map(avg => avg >= 70 ? 'rgba(16, 185, 129, 0.7)' : avg >= 50 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
      borderRadius: 8,
    }],
  };

  const topStudentsChartData = {
    labels: topStudents.map(s => s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name),
    datasets: [{ label: 'Score (%)', data: topStudents.map(s => s.pct), backgroundColor: 'rgba(139, 92, 246, 0.7)', borderRadius: 8 }],
  };

  const performanceDistributionData = {
    labels: ['Excellent (80-100%)', 'Good (70-79%)', 'Satisfactory (60-69%)', 'Pass (50-59%)', 'Fail (0-49%)'],
    datasets: [{
      label: 'Student Distribution',
      data: [performanceCategories.excellent.count, performanceCategories.good.count, performanceCategories.satisfactory.count, performanceCategories.pass.count, performanceCategories.fail.count],
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'],
      borderWidth: 0,
      borderRadius: 8,
    }],
  };

  const passFailChartData = {
    labels: ['Passed (≥50%)', 'Failed (<50%)'],
    datasets: [{
      data: [passRate, 100 - passRate],
      backgroundColor: ['#10b981', '#ef4444'],
      borderWidth: 0,
    }],
  };

  const radarChartData = {
    labels: topicPerformance.labels.slice(0, 8),
    datasets: [{ label: 'Topic Performance', data: topicPerformance.averages.slice(0, 8), backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgb(59, 130, 246)', borderWidth: 2, pointBackgroundColor: 'rgb(59, 130, 246)' }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { font: { size: 11 }, usePointStyle: true, boxWidth: 8 } },
      tooltip: { backgroundColor: 'white', titleColor: '#1f2937', bodyColor: '#6b7280', borderColor: '#e5e7eb', borderWidth: 1, padding: 8, callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%` } }
    },
  };

  const barChartOptions = {
    ...chartOptions,
    scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f3f4f6' }, title: { display: true, text: 'Percentage (%)', font: { size: 11 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } },
  };

  const lineChartOptions = {
    ...barChartOptions,
    elements: { line: { tension: 0.4, borderWidth: 2 }, point: { radius: 3, hoverRadius: 5 } },
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { font: { size: 11 } } } },
    scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20, backdropColor: 'transparent' }, grid: { color: '#e5e7eb' } } },
  };

  // ==================== HANDLERS ====================
  const handlePrintMatrix = () => {
    if (!printRef.current) return;
    const html = `
      <html>
        <head>
          <title>Assessment Results Matrix</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; background: white; }
            h2 { color: #1f2937; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 12px; font-size: 12px; }
            th { background: #f9fafb; font-weight: 600; color: #374151; }
            .fail { background: #fef2f2; color: #dc2626; font-weight: 600; }
            .student-name { font-weight: 500; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          <h2>Assessment Results - ${school?.school_name || 'School'}</h2>
          <p>Grade: ${grades.find(g => g.id === Number(selectedGradeId))?.grade_name || '-'} | Subject: ${subjects.find(s => s.id === Number(selectedSubjectId))?.name || '-'}</p>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `;
    const w = window.open('', '_blank', 'width=1200,height=800');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
    w.close();
  };

  const resetFilters = () => {
    setSelectedGradeId('');
    setSelectedSubjectId('');
    setSelectedTermId('');
    setSelectedExamSessionId('');
    setStudentSearch('');
    setTopicSearch('');
  };

  // ==================== RENDER FUNCTIONS ====================
  const renderResultsMatrix = () => {
    if (!canLoadMatrix) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Filters to View Matrix</h3>
          <p className="text-sm text-gray-500">Choose Grade, Subject, Term, and Exam Session to load the results matrix.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-3 bg-gradient-to-r from-gray-50/50 to-transparent">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ListChecks size={20} className="text-blue-500" />
              Results Matrix
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Red cells indicate scores below 50% (Needs Improvement)</p>
          </div>
          <button onClick={handlePrintMatrix} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
            <Printer size={16} /> Print Matrix
          </button>
        </div>
        <div ref={printRef} className="p-5 overflow-x-auto">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No students found matching your search</p>
            </div>
          ) : (
            <table className="min-w-[800px] w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50">Student</th>
                  {questions.map(q => (
                    <th key={q.id} className="text-center py-3 px-2 text-xs font-semibold text-gray-600">
                      {q.question_number}
                      <div className="text-[10px] text-gray-400 font-normal">/{q.max_score}</div>
                    </th>
                  ))}
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600">Total</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600">%</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600">Grade</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map(s => {
                  const sq = studentQuestionScore.get(s.registration_id);
                  const t = studentTotals.get(s.registration_id) || { total: 0, pct: 0, grade: 'F', gradeInfo: getGradeInfo(0) };
                  const pos = positions.get(s.registration_id) || 0;
                  const isFail = t.pct < 50;
                  return (
                    <tr key={s.registration_id} className={`${isFail ? 'bg-red-50/40' : 'hover:bg-gray-50'} transition-colors`}>
                      <td className="py-3 px-4 sticky left-0 bg-white border-r border-gray-100">
                        <div className="font-medium text-gray-800">{fullName(s)}</div>
                        <div className="text-xs text-gray-400">{s.registration_id}</div>
                      </td>
                      {questions.map(q => {
                        const score = sq?.get(q.id) || 0;
                        const percentage = q.max_score > 0 ? (score / q.max_score) * 100 : 0;
                        const isFailQuestion = percentage < 50 && score > 0;
                        return (
                          <td key={q.id} className={`text-center py-2 px-2 text-sm ${isFailQuestion ? 'bg-red-100 text-red-700 font-semibold' : 'text-gray-700'}`}>
                            {score}
                          </td>
                        );
                      })}
                      <td className="text-center py-3 px-3 font-semibold text-gray-800">{t.total}</td>
                      <td className={`text-center py-3 px-3 font-semibold ${isFail ? 'text-red-600' : 'text-blue-600'}`}>
                        {formatPercentage(t.pct)}%
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${t.gradeInfo.bg} ${t.gradeInfo.color}`}>
                          {t.grade}
                          {isFail && <AlertTriangle size={10} />}
                        </span>
                      </td>
                      <td className="text-center py-3 px-3 font-semibold text-gray-700">{pos}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderTopicInsights = () => {
    if (!canLoadMatrix) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Load Results First</h3>
          <p className="text-sm text-gray-500">Select Grade, Subject, Term, and Exam Session to calculate topic insights.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Search and Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Brain size={20} className="text-purple-500" />
                Topic-wise Performance Analysis
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">Detailed pass/fail analysis for each topic</p>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                value={topicSearch} 
                onChange={e => setTopicSearch(e.target.value)} 
                placeholder="Search topics..." 
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-64 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" 
              />
            </div>
          </div>
          
          {/* Overall Topic Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Topics</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">{topicPerformanceDetails.length}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4">
              <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Avg Pass Rate</div>
              <div className="text-2xl font-bold text-emerald-900 mt-1">
                {formatPercentage(topicPerformanceDetails.reduce((sum, t) => sum + t.passRate, 0) / (topicPerformanceDetails.length || 1))}%
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4">
              <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Easy Topics</div>
              <div className="text-2xl font-bold text-amber-900 mt-1">{topicPerformanceDetails.filter(t => t.difficulty === 'easy').length}</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-4">
              <div className="text-xs font-semibold text-red-600 uppercase tracking-wider">Hard Topics</div>
              <div className="text-2xl font-bold text-red-900 mt-1">{topicPerformanceDetails.filter(t => t.difficulty === 'hard').length}</div>
            </div>
          </div>
        </div>

        {/* Topic Cards */}
        <div className="space-y-4">
          {topicPerformanceDetails.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
              <BookOpen size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No topics found for this assessment.</p>
            </div>
          ) : (
            topicPerformanceDetails.map(topic => {
              const isExpanded = expandedTopic === topic.topicId;
              const difficultyColor = topic.difficulty === 'easy' ? 'text-emerald-700 bg-emerald-100' : topic.difficulty === 'hard' ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100';
              const difficultyIcon = topic.difficulty === 'easy' ? <ThumbsUp size={14} /> : topic.difficulty === 'hard' ? <ThumbsDown size={14} /> : <HelpCircle size={14} />;
              
              return (
                <div key={topic.topicId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  {/* Topic Header */}
                  <div 
                    className="px-6 py-4 cursor-pointer hover:bg-gray-50/80 transition-colors"
                    onClick={() => setExpandedTopic(isExpanded ? null : topic.topicId)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${difficultyColor}`}>
                            {difficultyIcon}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-lg">{topic.topicName}</h4>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                              <span className="flex items-center gap-1"><Users size={12} /> {topic.totalStudents} students</span>
                              <span className="flex items-center gap-1 text-emerald-600"><ThumbsUp size={12} /> {topic.passed} passed</span>
                              <span className="flex items-center gap-1 text-red-600"><ThumbsDown size={12} /> {topic.failed} failed</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${topic.avgScore >= 70 ? 'text-emerald-600' : topic.avgScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {formatPercentage(topic.avgScore)}%
                          </div>
                          <div className="text-xs text-gray-500">Average Score</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${topic.passRate >= 70 ? 'text-emerald-600' : topic.passRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {formatPercentage(topic.passRate)}%
                          </div>
                          <div className="text-xs text-gray-500">Pass Rate</div>
                        </div>
                        <ChevronRight size={20} className={`transform transition-transform duration-300 text-gray-400 ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Fail Rate: {formatPercentage(topic.failRate)}%</span>
                        <span>Pass Rate: {formatPercentage(topic.passRate)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${topic.passRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-6 bg-gradient-to-b from-gray-50/50 to-white">
                      {/* Score Distribution Chart */}
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <PieChart size={14} className="text-gray-400" />
                          Score Distribution
                        </h5>
                        <div className="grid grid-cols-5 gap-3">
                          {topic.scoreDistribution.map((dist, idx) => {
                            const colors = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#10b981'];
                            return (
                              <div key={idx} className="text-center">
                                <div className="text-xs text-gray-500 mb-2 font-medium">{dist.range}</div>
                                <div className="relative h-24 bg-gray-100 rounded-lg overflow-hidden">
                                  <div 
                                    className="absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-t-lg"
                                    style={{ 
                                      height: `${Math.max(4, dist.percentage)}%`, 
                                      backgroundColor: colors[idx],
                                      minHeight: dist.count > 0 ? '4px' : '0'
                                    }}
                                  />
                                </div>
                                <div className="text-sm font-semibold mt-2">{dist.count}</div>
                                <div className="text-[10px] text-gray-400">{formatPercentage(dist.percentage)}%</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Top Performers */}
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                            <Trophy size={16} className="text-emerald-600" />
                            <h5 className="text-sm font-semibold text-emerald-700">Top Performers</h5>
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {topic.topPerformers.map((student, idx) => (
                              <div key={idx} className="flex justify-between items-center py-2 px-2 hover:bg-gray-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-gray-400 w-6">#{idx + 1}</span>
                                  <span className="text-sm text-gray-700 truncate max-w-[180px]">{student.name}</span>
                                </div>
                                <span className="text-sm font-semibold text-emerald-600">{formatPercentage(student.pct)}%</span>
                              </div>
                            ))}
                            {topic.topPerformers.length === 0 && <div className="text-sm text-gray-400 text-center py-4">No data available</div>}
                          </div>
                        </div>
                        
                        {/* Bottom Performers */}
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                            <AlertTriangle size={16} className="text-red-600" />
                            <h5 className="text-sm font-semibold text-red-700">Needs Improvement</h5>
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {topic.bottomPerformers.map((student, idx) => (
                              <div key={idx} className={`flex justify-between items-center py-2 px-2 rounded-lg transition-colors ${student.pct < 50 ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-gray-400 w-6">#{idx + 1}</span>
                                  <span className="text-sm text-gray-700 truncate max-w-[180px]">{student.name}</span>
                                  {student.pct < 50 && <AlertTriangle size={12} className="text-red-500" />}
                                </div>
                                <span className={`text-sm font-semibold ${student.pct < 50 ? 'text-red-600' : 'text-orange-600'}`}>
                                  {formatPercentage(student.pct)}%
                                </span>
                              </div>
                            ))}
                            {topic.bottomPerformers.length === 0 && <div className="text-sm text-gray-400 text-center py-4">All students performed well!</div>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Actionable Insights */}
                      {topic.failRate > 30 && (
                        <div className="mt-5 p-4 bg-red-50 rounded-xl border border-red-200">
                          <div className="flex items-start gap-3">
                            <div className="p-1 bg-red-100 rounded-lg">
                              <AlertTriangle size={18} className="text-red-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-red-800">Action Required</div>
                              <div className="text-sm text-red-700 mt-1">
                                {topic.failed} student(s) ({formatPercentage(topic.failRate)}%) scored below 50% in "{topic.topicName}". 
                                Consider remedial sessions, additional practice materials, or revisiting this topic in class.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {topic.difficulty === 'hard' && topic.failRate > 50 && (
                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                          <div className="flex items-start gap-3">
                            <div className="p-1 bg-amber-100 rounded-lg">
                              <Flame size={18} className="text-amber-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-amber-800">Challenge Topic</div>
                              <div className="text-sm text-amber-700 mt-1">
                                This topic appears particularly challenging. Consider breaking down concepts, providing more examples, 
                                or extending teaching time for this topic.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderCharts = () => {
    if (!canLoadMatrix) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <PieChart className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Filters to View Charts</h3>
          <p className="text-sm text-gray-500">Choose Grade, Subject, Term, and Exam Session to visualize assessment data.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Controls */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-gray-400" />
            <span className="font-medium text-gray-700">Visualization Type:</span>
          </div>
          <div className="flex gap-2">
            {(['bar', 'line', 'radar'] as const).map(type => (
              <button 
                key={type} 
                onClick={() => setChartType(type)} 
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  chartType === type 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === 'bar' && <BarChart size={14} />}
                {type === 'line' && <ChartLine size={14} />}
                {type === 'radar' && <Radar size={14} />}
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
            <button 
              onClick={() => setShowDetailedStats(!showDetailedStats)} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                showDetailedStats 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Sparkles size={14} />
              {showDetailedStats ? 'Hide Stats' : 'Show Stats'}
            </button>
          </div>
        </div>

        {/* Statistics Panel */}
        {showDetailedStats && statistics && (
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Brain size={20} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">Comprehensive Statistical Analysis</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-blue-600 mb-3 uppercase tracking-wider">Central Tendency</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Mean</span><span className="font-bold text-blue-700">{formatPercentage(statistics.mean)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Median</span><span className="font-bold text-blue-700">{formatPercentage(statistics.median)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Mode</span><span className="font-bold text-blue-700 truncate max-w-[100px]">{statistics.mode.map(m => formatPercentage(m)).join(', ')}%</span></div>
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-emerald-600 mb-3 uppercase tracking-wider">Dispersion</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Std Dev</span><span className="font-bold text-emerald-700">±{formatPercentage(statistics.stdDev)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Range</span><span className="font-bold text-emerald-700">{formatPercentage(statistics.range)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Variance</span><span className="font-bold text-emerald-700">{statistics.variance.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-purple-600 mb-3 uppercase tracking-wider">Quartiles</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Q1 (25th)</span><span className="font-bold text-purple-700">{formatPercentage(statistics.q1)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Q3 (75th)</span><span className="font-bold text-purple-700">{formatPercentage(statistics.q3)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">IQR</span><span className="font-bold text-purple-700">{formatPercentage(statistics.iqr)}%</span></div>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-amber-600 mb-3 uppercase tracking-wider">Distribution</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Skewness</span><span className="font-bold text-amber-700">{statistics.skewness.toFixed(3)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">CV%</span><span className="font-bold text-amber-700">{formatPercentage(statistics.coefficientOfVariation)}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Students</span><span className="font-bold text-amber-700">{statistics.count}</span></div>
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><Medal size={16} className="text-gray-500" /><span className="text-xs font-semibold text-gray-600">Extremes</span></div>
                  <div className="flex justify-between text-sm"><span>Highest</span><span className="font-bold text-emerald-600">{formatPercentage(statistics.max)}%</span></div>
                  <div className="flex justify-between text-sm"><span>Lowest</span><span className="font-bold text-red-600">{formatPercentage(statistics.min)}%</span></div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><Zap size={16} className="text-gray-500" /><span className="text-xs font-semibold text-gray-600">Performance Gap</span></div>
                  <div className="flex justify-between text-sm"><span>Range</span><span className="font-bold">{formatPercentage(statistics.range)}%</span></div>
                  <div className="flex justify-between text-sm"><span>Spread</span><span className="font-bold">±{formatPercentage(statistics.stdDev)}%</span></div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><Clock size={16} className="text-gray-500" /><span className="text-xs font-semibold text-gray-600">Central Values</span></div>
                  <div className="flex justify-between text-sm"><span>Mean vs Median</span><span className="font-bold">{(statistics.mean - statistics.median).toFixed(2)}% diff</span></div>
                  <div className="flex justify-between text-sm"><span>Typical Range</span><span className="font-bold text-xs">{formatPercentage(statistics.mean - statistics.stdDev)} - {formatPercentage(statistics.mean + statistics.stdDev)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-blue-700 font-medium">Class Average</div>
                <div className="text-3xl font-bold text-blue-900 mt-1">{statistics ? formatPercentage(statistics.mean) : '0.00'}%</div>
              </div>
              <BarChart3 size={28} className="text-blue-600 opacity-60" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-emerald-700 font-medium">Pass Rate</div>
                <div className="text-3xl font-bold text-emerald-900 mt-1">{formatPercentage(passRate)}%</div>
              </div>
              <CheckCircle size={28} className="text-emerald-600 opacity-60" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-purple-700 font-medium">Highest Score</div>
                <div className="text-3xl font-bold text-purple-900 mt-1">{statistics ? formatPercentage(statistics.max) : '0.00'}%</div>
              </div>
              <Trophy size={28} className="text-purple-600 opacity-60" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-orange-700 font-medium">Fail Rate</div>
                <div className="text-3xl font-bold text-orange-900 mt-1">{formatPercentage(performanceCategories.fail.pct)}%</div>
              </div>
              <AlertTriangle size={28} className="text-orange-600 opacity-60" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-indigo-700 font-medium">Total Students</div>
                <div className="text-3xl font-bold text-indigo-900 mt-1">{students.length}</div>
              </div>
              <Users size={28} className="text-indigo-600 opacity-60" />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pass/Fail Doughnut Chart */}
          <SectionCard title="Overall Pass/Fail Distribution" icon={<PieChart size={18} />}>
            <div className="h-64">
              <Doughnut data={passFailChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </SectionCard>

          {/* Grade Distribution Pie Chart */}
          <SectionCard title="Grade Distribution" icon={<Award size={18} />}>
            <div className="h-64">
              <Pie data={gradeDistributionChartData} options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                  legend: { position: 'bottom' },
                  tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw} students (${((ctx.raw / gradeDistribution.total) * 100).toFixed(1)}%)` } }
                } 
              }} />
            </div>
          </SectionCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Question Performance Chart */}
          <SectionCard title="Question Performance Analysis" icon={<BarChart3 size={18} />}>
            <div className="h-80">
              {chartType === 'bar' && <Bar data={questionPerformanceChartData} options={barChartOptions} />}
              {chartType === 'line' && <Line data={questionPerformanceChartData} options={lineChartOptions} />}
              {chartType === 'radar' && <RadarChart data={radarChartData} options={radarOptions} />}
            </div>
          </SectionCard>

          {/* Topic Performance Chart */}
          <SectionCard title="Topic Performance Analysis" icon={<Target size={18} />}>
            <div className="h-80">
              <Bar data={topicPerformanceChartData} options={barChartOptions} />
            </div>
          </SectionCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Performance Distribution */}
          <SectionCard title="Performance Distribution" icon={<PieChart size={18} />}>
            <div className="h-64">
              <Pie data={performanceDistributionData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </SectionCard>

          {/* Top Students Ranking */}
          <SectionCard title="Top 10 Students" icon={<Trophy size={18} />}>
            <div className="h-80">
              <Bar data={topStudentsChartData} options={{ ...barChartOptions, scales: { ...barChartOptions.scales, x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } } } }} />
            </div>
          </SectionCard>
        </div>

        {/* Topic Performance Table */}
        <SectionCard title="Topic Performance Details" icon={<BookOpen size={18} />}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Topic</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Average</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Passed/Failed</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Pass Rate</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topicPerformance.fullNames.map((name, idx) => {
                  const avg = topicPerformance.averages[idx];
                  const topicDetail = topicPerformanceDetails.find(t => t.topicName === name);
                  const passRate = topicDetail?.passRate || 0;
                  const status = avg >= 70 ? 'Strong' : avg >= 50 ? 'Average' : 'Needs Work';
                  const statusColor = avg >= 70 ? 'text-emerald-700 bg-emerald-100' : avg >= 50 ? 'text-amber-700 bg-amber-100' : 'text-red-700 bg-red-100';
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${avg >= 70 ? 'text-emerald-600' : avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {formatPercentage(avg)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-emerald-600 font-medium">{topicDetail?.passed || 0}</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-red-600 font-medium">{topicDetail?.failed || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${passRate}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{formatPercentage(passRate)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    );
  };

  // ==================== LOADING & ERROR STATES ====================
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-500 font-medium">Loading assessment data...</p>
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
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <School className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">School Configuration Required</h3>
              <p className="text-gray-500 mt-2 text-sm">Your account needs to be linked to a school to view assessment data.</p>
              {errorMsg && (
                <div className="mt-4 p-3 bg-red-50 rounded-xl text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle size={16} /> {errorMsg}
                </div>
              )}
              <button onClick={() => router.push('/settings')} className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all">
                Go to Settings
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/80">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Marks Analysis</h1>
                  </div>
                  <p className="text-gray-500 text-sm">Results matrix, topic insights, and visual analytics for {school.school_name}</p>
                </div>
                <button onClick={() => router.push('/assessments')} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-1">
                  Back to Assessments <ChevronRight size={16} />
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Filter size={16} className="text-gray-500" />
                      Assessment Filters
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Select Grade, Subject, Term, and Exam Session to load data</p>
                  </div>
                  <button onClick={resetFilters} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <RefreshCw size={12} /> Reset All
                  </button>
                </div>
                <div className="grid md:grid-cols-4 gap-3">
                  <FilterSelect
                    value={selectedGradeId}
                    onChange={setSelectedGradeId}
                    options={grades.map(g => ({ value: String(g.id), label: g.grade_name }))}
                    placeholder="Select Grade"
                    icon={<School size={14} />}
                  />
                  <FilterSelect
                    value={selectedSubjectId}
                    onChange={setSelectedSubjectId}
                    options={subjectsForSelectedGrade.map(s => ({ value: String(s.id), label: s.name }))}
                    placeholder={selectedGradeId ? "Select Subject" : "Select grade first"}
                    disabled={!selectedGradeId}
                    icon={<BookOpen size={14} />}
                  />
                  <FilterSelect
                    value={selectedTermId}
                    onChange={setSelectedTermId}
                    options={terms.map(t => ({ value: String(t.id), label: `${t.term_name.replace('_', ' ')} ${t.year}` }))}
                    placeholder={selectedGradeId && selectedSubjectId ? "Select Term" : "Select grade & subject first"}
                    disabled={!selectedGradeId || !selectedSubjectId}
                    icon={<Calendar size={14} />}
                  />
                  <FilterSelect
                    value={selectedExamSessionId}
                    onChange={setSelectedExamSessionId}
                    options={examSessionsForSelectedTerm.map(es => ({ value: String(es.id), label: `${es.exam_type} ${es.term ? `- ${es.term.term_name.replace('_', ' ')} ${es.term.year}` : ''}` }))}
                    placeholder={selectedTermId ? "Select Exam Session" : "Select term first"}
                    disabled={!selectedTermId}
                    icon={<Target size={14} />}
                  />
                </div>
                <div className="mt-4 flex justify-between items-center flex-wrap gap-3 pt-3 border-t border-gray-100">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="Search student by name or ID..."
                      className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      disabled={!canLoadMatrix}
                    />
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <Calendar size={14} className="text-gray-400" />
                    {selectedExamSessionId ? `Session ID: ${selectedExamSessionId}` : 'Select exam session to load data'}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-6 flex gap-1 border-b border-gray-200">
                {(['matrix', 'topics', 'charts'] as TabKey[]).map(k => (
                  <button 
                    key={k} 
                    onClick={() => setActiveTab(k)} 
                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                      activeTab === k 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {k === 'matrix' && <ListChecks size={16} />}
                    {k === 'topics' && <Brain size={16} />}
                    {k === 'charts' && <ChartNoAxesColumn size={16} />}
                    {k === 'matrix' ? 'Results Matrix' : k === 'topics' ? 'Topic Insights' : 'Visual Analytics'}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-700">
                <AlertTriangle size={18} />
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="ml-auto">
                  <XCircle size={16} />
                </button>
              </div>
            )}
            
            {activeTab === 'matrix' && renderResultsMatrix()}
            {activeTab === 'topics' && renderTopicInsights()}
            {activeTab === 'charts' && renderCharts()}
          </div>
        </main>
      </div>
    </div>
  );
}
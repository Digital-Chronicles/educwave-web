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
import { Bar, Pie, Line, Radar } from 'react-chartjs-2';

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
type TabKey = 'matrix' | 'topics' | 'charts';
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

// ==================== UTILITY FUNCTIONS ====================
const fullName = (s: StudentRow): string => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim();

const getGradeInfo = (percentage: number): GradeInfo => {
  if (percentage >= 80) return { grade: 'A', color: 'text-green-700', bg: 'bg-green-50', label: 'Excellent', range: '80-100%' };
  if (percentage >= 70) return { grade: 'B', color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Good', range: '70-79%' };
  if (percentage >= 60) return { grade: 'C', color: 'text-yellow-700', bg: 'bg-yellow-50', label: 'Satisfactory', range: '60-69%' };
  if (percentage >= 50) return { grade: 'D', color: 'text-orange-700', bg: 'bg-orange-50', label: 'Pass', range: '50-59%' };
  return { grade: 'F', color: 'text-red-700', bg: 'bg-red-100', label: 'Fail', range: '0-49%' };
};

const formatPercentage = (value: number, decimals: number = 2): string => {
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

// ==================== CHART COMPONENTS ====================
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const, labels: { font: { size: 12 } } },
    tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}%` } },
  },
  scales: {
    y: { beginAtZero: true, max: 100, title: { display: true, text: 'Percentage (%)', font: { size: 12 } } },
    x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } },
  },
};

const lineOptions = {
  ...chartOptions,
  elements: { line: { tension: 0.4 } },
};

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' as const }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.raw.toFixed(2)}%` } } },
  scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } } },
};

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

  // ==================== TOPIC STUDENT INSIGHTS ====================
  const topicStudentInsights = useMemo(() => {
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
    const out = Array.from(map.entries()).map(([topicId, tmap]) => {
      const rows = Array.from(tmap.entries()).map(([student_id, v]) => {
        const pct = v.m > 0 ? (v.s / v.m) * 100 : 0;
        return { student_id, total: v.s, max: v.m, pct };
      });
      rows.sort((a, b) => b.pct - a.pct);
      const avgPct = rows.length > 0 ? rows.reduce((a, r) => a + r.pct, 0) / rows.length : 0;
      const failCount = rows.filter(r => r.pct < 50).length;
      return {
        topicId,
        topicName: topicNameById.get(topicId) ?? `Topic #${topicId}`,
        top: rows.slice(0, 3),
        bottom: rows.slice(-3).reverse(),
        avgPct,
        failCount,
      };
    });
    const q = topicSearch.trim().toLowerCase();
    const filtered = q ? out.filter(x => x.topicName.toLowerCase().includes(q)) : out;
    filtered.sort((a, b) => b.avgPct - a.avgPct);
    return filtered;
  }, [students, questions, studentQuestionScore, topicNameById, topicSearch]);

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
    datasets: [{ label: 'Number of Students', data: gradeDistribution.counts, backgroundColor: ['#10b981', '#34d399', '#f59e0b', '#f97316', '#ef4444'], borderWidth: 1 }],
  };

  const questionPerformanceChartData = {
    labels: questionPerformance.labels,
    datasets: [{ label: 'Average Score (%)', data: questionPerformance.averages, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderColor: 'rgb(59, 130, 246)', borderWidth: 1 }],
  };

  const topicPerformanceChartData = {
    labels: topicPerformance.labels,
    datasets: [{
      label: 'Average Score (%)',
      data: topicPerformance.averages,
      backgroundColor: topicPerformance.averages.map(avg => avg >= 70 ? 'rgba(34, 197, 94, 0.8)' : avg >= 50 ? 'rgba(234, 179, 8, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
      borderWidth: 1,
    }],
  };

  const topStudentsChartData = {
    labels: topStudents.map(s => s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name),
    datasets: [{ label: 'Score (%)', data: topStudents.map(s => s.pct), backgroundColor: 'rgba(139, 92, 246, 0.8)', borderColor: 'rgb(139, 92, 246)', borderWidth: 1 }],
  };

  const performanceDistributionData = {
    labels: ['Excellent (80-100%)', 'Good (70-79%)', 'Satisfactory (60-69%)', 'Pass (50-59%)', 'Fail (0-49%)'],
    datasets: [{
      label: 'Student Distribution',
      data: [performanceCategories.excellent.count, performanceCategories.good.count, performanceCategories.satisfactory.count, performanceCategories.pass.count, performanceCategories.fail.count],
      backgroundColor: ['#10b981', '#34d399', '#f59e0b', '#f97316', '#ef4444'],
      borderWidth: 1,
    }],
  };

  const radarChartData = {
    labels: topicPerformance.labels.slice(0, 8),
    datasets: [{ label: 'Topic Performance', data: topicPerformance.averages.slice(0, 8), backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgb(59, 130, 246)', borderWidth: 2 }],
  };

  // ==================== HANDLERS ====================
  const handlePrintMatrix = () => {
    if (!printRef.current) return;
    const html = `
      <html>
        <head>
          <title>Assessment Results Matrix</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px; font-size: 12px; }
            th { background: #f3f4f6; }
            .fail { background: #ffebee; color: #c62828; font-weight: 700; }
          </style>
        </head>
        <body>${printRef.current.innerHTML}</body>
      </html>
    `;
    const w = window.open('', '_blank', 'width=1100,height=800');
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
  };

  // ==================== RENDER FUNCTIONS ====================
  const renderResultsMatrix = () => {
    if (!canLoadMatrix) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <BarChart3 className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Filters to View Matrix</h3>
          <p className="text-sm text-gray-500">Choose Grade, Subject, Term, and Exam Session to load the results matrix.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Results Matrix</h3>
            <p className="text-sm text-gray-500">Red cells indicate scores below 50% (Fail)</p>
          </div>
          <button onClick={handlePrintMatrix} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            <Printer size={16} /> Print Matrix
          </button>
        </div>
        <div ref={printRef} className="p-4 overflow-x-auto">
          <table className="min-w-[800px] w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-700">Student</th>
                {questions.map(q => <th key={q.id} className="text-center py-3 px-2 text-xs font-semibold text-gray-700">{q.question_number}<div className="text-[10px] text-gray-400">/{q.max_score}</div></th>)}
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700">Total</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700">%</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700">Grade</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700">Pos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map(s => {
                const sq = studentQuestionScore.get(s.registration_id);
                const t = studentTotals.get(s.registration_id) || { total: 0, pct: 0, grade: 'F', gradeInfo: getGradeInfo(0) };
                const pos = positions.get(s.registration_id) || 0;
                const isFail = t.pct < 50;
                return (
                  <tr key={s.registration_id} className={isFail ? 'bg-red-50/30' : ''}>
                    <td className="py-3 px-3"><div className="font-medium">{fullName(s)}</div><div className="text-xs text-gray-500">{s.registration_id}</div></td>
                    {questions.map(q => {
                      const score = sq?.get(q.id) || 0;
                      const percentage = q.max_score > 0 ? (score / q.max_score) * 100 : 0;
                      const isFailQuestion = percentage < 50 && score > 0;
                      return <td key={q.id} className={`text-center py-2 px-2 text-sm ${isFailQuestion ? 'bg-red-100 text-red-700 font-bold' : ''}`}>{score}</td>;
                    })}
                    <td className="text-center py-3 px-3 font-semibold">{t.total}</td>
                    <td className={`text-center py-3 px-3 font-semibold ${isFail ? 'text-red-700' : 'text-blue-700'}`}>{formatPercentage(t.pct)}%</td>
                    <td className="text-center py-3 px-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.gradeInfo.bg} ${t.gradeInfo.color}`}>{t.grade}{isFail && <AlertTriangle size={12} className="inline ml-1" />}</span></td>
                    <td className="text-center py-3 px-3 font-semibold">{pos || '—'}</td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && <tr><td colSpan={questions.length + 5} className="py-10 text-center text-gray-500">No students found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTopicInsights = () => {
    if (!canLoadMatrix) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Target className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Load Results First</h3>
          <p className="text-sm text-gray-500">Select Grade, Subject, Term, and Exam Session to calculate topic insights.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center flex-wrap gap-3">
          <div><h3 className="text-lg font-semibold text-gray-900">Topic Student Insights</h3><p className="text-sm text-gray-500">Top and bottom performers per topic</p></div>
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={topicSearch} onChange={e => setTopicSearch(e.target.value)} placeholder="Search topics..." className="pl-10 pr-4 py-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500" /></div>
        </div>
        <div className="p-5 space-y-4">
          {topicStudentInsights.length === 0 ? <div className="text-center py-10 text-gray-500">No topic performance yet.</div> : topicStudentInsights.slice(0, 12).map(topic => {
            const isExpanded = expandedTopic === topic.topicId;
            return (
              <div key={topic.topicId} className="border rounded-lg overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setExpandedTopic(isExpanded ? null : topic.topicId)}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${topic.avgPct >= 70 ? 'bg-green-100 text-green-700' : topic.avgPct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        <BookOpen size={20} />
                      </div>
                      <div><h4 className="font-semibold">{topic.topicName}</h4><div className="flex gap-3 text-xs text-gray-500"><span>{topic.top.length} top performers</span><span>{topic.failCount} need improvement</span></div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><div className={`text-2xl font-bold ${topic.avgPct >= 70 ? 'text-green-600' : topic.avgPct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{formatPercentage(topic.avgPct)}%</div><div className="text-xs text-gray-500">Average Score</div></div>
                      <ChevronRight size={20} className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-5">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div><div className="flex items-center gap-2 mb-3"><TrendingUp size={16} className="text-green-600" /><span className="text-sm font-semibold text-green-700">Top Performers</span></div>
                        {topic.top.map((x, i) => <div key={i} className="flex justify-between py-2 border-b"><span>{studentById.get(x.student_id) ? fullName(studentById.get(x.student_id)!) : x.student_id}</span><span className="font-semibold text-green-700">{formatPercentage(x.pct)}%</span></div>)}</div>
                      <div><div className="flex items-center gap-2 mb-3"><TrendingDown size={16} className="text-red-600" /><span className="text-sm font-semibold text-red-700">Needs Improvement</span></div>
                        {topic.bottom.map((x, i) => <div key={i} className={`flex justify-between py-2 border-b ${x.pct < 50 ? 'bg-red-50 -mx-2 px-2 rounded' : ''}`}><span>{studentById.get(x.student_id) ? fullName(studentById.get(x.student_id)!) : x.student_id}{x.pct < 50 && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}</span><span className={`font-semibold ${x.pct < 50 ? 'text-red-700' : 'text-orange-700'}`}>{formatPercentage(x.pct)}%</span></div>)}</div>
                    </div>
                    {topic.failCount > 0 && <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertTriangle size={16} />{topic.failCount} student(s) scored below 50% in this topic</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCharts = () => {
    if (!canLoadMatrix) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <PieChart className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Filters to View Charts</h3>
          <p className="text-sm text-gray-500">Choose Grade, Subject, Term, and Exam Session to visualize assessment data.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2"><Eye size={18} /><span className="font-medium">Visualization Type:</span></div>
          <div className="flex gap-2">
            {(['bar', 'line', 'radar'] as const).map(type => (
              <button key={type} onClick={() => setChartType(type)} className={`px-4 py-2 rounded-lg text-sm font-medium ${chartType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                {type === 'bar' && <BarChart3 size={16} className="inline mr-1" />}{type === 'line' && <LineChart size={16} className="inline mr-1" />}{type === 'radar' && <Activity size={16} className="inline mr-1" />}{type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
            <button onClick={() => setShowDetailedStats(!showDetailedStats)} className={`px-4 py-2 rounded-lg text-sm font-medium ${showDetailedStats ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
              <Sparkles size={16} className="inline mr-1" />{showDetailedStats ? 'Hide Stats' : 'Show Stats'}
            </button>
          </div>
        </div>

        {/* Statistics Panel */}
        {showDetailedStats && statistics && (
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border shadow-sm">
            <div className="p-5 border-b bg-gradient-to-r from-blue-50 to-indigo-50"><div className="flex items-center gap-2"><Brain size={20} className="text-blue-600" /><h3 className="text-lg font-semibold">Comprehensive Statistical Analysis</h3></div></div>
            <div className="p-6">
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4"><div className="text-xs font-semibold text-blue-600 mb-2">Central Tendency</div><div className="space-y-2"><div className="flex justify-between"><span>Mean</span><span className="font-bold">{formatPercentage(statistics.mean)}%</span></div><div className="flex justify-between"><span>Median</span><span className="font-bold">{formatPercentage(statistics.median)}%</span></div><div className="flex justify-between"><span>Mode</span><span className="font-bold">{statistics.mode.map(m => formatPercentage(m)).join(', ')}%</span></div></div></div>
                <div className="bg-green-50 rounded-xl p-4"><div className="text-xs font-semibold text-green-600 mb-2">Dispersion</div><div className="space-y-2"><div className="flex justify-between"><span>Std Dev</span><span className="font-bold">±{formatPercentage(statistics.stdDev)}%</span></div><div className="flex justify-between"><span>Range</span><span className="font-bold">{formatPercentage(statistics.range)}%</span></div><div className="flex justify-between"><span>Variance</span><span className="font-bold">{statistics.variance.toFixed(2)}</span></div></div></div>
                <div className="bg-purple-50 rounded-xl p-4"><div className="text-xs font-semibold text-purple-600 mb-2">Quartiles</div><div className="space-y-2"><div className="flex justify-between"><span>Q1 (25th)</span><span className="font-bold">{formatPercentage(statistics.q1)}%</span></div><div className="flex justify-between"><span>Q3 (75th)</span><span className="font-bold">{formatPercentage(statistics.q3)}%</span></div><div className="flex justify-between"><span>IQR</span><span className="font-bold">{formatPercentage(statistics.iqr)}%</span></div></div></div>
                <div className="bg-orange-50 rounded-xl p-4"><div className="text-xs font-semibold text-orange-600 mb-2">Distribution</div><div className="space-y-2"><div className="flex justify-between"><span>Skewness</span><span className="font-bold">{statistics.skewness.toFixed(3)}</span></div><div className="flex justify-between"><span>CV%</span><span className="font-bold">{formatPercentage(statistics.coefficientOfVariation)}%</span></div><div className="flex justify-between"><span>Students</span><span className="font-bold">{statistics.count}</span></div></div></div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><Medal size={16} /><span className="text-xs font-semibold">Extremes</span></div><div className="flex justify-between"><span>Highest</span><span className="font-bold text-green-600">{formatPercentage(statistics.max)}%</span></div><div className="flex justify-between"><span>Lowest</span><span className="font-bold text-red-600">{formatPercentage(statistics.min)}%</span></div></div>
                <div className="bg-gray-50 rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><Zap size={16} /><span className="text-xs font-semibold">Performance Gap</span></div><div className="flex justify-between"><span>Range</span><span className="font-bold">{formatPercentage(statistics.range)}%</span></div><div className="flex justify-between"><span>Spread</span><span className="font-bold">±{formatPercentage(statistics.stdDev)}%</span></div></div>
                <div className="bg-gray-50 rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><Clock size={16} /><span className="text-xs font-semibold">Central Values</span></div><div className="flex justify-between"><span>Mean vs Median</span><span className="font-bold">{(statistics.mean - statistics.median).toFixed(2)}% diff</span></div><div className="flex justify-between"><span>Typical Range</span><span className="font-bold">{formatPercentage(statistics.mean - statistics.stdDev)} - {formatPercentage(statistics.mean + statistics.stdDev)}</span></div></div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5"><div className="flex justify-between"><div><div className="text-sm text-blue-700 font-medium">Class Average</div><div className="text-2xl font-bold text-blue-900">{statistics ? formatPercentage(statistics.mean) : '0.00'}%</div></div><BarChart3 size={32} className="text-blue-600 opacity-75" /></div></div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5"><div className="flex justify-between"><div><div className="text-sm text-green-700 font-medium">Pass Rate</div><div className="text-2xl font-bold text-green-900">{formatPercentage(passRate)}%</div></div><CheckCircle size={32} className="text-green-600 opacity-75" /></div></div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5"><div className="flex justify-between"><div><div className="text-sm text-purple-700 font-medium">Highest Score</div><div className="text-2xl font-bold text-purple-900">{statistics ? formatPercentage(statistics.max) : '0.00'}%</div></div><Award size={32} className="text-purple-600 opacity-75" /></div></div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5"><div className="flex justify-between"><div><div className="text-sm text-orange-700 font-medium">Fail Rate</div><div className="text-2xl font-bold text-orange-900">{formatPercentage(performanceCategories.fail.pct)}%</div></div><AlertTriangle size={32} className="text-orange-600 opacity-75" /></div></div>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-xl border shadow-sm"><div className="p-5 border-b"><h3 className="font-semibold">Grade Distribution</h3><p className="text-sm text-gray-500">Student performance by grade category</p></div><div className="p-6 h-80"><Pie data={gradeDistributionChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw} students (${((ctx.raw / gradeDistribution.total) * 100).toFixed(1)}%)` } } } }} /></div></div>
        <div className="bg-white rounded-xl border shadow-sm"><div className="p-5 border-b"><h3 className="font-semibold">Question Performance Analysis</h3><p className="text-sm text-gray-500">Average score percentage per question</p></div><div className="p-6 h-96">{chartType === 'bar' ? <Bar data={questionPerformanceChartData} options={chartOptions} /> : chartType === 'line' ? <Line data={questionPerformanceChartData} options={lineOptions} /> : <Radar data={radarChartData} options={radarOptions} />}</div></div>
        <div className="bg-white rounded-xl border shadow-sm"><div className="p-5 border-b"><h3 className="font-semibold">Topic Performance Analysis</h3><p className="text-sm text-gray-500">Average score percentage per topic with difficulty indicators</p></div><div className="p-6 h-96"><Bar data={topicPerformanceChartData} options={chartOptions} /></div></div>
        <div className="bg-white rounded-xl border shadow-sm"><div className="p-5 border-b"><h3 className="font-semibold">Performance Distribution</h3><p className="text-sm text-gray-500">Student distribution across performance levels</p></div><div className="p-6 h-80"><Pie data={performanceDistributionData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} /></div></div>
        <div className="bg-white rounded-xl border shadow-sm"><div className="p-5 border-b"><h3 className="font-semibold">Top 10 Students</h3><p className="text-sm text-gray-500">Highest performing students in this assessment</p></div><div className="p-6 h-96"><Bar data={topStudentsChartData} options={{ ...chartOptions, scales: { ...chartOptions.scales, x: { ticks: { maxRotation: 45, minRotation: 45 } } } }} /></div></div>

        {/* Topic Performance Table */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-5 border-b"><h3 className="font-semibold">Topic Performance Details</h3><p className="text-sm text-gray-500">Detailed breakdown of topic performance</p></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold">Topic</th><th className="px-4 py-3 text-center text-xs font-semibold">Average</th><th className="px-4 py-3 text-center text-xs font-semibold">Std Dev</th><th className="px-4 py-3 text-center text-xs font-semibold">Min</th><th className="px-4 py-3 text-center text-xs font-semibold">Max</th><th className="px-4 py-3 text-center text-xs font-semibold">Status</th></tr></thead>
              <tbody className="divide-y">
                {topicPerformance.fullNames.map((name, idx) => {
                  const avg = topicPerformance.averages[idx];
                  const status = avg >= 70 ? 'Good' : avg >= 50 ? 'Average' : 'Needs Improvement';
                  const statusColor = avg >= 70 ? 'text-green-700 bg-green-50' : avg >= 50 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50';
                  return <tr key={idx} className="hover:bg-gray-50"><td className="px-4 py-3 text-sm">{name}</td><td className="px-4 py-3 text-center"><span className={`font-semibold ${avg >= 70 ? 'text-green-600' : avg >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{formatPercentage(avg)}%</span></td><td className="px-4 py-3 text-center text-sm">±{formatPercentage(topicPerformance.stdDevs[idx])}%</td><td className="px-4 py-3 text-center text-sm">{formatPercentage(topicPerformance.mins[idx])}%</td><td className="px-4 py-3 text-center text-sm">{formatPercentage(topicPerformance.maxs[idx])}%</td><td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}>{status}</span></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==================== LOADING & ERROR STATES ====================
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" /><p className="mt-4 text-gray-500">Loading...</p></div>
      </div>
    );
  }

  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar /><div className="flex"><AppShell /><main className="flex-1 p-6"><div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-8 text-center"><FileText className="w-12 h-12 text-blue-400 mx-auto mb-4" /><h3 className="text-lg font-semibold">School Configuration Required</h3><p className="text-gray-600 mt-2">Your account needs to be linked to a school.</p>{errorMsg && <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-600">{errorMsg}</div>}<button onClick={() => router.push('/settings')} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Settings</button></div></main></div></div>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <div><h1 className="text-2xl font-bold text-gray-900">Marks Analysis</h1><p className="text-gray-600">Results matrix, topic insights, and visual analytics for {school.school_name}</p></div>
                <button onClick={() => router.push('/assessments')} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Back to Assessments <ChevronRight size={16} className="inline" /></button>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex justify-between mb-4"><div><h3 className="font-semibold">Filters</h3><p className="text-xs text-gray-500">Choose Grade, Subject, Term and Exam Session.</p></div><div className="flex gap-2 text-xs text-gray-500"><Filter size={14} /> Data loads when all filters selected</div></div>
                <div className="grid md:grid-cols-4 gap-3">
                  <select value={selectedGradeId} onChange={e => { setSelectedGradeId(e.target.value); setSelectedSubjectId(''); setSelectedTermId(''); setSelectedExamSessionId(''); }} className="p-2 border rounded-lg text-sm"><option value="">Select Grade</option>{grades.map(g => <option key={g.id} value={g.id}>{g.grade_name}</option>)}</select>
                  <select value={selectedSubjectId} onChange={e => { setSelectedSubjectId(e.target.value); setSelectedTermId(''); setSelectedExamSessionId(''); }} className="p-2 border rounded-lg text-sm" disabled={!selectedGradeId}><option value="">{selectedGradeId ? 'Select Subject' : 'Select grade first'}</option>{subjectsForSelectedGrade.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                  <select value={selectedTermId} onChange={e => { setSelectedTermId(e.target.value); setSelectedExamSessionId(''); }} className="p-2 border rounded-lg text-sm" disabled={!selectedGradeId || !selectedSubjectId}><option value="">{selectedGradeId && selectedSubjectId ? 'Select Term' : 'Select grade & subject first'}</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name.replace('_', ' ')} {t.year}</option>)}</select>
                  <select value={selectedExamSessionId} onChange={e => setSelectedExamSessionId(e.target.value)} className="p-2 border rounded-lg text-sm" disabled={!selectedTermId}><option value="">{selectedTermId ? 'Select Exam Session' : 'Select term first'}</option>{examSessionsForSelectedTerm.map(es => <option key={es.id} value={es.id}>{es.exam_type} {es.term ? `- ${es.term.term_name.replace('_', ' ')} ${es.term.year}` : ''}</option>)}</select>
                </div>
                <div className="mt-4 flex justify-between items-center flex-wrap gap-3">
                  <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search student..." className="pl-10 pr-4 py-2 border rounded-lg text-sm w-80" disabled={!canLoadMatrix} /></div>
                  <div className="flex gap-3 text-xs text-gray-500"><Calendar size={14} />{selectedExamSessionId ? `Session: ${selectedExamSessionId}` : 'Select exam session'}</div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-6 flex gap-1 border-b">
                {(['matrix', 'topics', 'charts'] as TabKey[]).map(k => <button key={k} onClick={() => setActiveTab(k)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>{k === 'matrix' ? 'Results Matrix' : k === 'topics' ? 'Topic Insights' : 'Visual Analytics'}</button>)}
              </div>
            </div>

            {errorMsg && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{errorMsg}</div>}
            {activeTab === 'matrix' && renderResultsMatrix()}
            {activeTab === 'topics' && renderTopicInsights()}
            {activeTab === 'charts' && renderCharts()}
          </div>
        </main>
      </div>
    </div>
  );
}
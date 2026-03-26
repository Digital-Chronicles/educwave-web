// app/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  BookOpen,
  Calendar,
  TrendingUp,
  TrendingDown,
  Award,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Eye,
  Download,
  RefreshCw,
  School,
  GraduationCap,
  Target,
  PieChart,
  LineChart,
  Activity,
  Brain,
  Medal,
  Flame,
  User,
  FileText,
  Clock,
  BarChart3,
  BookMarked,
  UsersRound,
  Trophy,
  Sparkles,
  ArrowUpRight,
  Info,
  DollarSign,
  CreditCard,
  Receipt,
  Briefcase,
  CalendarDays,
  ClipboardList,
  CheckSquare,
  XCircle,
  Timer,
  Layers,
  Zap,
  Star,
  ThumbsUp,
  ThumbsDown,
  LayoutDashboard,
  NotebookPen,
  ChartNoAxesColumn,
} from 'lucide-react';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
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
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

// Register ChartJS
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
interface Profile {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  school_id: string;
}

interface DashboardSummary {
  students: { total: number; active: number; newThisMonth: number };
  teachers: { total: number; active: number; newThisMonth: number };
  classes: { total: number; avgSize: number };
  subjects: { total: number; withTeachers: number };
  lessonPlans: { total: number; draft: number; submitted: number; approved: number; rejected: number };
  termPlans: { total: number; draft: number; approved: number };
  yearPlans: { total: number; draft: number; approved: number };
  exams: { upcoming: number; completed: number; total: number };
  attendance: { average: number; today: number };
  assessments: { averageScore: number; passRate: number; topSubject: string };
}

interface RecentItem {
  id: string;
  type: string;
  title: string;
  date: string;
  status?: string;
  user?: string;
}

// ==================== UTILITIES ====================
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num);
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    DRAFT: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
    SUBMITTED: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
    APPROVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    REJECTED: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
    COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
    PAID: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    OVERDUE: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
  };
  return colors[status?.toUpperCase()] || 'bg-gray-50 text-gray-700 ring-1 ring-gray-500/20';
};

// ==================== UI COMPONENTS ====================
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: number;
  trendLabel?: string;
  color?: string;
  gradient?: string;
  onClick?: () => void;
}> = ({ title, value, icon: Icon, trend, trendLabel, color = 'blue', gradient, onClick }) => (
  <div
    className={`group relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-5 transition-all duration-300 hover:shadow-lg hover:border-gray-200 ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    {/* Gradient background effect */}
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient || `from-${color}-50/30 to-transparent`} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
    
    <div className="relative z-10 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 tracking-wide">{title}</p>
        <p className="text-3xl font-bold mt-2 text-gray-900 tracking-tight">{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <div className={`p-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            </div>
            <span>{Math.abs(trend)}%</span>
            {trendLabel && <span className="text-gray-400 font-normal">vs last month</span>}
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl bg-${color}-50 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={22} className={`text-${color}-500`} />
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
  headerClassName?: string;
}> = ({ title, children, icon, action, className = '', headerClassName = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md ${className}`}>
    <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between ${headerClassName}`}>
      <div className="flex items-center gap-2.5">
        {icon && <div className="text-gray-400">{icon}</div>}
        <h3 className="font-semibold text-gray-800 text-base tracking-tight">{title}</h3>
      </div>
      {action && action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const MetricBadge: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color = 'blue' }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className={`font-semibold text-${color}-600`}>{value}</span>
  </div>
);

// ==================== MAIN DASHBOARD ====================
export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [summary, setSummary] = useState<DashboardSummary>({
    students: { total: 0, active: 0, newThisMonth: 0 },
    teachers: { total: 0, active: 0, newThisMonth: 0 },
    classes: { total: 0, avgSize: 0 },
    subjects: { total: 0, withTeachers: 0 },
    lessonPlans: { total: 0, draft: 0, submitted: 0, approved: 0, rejected: 0 },
    termPlans: { total: 0, draft: 0, approved: 0 },
    yearPlans: { total: 0, draft: 0, approved: 0 },
    exams: { upcoming: 0, completed: 0, total: 0 },
    attendance: { average: 0, today: 0 },
    assessments: { averageScore: 0, passRate: 0, topSubject: '' },
  });

  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<{ grade: string; count: number }[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<{ subject: string; avgScore: number; passRate: number }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; students: number; lessons: number }[]>([]);

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    if (!profile?.school_id) return;

    try {
      setRefreshing(true);
      setError(null);

      const schoolId = profile.school_id;

      const [
        studentsRes,
        teachersRes,
        classesRes,
        subjectsRes,
        lessonPlansRes,
        termPlansRes,
        yearPlansRes,
        examsRes,
        assessmentResultsRes,
        gradeDistributionRes,
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact' }).eq('school_id', schoolId),
        supabase.from('teachers').select('*', { count: 'exact' }).eq('school_id', schoolId),
        supabase.from('class').select('*, students:students(count)').eq('school_id', schoolId),
        supabase.from('subject').select('*, teacher_id').eq('school_id', schoolId),
        supabase.from('teacher_lesson_plans').select('status, created_at, lesson_topic').eq('school_id', schoolId),
        supabase.from('teacher_term_plans').select('status').eq('school_id', schoolId),
        supabase.from('teacher_year_plans').select('status').eq('school_id', schoolId),
        supabase.from('term_exam_session').select('start_date, end_date').eq('school_id', schoolId),
        supabase.from('assessment_examresult').select('percentage, subject_id, subject:subject(name)').eq('school_id', schoolId).limit(500),
        supabase.from('students').select('current_grade_id, class:class(grade_name)').eq('school_id', schoolId),
      ]);

      const students = studentsRes.data || [];
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const newStudents = students.filter((s: any) => new Date(s.created) > oneMonthAgo).length;

      const classes = classesRes.data || [];
      const avgClassSize = students.length / (classes.length || 1);

      const subjects = subjectsRes.data || [];
      const subjectsWithTeachers = subjects.filter((s: any) => s.teacher_id).length;

      const lessonPlans = lessonPlansRes.data || [];
      const lessonStats = {
        total: lessonPlans.length,
        draft: lessonPlans.filter((l: any) => l.status === 'DRAFT').length,
        submitted: lessonPlans.filter((l: any) => l.status === 'SUBMITTED').length,
        approved: lessonPlans.filter((l: any) => l.status === 'APPROVED').length,
        rejected: lessonPlans.filter((l: any) => l.status === 'REJECTED').length,
      };

      const termPlans = termPlansRes.data || [];
      const termStats = {
        total: termPlans.length,
        draft: termPlans.filter((t: any) => t.status === 'DRAFT').length,
        approved: termPlans.filter((t: any) => t.status === 'APPROVED').length,
      };

      const yearPlans = yearPlansRes.data || [];
      const yearStats = {
        total: yearPlans.length,
        draft: yearPlans.filter((y: any) => y.status === 'DRAFT').length,
        approved: yearPlans.filter((y: any) => y.status === 'APPROVED').length,
      };

      const exams = examsRes.data || [];
      const today = new Date().toISOString().split('T')[0];
      const upcomingExams = exams.filter((e: any) => e.start_date >= today).length;
      const completedExams = exams.filter((e: any) => e.end_date < today).length;

      const results = assessmentResultsRes.data || [];
      const avgScore = results.length > 0
        ? results.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / results.length
        : 0;
      const passRate = results.filter((r: any) => (r.percentage || 0) >= 50).length / (results.length || 1) * 100;

      const subjectScores = new Map<string, { total: number; count: number }>();
      results.forEach((r: any) => {
        const subjectName = r.subject?.name || 'Unknown';
        const current = subjectScores.get(subjectName) || { total: 0, count: 0 };
        current.total += r.percentage || 0;
        current.count += 1;
        subjectScores.set(subjectName, current);
      });
      const subjectPerf = Array.from(subjectScores.entries()).map(([name, data]) => ({
        subject: name,
        avgScore: data.total / data.count,
        passRate: 0,
      })).sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

      const gradeData = gradeDistributionRes.data || [];
      const gradeMap = new Map<string, number>();
      gradeData.forEach((g: any) => {
        const gradeName = g.class?.grade_name || 'Unknown';
        gradeMap.set(gradeName, (gradeMap.get(gradeName) || 0) + 1);
      });
      const gradeDist = Array.from(gradeMap.entries()).map(([grade, count]) => ({ grade, count })).sort((a, b) => a.grade.localeCompare(b.grade));

      const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
      const monthlyData = months.map((month, i) => ({
        month,
        students: Math.floor(students.length * (0.7 + i * 0.05)),
        lessons: Math.floor(lessonStats.total * (0.5 + i * 0.1)),
      }));

      const recentLessons = (lessonPlansRes.data || []).slice(0, 3).map((l: any) => ({
        id: l.id,
        type: 'lesson',
        title: l.lesson_topic || 'Untitled Lesson',
        date: l.created_at,
        status: l.status,
      }));
      const recentStudents = students.slice(0, 2).map((s: any) => ({
        id: s.registration_id,
        type: 'student',
        title: `${s.first_name} ${s.last_name}`,
        date: s.created,
      }));
      setRecentItems([...recentLessons, ...recentStudents]);

      setSummary({
        students: { total: students.length, active: students.length, newThisMonth: newStudents },
        teachers: { total: teachersRes.count || 0, active: teachersRes.count || 0, newThisMonth: 0 },
        classes: { total: classes.length, avgSize: Math.round(avgClassSize) },
        subjects: { total: subjects.length, withTeachers: subjectsWithTeachers },
        lessonPlans: lessonStats,
        termPlans: termStats,
        yearPlans: yearStats,
        exams: { upcoming: upcomingExams, completed: completedExams, total: exams.length },
        attendance: { average: 82, today: 76 },
        assessments: { averageScore: avgScore, passRate, topSubject: subjectPerf[0]?.subject || 'N/A' },
      });

      setGradeDistribution(gradeDist);
      setSubjectPerformance(subjectPerf);
      setMonthlyTrend(monthlyData);
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [profile?.school_id]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        setProfile(profileData);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile?.school_id) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, profile?.school_id]);

  const gradeChartData = {
    labels: gradeDistribution.map(g => g.grade),
    datasets: [{
      label: 'Students',
      data: gradeDistribution.map(g => g.count),
      backgroundColor: ['#3b82f6', '#8b5cf6', '#ec489a', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'],
      borderWidth: 0,
      borderRadius: 8,
    }],
  };

  const subjectChartData = {
    labels: subjectPerformance.map(s => s.subject.length > 12 ? s.subject.slice(0, 10) + '...' : s.subject),
    datasets: [{
      label: 'Average Score (%)',
      data: subjectPerformance.map(s => Math.round(s.avgScore)),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderRadius: 8,
      barPercentage: 0.65,
      categoryPercentage: 0.8,
    }],
  };

  const monthlyChartData = {
    labels: monthlyTrend.map(m => m.month),
    datasets: [
      {
        label: 'Students',
        data: monthlyTrend.map(m => m.students),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Lesson Plans',
        data: monthlyTrend.map(m => m.lessons),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const planStatusChartData = {
    labels: ['Draft', 'Submitted', 'Approved', 'Rejected'],
    datasets: [{
      data: [summary.lessonPlans.draft, summary.lessonPlans.submitted, summary.lessonPlans.approved, summary.lessonPlans.rejected],
      backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
      borderWidth: 0,
      borderRadius: 8,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom' as const, 
        labels: { 
          font: { size: 11, weight: 500 },
          boxWidth: 10,
          usePointStyle: true,
        } 
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#1f2937',
        bodyColor: '#6b7280',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.raw.toLocaleString()}`
        }
      }
    },
  };

  const barChartOptions = {
    ...chartOptions,
    scales: { 
      y: { 
        beginAtZero: true, 
        max: 100, 
        title: { display: true, text: 'Score (%)', font: { size: 11, weight: 500 } },
        grid: { color: '#f3f4f6' }
      },
      x: { 
        grid: { display: false },
        ticks: { font: { size: 11 } }
      }
    },
  };

  const lineChartOptions = {
    ...chartOptions,
    scales: { 
      y: { 
        beginAtZero: true, 
        title: { display: true, text: 'Count', font: { size: 11, weight: 500 } },
        grid: { color: '#f3f4f6' }
      },
      x: { 
        grid: { display: false },
        ticks: { font: { size: 11 } }
      }
    },
  };

  // Statistics cards data
  const statCards = [
    { title: "Students", value: formatNumber(summary.students.total), icon: Users, color: "blue", trend: 12, trendLabel: "vs last month" },
    { title: "Teachers", value: formatNumber(summary.teachers.total), icon: User, color: "green", trend: 5, trendLabel: "vs last month" },
    { title: "Classes", value: summary.classes.total, icon: School, color: "purple", trend: undefined },
    { title: "Subjects", value: summary.subjects.total, icon: BookOpen, color: "orange", trend: undefined },
    { title: "Lesson Plans", value: summary.lessonPlans.total, icon: FileText, color: "indigo", trend: -3, trendLabel: "vs last month" },
    { title: "Pass Rate", value: `${Math.round(summary.assessments.passRate)}%`, icon: Trophy, color: "yellow", trend: 8, trendLabel: "vs last month" },
    { title: "Avg Score", value: `${Math.round(summary.assessments.averageScore)}%`, icon: Target, color: "cyan", trend: 4, trendLabel: "vs last month" },
    { title: "Attendance", value: `${summary.attendance.average}%`, icon: Calendar, color: "pink", trend: 2, trendLabel: "vs last month" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-500 font-medium">Loading dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/80">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header with welcome section */}
            <div className="mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-indigo-100 rounded-lg">
                      <LayoutDashboard size={18} className="text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Dashboard</h1>
                  </div>
                  <p className="text-gray-500 text-sm flex items-center gap-1.5">
                    Welcome back, <span className="font-semibold text-gray-700">{profile?.full_name?.split(' ')[0] || 'Teacher'}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs">Last updated: {format(lastUpdated, 'hh:mm a')}</span>
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={fetchDashboardData}
                    disabled={refreshing}
                    className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin text-indigo-500' : 'text-gray-500'} />
                    Refresh
                  </button>
                  <button className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm shadow-indigo-200">
                    <Download size={16} />
                    Export Report
                  </button>
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-700 shadow-sm">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
                  <XCircle size={16} />
                </button>
              </div>
            )}

            {/* Stats Cards - Using flexbox for natural wrapping */}
            <div className="flex flex-wrap gap-4 mb-8">
              {statCards.map((card, index) => (
                <div key={index} className="flex-1 min-w-[180px]">
                  <StatCard 
                    title={card.title} 
                    value={card.value} 
                    icon={card.icon} 
                    color={card.color} 
                    gradient={`from-${card.color}-50/50 to-transparent`}
                    trend={card.trend}
                    trendLabel={card.trendLabel}
                  />
                </div>
              ))}
            </div>

            {/* Charts Row 1 - Enhanced with better spacing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <SectionCard 
                title="Grade Distribution" 
                icon={<PieChart size={18} className="text-gray-500" />}
                headerClassName="bg-gradient-to-r from-gray-50/50 to-transparent"
              >
                <div className="h-72">
                  {gradeDistribution.length > 0 ? (
                    <Pie data={gradeChartData} options={chartOptions} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <PieChart size={48} className="mb-2 opacity-30" />
                      <p className="text-sm">No grade data available</p>
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard 
                title="Subject Performance" 
                icon={<BarChart3 size={18} className="text-gray-500" />}
                headerClassName="bg-gradient-to-r from-gray-50/50 to-transparent"
              >
                <div className="h-72">
                  {subjectPerformance.length > 0 ? (
                    <Bar data={subjectChartData} options={barChartOptions} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <BarChart3 size={48} className="mb-2 opacity-30" />
                      <p className="text-sm">No assessment data available</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <SectionCard 
                title="Monthly Trend Analysis" 
                icon={<LineChart size={18} className="text-gray-500" />}
                action={
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Students</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Lessons</span>
                  </div>
                }
              >
                <div className="h-72">
                  <Line data={monthlyChartData} options={lineChartOptions} />
                </div>
              </SectionCard>

              <SectionCard 
                title="Lesson Plan Status" 
                icon={<ClipboardList size={18} className="text-gray-500" />}
              >
                <div className="h-72">
                  <Doughnut data={planStatusChartData} options={chartOptions} />
                </div>
              </SectionCard>
            </div>

            {/* Additional Stats Cards - Redesigned with modern layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Academic Overview */}
              <SectionCard 
                title="Academic Overview" 
                icon={<GraduationCap size={18} className="text-indigo-500" />}
                className="bg-gradient-to-br from-white to-indigo-50/20"
              >
                <div className="space-y-1">
                  <MetricBadge label="Average Class Size" value={`${summary.classes.avgSize} students`} color="indigo" />
                  <MetricBadge label="Subjects with Teachers" value={`${summary.subjects.withTeachers}/${summary.subjects.total}`} color="indigo" />
                  <MetricBadge label="Top Performing Subject" value={summary.assessments.topSubject || 'N/A'} color="emerald" />
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-500">Overall Pass Rate</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${summary.assessments.passRate}%` }} 
                        />
                      </div>
                      <span className="font-semibold text-emerald-600 text-sm">{Math.round(summary.assessments.passRate)}%</span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Plans Overview */}
              <SectionCard 
                title="Teaching Plans" 
                icon={<BookMarked size={18} className="text-blue-500" />}
                className="bg-gradient-to-br from-white to-blue-50/20"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-500">Lesson Plans</span>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">{summary.lessonPlans.draft} Draft</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">{summary.lessonPlans.approved} Approved</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Term Plans</span>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">{summary.termPlans.draft} Draft</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">{summary.termPlans.approved} Approved</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Year Plans</span>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">{summary.yearPlans.draft} Draft</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">{summary.yearPlans.approved} Approved</span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Exams Overview */}
              <SectionCard 
                title="Exams Overview" 
                icon={<Calendar size={18} className="text-purple-500" />}
                className="bg-gradient-to-br from-white to-purple-50/20"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-500 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      Upcoming Exams
                    </span>
                    <span className="font-bold text-blue-600 text-lg">{summary.exams.upcoming}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      Completed Exams
                    </span>
                    <span className="font-bold text-emerald-600 text-lg">{summary.exams.completed}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Total Exams Scheduled</span>
                    <span className="font-semibold text-gray-800">{summary.exams.total}</span>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Recent Activity and Quick Actions Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <SectionCard 
                title="Recent Activity" 
                icon={<Activity size={18} className="text-gray-500" />} 
                action={
                  <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                    View All <ChevronRight size={12} />
                  </button>
                }
              >
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  {recentItems.map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 group hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors">
                      <div className={`p-2 rounded-xl ${
                        item.type === 'lesson' ? 'bg-blue-50' : 'bg-emerald-50'
                      } group-hover:scale-105 transition-transform`}>
                        {item.type === 'lesson' ? <FileText size={16} className="text-blue-500" /> : <Users size={16} className="text-emerald-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={10} />
                            {format(new Date(item.date), 'MMM dd, yyyy')}
                          </span>
                          {item.status && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  ))}
                  {recentItems.length === 0 && (
                    <div className="text-center py-8">
                      <Activity size={32} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No recent activity</p>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Quick Actions - Enhanced with better visual hierarchy */}
              <SectionCard 
                title="Quick Actions" 
                icon={<Zap size={18} className="text-gray-500" />}
              >
                <div className="grid grid-cols-2 gap-3">
                  <button className="group p-4 bg-gradient-to-br from-white to-blue-50/40 border border-gray-100 rounded-xl text-center hover:shadow-md transition-all duration-300 hover:border-blue-200">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-all group-hover:scale-110 duration-300">
                      <FileText size={22} className="text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Create Lesson Plan</p>
                    <p className="text-xs text-gray-400 mt-1">Plan your next class</p>
                  </button>
                  <button className="group p-4 bg-gradient-to-br from-white to-emerald-50/40 border border-gray-100 rounded-xl text-center hover:shadow-md transition-all duration-300 hover:border-emerald-200">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-200 transition-all group-hover:scale-110 duration-300">
                      <Users size={22} className="text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Add Student</p>
                    <p className="text-xs text-gray-400 mt-1">Enroll new student</p>
                  </button>
                  <button className="group p-4 bg-gradient-to-br from-white to-amber-50/40 border border-gray-100 rounded-xl text-center hover:shadow-md transition-all duration-300 hover:border-amber-200">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-200 transition-all group-hover:scale-110 duration-300">
                      <Calendar size={22} className="text-amber-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Schedule Exam</p>
                    <p className="text-xs text-gray-400 mt-1">Set up assessments</p>
                  </button>
                  <button className="group p-4 bg-gradient-to-br from-white to-purple-50/40 border border-gray-100 rounded-xl text-center hover:shadow-md transition-all duration-300 hover:border-purple-200">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-all group-hover:scale-110 duration-300">
                      <Receipt size={22} className="text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Record Payment</p>
                    <p className="text-xs text-gray-400 mt-1">Manage finances</p>
                  </button>
                </div>
              </SectionCard>
            </div>

            {/* Footer note */}
            <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
              <p>Data reflects current academic period • Last sync: {format(lastUpdated, 'MMM dd, yyyy hh:mm a')}</p>
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
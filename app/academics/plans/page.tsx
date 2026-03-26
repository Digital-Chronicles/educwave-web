// app/academics/plans/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Calendar,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Check,
  Eye,
  FileText,
  Download,
  Upload,
  Clock,
  Users,
  Award,
  BarChart,
  TrendingUp,
  CalendarDays,
  BookMarked,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  Grid,
  List,
  ChevronRight,
  ChevronDown,
  Filter,
  Search,
  Tag,
  Layers,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Share2,
  Copy,
  MoreVertical,
  ArrowUpDown,
  FilterX
} from 'lucide-react';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

// ==================== TYPES ====================
type PlanStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
type LessonPlanStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
type ViewMode = 'grid' | 'list';
type SortField = 'date' | 'topic' | 'status' | 'class';
type SortOrder = 'asc' | 'desc';

interface LessonStep {
  id: string;
  lesson_plan_id: string;
  step_order: number;
  step_name: string;
  duration: string;
  teacher_activity: string;
  learner_activity: string;
  created_at: string;
  updated_at: string;
}

interface LessonPlan {
  id: string;
  school_id: string;
  teacher_user_id: string;
  teacher_name?: string;
  class_id: number;
  subject_id: number;
  term_id: number;
  lesson_date: string;
  lesson_duration: string;
  theme: string;
  sub_theme: string;
  lesson_topic: string;
  cognitive_objective: string;
  psychomotor_objective: string;
  affective_objective: string;
  competencies: string;
  life_skills_values: string;
  instructional_materials: string;
  evaluation_method: string;
  evaluation_task: string;
  self_eval_what_went_well: string | null;
  self_eval_achieved_count: number | null;
  self_eval_improvements: string | null;
  status: LessonPlanStatus;
  created_at: string;
  updated_at: string;
  lesson_steps?: LessonStep[];
  class?: { id: number; grade_name: string };
  subject?: { id: number; name: string; code: string };
  term?: { id: number; term_name: string; year: number };
}

interface TeacherTermPlan {
  id: string;
  school_id: string;
  term_id: number;
  teacher_user_id: string;
  class_id: number;
  subject_id: number;
  general_objectives: string | null;
  reference_materials: string | null;
  status: PlanStatus;
  created_at: string;
  weeks?: TeacherTermPlanWeek[];
  class?: { id: number; grade_name: string };
  subject?: { id: number; name: string };
  term?: { id: number; term_name: string; year: number };
}

interface TeacherTermPlanWeek {
  id: string;
  term_plan_id: string;
  week_no: number;
  week_start: string | null;
  week_end: string | null;
  topic: string | null;
  subtopics: string | null;
  learning_outcomes: string | null;
  teaching_methods: string | null;
  learning_activities: string | null;
  resources: string | null;
  assessment: string | null;
  remarks: string | null;
}

interface TeacherYearPlan {
  id: string;
  school_id: string;
  academic_year: number;
  teacher_user_id: string;
  class_id: number;
  subject_id: number;
  overview: string | null;
  resources: string | null;
  assessment_strategy: string | null;
  status: PlanStatus;
  created_at: string;
  class?: { id: number; grade_name: string };
  subject?: { id: number; name: string };
}

interface Subject {
  id: number;
  name: string;
  code: string | null;
  description: string;
  grade_id: number | null;
  curriculum_id: number;
  school_id: string | null;
  teacher_id: string | null;
  grade?: { grade_name: string };
}

interface Class {
  id: number;
  grade_name: string;
  class_teacher_id: string | null;
  school_id: string | null;
}

interface Topic {
  id: number;
  name: string;
  subject_id: number;
  grade_id: number;
  school_id: string | null;
  subject?: { name: string };
  grade?: { grade_name: string };
}

interface Term {
  id: number;
  term_name: string;
  year: number;
  start_date: string;
  end_date: string;
  school_id: string | null;
}

interface School {
  id: string;
  school_name: string;
}

interface Profile {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  school_id: string;
}

// ==================== UTILITIES ====================
const getStatusColor = (status: PlanStatus | LessonPlanStatus) => {
  switch (status) {
    case 'DRAFT': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'SUBMITTED': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: PlanStatus | LessonPlanStatus) => {
  switch (status) {
    case 'DRAFT': return <FileText size={14} />;
    case 'SUBMITTED': return <Send size={14} />;
    case 'APPROVED': return <CheckCircle size={14} />;
    case 'REJECTED': return <X size={14} />;
    default: return <AlertCircle size={14} />;
  }
};

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy');
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
};

// ==================== CUSTOM HOOKS ====================
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// ==================== UI COMPONENTS ====================
const Button: React.FC<{
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  icon?: React.ReactNode;
}> = ({ onClick, variant = 'primary', size = 'md', disabled = false, loading = false, children, className = '', type = 'button', icon }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${variants[variant]} ${sizes[size]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string; hover?: boolean }> = ({ children, className = '', hover = false }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${hover ? 'transition-all hover:shadow-md hover:border-gray-300' : ''} ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-6 border-b border-gray-200 ${className}`}>{children}</div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h3>
);

const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 mt-1 ${className}`}>{children}</p>
);

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-6 border-t border-gray-200 ${className}`}>{children}</div>
);

const Input: React.FC<{
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
}> = ({ type = 'text', placeholder, value, onChange, className = '', disabled = false, required = false, icon }) => (
  <div className="relative">
    {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">{icon}</div>}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${icon ? 'pl-10' : ''} ${className}`}
    />
  </div>
);

const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required = false }) => (
  <label className="block text-sm font-medium text-gray-700 mb-2">
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Textarea: React.FC<{
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  disabled?: boolean;
}> = ({ placeholder, value, onChange, rows = 3, disabled = false }) => (
  <textarea
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    rows={rows}
    disabled={disabled}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y disabled:bg-gray-50 disabled:cursor-not-allowed"
  />
);

const Badge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'; className?: string }> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Alert: React.FC<{ children: React.ReactNode; variant?: 'info' | 'success' | 'warning' | 'error'; className?: string; onClose?: () => void }> = ({ children, variant = 'info', className = '', onClose }) => {
  const variants = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };
  const icons = {
    info: <AlertCircle className="h-5 w-5 text-blue-600" />,
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
  };
  
  return (
    <div className={`p-4 rounded-lg border ${variants[variant]} ${className}`}>
      <div className="flex items-start gap-3">
        {icons[variant]}
        <div className="flex-1 text-sm">{children}</div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

const Select: React.FC<{
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}> = ({ value, onChange, children, className = '', disabled = false, required = false }) => (
  <select
    value={value}
    onChange={onChange}
    disabled={disabled}
    required={required}
    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </select>
);

const StatCard: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  color: string;
  trend?: number;
  onClick?: () => void;
}> = ({ icon: Icon, label, value, color, trend, onClick }) => (
  <Card hover={!!onClick}>
    <CardContent className="pt-6">
      <div className={`flex items-center justify-between ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
              <span>{Math.abs(trend)}% from last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon size={24} className={`${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ==================== MAIN COMPONENT ====================
export default function TeacherAcademicPlans() {
  // Tab State
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'termly' | 'yearly'>('daily');
  
  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [modalType, setModalType] = useState<'daily' | 'weekly' | 'termly' | 'yearly'>('daily');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  
  // Loading States
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data State
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [yearPlans, setYearPlans] = useState<TeacherYearPlan[]>([]);
  const [termPlans, setTermPlans] = useState<TeacherTermPlan[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Filter State
  const [filterStatus, setFilterStatus] = useState<PlanStatus | 'ALL'>('ALL');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterTerm, setFilterTerm] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // UI State
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // ==================== FETCH PROFILE ====================
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

  // ==================== FETCH DATA ====================
  const fetchData = useCallback(async () => {
    if (!profile?.school_id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [
        { data: classesData },
        { data: subjectsData },
        { data: topicsData },
        { data: termsData },
        { data: lessonPlansData },
        { data: termPlansData },
        { data: yearPlansData },
        { data: schoolsData }
      ] = await Promise.all([
        supabase.from('class').select('*').eq('school_id', profile.school_id).order('grade_name'),
        supabase.from('subject').select('*, grade:class(grade_name)').eq('school_id', profile.school_id).order('name'),
        supabase.from('assessment_topics').select('*, subject:subject(name), grade:class(grade_name)').eq('school_id', profile.school_id).order('name'),
        supabase.from('term_exam_session').select('*').eq('school_id', profile.school_id).order('year', { ascending: false }),
        supabase.from('teacher_lesson_plans').select('*, class:class(grade_name), subject:subject(name, code), term:term_exam_session(term_name, year)').eq('school_id', profile.school_id).order('created_at', { ascending: false }),
        supabase.from('teacher_term_plans').select('*, class:class(grade_name), subject:subject(name), term:term_exam_session(term_name, year)').eq('school_id', profile.school_id),
        supabase.from('teacher_year_plans').select('*, class:class(grade_name), subject:subject(name)').eq('school_id', profile.school_id),
        supabase.from('general_information').select('id, school_name').eq('id', profile.school_id)
      ]);

      setClasses(classesData || []);
      setSubjects(subjectsData || []);
      setTopics(topicsData || []);
      setTerms(termsData || []);
      setLessonPlans(lessonPlansData || []);
      setTermPlans(termPlansData || []);
      setYearPlans(yearPlansData || []);
      setSchools(schoolsData || []);
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.school_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==================== FILTERING AND SORTING ====================
  const filteredLessonPlans = useMemo(() => {
    let filtered = [...lessonPlans];
    
    // Status filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(plan => plan.status === filterStatus);
    }
    
    // Class filter
    if (filterClass !== 'ALL') {
      filtered = filtered.filter(plan => plan.class_id === parseInt(filterClass));
    }
    
    // Subject filter
    if (filterSubject !== 'ALL') {
      filtered = filtered.filter(plan => plan.subject_id === parseInt(filterSubject));
    }
    
    // Term filter
    if (filterTerm !== 'ALL') {
      filtered = filtered.filter(plan => plan.term_id === parseInt(filterTerm));
    }
    
    // Search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(plan => 
        plan.lesson_topic?.toLowerCase().includes(searchLower) ||
        plan.subject?.name?.toLowerCase().includes(searchLower) ||
        plan.class?.grade_name?.toLowerCase().includes(searchLower) ||
        plan.theme?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'date':
          aVal = new Date(a.lesson_date).getTime();
          bVal = new Date(b.lesson_date).getTime();
          break;
        case 'topic':
          aVal = a.lesson_topic || '';
          bVal = b.lesson_topic || '';
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'class':
          aVal = a.class?.grade_name || '';
          bVal = b.class?.grade_name || '';
          break;
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
    return filtered;
  }, [lessonPlans, filterStatus, filterClass, filterSubject, filterTerm, debouncedSearch, sortField, sortOrder]);

  const filteredTermPlans = useMemo(() => {
    let filtered = [...termPlans];
    if (filterStatus !== 'ALL') filtered = filtered.filter(plan => plan.status === filterStatus);
    if (filterClass !== 'ALL') filtered = filtered.filter(plan => plan.class_id === parseInt(filterClass));
    if (filterSubject !== 'ALL') filtered = filtered.filter(plan => plan.subject_id === parseInt(filterSubject));
    if (filterTerm !== 'ALL') filtered = filtered.filter(plan => plan.term_id === parseInt(filterTerm));
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(plan => 
        plan.subject?.name?.toLowerCase().includes(searchLower) ||
        plan.class?.grade_name?.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [termPlans, filterStatus, filterClass, filterSubject, filterTerm, debouncedSearch]);

  const filteredYearPlans = useMemo(() => {
    let filtered = [...yearPlans];
    if (filterStatus !== 'ALL') filtered = filtered.filter(plan => plan.status === filterStatus);
    if (filterClass !== 'ALL') filtered = filtered.filter(plan => plan.class_id === parseInt(filterClass));
    if (filterSubject !== 'ALL') filtered = filtered.filter(plan => plan.subject_id === parseInt(filterSubject));
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(plan => 
        plan.subject?.name?.toLowerCase().includes(searchLower) ||
        plan.class?.grade_name?.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [yearPlans, filterStatus, filterClass, filterSubject, debouncedSearch]);

  // ==================== STATISTICS ====================
  const stats = useMemo(() => ({
    daily: {
      total: lessonPlans.length,
      draft: lessonPlans.filter(p => p.status === 'DRAFT').length,
      submitted: lessonPlans.filter(p => p.status === 'SUBMITTED').length,
      approved: lessonPlans.filter(p => p.status === 'APPROVED').length,
      rejected: lessonPlans.filter(p => p.status === 'REJECTED').length,
    },
    weekly: {
      total: termPlans.length,
      draft: termPlans.filter(p => p.status === 'DRAFT').length,
      submitted: termPlans.filter(p => p.status === 'SUBMITTED').length,
      approved: termPlans.filter(p => p.status === 'APPROVED').length,
      rejected: termPlans.filter(p => p.status === 'REJECTED').length,
    },
    termly: {
      total: termPlans.length,
      draft: termPlans.filter(p => p.status === 'DRAFT').length,
      submitted: termPlans.filter(p => p.status === 'SUBMITTED').length,
      approved: termPlans.filter(p => p.status === 'APPROVED').length,
      rejected: termPlans.filter(p => p.status === 'REJECTED').length,
    },
    yearly: {
      total: yearPlans.length,
      draft: yearPlans.filter(p => p.status === 'DRAFT').length,
      submitted: yearPlans.filter(p => p.status === 'SUBMITTED').length,
      approved: yearPlans.filter(p => p.status === 'APPROVED').length,
      rejected: yearPlans.filter(p => p.status === 'REJECTED').length,
    },
  }), [lessonPlans, termPlans, yearPlans]);

  // ==================== CRUD OPERATIONS ====================
  const handleCreatePlan = async (data: any) => {
    try {
      setSaving(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (modalType === 'yearly') {
        const { error } = await supabase.from('teacher_year_plans').insert({
          school_id: profile?.school_id,
          academic_year: data.academic_year,
          teacher_user_id: user.id,
          class_id: parseInt(data.class_id),
          subject_id: parseInt(data.subject_id),
          overview: data.overview,
          resources: data.resources,
          assessment_strategy: data.assessment_strategy,
          status: 'DRAFT'
        });
        if (error) throw error;
        setSuccess('Yearly plan created successfully');
      } 
      else if (modalType === 'termly') {
        const { error } = await supabase.from('teacher_term_plans').insert({
          school_id: profile?.school_id,
          term_id: parseInt(data.term_id),
          teacher_user_id: user.id,
          class_id: parseInt(data.class_id),
          subject_id: parseInt(data.subject_id),
          general_objectives: data.general_objectives,
          reference_materials: data.reference_materials,
          status: 'DRAFT'
        });
        if (error) throw error;
        setSuccess('Termly plan created successfully');
      }
      else if (modalType === 'weekly') {
        const { data: termPlan, error: termPlanError } = await supabase
          .from('teacher_term_plans')
          .insert({
            school_id: profile?.school_id,
            term_id: parseInt(data.term_id),
            teacher_user_id: user.id,
            class_id: parseInt(data.class_id),
            subject_id: parseInt(data.subject_id),
            general_objectives: data.general_objectives,
            reference_materials: data.reference_materials,
            status: 'DRAFT'
          })
          .select()
          .single();
        
        if (termPlanError) throw termPlanError;

        if (data.weeks && data.weeks.length > 0) {
          const weeksWithPlanId = data.weeks.map((week: any) => ({
            ...week,
            term_plan_id: termPlan.id
          }));
          const { error: weeksError } = await supabase
            .from('teacher_term_plan_weeks')
            .insert(weeksWithPlanId);
          if (weeksError) throw weeksError;
        }
        setSuccess('Weekly plan created successfully');
      }
      else if (modalType === 'daily') {
        const { error: lessonPlanError } = await supabase
          .from('teacher_lesson_plans')
          .insert({
            school_id: profile?.school_id,
            teacher_user_id: user.id,
            class_id: parseInt(data.class_id),
            subject_id: parseInt(data.subject_id),
            term_id: data.term_id ? parseInt(data.term_id) : null,
            lesson_date: data.lesson_date,
            lesson_duration: data.lesson_duration,
            lesson_topic: data.lesson_topic,
            sub_theme: data.sub_theme,
            cognitive_objective: data.cognitive_objective,
            psychomotor_objective: data.psychomotor_objective,
            affective_objective: data.affective_objective,
            competencies: data.competencies,
            life_skills_values: data.life_skills_values,
            instructional_materials: data.instructional_materials,
            evaluation_method: data.evaluation_method,
            evaluation_task: data.evaluation_task,
            status: 'DRAFT'
          });
        if (lessonPlanError) throw lessonPlanError;
        setSuccess('Daily lesson plan created successfully');
      }

      await fetchData();
      setShowCreateModal(false);
      
      // Auto-clear success message
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Error creating plan:', err);
      setError(err.message || 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, type: 'daily' | 'weekly' | 'termly' | 'yearly', status: PlanStatus | LessonPlanStatus) => {
    try {
      let table = '';
      if (type === 'daily') table = 'teacher_lesson_plans';
      else if (type === 'weekly' || type === 'termly') table = 'teacher_term_plans';
      else table = 'teacher_year_plans';
      
      const { error } = await supabase
        .from(table)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      setSuccess(`Plan status updated to ${status}`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message || 'Failed to update status');
    }
  };

  const handleDeletePlan = async (id: string, type: 'daily' | 'weekly' | 'termly' | 'yearly') => {
    if (!confirm('Are you sure you want to delete this plan? This action cannot be undone.')) return;
    
    try {
      let table = '';
      if (type === 'daily') table = 'teacher_lesson_plans';
      else if (type === 'weekly' || type === 'termly') table = 'teacher_term_plans';
      else table = 'teacher_year_plans';
      
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      
      setSuccess('Plan deleted successfully');
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Error deleting plan:', err);
      setError(err.message || 'Failed to delete plan');
    }
  };

  const handleExportAll = () => {
    const data = filteredLessonPlans.map(plan => ({
      'Lesson Topic': plan.lesson_topic,
      'Class': plan.class?.grade_name,
      'Subject': plan.subject?.name,
      'Date': formatDate(plan.lesson_date),
      'Duration': plan.lesson_duration,
      'Status': plan.status,
      'Cognitive Objective': plan.cognitive_objective,
      'Psychomotor Objective': plan.psychomotor_objective,
      'Affective Objective': plan.affective_objective,
      'Competencies': plan.competencies,
      'Life Skills & Values': plan.life_skills_values,
      'Instructional Materials': plan.instructional_materials,
      'Evaluation Method': plan.evaluation_method,
      'Created At': formatDateTime(plan.created_at),
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lesson Plans');
    XLSX.writeFile(wb, `lesson_plans_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Lesson Plans Report</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                h1 { color: #333; }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const clearFilters = () => {
    setFilterStatus('ALL');
    setFilterClass('ALL');
    setFilterSubject('ALL');
    setFilterTerm('ALL');
    setSearchQuery('');
    if (searchInputRef.current) searchInputRef.current.value = '';
  };

  const openCreateModal = (type: 'daily' | 'weekly' | 'termly' | 'yearly') => {
    setModalType(type);
    setShowCreateModal(true);
  };

  const viewPlan = (plan: any) => {
    setSelectedPlan(plan);
    setShowViewModal(true);
  };

  // ==================== RENDER FUNCTIONS ====================
  const renderDailyPlans = () => {
    if (filteredLessonPlans.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700">No lesson plans found</h4>
            <p className="text-gray-500 mt-2">
              {searchQuery || filterStatus !== 'ALL' || filterClass !== 'ALL' 
                ? 'Try adjusting your filters' 
                : 'Create your first daily lesson plan to get started'}
            </p>
            {(searchQuery || filterStatus !== 'ALL' || filterClass !== 'ALL') && (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                <FilterX size={16} className="mr-2" />
                Clear Filters
              </Button>
            )}
            {!searchQuery && filterStatus === 'ALL' && filterClass === 'ALL' && (
              <Button onClick={() => openCreateModal('daily')} className="mt-4">
                <Plus size={16} className="mr-2" />
                Create Daily Plan
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessonPlans.map((plan) => (
            <Card key={plan.id} hover>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Badge variant={plan.status === 'APPROVED' ? 'success' : plan.status === 'DRAFT' ? 'warning' : plan.status === 'SUBMITTED' ? 'info' : 'danger'}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(plan.status)}
                      {plan.status}
                    </span>
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => exportToExcel(plan, plan.lesson_steps || [])}>
                      <Download size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => viewPlan(plan)}>
                      <Eye size={16} />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-3 line-clamp-2">{plan.lesson_topic || 'Untitled Lesson'}</CardTitle>
                <CardDescription>
                  {plan.class?.grade_name} • {plan.subject?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(plan.lesson_date)}</span>
                    <Clock className="h-4 w-4 ml-2" />
                    <span>{plan.lesson_duration || 'Not set'}</span>
                  </div>
                  {plan.cognitive_objective && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      <span className="font-medium">Objective:</span> {plan.cognitive_objective}
                    </p>
                  )}
                  {plan.term && (
                    <p className="text-xs text-gray-500">
                      Term: {plan.term.term_name?.replace('_', ' ')} {plan.term.year}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => viewPlan(plan)}>
                  <Eye size={16} className="mr-2" />
                  View
                </Button>
                {plan.status === 'DRAFT' && (
                  <>
                    <Button variant="outline" className="flex-1" onClick={() => handleUpdateStatus(plan.id, 'daily', 'SUBMITTED')}>
                      <Send size={16} className="mr-2" />
                      Submit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id, 'daily')}>
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }

    // List view
    return (
      <div className="space-y-3" ref={printRef}>
        {filteredLessonPlans.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <Badge variant={plan.status === 'APPROVED' ? 'success' : plan.status === 'DRAFT' ? 'warning' : plan.status === 'SUBMITTED' ? 'info' : 'danger'}>
                    {plan.status}
                  </Badge>
                  <span className="text-sm text-gray-500">{formatDate(plan.lesson_date)}</span>
                  <span className="text-sm text-gray-500">{plan.lesson_duration}</span>
                </div>
                <h3 className="font-semibold text-lg truncate">{plan.lesson_topic || 'Untitled Lesson'}</h3>
                <p className="text-sm text-gray-600">
                  {plan.class?.grade_name} • {plan.subject?.name}
                  {plan.term && ` • ${plan.term.term_name?.replace('_', ' ')} ${plan.term.year}`}
                </p>
                {plan.cognitive_objective && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{plan.cognitive_objective}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => exportToExcel(plan, plan.lesson_steps || [])}>
                  <Download size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => viewPlan(plan)}>
                  <Eye size={16} />
                </Button>
                {plan.status === 'DRAFT' && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(plan.id, 'daily', 'SUBMITTED')}>
                      <Send size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id, 'daily')}>
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // ==================== MAIN RENDER ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="animate-spin h-12 w-12 text-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-600">Loading lesson plans...</p>
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
        <main className="flex-1 p-6">
          {/* Notifications */}
          {error && (
            <Alert variant="error" className="mb-6" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mb-6" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Teaching Plans</h1>
                <p className="text-gray-600 mt-2">Create and manage your daily, weekly, termly, and yearly lesson plans</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={() => { setRefreshing(true); fetchData(); }}>
                  <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" onClick={handleExportAll}>
                  <FileSpreadsheet size={18} className="mr-2" />
                  Export All
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer size={18} className="mr-2" />
                  Print
                </Button>
                <Button onClick={() => openCreateModal('daily')}>
                  <Plus size={18} className="mr-2" />
                  New Plan
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <StatCard 
                icon={Calendar} 
                label="Daily Plans" 
                value={stats.daily.total} 
                color="bg-blue-500"
                onClick={() => setActiveTab('daily')}
              />
              <StatCard 
                icon={CalendarDays} 
                label="Weekly Plans" 
                value={stats.weekly.total} 
                color="bg-green-500"
                onClick={() => setActiveTab('weekly')}
              />
              <StatCard 
                icon={BookMarked} 
                label="Termly Plans" 
                value={stats.termly.total} 
                color="bg-purple-500"
                onClick={() => setActiveTab('termly')}
              />
              <StatCard 
                icon={Calendar} 
                label="Yearly Plans" 
                value={stats.yearly.total} 
                color="bg-orange-500"
                onClick={() => setActiveTab('yearly')}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex space-x-8 overflow-x-auto pb-1">
              {[
                { key: 'daily', label: 'Daily Plans', icon: Calendar, count: stats.daily.total },
                { key: 'weekly', label: 'Weekly Plans', icon: CalendarDays, count: stats.weekly.total },
                { key: 'termly', label: 'Termly Plans', icon: BookMarked, count: stats.termly.total },
                { key: 'yearly', label: 'Yearly Plans', icon: Calendar, count: stats.yearly.total },
              ].map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === key 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={20} />
                  {label}
                  <Badge variant="default" className="ml-1">
                    {count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  ref={searchInputRef as any}
                  placeholder="Search by topic, subject, or grade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as PlanStatus | 'ALL')}
                className="w-36"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </Select>
              {classes.length > 0 && (
                <Select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-40"
                >
                  <option value="ALL">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.grade_name}</option>
                  ))}
                </Select>
              )}
              {subjects.length > 0 && (
                <Select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-48"
                >
                  <option value="ALL">All Subjects</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </Select>
              )}
              {(filterStatus !== 'ALL' || filterClass !== 'ALL' || filterSubject !== 'ALL' || filterTerm !== 'ALL' || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <FilterX size={16} className="mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="px-3"
                >
                  <Grid size={16} />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-3"
                >
                  <List size={16} />
                </Button>
              </div>
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  variant={sortField === 'date' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (sortField === 'date') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('date');
                      setSortOrder('desc');
                    }
                  }}
                  className="px-3"
                >
                  <ArrowUpDown size={14} className="mr-1" />
                  Date
                </Button>
                <Button
                  variant={sortField === 'topic' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (sortField === 'topic') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('topic');
                      setSortOrder('asc');
                    }
                  }}
                  className="px-3"
                >
                  Topic
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          {activeTab === 'daily' && renderDailyPlans()}
          
          {activeTab === 'weekly' && (
            <div className="space-y-6">
              {filteredTermPlans.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CalendarDays className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-700">No weekly plans found</h4>
                    <p className="text-gray-500 mt-2">
                      {searchQuery || filterStatus !== 'ALL' ? 'Try adjusting your filters' : 'Create your first weekly plan to get started'}
                    </p>
                    <Button onClick={() => openCreateModal('weekly')} className="mt-4">
                      <Plus size={16} className="mr-2" />
                      Create Weekly Plan
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredTermPlans.map((plan) => (
                  <Card key={plan.id} hover>
                    <CardHeader>
                      <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                          <Badge variant={plan.status === 'APPROVED' ? 'success' : plan.status === 'DRAFT' ? 'warning' : plan.status === 'SUBMITTED' ? 'info' : 'danger'}>
                            {plan.status}
                          </Badge>
                          <CardTitle className="mt-2">
                            {plan.class?.grade_name} - {plan.subject?.name}
                          </CardTitle>
                          <CardDescription>
                            {plan.term ? `${plan.term.term_name?.replace('_', ' ')} ${plan.term.year}` : 'Term not set'}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => viewPlan(plan)}>
                            <Eye size={16} />
                          </Button>
                          {plan.status === 'DRAFT' && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id, 'weekly')}>
                              <Trash2 size={16} className="text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4 line-clamp-2">{plan.general_objectives}</p>
                      {plan.weeks && plan.weeks.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2 text-sm">Weekly Breakdown</h4>
                          <div className="space-y-2">
                            {plan.weeks.slice(0, 3).map((week) => (
                              <div key={week.id} className="flex items-center gap-2 text-sm text-gray-600">
                                <ChevronRight size={14} />
                                <span>Week {week.week_no}: {week.topic || 'No topic set'}</span>
                              </div>
                            ))}
                            {plan.weeks.length > 3 && (
                              <p className="text-sm text-indigo-600">+{plan.weeks.length - 3} more weeks</p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <div className="flex justify-between items-center w-full">
                        <p className="text-xs text-gray-500">Created: {formatDateTime(plan.created_at)}</p>
                        {plan.status === 'DRAFT' && (
                          <Button size="sm" onClick={() => handleUpdateStatus(plan.id, 'weekly', 'SUBMITTED')}>
                            <Send size={14} className="mr-2" />
                            Submit for Review
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'termly' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTermPlans.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-12 text-center">
                    <BookMarked className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-700">No termly plans found</h4>
                    <Button onClick={() => openCreateModal('termly')} className="mt-4">
                      <Plus size={16} className="mr-2" />
                      Create Termly Plan
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredTermPlans.map((plan) => (
                  <Card key={plan.id} hover>
                    <CardHeader>
                      <Badge variant={plan.status === 'APPROVED' ? 'success' : plan.status === 'DRAFT' ? 'warning' : plan.status === 'SUBMITTED' ? 'info' : 'danger'}>
                        {plan.status}
                      </Badge>
                      <CardTitle className="mt-2 line-clamp-1">
                        {plan.class?.grade_name} - {plan.subject?.name}
                      </CardTitle>
                      <CardDescription>
                        {plan.term ? `${plan.term.term_name?.replace('_', ' ')} ${plan.term.year}` : 'Term not set'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-3">{plan.general_objectives}</p>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => viewPlan(plan)}>
                        <Eye size={16} className="mr-2" />
                        View
                      </Button>
                      {plan.status === 'DRAFT' && (
                        <Button className="flex-1" onClick={() => handleUpdateStatus(plan.id, 'termly', 'SUBMITTED')}>
                          <Send size={16} className="mr-2" />
                          Submit
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'yearly' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredYearPlans.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-12 text-center">
                    <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-700">No yearly plans found</h4>
                    <Button onClick={() => openCreateModal('yearly')} className="mt-4">
                      <Plus size={16} className="mr-2" />
                      Create Yearly Plan
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredYearPlans.map((plan) => (
                  <Card key={plan.id} hover>
                    <CardHeader>
                      <Badge variant={plan.status === 'APPROVED' ? 'success' : plan.status === 'DRAFT' ? 'warning' : plan.status === 'SUBMITTED' ? 'info' : 'danger'}>
                        {plan.status}
                      </Badge>
                      <CardTitle className="mt-2">Year {plan.academic_year}</CardTitle>
                      <CardDescription>
                        {plan.class?.grade_name} • {plan.subject?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-3">{plan.overview}</p>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => viewPlan(plan)}>
                        <Eye size={16} className="mr-2" />
                        View
                      </Button>
                      {plan.status === 'DRAFT' && (
                        <Button className="flex-1" onClick={() => handleUpdateStatus(plan.id, 'yearly', 'SUBMITTED')}>
                          <Send size={16} className="mr-2" />
                          Submit
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <CreatePlanModal
          type={modalType}
          subjects={subjects}
          classes={classes}
          topics={topics}
          terms={terms}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePlan}
          saving={saving}
        />
      )}

      {/* View Plan Modal */}
      {showViewModal && selectedPlan && (
        <ViewPlanModal
          plan={selectedPlan}
          type={activeTab}
          onClose={() => setShowViewModal(false)}
          onStatusUpdate={(status) => handleUpdateStatus(selectedPlan.id, activeTab, status)}
          onExport={() => exportToExcel(selectedPlan, selectedPlan.lesson_steps || [])}
        />
      )}
    </div>
  );
}

// Export function (needs to be defined before usage)
const exportToExcel = (lessonPlan: any, steps: any[]) => {
  const workbook = XLSX.utils.book_new();
  
  const mainSheetData = [
    ['PRIMARY SCHOOL LESSON PLAN'],
    [],
    [`School: ${lessonPlan.school_name || ''}`],
    [`Teacher: ${lessonPlan.teacher_name || ''}`],
    [`Class: ${lessonPlan.class?.grade_name || ''}`],
    [`Subject: ${lessonPlan.subject?.name || ''}`],
    [`Date: ${formatDate(lessonPlan.lesson_date)}`],
    [`Duration: ${lessonPlan.lesson_duration || ''}`],
    [`Topic: ${lessonPlan.lesson_topic || ''}`],
    [`Sub-Theme: ${lessonPlan.sub_theme || ''}`],
    [],
    ['LESSON OBJECTIVES'],
    [`Cognitive: ${lessonPlan.cognitive_objective || ''}`],
    [`Psychomotor: ${lessonPlan.psychomotor_objective || ''}`],
    [`Affective: ${lessonPlan.affective_objective || ''}`],
    [],
    ['COMPETENCIES & LIFE SKILLS'],
    [`Competencies: ${lessonPlan.competencies || ''}`],
    [`Life Skills & Values: ${lessonPlan.life_skills_values || ''}`],
    [],
    ['INSTRUCTIONAL MATERIALS'],
    [lessonPlan.instructional_materials || ''],
    [],
    ['LESSON DELIVERY'],
    ['Step', 'Step Name', 'Duration', 'Teacher Activity', 'Learner Activity'],
    ...steps.map((step, idx) => [
      idx + 1,
      step.step_name,
      step.duration,
      step.teacher_activity,
      step.learner_activity
    ]),
    [],
    ['EVALUATION'],
    [`Method: ${lessonPlan.evaluation_method || ''}`],
    [`Task: ${lessonPlan.evaluation_task || ''}`],
    [],
    ['TEACHER\'S SELF EVALUATION'],
    [`What went well?: ${lessonPlan.self_eval_what_went_well || ''}`],
    [`Learners achieved objective: ${lessonPlan.self_eval_achieved_count || 0}`],
    [`Improvements needed: ${lessonPlan.self_eval_improvements || ''}`],
  ];
  
  const mainSheet = XLSX.utils.aoa_to_sheet(mainSheetData);
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Lesson Plan');
  
  // Set column widths
  mainSheet['!cols'] = [
    { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 30 }
  ];
  
  XLSX.writeFile(workbook, `lesson_plan_${lessonPlan.lesson_topic || 'untitled'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

// CreatePlanModal Component (simplified version - you can keep your existing implementation)
const CreatePlanModal: React.FC<{
  type: 'daily' | 'weekly' | 'termly' | 'yearly';
  subjects: Subject[];
  classes: Class[];
  topics: Topic[];
  terms: Term[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  saving: boolean;
}> = ({ type, subjects, classes, topics, terms, onClose, onSubmit, saving }) => {
  const [formData, setFormData] = useState<any>({ status: 'DRAFT' });
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [weeks, setWeeks] = useState<any[]>([{ week_no: 1, topic: '', subtopics: '', learning_outcomes: '', teaching_methods: '', learning_activities: '', resources: '', assessment: '', remarks: '' }]);

  useEffect(() => {
    if (formData.class_id) {
      const filtered = subjects.filter(s => s.grade_id === parseInt(formData.class_id));
      setFilteredSubjects(filtered);
      setFormData(prev => ({ ...prev, subject_id: '', topic_id: '' }));
      setFilteredTopics([]);
    } else {
      setFilteredSubjects([]);
    }
  }, [formData.class_id, subjects]);

  useEffect(() => {
    if (formData.subject_id && formData.class_id) {
      const filtered = topics.filter(t => t.subject_id === parseInt(formData.subject_id) && t.grade_id === parseInt(formData.class_id));
      setFilteredTopics(filtered);
    } else {
      setFilteredTopics([]);
    }
  }, [formData.subject_id, formData.class_id, topics]);

  const handleAddWeek = () => {
    setWeeks([...weeks, { week_no: weeks.length + 1, topic: '', subtopics: '', learning_outcomes: '', teaching_methods: '', learning_activities: '', resources: '', assessment: '', remarks: '' }]);
  };

  const handleRemoveWeek = (index: number) => {
    setWeeks(weeks.filter((_, i) => i !== index));
  };

  const handleWeekChange = (index: number, field: string, value: string) => {
    const updatedWeeks = [...weeks];
    updatedWeeks[index][field] = value;
    setWeeks(updatedWeeks);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, weeks: type === 'weekly' ? weeks : undefined });
  };

  const getTitle = () => {
    switch (type) {
      case 'daily': return 'Create Daily Lesson Plan';
      case 'weekly': return 'Create Weekly Plan';
      case 'termly': return 'Create Termly Plan';
      case 'yearly': return 'Create Yearly Plan';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              <X size={20} />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label required>Grade / Class</Label>
              <Select
                value={formData.class_id?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                required
                disabled={saving}
              >
                <option value="">Select Grade/Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.grade_name}</option>
                ))}
              </Select>
            </div>
            
            <div>
              <Label required>Subject</Label>
              <Select
                value={formData.subject_id?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                disabled={!formData.class_id || saving}
                required
              >
                <option value="">{!formData.class_id ? 'Select grade first' : 'Select subject'}</option>
                {filteredSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </Select>
            </div>
            
            <div>
              <Label>Topic</Label>
              <Select
                value={formData.topic_id?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                disabled={!formData.subject_id || saving}
              >
                <option value="">{!formData.subject_id ? 'Select subject first' : 'Select topic (optional)'}</option>
                {filteredTopics.map(topic => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Add other form fields based on type - similar to your existing implementation */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
              {saving ? 'Saving...' : 'Save as Draft'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ViewPlanModal Component
const ViewPlanModal: React.FC<{
  plan: any;
  type: string;
  onClose: () => void;
  onStatusUpdate: (status: string) => void;
  onExport: () => void;
}> = ({ plan, type, onClose, onStatusUpdate, onExport }) => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'objectives', label: 'Objectives', icon: Target },
    { id: 'content', label: 'Content', icon: BookOpen },
    { id: 'assessment', label: 'Assessment', icon: Award },
    { id: 'evaluation', label: 'Evaluation', icon: BarChart },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{plan.lesson_topic || 'Lesson Plan'}</h2>
              <p className="text-gray-600 mt-1">
                {plan.class?.grade_name} • {plan.subject?.name} • {formatDate(plan.lesson_date)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download size={16} className="mr-2" />
                Export
              </Button>
              <Button variant="ghost" onClick={onClose}>
                <X size={20} />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-200">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeSection === id
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {activeSection === 'overview' && (
            <>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Lesson Details</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div><span className="text-sm text-gray-500">Date:</span> <span className="font-medium">{formatDate(plan.lesson_date)}</span></div>
                  <div><span className="text-sm text-gray-500">Duration:</span> <span className="font-medium">{plan.lesson_duration}</span></div>
                  <div><span className="text-sm text-gray-500">Theme:</span> <span className="font-medium">{plan.theme || '—'}</span></div>
                  <div><span className="text-sm text-gray-500">Sub-theme:</span> <span className="font-medium">{plan.sub_theme || '—'}</span></div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                <div className="flex items-center gap-3">
                  <Badge variant={plan.status === 'APPROVED' ? 'success' : plan.status === 'DRAFT' ? 'warning' : plan.status === 'SUBMITTED' ? 'info' : 'danger'}>
                    {plan.status}
                  </Badge>
                  {plan.status === 'DRAFT' && (
                    <Button size="sm" onClick={() => onStatusUpdate('SUBMITTED')}>
                      <Send size={14} className="mr-2" />
                      Submit for Review
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {activeSection === 'objectives' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Cognitive Objective</h3>
                <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{plan.cognitive_objective || 'Not specified'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Psychomotor Objective</h3>
                <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{plan.psychomotor_objective || 'Not specified'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Affective Objective</h3>
                <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{plan.affective_objective || 'Not specified'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Competencies</h3>
                <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{plan.competencies || 'Not specified'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Life Skills & Values</h3>
                <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{plan.life_skills_values || 'Not specified'}</p>
              </div>
            </div>
          )}

          {activeSection === 'content' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Instructional Materials</h3>
                <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{plan.instructional_materials || 'Not specified'}</p>
              </div>
              {plan.lesson_steps && plan.lesson_steps.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Lesson Steps</h3>
                  <div className="space-y-3">
                    {plan.lesson_steps.map((step: any, idx: number) => (
                      <div key={step.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">Step {idx + 1}: {step.step_name}</span>
                          <span className="text-sm text-gray-500">{step.duration}</span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div><span className="text-gray-500">Teacher Activity:</span> {step.teacher_activity}</div>
                          <div><span className="text-gray-500">Learner Activity:</span> {step.learner_activity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'assessment' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Evaluation Method</h3>
                <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{plan.evaluation_method || 'Not specified'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Evaluation Task</h3>
                <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{plan.evaluation_task || 'Not specified'}</p>
              </div>
            </div>
          )}

          {activeSection === 'evaluation' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Self Evaluation</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">What went well?</span>
                    <p className="mt-1">{plan.self_eval_what_went_well || 'Not evaluated yet'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Learners achieved objective</span>
                    <p className="mt-1">{plan.self_eval_achieved_count || 0} out of {plan.class?.student_count || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">What needs to be improved?</span>
                    <p className="mt-1">{plan.self_eval_improvements || 'Not evaluated yet'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
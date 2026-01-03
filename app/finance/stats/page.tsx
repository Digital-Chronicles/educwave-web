'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  Filter,
  Search,
  Wallet,
  AlertTriangle,
  RefreshCw,
  Download,
  X,
  Loader2,
} from 'lucide-react';

// Types
type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
type FeeTerm = 'T1' | 'T2' | 'T3';
type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue';
type PayMethod = 'cash' | 'card' | 'online_transfer' | 'mobile_money' | 'bank';

interface Profile {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  school_id: string | null;
}

interface School {
  id: string;
  school_name: string;
}

interface Grade {
  id: number;
  grade_name: string;
}

interface FeeTransaction {
  id: number;
  grade_id: number | null;
  student_tuition_id: number;
  school_id: string | null;
  term: FeeTerm | null;
  academic_year: string | null;
  amount_due: number;
  amount_paid: number;
  payment_method: PayMethod;
  status: FeeStatus;
  due_date: string | null;
  last_payment_date: string | null;
  payment_reference: string | null;
  receipt_url: string | null;
  remarks: string | null;
  created: string;
  updated: string;
  grade?: { grade_name: string } | null;
  student_tuition?: {
    id: number;
    student_id: string;
    total_fee: number;
    student?: { registration_id: string; first_name: string; last_name: string } | null;
  } | null;
}

interface TuitionProfile {
  id: number;
  student_id: string;
  total_fee: number;
  school_id: string | null;
  student?: { registration_id: string; first_name: string; last_name: string } | null;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  term: string;
  academicYear: string;
  gradeId: string;
  status: string;
  method: string;
  search: string;
}

interface KPI {
  totalDue: number;
  totalPaid: number;
  totalOutstanding: number;
  collectionRate: number;
  totalTransactions: number;
  totalStudents: number;
  averagePayment: number;
}

interface MonthlyData {
  month: string;
  paid: number;
  transactions: number;
  students: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
  amount: number;
}

interface MethodBreakdown {
  method: string;
  count: number;
  amount: number;
}

interface Debtor {
  studentId: string;
  name: string;
  registrationId: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
}

// Utility functions
const safeNum = (value: any): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (amount: number): string => {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
};

const clamp = (value: number, min = 0, max = 1): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const dateAtStart = (dateStr: string): Date => {
  return new Date(dateStr + 'T00:00:00');
};

const dateAtEnd = (dateStr: string): Date => {
  return new Date(dateStr + 'T23:59:59');
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Default filters
const DEFAULT_FILTERS: Filters = {
  dateFrom: '',
  dateTo: '',
  term: '',
  academicYear: '',
  gradeId: '',
  status: '',
  method: '',
  search: '',
};

export default function FinanceStatsPage() {
  const router = useRouter();
  
  // State
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [tuitionProfiles, setTuitionProfiles] = useState<TuitionProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  // Authentication check
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/');
        return;
      }
      setUserEmail(data.session.user.email ?? null);
      setAuthChecking(false);
    } catch (err) {
      console.error('Auth error:', err);
      router.replace('/');
    }
  };

  // Load data
  useEffect(() => {
    if (authChecking) return;
    loadData();
  }, [authChecking]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, role, school_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('Profile not found');
      
      setProfile(profileData as Profile);

      if (!profileData.school_id) {
        setSchool(null);
        return;
      }

      // Load school
      const { data: schoolData, error: schoolError } = await supabase
        .from('general_information')
        .select('id, school_name')
        .eq('id', profileData.school_id)
        .single();

      if (schoolError) throw schoolError;
      if (!schoolData) throw new Error('School not found');
      
      setSchool(schoolData as School);

      // Load grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('class')
        .select('id, grade_name')
        .eq('school_id', schoolData.id)
        .order('grade_name');

      if (gradesError) throw gradesError;
      setGrades((gradesData || []) as Grade[]);

      // Load all data
      await Promise.all([
        loadTuitionData(schoolData.id),
        loadTransactionData(schoolData.id),
      ]);

    } catch (err: any) {
      console.error('Load error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadTuitionData = async (schoolId: string) => {
    const { data, error } = await supabase
      .from('student_tuition_description')
      .select(`
        id,
        student_id,
        total_fee,
        school_id,
        student:students ( registration_id, first_name, last_name )
      `)
      .eq('school_id', schoolId);

    if (error) throw error;
    setTuitionProfiles((data || []) as unknown as TuitionProfile[]);
  };

  const loadTransactionData = async (schoolId: string) => {
    const { data, error } = await supabase
      .from('fee_transaction')
      .select(`
        id,
        grade_id,
        student_tuition_id,
        school_id,
        term,
        academic_year,
        amount_due,
        amount_paid,
        payment_method,
        due_date,
        status,
        last_payment_date,
        payment_reference,
        receipt_url,
        remarks,
        created,
        updated,
        grade:class ( grade_name ),
        student_tuition:student_tuition_description (
          id,
          student_id,
          total_fee,
          student:students ( registration_id, first_name, last_name )
        )
      `)
      .eq('school_id', schoolId)
      .order('created', { ascending: false })
      .limit(5000);

    if (error) throw error;
    setTransactions((data || []) as unknown as FeeTransaction[]);
  };

  const handleRefresh = async () => {
    if (!school?.id) return;
    
    setRefreshing(true);
    setError(null);
    
    try {
      await Promise.all([
        loadTuitionData(school.id),
        loadTransactionData(school.id),
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    if (filteredTransactions.length === 0) return;
    
    setExporting(true);
    try {
      const headers = ['ID', 'Student Name', 'Registration ID', 'Amount Due', 'Amount Paid', 'Balance', 'Status', 'Payment Method', 'Date', 'Reference'];
      const rows = filteredTransactions.map(tx => [
        tx.id,
        `${tx.student_tuition?.student?.first_name || ''} ${tx.student_tuition?.student?.last_name || ''}`.trim(),
        tx.student_tuition?.student?.registration_id || '',
        tx.amount_due,
        tx.amount_paid,
        tx.amount_due - tx.amount_paid,
        tx.status,
        tx.payment_method,
        tx.created,
        tx.payment_reference || '',
      ]);

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `finance-report-${formatDate(new Date())}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const { dateFrom, dateTo, term, academicYear, gradeId, status, method, search } = filters;
    const searchTerm = search.trim().toLowerCase();

    return transactions.filter(tx => {
      // Date filter
      if (dateFrom && tx.created) {
        const createdDate = new Date(tx.created + 'T00:00:00');
        if (createdDate < dateAtStart(dateFrom)) return false;
      }
      
      if (dateTo && tx.created) {
        const createdDate = new Date(tx.created + 'T00:00:00');
        if (createdDate > dateAtEnd(dateTo)) return false;
      }

      // Other filters
      if (term && tx.term !== term) return false;
      if (academicYear && tx.academic_year !== academicYear) return false;
      if (gradeId && String(tx.grade_id) !== gradeId) return false;
      if (status && tx.status !== status) return false;
      if (method && tx.payment_method !== method) return false;

      // Search
      if (searchTerm) {
        const studentName = tx.student_tuition?.student 
          ? `${tx.student_tuition.student.first_name} ${tx.student_tuition.student.last_name}`.toLowerCase()
          : '';
        const registrationId = tx.student_tuition?.student?.registration_id?.toLowerCase() || '';
        const reference = tx.payment_reference?.toLowerCase() || '';
        
        if (!studentName.includes(searchTerm) && 
            !registrationId.includes(searchTerm) && 
            !reference.includes(searchTerm) &&
            !String(tx.id).includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, filters]);

  // Calculate KPIs
  const kpis = useMemo((): KPI => {
    const totalDue = tuitionProfiles.reduce((sum, profile) => sum + safeNum(profile.total_fee), 0);
    
    // Calculate total paid per student
    const paidPerStudent = new Map<number, number>();
    transactions.forEach(tx => {
      const current = paidPerStudent.get(tx.student_tuition_id) || 0;
      paidPerStudent.set(tx.student_tuition_id, current + safeNum(tx.amount_paid));
    });
    
    const totalPaid = Array.from(paidPerStudent.values()).reduce((sum, amount) => sum + amount, 0);
    const totalOutstanding = Math.max(0, totalDue - totalPaid);
    const collectionRate = totalDue > 0 ? totalPaid / totalDue : 0;
    
    const totalStudents = new Set(transactions.map(tx => tx.student_tuition_id)).size;
    const averagePayment = filteredTransactions.length > 0 
      ? filteredTransactions.reduce((sum, tx) => sum + safeNum(tx.amount_paid), 0) / filteredTransactions.length
      : 0;

    return {
      totalDue,
      totalPaid,
      totalOutstanding,
      collectionRate,
      totalTransactions: filteredTransactions.length,
      totalStudents,
      averagePayment,
    };
  }, [tuitionProfiles, transactions, filteredTransactions]);

  // Monthly data - FIXED VERSION
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, {
      paid: number;
      transactions: number;
      studentIds: Set<number>;
    }>();
    
    filteredTransactions.forEach(tx => {
      if (!tx.created) return;
      
      const date = new Date(tx.created + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthEntry = monthMap.get(monthKey) || {
        paid: 0,
        transactions: 0,
        studentIds: new Set<number>(),
      };
      
      monthEntry.paid += safeNum(tx.amount_paid);
      monthEntry.transactions += 1;
      monthEntry.studentIds.add(tx.student_tuition_id);
      
      monthMap.set(monthKey, monthEntry);
    });

    return Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        paid: data.paid,
        transactions: data.transactions,
        students: data.studentIds.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [filteredTransactions]);

  // Status breakdown
  const statusBreakdown = useMemo((): StatusBreakdown[] => {
    const breakdown = new Map<string, { count: number; amount: number }>();
    
    filteredTransactions.forEach(tx => {
      const status = tx.status || 'unknown';
      const current = breakdown.get(status) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += safeNum(tx.amount_paid);
      breakdown.set(status, current);
    });
    
    return Array.from(breakdown.entries())
      .map(([status, data]) => ({
        status,
        count: data.count,
        amount: data.amount,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredTransactions]);

  // Method breakdown
  const methodBreakdown = useMemo((): MethodBreakdown[] => {
    const breakdown = new Map<string, { count: number; amount: number }>();
    
    filteredTransactions.forEach(tx => {
      const method = tx.payment_method || 'unknown';
      const current = breakdown.get(method) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += safeNum(tx.amount_paid);
      breakdown.set(method, current);
    });
    
    return Array.from(breakdown.entries())
      .map(([method, data]) => ({
        method,
        count: data.count,
        amount: data.amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  // Top debtors
  const topDebtors = useMemo((): Debtor[] => {
    const debtorMap = new Map<number, Omit<Debtor, 'balance'>>();
    
    // Map tuition profiles
    tuitionProfiles.forEach(profile => {
      const studentName = profile.student 
        ? `${profile.student.first_name} ${profile.student.last_name}`
        : 'Unknown Student';
      
      debtorMap.set(profile.id, {
        studentId: profile.student_id,
        name: studentName,
        registrationId: profile.student?.registration_id || '',
        totalDue: safeNum(profile.total_fee),
        totalPaid: 0,
      });
    });
    
    // Add payments
    transactions.forEach(tx => {
      const debtor = debtorMap.get(tx.student_tuition_id);
      if (debtor) {
        debtor.totalPaid += safeNum(tx.amount_paid);
      }
    });
    
    return Array.from(debtorMap.values())
      .filter(debtor => debtor.totalDue > debtor.totalPaid)
      .map(debtor => ({
        ...debtor,
        balance: debtor.totalDue - debtor.totalPaid,
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);
  }, [tuitionProfiles, transactions]);

  // Filter handlers
  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Loading state
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading Finance Statistics...</p>
        </div>
      </div>
    );
  }

  // No school configuration
  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">School Configuration Required</h3>
              <p className="text-gray-600 mb-6">
                Your account must be linked to a school before you can view finance statistics.
              </p>
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Settings
              </button>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <p className="mt-4 text-xs text-gray-500">
                Signed in as <span className="font-medium">{userEmail ?? '—'}</span>
              </p>
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
        
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => router.push('/finance')}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Finance Analytics</h1>
                  </div>
                  <p className="text-gray-600">
                    Dashboard for <span className="font-medium">{school.school_name}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExport}
                    disabled={exporting || filteredTransactions.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Export CSV
                  </button>
                  
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 disabled:opacity-50"
                  >
                    {refreshing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Refresh
                  </button>
                  
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700"
                  >
                    <Filter className="w-4 h-4" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">Filter Data</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Date Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => updateFilter('dateFrom', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => updateFilter('dateTo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Term</label>
                    <select
                      value={filters.term}
                      onChange={(e) => updateFilter('term', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">All Terms</option>
                      <option value="T1">Term 1</option>
                      <option value="T2">Term 2</option>
                      <option value="T3">Term 3</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Academic Year</label>
                    <input
                      type="text"
                      value={filters.academicYear}
                      onChange={(e) => updateFilter('academicYear', e.target.value)}
                      placeholder="e.g., 2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Grade</label>
                    <select
                      value={filters.gradeId}
                      onChange={(e) => updateFilter('gradeId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">All Grades</option>
                      {grades.map(grade => (
                        <option key={grade.id} value={grade.id}>
                          {grade.grade_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => updateFilter('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Payment Method</label>
                    <select
                      value={filters.method}
                      onChange={(e) => updateFilter('method', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">All Methods</option>
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Card</option>
                      <option value="online_transfer">Online Transfer</option>
                    </select>
                  </div>
                  
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-2">Search</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        placeholder="Search by student name, registration ID, or reference..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="lg:col-span-4 flex items-end gap-2">
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm text-gray-700"
                    >
                      Reset Filters
                    </button>
                    <div className="text-xs text-gray-500 ml-auto">
                      Showing {filteredTransactions.length} of {transactions.length} transactions
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">Total Due</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalDue)}</div>
                <div className="text-xs text-gray-500 mt-1">School-wide tuition fees</div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">Total Collected</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalPaid)}</div>
                <div className="text-xs text-gray-500 mt-1">All payment records</div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">Outstanding</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalOutstanding)}</div>
                <div className="text-xs text-gray-500 mt-1">Balance remaining</div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">Collection Rate</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {(kpis.collectionRate * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Paid vs Due</div>
                <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-2 bg-purple-600 transition-all duration-300"
                    style={{ width: `${clamp(kpis.collectionRate) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Monthly Trend */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-5 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900">Monthly Collection Trend</h2>
                  <p className="text-xs text-gray-500">Last 12 months of payments</p>
                </div>
                <div className="p-5">
                  {monthlyData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No data available for the selected filters
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {monthlyData.map(month => {
                        const maxPaid = Math.max(...monthlyData.map(m => m.paid));
                        const percentage = maxPaid > 0 ? (month.paid / maxPaid) * 100 : 0;
                        
                        return (
                          <div key={month.month} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-700">{month.month}</span>
                              <span className="text-gray-600">{formatCurrency(month.paid)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{month.transactions} transactions</span>
                              <span>{month.students} students</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Breakdowns */}
              <div className="space-y-6">
                {/* Status Breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-5 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-900">Payment Status</h2>
                    <p className="text-xs text-gray-500">Distribution by status</p>
                  </div>
                  <div className="p-5 space-y-4">
                    {statusBreakdown.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No data</div>
                    ) : (
                      statusBreakdown.map(item => (
                        <div key={item.status} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700 capitalize">{item.status}</span>
                            <span className="text-gray-600">{item.count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-2 bg-gray-800 rounded-full transition-all duration-300"
                              style={{
                                width: `${(item.count / filteredTransactions.length) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(item.amount)} collected
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Method Breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-5 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-900">Payment Methods</h2>
                    <p className="text-xs text-gray-500">Top payment channels</p>
                  </div>
                  <div className="p-5 space-y-3">
                    {methodBreakdown.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No data</div>
                    ) : (
                      methodBreakdown.map(item => (
                        <div key={item.method} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700 capitalize">
                            {item.method.replace('_', ' ')}
                          </span>
                          <div className="text-right">
                            <div className="text-gray-900">{formatCurrency(item.amount)}</div>
                            <div className="text-xs text-gray-500">{item.count} payments</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Debtors */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Top Debtors</h2>
                  <p className="text-xs text-gray-500">Students with highest outstanding balances</p>
                </div>
                <span className="text-xs text-gray-500">{topDebtors.length} students</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Student</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Registration ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Total Due</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount Paid</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Balance</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Completion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {topDebtors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          No outstanding balances found
                        </td>
                      </tr>
                    ) : (
                      topDebtors.map(debtor => {
                        const completionRate = debtor.totalDue > 0 
                          ? debtor.totalPaid / debtor.totalDue 
                          : 0;
                          
                        return (
                          <tr key={debtor.studentId} className="hover:bg-gray-50">
                            <td className="py-4 px-4">
                              <div className="font-medium text-gray-900">{debtor.name}</div>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-700">{debtor.registrationId}</td>
                            <td className="py-4 px-4 text-sm text-gray-700">{formatCurrency(debtor.totalDue)}</td>
                            <td className="py-4 px-4 text-sm text-gray-700">{formatCurrency(debtor.totalPaid)}</td>
                            <td className="py-4 px-4">
                              <div className="font-semibold text-red-600">{formatCurrency(debtor.balance)}</div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                                  <div
                                    className="h-2 bg-green-600 rounded-full"
                                    style={{ width: `${clamp(completionRate) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600">
                                  {(completionRate * 100).toFixed(0)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 border-t border-gray-200 text-center">
                <button
                  onClick={() => router.push('/finance/outstanding')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all outstanding payments →
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
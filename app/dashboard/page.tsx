'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  Users,
  GraduationCap,
  CreditCard,
  AlertCircle,
  Clock,
  ChevronRight,
  DollarSign,
  Calendar,
  UserPlus,
  TrendingUp,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';

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

interface Student {
  registration_id: string;
  first_name: string;
  last_name: string;
  current_status: string | null;
  created: string;
  school_id?: string | null;
}

interface FeeTransaction {
  id: number;
  created: string;
  status: string;
  amount_paid: number;
  amount_due: number;
  payment_method: string;
  academic_year: string | null;
  term: string | null;
  school_id?: string | null;
}

interface ExamSession {
  id: number;
  exam_type: string;
  start_date: string;
  end_date: string;
  term: {
    year: number;
    term_name: string;
  } | null;
  school_id?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [studentsCount, setStudentsCount] = useState(0);
  const [teachersCount, setTeachersCount] = useState(0);
  const [feeTxCount, setFeeTxCount] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [recentFees, setRecentFees] = useState<FeeTransaction[]>([]);
  const [activeExams, setActiveExams] = useState<ExamSession[]>([]);

  // 1) Auth check
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

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // 2) Load profile + school + dashboard data (scoped)
  useEffect(() => {
    if (authChecking) return;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) throw userErr;
        if (!user) throw new Error('Could not find authenticated user.');

        // Profile (source of school_id + full_name)
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id')
          .eq('user_id', user.id)
          .single();

        if (pErr) throw pErr;
        if (!p) throw new Error('Profile not found for this user.');

        const prof = p as ProfileRow;
        setProfile(prof);

        // Name in UI
        const displayName =
          prof.full_name ||
          (user.user_metadata?.full_name as string | undefined) ||
          'Admin User';

        setUserName(displayName);

        if (!prof.school_id) {
          // Not linked to a school yet
          setSchool(null);
          setStudentsCount(0);
          setTeachersCount(0);
          setFeeTxCount(0);
          setTotalOutstanding(0);
          setRecentStudents([]);
          setRecentFees([]);
          setActiveExams([]);
          setLoading(false);
          return;
        }

        // Load school name
        const { data: s, error: sErr } = await supabase
          .from('general_information')
          .select('id, school_name')
          .eq('id', prof.school_id)
          .single();

        if (sErr) throw sErr;
        setSchool(s as SchoolRow);

        const schoolId = prof.school_id;

        // Counts (scoped)
        const [
          { count: sc, error: scErr },
          { count: tc, error: tcErr },
          { count: fc, error: fcErr },
        ] = await Promise.all([
          supabase
            .from('students')
            .select('registration_id', { count: 'exact', head: true })
            .eq('school_id', schoolId),
          supabase
            .from('teachers')
            .select('registration_id', { count: 'exact', head: true })
            .eq('school_id', schoolId),
          supabase
            .from('fee_transaction')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', schoolId),
        ]);

        if (!scErr && typeof sc === 'number') setStudentsCount(sc);
        if (!tcErr && typeof tc === 'number') setTeachersCount(tc);
        if (!fcErr && typeof fc === 'number') setFeeTxCount(fc);

        // Outstanding (scoped) — only NOT paid
        const { data: unpaidRows, error: unpaidErr } = await supabase
          .from('fee_transaction')
          .select('amount_due, status')
          .eq('school_id', schoolId)
          .neq('status', 'paid');

        if (unpaidErr) throw unpaidErr;

        const outstanding = (unpaidRows ?? []).reduce((sum: number, row: any) => {
          const due = Number(row?.amount_due ?? 0);
          return sum + (Number.isFinite(due) ? due : 0);
        }, 0);

        setTotalOutstanding(outstanding);

        // Recent students (scoped)
        const { data: studentsData, error: rsErr } = await supabase
          .from('students')
          .select('registration_id, first_name, last_name, current_status, created')
          .eq('school_id', schoolId)
          .order('created', { ascending: false })
          .limit(5);

        if (rsErr) throw rsErr;
        setRecentStudents((studentsData ?? []) as Student[]);

        // Recent fees (scoped)
        const { data: feesData, error: rfErr } = await supabase
          .from('fee_transaction')
          .select('id, created, status, amount_paid, amount_due, payment_method, academic_year, term')
          .eq('school_id', schoolId)
          .order('created', { ascending: false })
          .limit(5);

        if (rfErr) throw rfErr;
        setRecentFees((feesData ?? []) as FeeTransaction[]);

        // Active exams (scoped)
        const { data: examsData, error: exErr } = await supabase
          .from('exam_session')
          .select('id, exam_type, start_date, end_date, term:term_exam_session (year, term_name)')
          .eq('school_id', schoolId)
          .order('start_date', { ascending: true })
          .limit(5);

        if (exErr) throw exErr;
        setActiveExams((examsData ?? []) as any);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authChecking]);

  // 3) Loading screen
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-blue-600 to-orange-500 animate-pulse mb-4"></div>
          <p className="text-sm text-gray-600">Checking your session…</p>
        </div>
      </div>
    );
  }

  // 4) Not linked to a school
  if (profile && !profile.school_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">School setup required</h1>
              <p className="text-gray-600 mt-2">
                Your account is not linked to any school. Please go to Settings and connect your profile to a school.
              </p>

              {errorMsg && (
                <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{errorMsg}</p>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => router.push('/settings')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go to Settings
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
              </div>

              <p className="mt-5 text-xs text-gray-500">
                Signed in as <span className="font-medium">{userEmail ?? '—'}</span>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <div className="flex">
        <AppShell />

        <main className="flex-1 p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Welcome back, {userName?.split(' ')[0] || 'Admin'} 👋
                </h1>
                <p className="text-gray-600 mt-1">
                  {school?.school_name ? (
                    <>
                      Here&apos;s what&apos;s happening with <span className="font-medium">{school.school_name}</span> today.
                    </>
                  ) : (
                    "Here's what's happening with your school today."
                  )}
                </p>
              </div>

              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                <Clock size={16} />
                <span>{todayLabel}</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Students Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                  {loading ? '…' : 'Live'}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? '...' : studentsCount.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-600 mb-2">Total Students</p>
              <div className="flex items-center text-xs text-gray-500">
                <TrendingUp size={12} className="mr-1" />
                <span>School-scoped</span>
              </div>
            </div>

            {/* Teachers Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100">
                  <GraduationCap className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-50 text-orange-700">
                  {loading ? '…' : 'Live'}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? '...' : teachersCount.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-600 mb-2">Total Teachers</p>
              <div className="flex items-center text-xs text-gray-500">
                <UserPlus size={12} className="mr-1" />
                <span>School-scoped</span>
              </div>
            </div>

            {/* Transactions Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
                  <CreditCard className="h-6 w-6 text-gray-600" />
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-50 text-gray-700">
                  {loading ? '…' : 'Live'}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? '...' : feeTxCount.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-600 mb-2">Fee Transactions</p>
              <div className="flex items-center text-xs text-gray-500">
                <DollarSign size={12} className="mr-1" />
                <span>School-scoped</span>
              </div>
            </div>

            {/* Outstanding Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-700">
                  Requires action
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? '...' : `UGX ${Number(totalOutstanding).toLocaleString()}`}
              </h3>
              <p className="text-sm text-gray-600 mb-2">Outstanding Balance</p>
              <div className="flex items-center text-xs text-red-500">
                <AlertCircle size={12} className="mr-1" />
                <span>Unpaid balances (school only)</span>
              </div>
            </div>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Students */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Recent Students</h2>
                  <p className="text-sm text-gray-600 mt-1">Last 5 students registered</p>
                </div>
                <button
                  onClick={() => router.push('/students')}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all <ChevronRight size={16} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">
                        Reg. ID
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">
                        Name
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">
                        Status
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">
                        Registered
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          Loading students...
                        </td>
                      </tr>
                    ) : recentStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          No students found
                        </td>
                      </tr>
                    ) : (
                      recentStudents.map((student) => (
                        <tr
                          key={student.registration_id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono text-sm text-blue-600 font-medium">
                              {student.registration_id}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-blue-700">
                                  {student.first_name?.charAt(0) || 'S'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {student.first_name} {student.last_name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                student.current_status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}
                            >
                              {student.current_status || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatDate(student.created)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Exams */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Active Exams</h2>
                  <p className="text-sm text-gray-600 mt-1">Upcoming exam sessions</p>
                </div>
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading exams...</div>
                ) : activeExams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No active exams</div>
                ) : (
                  activeExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-4 rounded-xl border border-gray-200 hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{exam.exam_type} Exam</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {exam.term ? `${exam.term.term_name} • ${exam.term.year}` : 'No term'}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            exam.exam_type === 'BOT'
                              ? 'bg-blue-50 text-blue-700'
                              : exam.exam_type === 'MOT'
                              ? 'bg-orange-50 text-orange-700'
                              : 'bg-gray-50 text-gray-700'
                          }`}
                        >
                          {exam.exam_type}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock size={14} className="mr-2" />
                        <span>
                          {formatDate(exam.start_date)} - {formatDate(exam.end_date)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
                <p className="text-sm text-gray-600 mt-1">Latest fee payments</p>
              </div>
              <button
                onClick={() => router.push('/finance/fees')}
                className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all <ChevronRight size={16} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">
                      Date
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">
                      Amount Paid
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">
                      Balance
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4">
                      Method
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : recentFees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    recentFees.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-gray-600">{formatDate(tx.created)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              tx.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : tx.status === 'overdue'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">
                            UGX {Number(tx.amount_paid).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              Number(tx.amount_due) > 0 ? 'text-red-600' : 'text-gray-900'
                            }`}
                          >
                            UGX {Number(tx.amount_due).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {tx.payment_method || 'Not specified'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
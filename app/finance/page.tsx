'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  PieChart,
  Download,
  Search,
  Calendar,
  Eye,
  MoreVertical,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

// ---------- Types ----------
type UUID = string;

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';

interface ProfileRow {
  user_id: UUID;
  email: string | null;
  full_name: string | null; // ✅ matches DB
  role: AppRole;
  school_id: UUID | null;
  created_at: string;
  updated_at: string;
}

interface SchoolRow {
  id: UUID;
  school_name: string;
}

interface GradeSummary {
  grade_id: number;
  grade_name: string;
  expected: number;
  collected: number;
  outstanding: number;
  student_count: number;
}

interface Payment {
  id: number;
  student_name: string;
  grade: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'overdue';
  payment_method: string;
}

// ---------- Component ----------
export default function FinancePage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stats
  const [totalExpected, setTotalExpected] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [collectionRate, setCollectionRate] = useState(0);
  const [gradeSummaries, setGradeSummaries] = useState<GradeSummary[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'pending' | 'overdue'>('all');
  const [searchTx, setSearchTx] = useState('');

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `UGX ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`;
    }
  };

  // ✅ 1) Auth check
  useEffect(() => {
    const run = async () => {
      try {
        setAuthChecking(true);
        setErrorMsg(null);

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data.session;
        if (!session) {
          router.replace('/');
          return;
        }

        setUserEmail(session.user.email ?? null);
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message || 'Failed to check authentication.');
      } finally {
        setAuthChecking(false);
      }
    };

    run();
  }, [router]);

  // ✅ 2) Load profile + school + finance data
  useEffect(() => {
    if (authChecking) return;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const user = userRes.user;
        if (!user) {
          setErrorMsg('Could not find authenticated user.');
          return;
        }

        // ✅ profiles PK is user_id (uuid)
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id, created_at, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profErr) throw profErr;

        if (!prof) {
          setProfile(null);
          setSchool(null);
          setErrorMsg('User profile not found. Insert a row into profiles for this auth user.');
          return;
        }

        const profRow = prof as ProfileRow;
        setProfile(profRow);

        if (!profRow.school_id) {
          setSchool(null);
          setErrorMsg('Your profile is not linked to a school. Set profiles.school_id for this user.');
          return;
        }

        const { data: sch, error: schErr } = await supabase
          .from('general_information')
          .select('id, school_name')
          .eq('id', profRow.school_id)
          .maybeSingle();

        if (schErr) throw schErr;

        if (!sch) {
          setSchool(null);
          setErrorMsg('School record not found in general_information for this school_id.');
          return;
        }

        const schoolData = sch as SchoolRow;
        setSchool(schoolData);

        // ================================
        // A. Expected fees (tuition descriptions)
        // ================================
        const { data: tuitionRows, error: tuitionErr } = await supabase
          .from('student_tuition_description')
          .select(
            `
              id,
              total_fee,
              school_id,
              tuition:finance_schoolfees (
                id,
                grade:class ( id, grade_name )
              )
            `
          )
          .eq('school_id', schoolData.id);

        if (tuitionErr) throw tuitionErr;

        const tuitionData = (tuitionRows ?? []) as any[];

        // ================================
        // B. ALL transactions (accurate totals)
        // ================================
        const { data: allTxRows, error: allTxErr } = await supabase
          .from('fee_transaction')
          .select(
            `
              id,
              amount_paid,
              amount_due,
              payment_date,
              payment_method,
              school_id,
              grade:class ( id, grade_name ),
              student:students ( first_name, last_name )
            `
          )
          .eq('school_id', schoolData.id)
          .order('payment_date', { ascending: false });

        if (allTxErr) throw allTxErr;

        const allTransactions = (allTxRows ?? []) as any[];
        const recentTx = allTransactions.slice(0, 10);

        // ================================
        // C. Student counts per grade
        // ================================
        const { data: studentRows, error: studentErr } = await supabase
          .from('students')
          .select('grade_id')
          .eq('school_id', schoolData.id);

        if (studentErr) throw studentErr;

        const studentCounts = new Map<number, number>();
        (studentRows ?? []).forEach((s: any) => {
          const gid = Number(s.grade_id);
          if (!Number.isNaN(gid) && gid) studentCounts.set(gid, (studentCounts.get(gid) || 0) + 1);
        });

        // ================================
        // D. Totals
        // ================================
        let expectedTotal = 0;
        let collectedTotal = 0;

        for (const t of tuitionData) expectedTotal += Number(t.total_fee ?? 0);
        for (const tx of allTransactions) collectedTotal += Number(tx.amount_paid ?? 0);

        const outstandingTotal = expectedTotal - collectedTotal;
        const rate = expectedTotal > 0 ? (collectedTotal / expectedTotal) * 100 : 0;

        setTotalExpected(expectedTotal);
        setTotalCollected(collectedTotal);
        setTotalOutstanding(outstandingTotal);
        setCollectionRate(Number(rate.toFixed(1)));

        // ================================
        // E. Per-grade summaries
        // ================================
        const summaryMap = new Map<number, GradeSummary>();

        // Expected per grade
        for (const t of tuitionData) {
          const grade = t.tuition?.grade;
          if (!grade) continue;

          const gradeId = Number(grade.id);
          if (!summaryMap.has(gradeId)) {
            summaryMap.set(gradeId, {
              grade_id: gradeId,
              grade_name: grade.grade_name,
              expected: 0,
              collected: 0,
              outstanding: 0,
              student_count: studentCounts.get(gradeId) || 0,
            });
          }
          summaryMap.get(gradeId)!.expected += Number(t.total_fee ?? 0);
        }

        // Collected per grade
        for (const tx of allTransactions) {
          const grade = tx.grade;
          if (!grade) continue;

          const gradeId = Number(grade.id);
          if (!summaryMap.has(gradeId)) {
            summaryMap.set(gradeId, {
              grade_id: gradeId,
              grade_name: grade.grade_name,
              expected: 0,
              collected: 0,
              outstanding: 0,
              student_count: studentCounts.get(gradeId) || 0,
            });
          }
          summaryMap.get(gradeId)!.collected += Number(tx.amount_paid ?? 0);
        }

        const summaries = Array.from(summaryMap.values())
          .map(s => ({ ...s, outstanding: s.expected - s.collected }))
          .sort((a, b) => a.grade_name.localeCompare(b.grade_name, undefined, { numeric: true }));

        setGradeSummaries(summaries);

        // ================================
        // F. Recent payments UI
        // ================================
        const payments: Payment[] = recentTx.map((tx: any) => ({
          id: tx.id,
          student_name: `${tx.student?.first_name || 'Unknown'} ${tx.student?.last_name || ''}`.trim(),
          grade: tx.grade?.grade_name || 'N/A',
          amount: Number(tx.amount_paid ?? 0),
          date: tx.payment_date ? new Date(tx.payment_date).toLocaleDateString() : '—',
          status: 'completed',
          payment_method: tx.payment_method || 'Cash',
        }));

        setRecentPayments(payments);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err?.message || 'Failed to load finance data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authChecking]);

  // ---------- Derived ----------
  const filteredPayments = useMemo(() => {
    const q = searchTx.trim().toLowerCase();
    return recentPayments
      .filter(p => activeFilter === 'all' || p.status === activeFilter)
      .filter(p => {
        if (!q) return true;
        return (
          p.student_name.toLowerCase().includes(q) ||
          p.grade.toLowerCase().includes(q) ||
          p.payment_method.toLowerCase().includes(q)
        );
      });
  }, [recentPayments, activeFilter, searchTx]);

  // ---------- Loading ----------
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading Finance Dashboard...</p>
        </div>
      </div>
    );
  }

  // ---------- Not configured ----------
  if (!profile || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar userEmail={userEmail} />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">School Configuration Required</h3>
              <p className="text-gray-600 mb-6">
                {errorMsg || 'Your account needs to be linked to a school before accessing the Finance module.'}
              </p>
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Settings
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={userEmail} />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
                  <p className="text-gray-600">
                    Track fees, collections, and financial performance for {school.school_name}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Academic Year 2024-2025</span>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Download className="w-4 h-4" />
                    Export Report
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Collected"
                value={formatCurrency(totalCollected)}
                icon={DollarSign}
                badge="Collected"
                badgeClass="text-blue-600 bg-blue-50"
                iconClass="bg-blue-100 text-blue-600"
              />
              <StatCard
                title="Collection Rate"
                value={`${collectionRate}%`}
                icon={TrendingUp}
                badge="Rate"
                badgeClass="text-green-600 bg-green-50"
                iconClass="bg-green-100 text-green-600"
              />
              <StatCard
                title="Outstanding Balance"
                value={formatCurrency(totalOutstanding)}
                icon={TrendingDown}
                badge="Outstanding"
                badgeClass="text-amber-600 bg-amber-50"
                iconClass="bg-amber-100 text-amber-600"
              />
              <StatCard
                title="Total Students"
                value={String(gradeSummaries.reduce((acc, g) => acc + (g.student_count || 0), 0))}
                icon={Users}
                badge="Students"
                badgeClass="text-purple-600 bg-purple-50"
                iconClass="bg-purple-100 text-purple-600"
              />
            </div>

            {/* Grade Summary + Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Per-Grade Financial Summary</h3>
                    <p className="text-sm text-gray-500">Detailed breakdown by grade level</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View Details →</button>
                </div>

                <div className="p-5">
                  {gradeSummaries.length === 0 ? (
                    <div className="text-center py-8">
                      <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No financial data available</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grade</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Students</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Expected</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Collected</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Outstanding</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {gradeSummaries.map(g => {
                            const rate = g.expected > 0 ? Math.round((g.collected / g.expected) * 100) : 0;
                            return (
                              <tr key={g.grade_id} className="hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <Users className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="font-medium text-gray-900">{g.grade_name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm font-medium text-gray-900">{g.student_count}</td>
                                <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(g.expected)}</td>
                                <td className="py-3 px-4 text-sm font-medium text-green-600">{formatCurrency(g.collected)}</td>
                                <td className="py-3 px-4 text-sm font-medium text-amber-600">{formatCurrency(g.outstanding)}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-28 bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full ${
                                          rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(rate, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium text-gray-700 w-10">{rate}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-5 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
                  <p className="text-sm text-gray-500">Financial overview</p>
                </div>

                <div className="p-5 space-y-4">
                  <QuickStat icon={CreditCard} title="Total Expected" subtitle="Annual tuition fees" value={formatCurrency(totalExpected)} />
                  <QuickStat
                    icon={CheckCircle}
                    title="Paid in Full"
                    subtitle="Grades with zero outstanding"
                    value={`${gradeSummaries.filter(g => g.outstanding === 0).length} grades`}
                  />
                  <QuickStat
                    icon={AlertCircle}
                    title="High Risk"
                    subtitle="Grades below 50% collection"
                    value={`${gradeSummaries.filter(g => (g.collected / Math.max(g.expected, 1)) * 100 < 50).length} grades`}
                  />
                  <QuickStat icon={Clock} title="Payment Methods" subtitle="Top method (demo)" value="Bank: 45%" />
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-5 border-b border-gray-200">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                    <p className="text-sm text-gray-500">Latest fee payments and collections</p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTx}
                        onChange={e => setSearchTx(e.target.value)}
                        placeholder="Search transactions..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                      />
                    </div>

                    <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                      {(['all', 'completed', 'pending', 'overdue'] as const).map(filter => (
                        <button
                          key={filter}
                          onClick={() => setActiveFilter(filter)}
                          className={`px-3 py-2 text-sm font-medium capitalize ${
                            activeFilter === filter ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          type="button"
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No transactions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Student</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grade</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Method</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredPayments.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Users className="w-4 h-4 text-gray-600" />
                                </div>
                                <span className="font-medium text-gray-900">{p.student_name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {p.grade}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-900">{formatCurrency(p.amount)}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">{p.date}</td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Completed
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">{p.payment_method}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button className="p-1 hover:bg-gray-100 rounded" type="button">
                                  <Eye className="w-4 h-4 text-gray-600" />
                                </button>
                                <button className="p-1 hover:bg-gray-100 rounded" type="button">
                                  <MoreVertical className="w-4 h-4 text-gray-600" />
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

          </div>
        </main>
      </div>
    </div>
  );
}

// ---------- UI helpers ----------
function StatCard({
  title,
  value,
  icon: Icon,
  badge,
  badgeClass,
  iconClass,
}: {
  title: string;
  value: string;
  icon: any;
  badge: string;
  badgeClass: string;
  iconClass: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${iconClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeClass}`}>{badge}</span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  title,
  subtitle,
  value,
}: {
  icon: any;
  title: string;
  subtitle: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-700" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

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
  Calendar,
  CheckCircle2,
  Filter,
  Search,
  TrendingUp,
  Wallet,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
type FeeTerm = 'T1' | 'T2' | 'T3';
type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue';
type PayMethod = 'cash' | 'card' | 'online_transfer' | 'mobile_money' | 'bank';

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

/**
 * fee_transaction has created/updated (DATE), NOT created_at/updated_at
 */
interface FeeTxRow {
  id: number;
  grade_id: number | null;
  student_tuition_id: number;
  school_id: string | null;

  term: FeeTerm | null;
  academic_year: string | null;

  amount_due: number; // numeric(10,2)
  amount_paid: number; // numeric(10,2)

  payment_method: PayMethod;
  status: FeeStatus;

  due_date: string | null; // DATE
  last_payment_date: string | null; // DATE

  payment_reference: string | null;
  receipt_url: string | null;
  remarks: string | null;

  created: string; // ✅ DATE
  updated: string; // ✅ DATE

  grade?: { grade_name: string } | null;

  student_tuition?: {
    id: number;
    student_id: string;
    total_fee: number;
    student?: { registration_id: string; first_name: string; last_name: string } | null;
  } | null;
}

/**
 * student_tuition_description uses created_at/updated_at (timestamp),
 * but for stats we only need total_fee + student info.
 */
interface TuitionProfileRow {
  id: number;
  student_id: string;
  total_fee: number;
  school_id: string | null;
  student?: { registration_id: string; first_name: string; last_name: string } | null;
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtUGX(n: number) {
  return `UGX ${Math.round(n).toLocaleString()}`;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function dateAtStart(d: string) {
  // d = YYYY-MM-DD
  return new Date(d + 'T00:00:00');
}
function dateAtEnd(d: string) {
  return new Date(d + 'T23:59:59');
}

export default function FinanceStatsPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [transactions, setTransactions] = useState<FeeTxRow[]>([]);
  const [tuitionProfiles, setTuitionProfiles] = useState<TuitionProfileRow[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>(''); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState<string>(''); // YYYY-MM-DD
  const [term, setTerm] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [gradeId, setGradeId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [method, setMethod] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // -----------------------------
  // Auth
  // -----------------------------
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace('/');
        return;
      }
      setUserEmail(session.user.email ?? null);
      setAuthChecking(false);
    };
    run();
  }, [router]);

  // -----------------------------
  // Load
  // -----------------------------
  useEffect(() => {
    if (authChecking) return;

    const loadAll = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
          error: uErr,
        } = await supabase.auth.getUser();
        if (uErr) throw uErr;
        if (!user) throw new Error('Could not find authenticated user.');

        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id')
          .eq('user_id', user.id)
          .single();
        if (pErr) throw pErr;
        if (!p) throw new Error('Profile not found.');

        const prof = p as ProfileRow;
        setProfile(prof);

        if (!prof.school_id) {
          setSchool(null);
          setGrades([]);
          setTransactions([]);
          setTuitionProfiles([]);
          return;
        }

        const { data: s, error: sErr } = await supabase
          .from('general_information')
          .select('id, school_name')
          .eq('id', prof.school_id)
          .single();
        if (sErr) throw sErr;
        if (!s) throw new Error('School not found.');

        const schoolRow = s as SchoolRow;
        setSchool(schoolRow);

        const { data: g, error: gErr } = await supabase
          .from('class')
          .select('id, grade_name')
          .eq('school_id', schoolRow.id)
          .order('grade_name');
        if (gErr) throw gErr;
        setGrades((g ?? []) as GradeRow[]);

        await Promise.all([loadTuitionProfiles(schoolRow.id), loadTransactions(schoolRow.id)]);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to load finance stats.');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecking]);

  const loadTuitionProfiles = async (schoolId: string) => {
    const { data, error } = await supabase
      .from('student_tuition_description')
      .select(
        `
        id,
        student_id,
        total_fee,
        school_id,
        student:students ( registration_id, first_name, last_name )
      `
      )
      .eq('school_id', schoolId);

    if (error) throw error;
    setTuitionProfiles((data ?? []) as unknown as TuitionProfileRow[]);
  };

  const loadTransactions = async (schoolId: string) => {
    const { data, error } = await supabase
      .from('fee_transaction')
      .select(
        `
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
      `
      )
      .eq('school_id', schoolId)
      .order('id', { ascending: false })
      .limit(5000);

    if (error) throw error;
    setTransactions((data ?? []) as unknown as FeeTxRow[]);
  };

  // -----------------------------
  // Derived maps
  // -----------------------------
  const tuitionById = useMemo(() => {
    const m = new Map<number, TuitionProfileRow>();
    for (const t of tuitionProfiles) m.set(t.id, t);
    return m;
  }, [tuitionProfiles]);

  const tuitionIdPaidMap = useMemo(() => {
    // total paid per tuition profile id (school-wide)
    const m = new Map<number, number>();
    for (const t of transactions) {
      const id = t.student_tuition_id;
      m.set(id, (m.get(id) ?? 0) + safeNum(t.amount_paid));
    }
    return m;
  }, [transactions]);

  // -----------------------------
  // Filtered transactions
  // -----------------------------
  const filteredTx = useMemo(() => {
    const q = search.trim().toLowerCase();

    return transactions.filter((t) => {
      // fee_transaction.created is DATE
      const created = t.created ? new Date(t.created + 'T00:00:00') : null;

      const fromOk = dateFrom ? (created ? created >= dateAtStart(dateFrom) : false) : true;
      const toOk = dateTo ? (created ? created <= dateAtEnd(dateTo) : false) : true;

      const termOk = term ? (t.term ?? '') === term : true;
      const yearOk = academicYear ? (t.academic_year ?? '') === academicYear : true;
      const gradeOk = gradeId ? String(t.grade_id ?? '') === gradeId : true;
      const statusOk = status ? (t.status ?? '') === status : true;
      const methodOk = method ? (t.payment_method ?? '') === method : true;

      const stu = t.student_tuition?.student;
      const name = stu ? `${stu.first_name} ${stu.last_name}`.toLowerCase() : '';
      const reg = stu?.registration_id?.toLowerCase() ?? '';
      const searchOk =
        !q ||
        name.includes(q) ||
        reg.includes(q) ||
        String(t.id).includes(q) ||
        String(t.payment_reference ?? '').toLowerCase().includes(q);

      return fromOk && toOk && termOk && yearOk && gradeOk && statusOk && methodOk && searchOk;
    });
  }, [transactions, search, dateFrom, dateTo, term, academicYear, gradeId, status, method]);

  // -----------------------------
  // KPIs (School-wide Due; Filtered Paid)
  // - Due = SUM(student_tuition_description.total_fee) (school-wide)
  // - Paid = SUM(filtered transactions amount_paid)
  // - Outstanding = Due - SUM(all paid across school) OR for filtered? -> show both
  // -----------------------------
  const kpis = useMemo(() => {
    const dueSchoolWide = tuitionProfiles.reduce((s, t) => s + safeNum(t.total_fee), 0);

    const paidFiltered = filteredTx.reduce((s, t) => s + safeNum(t.amount_paid), 0);

    const paidSchoolWide = Array.from(tuitionIdPaidMap.values()).reduce((s, n) => s + safeNum(n), 0);

    const outstandingSchoolWide = dueSchoolWide - paidSchoolWide;
    const rateSchoolWide = dueSchoolWide > 0 ? paidSchoolWide / dueSchoolWide : 0;

    const filteredCount = filteredTx.length;

    return {
      dueSchoolWide,
      paidSchoolWide,
      outstandingSchoolWide,
      rateSchoolWide,
      paidFiltered,
      filteredCount,
    };
  }, [tuitionProfiles, filteredTx, tuitionIdPaidMap]);

  // -----------------------------
  // Monthly trend (based on filtered transactions)
  // -----------------------------
  const monthly = useMemo(() => {
    const map = new Map<
      string,
      { paid: number; txCount: number; tuitionIds: Set<number> }
    >();

    for (const t of filteredTx) {
      if (!t.created) continue;
      const d = new Date(t.created + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const cur = map.get(key) ?? { paid: 0, txCount: 0, tuitionIds: new Set<number>() };
      cur.paid += safeNum(t.amount_paid);
      cur.txCount += 1;
      cur.tuitionIds.add(t.student_tuition_id);
      map.set(key, cur);
    }

    const rows = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, v]) => {
        let dueApprox = 0;
        for (const tid of v.tuitionIds) {
          dueApprox += safeNum(tuitionById.get(tid)?.total_fee ?? 0);
        }
        const rate = dueApprox > 0 ? v.paid / dueApprox : 0;
        return { month, paid: v.paid, dueApprox, rate, txCount: v.txCount };
      });

    const maxPaid = rows.reduce((m, r) => Math.max(m, r.paid), 0);
    return { rows, maxPaid };
  }, [filteredTx, tuitionById]);

  // -----------------------------
  // Breakdown by status + method (filtered)
  // -----------------------------
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; paid: number }>();
    for (const t of filteredTx) {
      const k = t.status ?? 'unknown';
      const cur = map.get(k) ?? { count: 0, paid: 0 };
      cur.count += 1;
      cur.paid += safeNum(t.amount_paid);
      map.set(k, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [filteredTx]);

  const methodBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; paid: number }>();
    for (const t of filteredTx) {
      const k = t.payment_method ?? 'unknown';
      const cur = map.get(k) ?? { count: 0, paid: 0 };
      cur.count += 1;
      cur.paid += safeNum(t.amount_paid);
      map.set(k, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].paid - a[1].paid);
  }, [filteredTx]);

  // -----------------------------
  // Top Debtors (school-wide, correct Outstanding)
  // balance = tuition.total_fee - sum(all paid for that student tuition id)
  // -----------------------------
  const topDebtors = useMemo(() => {
    const rows = tuitionProfiles.map((tp) => {
      const paid = safeNum(tuitionIdPaidMap.get(tp.id) ?? 0);
      const due = safeNum(tp.total_fee);
      const balance = due - paid;

      const st = tp.student;
      const name = st ? `${st.first_name} ${st.last_name}` : tp.student_id;

      return {
        tuition_id: tp.id,
        student_id: st?.registration_id ?? tp.student_id,
        name,
        due,
        paid,
        balance,
      };
    });

    return rows
      .filter((r) => r.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 15);
  }, [tuitionProfiles, tuitionIdPaidMap]);

  // -----------------------------
  // Guards
  // -----------------------------
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading Finance Stats...</p>
        </div>
      </div>
    );
  }

  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar userEmail={userEmail} />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">School Configuration Required</h3>
              <p className="text-gray-600 mb-6">
                Your account must be linked to a school before you can view finance stats.
              </p>
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Settings
              </button>
              {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
              <p className="mt-4 text-xs text-gray-500">
                Signed in as <span className="font-medium">{userEmail ?? '—'}</span>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={userEmail} />
      <div className="flex">
        <AppShell />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Finance Stats</h1>
                  <p className="text-gray-600">
                    Reports & payment trends for <span className="font-medium">{school.school_name}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (!school?.id) return;
                      setLoading(true);
                      setErrorMsg(null);
                      try {
                        await Promise.all([loadTuitionProfiles(school.id), loadTransactions(school.id)]);
                      } catch (e: any) {
                        setErrorMsg(e?.message || 'Failed to refresh.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>

                  <button
                    onClick={() => router.push('/finance')}
                    className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
                  <span className="text-xs text-gray-500">({kpis.filteredCount} tx)</span>
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Term</label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All</option>
                    <option value="T1">T1</option>
                    <option value="T2">T2</option>
                    <option value="T3">T3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Academic Year</label>
                  <input
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2025"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Grade</label>
                  <select
                    value={gradeId}
                    onChange={(e) => setGradeId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.grade_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All</option>
                    <option value="pending">pending</option>
                    <option value="partial">partial</option>
                    <option value="paid">paid</option>
                    <option value="overdue">overdue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All</option>
                    <option value="cash">cash</option>
                    <option value="mobile_money">mobile_money</option>
                    <option value="bank">bank</option>
                    <option value="card">card</option>
                    <option value="online_transfer">online_transfer</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Search</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="student name / reg / tx id / ref..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 flex items-end gap-2">
                  <button
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                      setTerm('');
                      setAcademicYear('');
                      setGradeId('');
                      setStatus('');
                      setMethod('');
                      setSearch('');
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards (School-wide) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500">Total Due (School)</div>
                    <div className="text-2xl font-bold text-gray-900">{fmtUGX(kpis.dueSchoolWide)}</div>
                    <div className="text-xs text-gray-500 mt-1">Sum of tuition profiles</div>
                  </div>
                  <Wallet className="w-6 h-6 text-gray-400" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500">Total Paid (School)</div>
                    <div className="text-2xl font-bold text-gray-900">{fmtUGX(kpis.paidSchoolWide)}</div>
                    <div className="text-xs text-gray-500 mt-1">All transactions</div>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-gray-400" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500">Outstanding (School)</div>
                    <div className="text-2xl font-bold text-gray-900">{fmtUGX(kpis.outstandingSchoolWide)}</div>
                    <div className="text-xs text-gray-500 mt-1">Due − Paid</div>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-gray-400" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500">Payment Rate (School)</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {(clamp01(kpis.rateSchoolWide) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Filtered paid: {fmtUGX(kpis.paidFiltered)}
                    </div>
                  </div>
                  <BarChart3 className="w-6 h-6 text-gray-400" />
                </div>
                <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-2 bg-blue-600"
                    style={{ width: `${clamp01(kpis.rateSchoolWide) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Trend + Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Monthly Trend */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2">
                <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Monthly Collections (last 12)</h2>
                    <p className="text-xs text-gray-500">Based on filtered transactions</p>
                  </div>
                </div>

                <div className="p-5">
                  {monthly.rows.length === 0 ? (
                    <div className="text-sm text-gray-500">No data for the selected filters.</div>
                  ) : (
                    <div className="space-y-3">
                      {monthly.rows.map((r) => {
                        const w = monthly.maxPaid > 0 ? (r.paid / monthly.maxPaid) * 100 : 0;
                        return (
                          <div key={r.month} className="flex items-center gap-3">
                            <div className="w-20 text-xs text-gray-600">{r.month}</div>
                            <div className="flex-1">
                              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-3 bg-blue-600" style={{ width: `${w}%` }} />
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                                <span>{fmtUGX(r.paid)}</span>
                                <span>rate {(clamp01(r.rate) * 100).toFixed(0)}% • tx {r.txCount}</span>
                              </div>
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
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-900">By Status (Filtered)</h2>
                  </div>
                  <div className="p-5 space-y-3">
                    {statusBreakdown.length === 0 ? (
                      <div className="text-sm text-gray-500">No data.</div>
                    ) : (
                      statusBreakdown.map(([k, v]) => {
                        const share = kpis.filteredCount > 0 ? v.count / kpis.filteredCount : 0;
                        return (
                          <div key={k} className="text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-800">{k}</span>
                              <span className="text-gray-500">{v.count}</span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-2 bg-gray-900" style={{ width: `${clamp01(share) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-900">By Payment Method (Filtered)</h2>
                  </div>
                  <div className="p-5 space-y-3">
                    {methodBreakdown.length === 0 ? (
                      <div className="text-sm text-gray-500">No data.</div>
                    ) : (
                      methodBreakdown.map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-sm">
                          <span className="text-gray-800">{k}</span>
                          <span className="text-gray-600">{fmtUGX(v.paid)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Debtors */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Top Debtors (School)</h2>
                <p className="text-xs text-gray-500">
                  Balance = tuition profile total_fee − all payments recorded.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Student</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Due</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Paid</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {topDebtors.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-sm text-gray-500">
                          No debtors found.
                        </td>
                      </tr>
                    ) : (
                      topDebtors.map((r) => (
                        <tr key={r.tuition_id} className="hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="text-sm font-medium text-gray-900">{r.name}</div>
                            <div className="text-xs text-gray-500">{r.student_id}</div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">{fmtUGX(r.due)}</td>
                          <td className="py-4 px-4 text-sm text-gray-700">{fmtUGX(r.paid)}</td>
                          <td className="py-4 px-4 text-sm font-semibold text-gray-900">{fmtUGX(r.balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
                Tip: To see specific term performance, filter by Term + Academic Year.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

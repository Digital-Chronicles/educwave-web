'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  Search,
  Plus,
  RefreshCw,
  Wallet,
  Receipt,
  GraduationCap,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  X,
  ClipboardList,
  BarChart3,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
type TabKey = 'overview' | 'schoolFees' | 'otherFees' | 'tuition' | 'transactions';

type FeeTerm = 'T1' | 'T2' | 'T3';
type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue';
type PaymentMethod = 'cash' | 'card' | 'online_transfer' | 'mobile_money' | 'bank';

// Adjust if your enum names differ
type OtherFeeType =
  | 'development'
  | 'sports'
  | 'uniform'
  | 'medical'
  | 'exam'
  | 'library'
  | 'ict'
  | 'others';

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
 * assessment_schoolfees:
 * ✅ do NOT select created_at/updated_at because they don't exist in your schema.
 * You can keep created_by if you want, but UI doesn't need it here.
 */
interface SchoolFeesRow {
  id: number;
  grade_id: number;
  school_id: string | null;
  tuitionfee: number;
  hostelfee: number;
  breakfastfee: number;
  lunchfee: number;
  description: string;
  created_by?: string | null;
  grade?: { id: number; grade_name: string } | null;
}

/**
 * other_school_payments has created/updated (DATE)
 */
interface OtherFeesRow {
  id: number;
  grade_id: number;
  school_id: string | null;
  fees_type: OtherFeeType;
  amount: number;
  description: string;
  unique_code: string | null;
  created: string; // DATE
  updated: string; // DATE
  grade?: { id: number; grade_name: string } | null;
}

/**
 * student_tuition_description uses created_at/updated_at (timestamp)
 */
interface StudentTuitionRow {
  id: number;
  student_id: string;
  tuition_id: number;
  school_id: string | null;
  hostel: boolean;
  lunch: boolean;
  breakfast: boolean;
  total_fee: number;
  created_at: string;
  updated_at: string;

  tuition?: {
    id: number;
    grade_id: number;
    grade?: { id: number; grade_name: string } | null;
  } | null;

  student?: {
    registration_id: string;
    first_name: string;
    last_name: string;
  } | null;
}

/**
 * fee_transaction has created/updated (DATE)
 */
interface FeeTransactionRow {
  id: number;
  student_tuition_id: number;
  grade_id: number | null;
  school_id: string | null;

  term: FeeTerm | null;
  academic_year: string | null;

  amount_due: number;
  amount_paid: number;

  payment_method: PaymentMethod;
  status: FeeStatus;

  due_date: string | null;
  last_payment_date: string | null;

  payment_reference: string | null;
  receipt_url: string | null;
  remarks: string | null;

  created: string; // DATE
  updated: string; // DATE

  grade?: { id: number; grade_name: string } | null;

  student_tuition?: {
    id: number;
    student_id: string;
    total_fee: number;
    student?: { registration_id: string; first_name: string; last_name: string } | null;
    tuition?: { id: number; grade?: { id: number; grade_name: string } | null } | null;
  } | null;
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(n: any) {
  const v = safeNum(n);
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function supaErrText(err: any) {
  if (!err) return null;
  const parts = [
    err.message ? `Message: ${err.message}` : null,
    err.code ? `Code: ${err.code}` : null,
    err.details ? `Details: ${err.details}` : null,
    err.hint ? `Hint: ${err.hint}` : null,
  ].filter(Boolean);
  return parts.join(' • ');
}

export default function FinancePage() {
  const router = useRouter();

  // Auth/scope
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  // Data
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [schoolFees, setSchoolFees] = useState<SchoolFeesRow[]>([]);
  const [otherFees, setOtherFees] = useState<OtherFeesRow[]>([]);
  const [tuitionRows, setTuitionRows] = useState<StudentTuitionRow[]>([]);
  const [transactions, setTransactions] = useState<FeeTransactionRow[]>([]);

  // UI
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');

  // Modals
  const [showSchoolFeeModal, setShowSchoolFeeModal] = useState(false);
  const [showOtherFeeModal, setShowOtherFeeModal] = useState(false);

  // School fee form
  const [feeGradeId, setFeeGradeId] = useState('');
  const [feeTuition, setFeeTuition] = useState('0');
  const [feeHostel, setFeeHostel] = useState('0');
  const [feeBreakfast, setFeeBreakfast] = useState('0');
  const [feeLunch, setFeeLunch] = useState('0');
  const [feeDesc, setFeeDesc] = useState('No Description ...');
  const [savingSchoolFee, setSavingSchoolFee] = useState(false);

  // Other fee form
  const [otherGradeId, setOtherGradeId] = useState('');
  const [otherType, setOtherType] = useState<OtherFeeType>('development');
  const [otherAmount, setOtherAmount] = useState('0');
  const [otherDesc, setOtherDesc] = useState('No Description ...');
  const [otherCode, setOtherCode] = useState('');
  const [savingOtherFee, setSavingOtherFee] = useState(false);

  const schoolId = school?.id ?? null;

  // ----------------------------------------------------
  // Derived totals (✅ correct Outstanding)
  // Due = sum(student_tuition_description.total_fee)
  // Paid = sum(fee_transaction.amount_paid)
  // Outstanding = Due - Paid
  // ----------------------------------------------------
  const totals = useMemo(() => {
    const due = tuitionRows.reduce((s, t) => s + safeNum(t.total_fee), 0);
    const paid = transactions.reduce((s, t) => s + safeNum(t.amount_paid), 0);
    const balance = due - paid;

    const paidPct = due > 0 ? Math.min((paid / due) * 100, 100) : 0;

    const studentsWithTuition = new Set(tuitionRows.map((t) => t.student_id)).size;

    return {
      due,
      paid,
      balance,
      paidPct,
      txCount: transactions.length,
      studentsWithTuition,
      totalFeesDefined: schoolFees.length,
      totalOtherFees: otherFees.length,
    };
  }, [tuitionRows, transactions, schoolFees, otherFees]);

  // ----------------------------------------------------
  // Filtering helpers
  // ----------------------------------------------------
  const filteredSchoolFees = useMemo(() => {
    const query = q.trim().toLowerCase();
    return schoolFees.filter((r) => {
      const gOk = selectedGradeId ? r.grade_id === Number(selectedGradeId) : true;
      const searchOk =
        !query ||
        (r.grade?.grade_name ?? '').toLowerCase().includes(query) ||
        (r.description ?? '').toLowerCase().includes(query);
      return gOk && searchOk;
    });
  }, [schoolFees, q, selectedGradeId]);

  const filteredOtherFees = useMemo(() => {
    const query = q.trim().toLowerCase();
    return otherFees.filter((r) => {
      const gOk = selectedGradeId ? r.grade_id === Number(selectedGradeId) : true;
      const searchOk =
        !query ||
        (r.grade?.grade_name ?? '').toLowerCase().includes(query) ||
        `${r.fees_type}`.toLowerCase().includes(query) ||
        (r.description ?? '').toLowerCase().includes(query) ||
        (r.unique_code ?? '').toLowerCase().includes(query);
      return gOk && searchOk;
    });
  }, [otherFees, q, selectedGradeId]);

  const filteredTuition = useMemo(() => {
    const query = q.trim().toLowerCase();
    return tuitionRows.filter((r) => {
      const gId = r.tuition?.grade?.id ?? r.tuition?.grade_id;
      const gOk = selectedGradeId ? Number(selectedGradeId) === Number(gId) : true;
      const name = `${r.student?.first_name ?? ''} ${r.student?.last_name ?? ''}`.toLowerCase();
      const searchOk = !query || name.includes(query) || (r.student_id ?? '').toLowerCase().includes(query);
      return gOk && searchOk;
    });
  }, [tuitionRows, q, selectedGradeId]);

  const filteredTransactions = useMemo(() => {
    const query = q.trim().toLowerCase();
    return transactions.filter((t) => {
      const gOk = selectedGradeId ? String(t.grade_id ?? '') === selectedGradeId : true;
      const stu = t.student_tuition?.student;
      const name = `${stu?.first_name ?? ''} ${stu?.last_name ?? ''}`.toLowerCase();
      const searchOk =
        !query ||
        name.includes(query) ||
        (t.payment_reference ?? '').toLowerCase().includes(query) ||
        (t.status ?? '').toLowerCase().includes(query) ||
        (t.payment_method ?? '').toLowerCase().includes(query);
      return gOk && searchOk;
    });
  }, [transactions, q, selectedGradeId]);

  // ----------------------------------------------------
  // Auth check
  // ----------------------------------------------------
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/');
        return;
      }
      setUserEmail(data.session.user.email ?? null);
      setAuthChecking(false);
    };
    run();
  }, [router]);

  // ----------------------------------------------------
  // Load (school scoped)
  // ----------------------------------------------------
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

        // Profile
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
          setSchoolFees([]);
          setOtherFees([]);
          setTuitionRows([]);
          setTransactions([]);
          return;
        }

        // School
        const { data: s, error: sErr } = await supabase
          .from('general_information')
          .select('id, school_name')
          .eq('id', prof.school_id)
          .single();

        if (sErr) throw sErr;
        if (!s) throw new Error('School not found.');
        const schoolRow = s as SchoolRow;
        setSchool(schoolRow);

        // Grades
        const { data: gradeRows, error: gradeErr } = await supabase
          .from('class')
          .select('id, grade_name')
          .eq('school_id', schoolRow.id)
          .order('grade_name');

        if (gradeErr) throw gradeErr;
        setGrades((gradeRows ?? []) as GradeRow[]);

        // assessment_schoolfees (NO created_at/updated_at)
        const { data: feeRows, error: feeErr } = await supabase
          .from('assessment_schoolfees')
          .select(
            `
            id,
            grade_id,
            tuitionfee,
            hostelfee,
            breakfastfee,
            lunchfee,
            description,
            school_id,
            created_by,
            grade:class ( id, grade_name )
          `
          )
          .eq('school_id', schoolRow.id)
          .order('grade_id');

        if (feeErr) throw feeErr;
        setSchoolFees((feeRows ?? []) as unknown as SchoolFeesRow[]);

        // other_school_payments (created/updated)
        const { data: otherRows, error: otherErr } = await supabase
          .from('other_school_payments')
          .select(
            `
            id,
            grade_id,
            fees_type,
            amount,
            description,
            unique_code,
            school_id,
            created,
            updated,
            grade:class ( id, grade_name )
          `
          )
          .eq('school_id', schoolRow.id)
          .order('grade_id');

        if (otherErr) throw otherErr;
        setOtherFees((otherRows ?? []) as unknown as OtherFeesRow[]);

        // student_tuition_description (created_at/updated_at)
        const { data: tuition, error: tuitionErr } = await supabase
          .from('student_tuition_description')
          .select(
            `
            id,
            student_id,
            tuition_id,
            hostel,
            lunch,
            breakfast,
            total_fee,
            school_id,
            created_at,
            updated_at,
            tuition:assessment_schoolfees (
              id,
              grade_id,
              grade:class ( id, grade_name )
            ),
            student:students ( registration_id, first_name, last_name )
          `
          )
          .eq('school_id', schoolRow.id);

        if (tuitionErr) throw tuitionErr;
        setTuitionRows((tuition ?? []) as unknown as StudentTuitionRow[]);

        // fee_transaction (created/updated)
        const { data: txRows, error: txErr } = await supabase
          .from('fee_transaction')
          .select(
            `
            id,
            student_tuition_id,
            grade_id,
            term,
            academic_year,
            amount_due,
            amount_paid,
            payment_method,
            status,
            due_date,
            last_payment_date,
            payment_reference,
            receipt_url,
            remarks,
            created,
            updated,
            school_id,
            grade:class ( id, grade_name ),
            student_tuition:student_tuition_description (
              id,
              student_id,
              total_fee,
              student:students ( registration_id, first_name, last_name ),
              tuition:assessment_schoolfees (
                id,
                grade:class ( id, grade_name )
              )
            )
          `
          )
          .eq('school_id', schoolRow.id)
          .order('id', { ascending: false });

        if (txErr) throw txErr;
        setTransactions((txRows ?? []) as unknown as FeeTransactionRow[]);
      } catch (err: any) {
        setErrorMsg(supaErrText(err) || err?.message || 'Failed to load finance data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authChecking, router]);

  // ----------------------------------------------------
  // Reload helpers
  // ----------------------------------------------------
  const reloadSchoolFees = async () => {
    if (!schoolId) return;

    const { data, error } = await supabase
      .from('assessment_schoolfees')
      .select(
        `
        id,
        grade_id,
        tuitionfee,
        hostelfee,
        breakfastfee,
        lunchfee,
        description,
        school_id,
        created_by,
        grade:class ( id, grade_name )
      `
      )
      .eq('school_id', schoolId)
      .order('grade_id');

    if (error) throw error;
    setSchoolFees((data ?? []) as unknown as SchoolFeesRow[]);
  };

  const reloadOtherFees = async () => {
    if (!schoolId) return;

    const { data, error } = await supabase
      .from('other_school_payments')
      .select(
        `
        id,
        grade_id,
        fees_type,
        amount,
        description,
        unique_code,
        school_id,
        created,
        updated,
        grade:class ( id, grade_name )
      `
      )
      .eq('school_id', schoolId)
      .order('grade_id');

    if (error) throw error;
    setOtherFees((data ?? []) as unknown as OtherFeesRow[]);
  };

  // ----------------------------------------------------
  // Create/Update fees
  // ----------------------------------------------------
  const handleSaveSchoolFee = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !schoolId) return;

    setSavingSchoolFee(true);
    setErrorMsg(null);

    try {
      if (!feeGradeId) throw new Error('Grade is required.');

      const payload = {
        grade_id: Number(feeGradeId),
        school_id: schoolId,
        tuitionfee: safeNum(feeTuition),
        hostelfee: safeNum(feeHostel),
        breakfastfee: safeNum(feeBreakfast),
        lunchfee: safeNum(feeLunch),
        description: feeDesc?.trim() || 'No Description ...',
        created_by: profile.user_id,
      };

      // If your constraint is school_id + grade_id unique, use that:
      const { error } = await supabase
        .from('assessment_schoolfees')
        .upsert(payload, { onConflict: 'school_id,grade_id' });

      if (error) throw error;

      await reloadSchoolFees();
      setShowSchoolFeeModal(false);

      setFeeGradeId('');
      setFeeTuition('0');
      setFeeHostel('0');
      setFeeBreakfast('0');
      setFeeLunch('0');
      setFeeDesc('No Description ...');
    } catch (err: any) {
      setErrorMsg(supaErrText(err) || err?.message || 'Failed to save school fees.');
    } finally {
      setSavingSchoolFee(false);
    }
  };

  const handleSaveOtherFee = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !schoolId) return;

    setSavingOtherFee(true);
    setErrorMsg(null);

    try {
      if (!otherGradeId) throw new Error('Grade is required.');
      if (!otherType) throw new Error('Fee type is required.');

      const payload = {
        grade_id: Number(otherGradeId),
        school_id: schoolId,
        fees_type: otherType,
        amount: safeNum(otherAmount),
        description: otherDesc?.trim() || 'No Description ...',
        unique_code: otherCode?.trim() || null,
        created_by: profile.user_id,
      };

      const { error } = await supabase
        .from('other_school_payments')
        .upsert(payload, { onConflict: 'school_id,grade_id,fees_type' });

      if (error) throw error;

      await reloadOtherFees();
      setShowOtherFeeModal(false);

      setOtherGradeId('');
      setOtherType('development');
      setOtherAmount('0');
      setOtherDesc('No Description ...');
      setOtherCode('');
    } catch (err: any) {
      setErrorMsg(supaErrText(err) || err?.message || 'Failed to save other fees.');
    } finally {
      setSavingOtherFee(false);
    }
  };

  // ----------------------------------------------------
  // UI components
  // ----------------------------------------------------
  const TabButton = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      onClick={() => setActiveTab(k)}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        activeTab === k
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );

  const HeaderFilters = () => (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={selectedGradeId}
          onChange={(e) => setSelectedGradeId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Grades</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.grade_name}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setQ('');
            setSelectedGradeId('');
          }}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          title="Reset filters"
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/finance/management')}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          <ClipboardList className="w-4 h-4" />
          Finance Management
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => router.push('/finance/stats')}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          <TrendingUp className="w-4 h-4" />
          Finance Stats
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ----------------------------------------------------
  // Guards
  // ----------------------------------------------------
  const showLoading = authChecking || loading;
  const showNoSchool = !showLoading && !!profile && !profile.school_id;
  const canRenderApp = !showLoading && !!profile?.school_id && !!school;

  if (showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading Finance...</p>
        </div>
      </div>
    );
  }

  if (showNoSchool) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar userEmail={userEmail} />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">School Configuration Required</h3>
              <p className="text-gray-600 mb-6">
                Your account must be linked to a school to use the Finance module.
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

  if (!canRenderApp) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar userEmail={userEmail} />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-600">Unable to render finance page.</p>
              {errorMsg && <p className="text-sm text-red-600 mt-2">{errorMsg}</p>}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Sections
  // ----------------------------------------------------
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500">Finance Overview</div>
                <h2 className="text-xl font-bold text-gray-900">{school?.school_name}</h2>
                <p className="text-sm text-gray-600">
                  Outstanding = Tuition Profiles Total ({money(totals.due)}) − Total Paid ({money(totals.paid)})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/finance/management')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-xl hover:bg-gray-50"
              >
                <ClipboardList className="w-4 h-4" />
                Manage
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => router.push('/finance/stats')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                <BarChart3 className="w-4 h-4" />
                Stats
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>Collections progress</span>
              <span className="font-medium">{totals.due > 0 ? `${totals.paidPct.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${totals.paidPct}%` }} />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Total Paid</div>
                <div className="p-2 rounded-lg bg-green-100">
                  <Receipt className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-gray-900">{money(totals.paid)}</div>
              <div className="text-xs text-gray-500">{totals.txCount} transactions</div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Total Due</div>
                <div className="p-2 rounded-lg bg-blue-100">
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-gray-900">{money(totals.due)}</div>
              <div className="text-xs text-gray-500">Sum of tuition profile totals</div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Outstanding</div>
                <div className="p-2 rounded-lg bg-amber-100">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-gray-900">{money(totals.balance)}</div>
              <div className="text-xs text-gray-500">Due − Paid</div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Students w/ Tuition</div>
                <div className="p-2 rounded-lg bg-purple-100">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-gray-900">{totals.studentsWithTuition}</div>
              <div className="text-xs text-gray-500">Fee profiles created</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <p className="text-sm text-gray-500">Latest fee payments recorded</p>
          </div>
          <button
            onClick={() => setActiveTab('transactions')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View All →
          </button>
        </div>
        <div className="p-5">
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-500">No transactions yet.</div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 6).map((t) => {
                const stu = t.student_tuition?.student;
                const studentName = stu ? `${stu.first_name ?? ''} ${stu.last_name ?? ''}`.trim() : '—';

                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{studentName}</div>
                      <div className="text-xs text-gray-500">
                        {t.payment_method} • {t.status} • Ref: {t.payment_reference ?? '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{money(t.amount_paid)}</div>
                      <div className="text-xs text-gray-500">{t.created ?? '—'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSchoolFees = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">School Fees (Per Grade)</h3>
          <p className="text-sm text-gray-500">Set tuition/hostel/breakfast/lunch fees for each class.</p>
        </div>
        <button
          onClick={() => setShowSchoolFeeModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add / Update Fees
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <HeaderFilters />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grade</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Tuition</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Hostel</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Breakfast</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Lunch</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSchoolFees.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{r.grade?.grade_name ?? r.grade_id}</td>
                  <td className="py-4 px-4 text-sm text-gray-900">{money(r.tuitionfee)}</td>
                  <td className="py-4 px-4 text-sm text-gray-900">{money(r.hostelfee)}</td>
                  <td className="py-4 px-4 text-sm text-gray-900">{money(r.breakfastfee)}</td>
                  <td className="py-4 px-4 text-sm text-gray-900">{money(r.lunchfee)}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{r.description}</td>
                </tr>
              ))}
              {filteredSchoolFees.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                    No school fees configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderOtherFees = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Other Fees (Per Grade)</h3>
          <p className="text-sm text-gray-500">Additional charges per class (unique by grade + type).</p>
        </div>
        <button
          onClick={() => setShowOtherFeeModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Add / Update Other Fee
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <HeaderFilters />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grade</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Unique Code</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Description</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOtherFees.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4 font-medium text-gray-900">{r.grade?.grade_name ?? r.grade_id}</td>
                  <td className="py-4 px-4 text-sm text-gray-900">{r.fees_type}</td>
                  <td className="py-4 px-4 text-sm text-gray-900">{money(r.amount)}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{r.unique_code ?? '—'}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{r.description}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{r.created}</td>
                </tr>
              ))}
              {filteredOtherFees.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                    No other fees configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTuition = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Student Tuition Description</h3>
        <p className="text-sm text-gray-500">Each row is a student’s fee profile with computed total_fee.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <HeaderFilters />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Student</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grade</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Hostel</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Breakfast</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Lunch</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Total Fee</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTuition.map((r) => {
                const name = r.student ? `${r.student.first_name} ${r.student.last_name}` : r.student_id;
                const gradeName = r.tuition?.grade?.grade_name ?? r.tuition?.grade_id ?? '—';
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{name}</div>
                      <div className="text-xs text-gray-500">{r.student_id}</div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">{gradeName}</td>
                    <td className="py-4 px-4 text-sm">{r.hostel ? 'Yes' : 'No'}</td>
                    <td className="py-4 px-4 text-sm">{r.breakfast ? 'Yes' : 'No'}</td>
                    <td className="py-4 px-4 text-sm">{r.lunch ? 'Yes' : 'No'}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-gray-900">{money(r.total_fee)}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{r.created_at ? r.created_at : '—'}</td>
                  </tr>
                );
              })}
              {filteredTuition.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-500">
                    No tuition profiles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Fee Transactions</h3>
        <p className="text-sm text-gray-500">Payments & statuses.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <HeaderFilters />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Student</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grade</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Paid</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Method</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Ref</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.map((t) => {
                const stu = t.student_tuition?.student;
                const name = stu ? `${stu.first_name ?? ''} ${stu.last_name ?? ''}`.trim() : '—';

                const badge =
                  t.status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : t.status === 'partial'
                    ? 'bg-amber-100 text-amber-800'
                    : t.status === 'overdue'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800';

                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{name}</div>
                      <div className="text-xs text-gray-500">{t.student_tuition?.student_id ?? '—'}</div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">{t.grade?.grade_name ?? t.grade_id ?? '—'}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-gray-900">{money(t.amount_paid)}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">{t.payment_method}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{t.payment_reference ?? '—'}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{t.created ?? '—'}</td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          Outstanding shown on Overview is computed from tuition profiles total_fee − sum(amount_paid).
        </div>
      </div>
    </div>
  );

  // ----------------------------------------------------
  // Main render
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={userEmail} />
      <div className="flex">
        <AppShell />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
                  <p className="text-gray-600">Fees setup and transactions for {school?.school_name}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/finance/management')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-50"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Finance Management
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => router.push('/finance/stats')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Finance Stats
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setShowSchoolFeeModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                    School Fees
                  </button>

                  <button
                    onClick={() => setShowOtherFeeModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Other Fees
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 border-b border-gray-200">
                <TabButton k="overview" label="Overview" />
                <TabButton k="schoolFees" label="School Fees" />
                <TabButton k="otherFees" label="Other Fees" />
                <TabButton k="tuition" label="Student Tuition" />
                <TabButton k="transactions" label="Transactions" />
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            )}

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'schoolFees' && renderSchoolFees()}
            {activeTab === 'otherFees' && renderOtherFees()}
            {activeTab === 'tuition' && renderTuition()}
            {activeTab === 'transactions' && renderTransactions()}
          </div>
        </main>
      </div>

      {/* School Fee Modal */}
      {showSchoolFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Add / Update School Fees</h3>
              <button
                onClick={() => setShowSchoolFeeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveSchoolFee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade *</label>
                <select
                  value={feeGradeId}
                  onChange={(e) => setFeeGradeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select grade</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.grade_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tuition</label>
                  <input
                    value={feeTuition}
                    onChange={(e) => setFeeTuition(e.target.value)}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hostel</label>
                  <input
                    value={feeHostel}
                    onChange={(e) => setFeeHostel(e.target.value)}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Breakfast</label>
                  <input
                    value={feeBreakfast}
                    onChange={(e) => setFeeBreakfast(e.target.value)}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lunch</label>
                  <input
                    value={feeLunch}
                    onChange={(e) => setFeeLunch(e.target.value)}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  value={feeDesc}
                  onChange={(e) => setFeeDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSchoolFeeModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchoolFee}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingSchoolFee ? 'Saving…' : 'Save Fees'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Other Fee Modal */}
      {showOtherFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Add / Update Other Fee</h3>
              <button
                onClick={() => setShowOtherFeeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveOtherFee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade *</label>
                <select
                  value={otherGradeId}
                  onChange={(e) => setOtherGradeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type *</label>
                <select
                  value={otherType}
                  onChange={(e) => setOtherType(e.target.value as OtherFeeType)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {(
                    ['development', 'sports', 'uniform', 'medical', 'exam', 'library', 'ict', 'others'] as OtherFeeType[]
                  ).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input
                    value={otherAmount}
                    onChange={(e) => setOtherAmount(e.target.value)}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unique Code</label>
                  <input
                    value={otherCode}
                    onChange={(e) => setOtherCode(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  value={otherDesc}
                  onChange={(e) => setOtherDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOtherFeeModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOtherFee}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                >
                  {savingOtherFee ? 'Saving…' : 'Save Other Fee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

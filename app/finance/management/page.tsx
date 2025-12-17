'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  ClipboardList,
  Receipt,
  Users,
  Search,
  RefreshCw,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  X,
  Wallet,
  CalendarDays,
  CreditCard,
  Building2,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
type TabKey = 'tuition' | 'transactions';

type FeeTerm = 'T1' | 'T2' | 'T3';
type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue';
type PaymentMethod = 'cash' | 'card' | 'online_transfer' | 'mobile_money' | 'bank';

// ✅ Adjust to your enum in Postgres if needed
type FeePaymentMethod = PaymentMethod;

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

interface SchoolFeesRow {
  id: number;
  grade_id: number;
  school_id: string | null;
  tuitionfee: number;
  hostelfee: number;
  breakfastfee: number;
  lunchfee: number;
  description: string;
  created: string;
  updated: string;
  grade?: { id: number; grade_name: string } | null;
}

interface StudentRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  current_grade_id: number | null;
}

interface StudentTuitionRow {
  id: number;
  student_id: string;
  tuition_id: number;
  school_id: string | null;
  hostel: boolean;
  lunch: boolean;
  breakfast: boolean;
  total_fee: number;
  // NOTE: your table doesn't show created/updated, but many systems add them.
  // We'll keep optional to avoid runtime issues.
  created?: string | null;
  updated?: string | null;
  tuition?: {
    id: number;
    grade_id: number;
    tuitionfee: number;
    hostelfee: number;
    breakfastfee: number;
    lunchfee: number;
    grade?: { id: number; grade_name: string } | null;
  } | null;
  student?: { registration_id: string; first_name: string; last_name: string; current_grade_id: number | null } | null;
}

interface FeeTransactionRow {
  id: number;
  grade_id: number | null;
  student_tuition_id: number;
  school_id: string | null;

  term: FeeTerm | null;
  academic_year: string | null;

  amount_due: number;
  amount_paid: number;
  payment_method: FeePaymentMethod;

  due_date: string | null;
  status: FeeStatus;
  last_payment_date: string | null;

  payment_reference: string | null;
  receipt_url: string | null;
  remarks: string | null;

  created: string;
  updated: string;

  grade?: { id: number; grade_name: string } | null;
  student_tuition?: {
    id: number;
    student_id: string;
    total_fee: number;
    student?: { registration_id: string; first_name: string; last_name: string; current_grade_id: number | null } | null;
    tuition?: { id: number; grade?: { id: number; grade_name: string } | null } | null;
  } | null;
}

function toMoney(n: any) {
  const v = Number(n ?? 0);
  return Number.isFinite(v) ? v.toFixed(2) : '0.00';
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

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isWithinDays(isoDate: string | null | undefined, days: number) {
  if (!isoDate) return false;
  const t = new Date(isoDate).getTime();
  if (!Number.isFinite(t)) return false;
  const diff = Date.now() - t;
  return diff <= days * 24 * 60 * 60 * 1000;
}

export default function FinanceManagementPage() {
  const router = useRouter();

  // -----------------------------
  // State (keep hooks consistent)
  // -----------------------------
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('tuition');

  // Data
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [schoolFees, setSchoolFees] = useState<SchoolFeesRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [tuitionRows, setTuitionRows] = useState<StudentTuitionRow[]>([]);
  const [transactions, setTransactions] = useState<FeeTransactionRow[]>([]);

  // Filters
  const [q, setQ] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');

  // Modals
  const [showTuitionModal, setShowTuitionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Tuition modal form
  const [tuitionStudentId, setTuitionStudentId] = useState('');
  const [tuitionGradeId, setTuitionGradeId] = useState('');
  const [tuitionHostel, setTuitionHostel] = useState(false);
  const [tuitionBreakfast, setTuitionBreakfast] = useState(false);
  const [tuitionLunch, setTuitionLunch] = useState(false);
  const [savingTuition, setSavingTuition] = useState(false);

  // Payment modal form
  const [payStudentTuitionId, setPayStudentTuitionId] = useState('');
  const [payTerm, setPayTerm] = useState<FeeTerm>('T1');
  const [payAcademicYear, setPayAcademicYear] = useState('');
  const [payAmountPaid, setPayAmountPaid] = useState('0');
  const [payMethod, setPayMethod] = useState<FeePaymentMethod>('cash');
  const [payDueDate, setPayDueDate] = useState<string>('');
  const [payReference, setPayReference] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // -----------------------------
  // Derived
  // -----------------------------
  const schoolId = school?.id ?? null;

  const tuitionByStudentId = useMemo(() => {
    const m = new Map<string, StudentTuitionRow>();
    for (const r of tuitionRows) m.set(r.student_id, r);
    return m;
  }, [tuitionRows]);

  const gradeNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const g of grades) m.set(g.id, g.grade_name);
    return m;
  }, [grades]);

  const schoolFeeByGradeId = useMemo(() => {
    const m = new Map<number, SchoolFeesRow>();
    for (const f of schoolFees) m.set(f.grade_id, f);
    return m;
  }, [schoolFees]);

  const txByTuitionId = useMemo(() => {
    const m = new Map<number, FeeTransactionRow[]>();
    for (const t of transactions) {
      const key = t.student_tuition_id;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(t);
    }
    return m;
  }, [transactions]);

  const studentBalances = useMemo(() => {
    // balance = sum(amount_due) - sum(amount_paid) per student_tuition_id
    const m = new Map<number, { due: number; paid: number; bal: number }>();
    for (const t of transactions) {
      const id = t.student_tuition_id;
      const cur = m.get(id) ?? { due: 0, paid: 0, bal: 0 };
      cur.due += Number(t.amount_due ?? 0);
      cur.paid += Number(t.amount_paid ?? 0);
      cur.bal = Math.max(cur.due - cur.paid, 0);
      m.set(id, cur);
    }
    return m;
  }, [transactions]);

  const stats = useMemo(() => {
    const studentsCount = students.length;
    const tuitionCount = tuitionRows.length;
    const withTuition = new Set(tuitionRows.map((t) => t.student_id)).size;

    const totalPaid = transactions.reduce((s, t) => s + Number(t.amount_paid ?? 0), 0);
    const totalDue = transactions.reduce((s, t) => s + Number(t.amount_due ?? 0), 0);
    const outstanding = Math.max(totalDue - totalPaid, 0);

    return {
      studentsCount,
      tuitionCount,
      withTuition,
      totalPaid,
      totalDue,
      outstanding,
      txCount: transactions.length,
    };
  }, [students, tuitionRows, transactions]);

  const filteredStudents = useMemo(() => {
    const query = q.trim().toLowerCase();
    return students.filter((s) => {
      const gOk = selectedGradeId ? Number(selectedGradeId) === Number(s.current_grade_id ?? 0) : true;
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const searchOk = !query || name.includes(query) || `${s.registration_id}`.toLowerCase().includes(query);
      return gOk && searchOk;
    });
  }, [students, q, selectedGradeId]);

  const filteredTransactions = useMemo(() => {
    const query = q.trim().toLowerCase();
    return transactions.filter((t) => {
      const gOk = selectedGradeId ? Number(selectedGradeId) === Number(t.grade_id ?? 0) : true;
      const stu = t.student_tuition?.student;
      const name = `${stu?.first_name ?? ''} ${stu?.last_name ?? ''}`.toLowerCase();
      const searchOk =
        !query ||
        name.includes(query) ||
        (t.payment_reference ?? '').toLowerCase().includes(query) ||
        (t.status ?? '').toLowerCase().includes(query) ||
        (t.payment_method ?? '').toLowerCase().includes(query) ||
        (t.academic_year ?? '').toLowerCase().includes(query);
      return gOk && searchOk;
    });
  }, [transactions, q, selectedGradeId]);

  // -----------------------------
  // Auth check
  // -----------------------------
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

  // -----------------------------
  // Load (scoped to school)
  // -----------------------------
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
          setStudents([]);
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
        const schoolData = s as SchoolRow;
        setSchool(schoolData);

        // Grades
        const { data: gradeRows, error: gradeErr } = await supabase
          .from('class')
          .select('id, grade_name')
          .eq('school_id', schoolData.id)
          .order('grade_name');
        if (gradeErr) throw gradeErr;
        setGrades((gradeRows ?? []) as GradeRow[]);

        // School fees (for mapping grade -> fees id)
        const { data: feesRows, error: feesErr } = await supabase
          .from('assessment_schoolfees')
          .select(
            `
            id, grade_id, school_id,
            tuitionfee, hostelfee, breakfastfee, lunchfee,
            description, created, updated,
            grade:class ( id, grade_name )
          `
          )
          .eq('school_id', schoolData.id);
        if (feesErr) throw feesErr;
        setSchoolFees((feesRows ?? []) as unknown as SchoolFeesRow[]);

        // Students (scoped to school)
        const { data: studentRows, error: stuErr } = await supabase
          .from('students')
          .select('registration_id, first_name, last_name, current_grade_id')
          .eq('school_id', schoolData.id)
          .order('first_name');
        if (stuErr) throw stuErr;
        setStudents((studentRows ?? []) as unknown as StudentRow[]);

        // Tuition profiles
        const { data: tuition, error: tuitionErr } = await supabase
          .from('student_tuition_description')
          .select(
            `
            id, student_id, tuition_id, school_id,
            hostel, lunch, breakfast, total_fee,
            tuition:assessment_schoolfees (
              id, grade_id, tuitionfee, hostelfee, breakfastfee, lunchfee,
              grade:class ( id, grade_name )
            ),
            student:students ( registration_id, first_name, last_name, current_grade_id )
          `
          )
          .eq('school_id', schoolData.id);
        if (tuitionErr) throw tuitionErr;
        setTuitionRows((tuition ?? []) as unknown as StudentTuitionRow[]);

        // Transactions
        const { data: txRows, error: txErr } = await supabase
          .from('fee_transaction')
          .select(
            `
            id, grade_id, student_tuition_id, school_id,
            term, academic_year,
            amount_due, amount_paid, payment_method,
            due_date, status, last_payment_date,
            payment_reference, receipt_url, remarks,
            created, updated,
            grade:class ( id, grade_name ),
            student_tuition:student_tuition_description (
              id, student_id, total_fee,
              student:students ( registration_id, first_name, last_name, current_grade_id ),
              tuition:assessment_schoolfees ( id, grade:class ( id, grade_name ) )
            )
          `
          )
          .eq('school_id', schoolData.id)
          .order('id', { ascending: false });
        if (txErr) throw txErr;
        setTransactions((txRows ?? []) as unknown as FeeTransactionRow[]);
      } catch (err: any) {
        setErrorMsg(supaErrText(err) || err?.message || 'Failed to load finance management data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authChecking, router]);

  // -----------------------------
  // Helpers
  // -----------------------------
  const resetFilters = () => {
    setQ('');
    setSelectedGradeId('');
  };

  const openTuitionModalForStudent = (s: StudentRow) => {
    const existing = tuitionByStudentId.get(s.registration_id);
    const gradeId = s.current_grade_id ? String(s.current_grade_id) : '';

    setTuitionStudentId(s.registration_id);
    setTuitionGradeId(gradeId);

    setTuitionHostel(existing?.hostel ?? false);
    setTuitionBreakfast(existing?.breakfast ?? false);
    setTuitionLunch(existing?.lunch ?? false);

    setShowTuitionModal(true);
  };

  const openPaymentModalForStudent = (s: StudentRow) => {
    const t = tuitionByStudentId.get(s.registration_id);
    if (!t) {
      setErrorMsg('This student has no tuition profile yet. Create tuition first.');
      return;
    }
    setPayStudentTuitionId(String(t.id));
    setPayTerm('T1');
    setPayAcademicYear('');
    setPayAmountPaid('0');
    setPayMethod('cash');
    setPayDueDate('');
    setPayReference('');
    setPayRemarks('');
    setShowPaymentModal(true);
  };

  const canEditTuitionRow = (r: StudentTuitionRow) => {
    // Requirement: user can only change fee description within 30 days, otherwise admin only.
    // Your tuition table doesn't show created date; if you add it later, this will work automatically.
    if (profile?.role === 'ADMIN') return true;
    if (r.created && isWithinDays(r.created, 30)) return true;
    // If no created column exists, default to allowing only ADMIN (safer).
    return false;
  };

  const reloadTuitionAndTx = async () => {
    if (!schoolId) return;
    const [tuRes, txRes] = await Promise.all([
      supabase
        .from('student_tuition_description')
        .select(
          `
          id, student_id, tuition_id, school_id,
          hostel, lunch, breakfast, total_fee,
          tuition:assessment_schoolfees (
            id, grade_id, tuitionfee, hostelfee, breakfastfee, lunchfee,
            grade:class ( id, grade_name )
          ),
          student:students ( registration_id, first_name, last_name, current_grade_id )
        `
        )
        .eq('school_id', schoolId),
      supabase
        .from('fee_transaction')
        .select(
          `
          id, grade_id, student_tuition_id, school_id,
          term, academic_year,
          amount_due, amount_paid, payment_method,
          due_date, status, last_payment_date,
          payment_reference, receipt_url, remarks,
          created, updated,
          grade:class ( id, grade_name ),
          student_tuition:student_tuition_description (
            id, student_id, total_fee,
            student:students ( registration_id, first_name, last_name, current_grade_id ),
            tuition:assessment_schoolfees ( id, grade:class ( id, grade_name ) )
          )
        `
        )
        .eq('school_id', schoolId)
        .order('id', { ascending: false }),
    ]);

    if (tuRes.error) throw tuRes.error;
    if (txRes.error) throw txRes.error;

    setTuitionRows((tuRes.data ?? []) as unknown as StudentTuitionRow[]);
    setTransactions((txRes.data ?? []) as unknown as FeeTransactionRow[]);
  };

  // -----------------------------
  // Save Tuition Profile
  // -----------------------------
  const handleSaveTuition = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolId || !profile) return;

    setSavingTuition(true);
    setErrorMsg(null);

    try {
      if (!tuitionStudentId) throw new Error('Student is required.');
      if (!tuitionGradeId) throw new Error('Student current grade is required.');

      const gradeId = Number(tuitionGradeId);
      const feeRow = schoolFeeByGradeId.get(gradeId);
      if (!feeRow) {
        throw new Error('No school fees found for this grade. Please set School Fees first.');
      }

      const existing = tuitionByStudentId.get(tuitionStudentId);

      // Enforce 30-day rule (non-admins)
      if (existing && !canEditTuitionRow(existing)) {
        throw new Error('Edits are locked after 30 days. Only system admins can change this record.');
      }

      // Upsert needs a UNIQUE constraint. You have none shown for tuition_description.
      // We'll do: if exists -> update; else -> insert.
      if (existing) {
        const { error } = await supabase
          .from('student_tuition_description')
          .update({
            tuition_id: feeRow.id,
            hostel: tuitionHostel,
            breakfast: tuitionBreakfast,
            lunch: tuitionLunch,
            school_id: schoolId,
          })
          .eq('id', existing.id)
          .eq('school_id', schoolId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('student_tuition_description').insert({
          student_id: tuitionStudentId,
          tuition_id: feeRow.id,
          school_id: schoolId,
          hostel: tuitionHostel,
          breakfast: tuitionBreakfast,
          lunch: tuitionLunch,
          // total_fee will be calculated by your trigger
        });

        if (error) throw error;
      }

      await reloadTuitionAndTx();
      setShowTuitionModal(false);
    } catch (err: any) {
      setErrorMsg(supaErrText(err) || err?.message || 'Failed to save student tuition.');
    } finally {
      setSavingTuition(false);
    }
  };

  // -----------------------------
  // Save Payment (transaction)
  // -----------------------------
  const handleSavePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolId || !profile) return;

    setSavingPayment(true);
    setErrorMsg(null);

    try {
      const tuitionId = Number(payStudentTuitionId);
      if (!tuitionId) throw new Error('Select a student tuition profile.');

      const tRow = tuitionRows.find((x) => x.id === tuitionId);
      if (!tRow) throw new Error('Tuition profile not found.');

      const amountPaid = Number(payAmountPaid || 0);
      if (!Number.isFinite(amountPaid) || amountPaid < 0) throw new Error('Invalid amount paid.');

      // Compute recommended amount_due:
      // If there are transactions for same term/year, keep due = max(previous due) else tuition total_fee
      const same = (txByTuitionId.get(tuitionId) ?? []).filter(
        (x) => (x.term ?? null) === (payTerm ?? null) && (x.academic_year ?? null) === (payAcademicYear?.trim() || null)
      );

      const baseDue = same.length > 0 ? Number(same[0].amount_due ?? tRow.total_fee ?? 0) : Number(tRow.total_fee ?? 0);

      const payload = {
        student_tuition_id: tuitionId,
        grade_id: tRow.student?.current_grade_id ?? null,
        school_id: schoolId,

        term: payTerm ?? null,
        academic_year: payAcademicYear?.trim() || null,

        amount_due: baseDue,
        amount_paid: amountPaid,

        payment_method: payMethod,
        due_date: payDueDate || null,
        last_payment_date: todayISO(),

        payment_reference: payReference?.trim() || null,
        remarks: payRemarks?.trim() || null,
      };

      // IMPORTANT: fee_transaction only has UNIQUE(payment_reference).
      // So we must INSERT (not upsert on composite).
      const { error } = await supabase.from('fee_transaction').insert(payload);
      if (error) throw error;

      await reloadTuitionAndTx();
      setShowPaymentModal(false);
    } catch (err: any) {
      setErrorMsg(supaErrText(err) || err?.message || 'Failed to record payment.');
    } finally {
      setSavingPayment(false);
    }
  };

  // -----------------------------
  // UI states
  // -----------------------------
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading Finance Management...</p>
        </div>
      </div>
    );
  }

  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar userEmail={userEmail} />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">School Configuration Required</h3>
              <p className="text-gray-600 mb-6">Your account must be linked to a school to manage tuition.</p>

              {errorMsg && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                  <p className="text-sm text-red-600">{errorMsg}</p>
                </div>
              )}

              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
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

  // -----------------------------
  // UI blocks
  // -----------------------------
  const HeaderFilters = () => (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student, reg no, reference..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={selectedGradeId}
          onChange={(e) => setSelectedGradeId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Grades</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.grade_name}
            </option>
          ))}
        </select>

        <button
          onClick={resetFilters}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
          title="Reset filters"
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/finance')}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Finance
        </button>
      </div>
    </div>
  );

  const renderOverviewCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Students</div>
          <div className="p-2 rounded-xl bg-blue-100">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{stats.studentsCount}</div>
        <div className="text-xs text-gray-500">{stats.withTuition} have tuition profiles</div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Transactions</div>
          <div className="p-2 rounded-xl bg-green-100">
            <Receipt className="w-4 h-4 text-green-600" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{stats.txCount}</div>
        <div className="text-xs text-gray-500">Payments recorded</div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Total Paid</div>
          <div className="p-2 rounded-xl bg-emerald-100">
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{toMoney(stats.totalPaid)}</div>
        <div className="text-xs text-gray-500">Across all terms</div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Outstanding</div>
          <div className="p-2 rounded-xl bg-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{toMoney(stats.outstanding)}</div>
        <div className="text-xs text-gray-500">Due - Paid</div>
      </div>
    </div>
  );

  const renderTuitionTab = () => (
    <div className="space-y-6">
      {renderOverviewCards()}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Student Tuition Management</h3>
            <p className="text-sm text-gray-500">Create/update tuition profiles and add payments.</p>
          </div>

          <button
            onClick={() => setShowTuitionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Tuition
          </button>
        </div>

        <div className="p-5 border-b border-gray-200">
          <HeaderFilters />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Student</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grade</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Total Fee</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Balance</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Options</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map((s) => {
                const t = tuitionByStudentId.get(s.registration_id);
                const gName = s.current_grade_id ? gradeNameById.get(s.current_grade_id) : null;

                const balInfo = t ? studentBalances.get(t.id) : null;
                const balance = balInfo?.bal ?? 0;

                const options = t
                  ? [
                      t.hostel ? 'Hostel' : null,
                      t.breakfast ? 'Breakfast' : null,
                      t.lunch ? 'Lunch' : null,
                    ].filter(Boolean)
                  : [];

                return (
                  <tr key={s.registration_id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">
                        {s.first_name} {s.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{s.registration_id}</div>
                    </td>

                    <td className="py-4 px-4 text-sm text-gray-900">{gName ?? '—'}</td>

                    <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                      {t ? toMoney(t.total_fee) : '—'}
                      {!t && <div className="text-xs text-gray-500 font-normal">No tuition profile</div>}
                    </td>

                    <td className="py-4 px-4">
                      {t ? (
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            balance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {toMoney(balance)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-sm text-gray-700">
                      {t ? (
                        options.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {options.map((o) => (
                              <span key={o} className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                {o}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">No extras</span>
                        )
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openTuitionModalForStudent(s)}
                          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                        >
                          Manage
                        </button>
                        <button
                          onClick={() => openPaymentModalForStudent(s)}
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                        >
                          Add Payment
                        </button>
                      </div>
                      {t && !canEditTuitionRow(t) && profile?.role !== 'ADMIN' && (
                        <div className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Edits locked (30-day rule)
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-gray-400" />
          Tuition is computed by your trigger on <span className="font-medium">student_tuition_description</span>.
        </div>
      </div>
    </div>
  );

  const renderTransactionsTab = () => (
    <div className="space-y-6">
      {renderOverviewCards()}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
            <p className="text-sm text-gray-500">Review payments and references.</p>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>

        <div className="p-5 border-b border-gray-200">
          <HeaderFilters />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Student</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Grade</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Term / Year</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Paid</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Due</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Method</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Reference</th>
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

                    <td className="py-4 px-4 text-sm text-gray-700">
                      <div className="font-medium">{t.term ?? '—'}</div>
                      <div className="text-xs text-gray-500">{t.academic_year ?? '—'}</div>
                    </td>

                    <td className="py-4 px-4 text-sm font-semibold text-gray-900">{toMoney(t.amount_paid)}</td>
                    <td className="py-4 px-4 text-sm text-gray-900">{toMoney(t.amount_due)}</td>

                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge}`}>
                        {t.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-sm text-gray-700">{t.payment_method}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{t.payment_reference ?? '—'}</td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-gray-400" />
          Transactions are inserted (not upsert) because only <span className="font-medium">payment_reference</span> is unique.
        </div>
      </div>
    </div>
  );

  // -----------------------------
  // Page render
  // -----------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={userEmail} />
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <div>
                  <div className="text-xs text-gray-500">Finance</div>
                  <h1 className="text-2xl font-bold text-gray-900">Management</h1>
                  <p className="text-gray-600">
                    Manage student tuition profiles and record payments for {school.school_name}.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/finance/stats')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Finance Stats
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Record Payment
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 border-b border-gray-200">
                {(['tuition', 'transactions'] as TabKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setActiveTab(k)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === k
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {k === 'tuition' ? 'Student Tuition' : 'Transactions'}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            )}

            {activeTab === 'tuition' && renderTuitionTab()}
            {activeTab === 'transactions' && renderTransactionsTab()}
          </div>
        </main>
      </div>

      {/* Tuition Modal */}
      {showTuitionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 m-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create / Update Tuition Profile</h3>
                <p className="text-sm text-gray-500">Uses the student’s current grade to pick the correct fee row.</p>
              </div>
              <button onClick={() => setShowTuitionModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveTuition} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student *</label>
                <select
                  value={tuitionStudentId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setTuitionStudentId(sid);
                    const st = students.find((x) => x.registration_id === sid);
                    setTuitionGradeId(st?.current_grade_id ? String(st.current_grade_id) : '');
                    const existing = tuitionByStudentId.get(sid);
                    setTuitionHostel(existing?.hostel ?? false);
                    setTuitionBreakfast(existing?.breakfast ?? false);
                    setTuitionLunch(existing?.lunch ?? false);
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.registration_id} value={s.registration_id}>
                      {s.first_name} {s.last_name} — {s.registration_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Grade *</label>
                  <select
                    value={tuitionGradeId}
                    onChange={(e) => setTuitionGradeId(e.target.value)}
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
                  <p className="text-xs text-gray-500 mt-1">Fees must be configured for this grade.</p>
                </div>

                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <div className="text-xs text-gray-500">Mapped Fee Row</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">
                    {tuitionGradeId && schoolFeeByGradeId.get(Number(tuitionGradeId))
                      ? `assessment_schoolfees #${schoolFeeByGradeId.get(Number(tuitionGradeId))!.id}`
                      : '—'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Total is calculated by your trigger based on extras.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={tuitionHostel} onChange={(e) => setTuitionHostel(e.target.checked)} />
                  <span className="text-sm text-gray-700">Hostel</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tuitionBreakfast}
                    onChange={(e) => setTuitionBreakfast(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">Breakfast</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={tuitionLunch} onChange={(e) => setTuitionLunch(e.target.checked)} />
                  <span className="text-sm text-gray-700">Lunch</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTuitionModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTuition}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingTuition ? 'Saving…' : 'Save Tuition'}
                </button>
              </div>

              <div className="text-xs text-gray-500 border-t border-gray-200 pt-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                Non-admin edits may be restricted after 30 days (recommended to enforce with RLS/DB policy too).
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 m-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
                <p className="text-sm text-gray-500">Creates a new fee_transaction row.</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Student Tuition Profile *</label>
                <select
                  value={payStudentTuitionId}
                  onChange={(e) => setPayStudentTuitionId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select</option>
                  {tuitionRows.map((t) => {
                    const st = t.student;
                    const name = st ? `${st.first_name} ${st.last_name}` : t.student_id;
                    const g = st?.current_grade_id ? gradeNameById.get(st.current_grade_id) : undefined;
                    return (
                      <option key={t.id} value={t.id}>
                        {name} — {t.student_id} {g ? `(${g})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Term *</label>
                <select
                  value={payTerm}
                  onChange={(e) => setPayTerm(e.target.value as FeeTerm)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="T1">T1</option>
                  <option value="T2">T2</option>
                  <option value="T3">T3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                <input
                  value={payAcademicYear}
                  onChange={(e) => setPayAcademicYear(e.target.value)}
                  placeholder="e.g. 2025/2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={payAmountPaid}
                  onChange={(e) => setPayAmountPaid(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as FeePaymentMethod)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="cash">cash</option>
                  <option value="mobile_money">mobile_money</option>
                  <option value="bank">bank</option>
                  <option value="card">card</option>
                  <option value="online_transfer">online_transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <div className="relative">
                  <CalendarDays className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={payDueDate}
                    onChange={(e) => setPayDueDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Reference</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="Unique reference (optional)"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Must be unique if provided.</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <input
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                >
                  {savingPayment ? 'Saving…' : 'Record Payment'}
                </button>
              </div>

              <div className="md:col-span-2 text-xs text-gray-500 border-t border-gray-200 pt-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gray-400" />
                This inserts a new transaction row; status/balance logic can be handled by your DB trigger.
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

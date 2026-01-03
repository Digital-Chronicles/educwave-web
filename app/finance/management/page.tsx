'use client';

import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  X,
  Wallet,
  Receipt,
  Building2,
  ClipboardList,
  CalendarDays,
  CreditCard,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
type TabKey = 'tuition' | 'transactions';

type FeeTerm = 'T1' | 'T2' | 'T3';
type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue';
type PaymentMethod = 'cash' | 'card' | 'online_transfer' | 'mobile_money' | 'bank';
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
  student?: {
    registration_id: string;
    first_name: string;
    last_name: string;
    current_grade_id: number | null;
  } | null;
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
    student?: {
      registration_id: string;
      first_name: string;
      last_name: string;
      current_grade_id: number | null;
    } | null;
    tuition?: { id: number; grade?: { id: number; grade_name: string } | null } | null;
  } | null;
}

function toMoney(n: any) {
  const v = Number(n ?? 0);
  return Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0';
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

function parseISO(iso: string | null | undefined) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

// -----------------------------
// Tiny Combobox (no libs)
// -----------------------------
function useOutsideClick(ref: any, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

export default function FinanceManagementPage() {
  const router = useRouter();

  // -----------------------------
  // State
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

  // Tuition autocomplete
  const [tuitionStudentQuery, setTuitionStudentQuery] = useState('');
  const [tuitionStudentOpen, setTuitionStudentOpen] = useState(false);
  const tuitionStudentBoxRef = useRef<HTMLDivElement | null>(null);

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

  // Payment autocomplete
  const [payProfileQuery, setPayProfileQuery] = useState('');
  const [payProfileOpen, setPayProfileOpen] = useState(false);
  const payProfileBoxRef = useRef<HTMLDivElement | null>(null);

  useOutsideClick(tuitionStudentBoxRef, () => setTuitionStudentOpen(false));
  useOutsideClick(payProfileBoxRef, () => setPayProfileOpen(false));

  // -----------------------------
  // Derived
  // -----------------------------
  const schoolId = school?.id ?? null;

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

  const tuitionByStudentId = useMemo(() => {
    const m = new Map<string, StudentTuitionRow>();
    for (const r of tuitionRows) m.set(r.student_id, r);
    return m;
  }, [tuitionRows]);

  // ✅ KEY FIX: totals/paid/balance based on tuition.total_fee (not amount_due)
  const tuitionPayments = useMemo(() => {
    const paidByTuitionId = new Map<number, number>();
    const lastPayByTuitionId = new Map<number, string | null>();

    for (const tx of transactions) {
      const id = tx.student_tuition_id;
      const cur = paidByTuitionId.get(id) ?? 0;
      paidByTuitionId.set(id, cur + Number(tx.amount_paid ?? 0));

      // latest date
      const a = parseISO(lastPayByTuitionId.get(id) ?? null);
      const b = parseISO(tx.last_payment_date ?? tx.created ?? null);
      if (b !== null && (a === null || b > a)) {
        lastPayByTuitionId.set(id, tx.last_payment_date ?? tx.created ?? null);
      }
    }

    return { paidByTuitionId, lastPayByTuitionId };
  }, [transactions]);

  const computedTuitionRows = useMemo(() => {
    return tuitionRows.map((t) => {
      const paid = tuitionPayments.paidByTuitionId.get(t.id) ?? 0;
      const total = Number(t.total_fee ?? 0);
      const outstanding = Math.max(total - paid, 0);

      let status: FeeStatus = 'pending';
      if (paid <= 0 && total > 0) status = 'pending';
      if (paid > 0 && paid < total) status = 'partial';
      if (paid >= total && total > 0) status = 'paid';

      return {
        tuition: t,
        total,
        paid,
        outstanding,
        status,
        lastPayment: tuitionPayments.lastPayByTuitionId.get(t.id) ?? null,
      };
    });
  }, [tuitionRows, tuitionPayments]);

  const overviewStats = useMemo(() => {
    const totalExpected = computedTuitionRows.reduce((s, r) => s + r.total, 0);
    const totalPaid = computedTuitionRows.reduce((s, r) => s + r.paid, 0);
    const totalOutstanding = Math.max(totalExpected - totalPaid, 0);

    const studentsCount = students.length;
    const profilesCount = tuitionRows.length;
    const txCount = transactions.length;

    const pct = totalExpected > 0 ? Math.min((totalPaid / totalExpected) * 100, 100) : 0;

    return { totalExpected, totalPaid, totalOutstanding, studentsCount, profilesCount, txCount, pct };
  }, [computedTuitionRows, students, tuitionRows, transactions]);

  const filteredStudents = useMemo(() => {
    const query = q.trim().toLowerCase();
    return students.filter((s) => {
      const gOk = selectedGradeId ? Number(selectedGradeId) === Number(s.current_grade_id ?? 0) : true;
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const searchOk = !query || name.includes(query) || `${s.registration_id}`.toLowerCase().includes(query);
      return gOk && searchOk;
    });
  }, [students, q, selectedGradeId]);

  const filteredTuitionForTable = useMemo(() => {
    const query = q.trim().toLowerCase();

    return computedTuitionRows.filter((row) => {
      const t = row.tuition;
      const gradeId = t.student?.current_grade_id ?? null;
      const gOk = selectedGradeId ? Number(selectedGradeId) === Number(gradeId ?? 0) : true;

      const name = `${t.student?.first_name ?? ''} ${t.student?.last_name ?? ''}`.toLowerCase();
      const searchOk =
        !query ||
        name.includes(query) ||
        (t.student_id ?? '').toLowerCase().includes(query);

      return gOk && searchOk;
    });
  }, [computedTuitionRows, q, selectedGradeId]);

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

  // Autocomplete lists
  const tuitionStudentSuggestions = useMemo(() => {
    const query = tuitionStudentQuery.trim().toLowerCase();
    const base = students;
    const res = !query
      ? base.slice(0, 30)
      : base
          .filter((s) => {
            const name = `${s.first_name} ${s.last_name}`.toLowerCase();
            const reg = `${s.registration_id}`.toLowerCase();
            return name.includes(query) || reg.includes(query);
          })
          .slice(0, 30);
    return res;
  }, [students, tuitionStudentQuery]);

  const payProfileSuggestions = useMemo(() => {
    const query = payProfileQuery.trim().toLowerCase();
    const base = tuitionRows;

    const format = (t: StudentTuitionRow) => {
      const st = t.student;
      const name = st ? `${st.first_name ?? ''} ${st.last_name ?? ''}`.trim() : t.student_id;
      const g = st?.current_grade_id ? gradeNameById.get(st.current_grade_id) : undefined;
      return `${name} — ${t.student_id}${g ? ` (${g})` : ''}`.toLowerCase();
    };

    const res = !query
      ? base.slice(0, 30)
      : base.filter((t) => format(t).includes(query) || `${t.id}`.includes(query)).slice(0, 30);

    return res;
  }, [tuitionRows, payProfileQuery, gradeNameById]);

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
  // Load
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

        const { data: s, error: sErr } = await supabase
          .from('general_information')
          .select('id, school_name')
          .eq('id', prof.school_id)
          .single();
        if (sErr) throw sErr;
        if (!s) throw new Error('School not found.');
        const schoolData = s as SchoolRow;
        setSchool(schoolData);

        const { data: gradeRows, error: gradeErr } = await supabase
          .from('class')
          .select('id, grade_name')
          .eq('school_id', schoolData.id)
          .order('grade_name');
        if (gradeErr) throw gradeErr;
        setGrades((gradeRows ?? []) as GradeRow[]);

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

        const { data: studentRows, error: stuErr } = await supabase
          .from('students')
          .select('registration_id, first_name, last_name, current_grade_id')
          .eq('school_id', schoolData.id)
          .order('first_name');
        if (stuErr) throw stuErr;
        setStudents((studentRows ?? []) as unknown as StudentRow[]);

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
  // Hostel rule
  // -----------------------------
  const setHostelWithRule = (checked: boolean) => {
    setTuitionHostel(checked);
    if (checked) {
      setTuitionBreakfast(true);
      setTuitionLunch(true);
    }
  };

  // -----------------------------
  // Tuition modal select student
  // -----------------------------
  const selectStudentForTuition = (s: StudentRow) => {
    setTuitionStudentId(s.registration_id);
    setTuitionGradeId(s.current_grade_id ? String(s.current_grade_id) : '');

    const existing = tuitionByStudentId.get(s.registration_id);
    const exHostel = existing?.hostel ?? false;
    const exBreakfast = existing?.breakfast ?? false;
    const exLunch = existing?.lunch ?? false;

    setTuitionHostel(exHostel);
    setTuitionBreakfast(exBreakfast);
    setTuitionLunch(exLunch);

    if (exHostel) {
      setTuitionBreakfast(true);
      setTuitionLunch(true);
    }

    setTuitionStudentQuery(`${s.first_name} ${s.last_name} — ${s.registration_id}`);
    setTuitionStudentOpen(false);
  };

  const selectPayProfile = (t: StudentTuitionRow) => {
    setPayStudentTuitionId(String(t.id));
    const st = t.student;
    const name = st ? `${st.first_name} ${st.last_name}` : t.student_id;
    const g = st?.current_grade_id ? gradeNameById.get(st.current_grade_id) : undefined;
    setPayProfileQuery(`${name} — ${t.student_id}${g ? ` (${g})` : ''}`);
    setPayProfileOpen(false);
  };

  const openTuitionModalForStudent = (s: StudentRow) => {
    const existing = tuitionByStudentId.get(s.registration_id);
    const gradeId = s.current_grade_id ? String(s.current_grade_id) : '';

    setTuitionStudentId(s.registration_id);
    setTuitionGradeId(gradeId);

    setTuitionHostel(existing?.hostel ?? false);
    setTuitionBreakfast(existing?.breakfast ?? false);
    setTuitionLunch(existing?.lunch ?? false);

    if (existing?.hostel) {
      setTuitionBreakfast(true);
      setTuitionLunch(true);
    }

    setTuitionStudentQuery(`${s.first_name} ${s.last_name} — ${s.registration_id}`);
    setTuitionStudentOpen(false);
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

    const st = t.student;
    const name = st ? `${st.first_name} ${st.last_name}` : t.student_id;
    const g = st?.current_grade_id ? gradeNameById.get(st.current_grade_id) : undefined;
    setPayProfileQuery(`${name} — ${t.student_id}${g ? ` (${g})` : ''}`);
    setPayProfileOpen(false);

    setShowPaymentModal(true);
  };

  // -----------------------------
  // Save Tuition
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
      if (!feeRow) throw new Error('No school fees found for this grade. Please set School Fees first.');

      const existing = tuitionByStudentId.get(tuitionStudentId);

      // Enforce Hostel => Breakfast + Lunch
      const hostel = tuitionHostel;
      const breakfast = hostel ? true : tuitionBreakfast;
      const lunch = hostel ? true : tuitionLunch;

      if (existing) {
        const { error } = await supabase
          .from('student_tuition_description')
          .update({
            tuition_id: feeRow.id,
            hostel,
            breakfast,
            lunch,
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
          hostel,
          breakfast,
          lunch,
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
  // Save Payment
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

      // Keep amount_due for record, but balance display uses tuition.total_fee
      const baseDue = Number(tRow.total_fee ?? 0);

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
        <Navbar />
        <div className="flex">
          <AppShell />
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

  const OverviewCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Students</div>
          <div className="p-2 rounded-xl bg-blue-100">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{overviewStats.studentsCount}</div>
        <div className="text-xs text-gray-500">{overviewStats.profilesCount} tuition profiles</div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Total Expected</div>
          <div className="p-2 rounded-xl bg-indigo-100">
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{toMoney(overviewStats.totalExpected)}</div>
        <div className="text-xs text-gray-500">Sum of tuition totals</div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Total Paid</div>
          <div className="p-2 rounded-xl bg-emerald-100">
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{toMoney(overviewStats.totalPaid)}</div>
        <div className="text-xs text-gray-500">{overviewStats.txCount} payments</div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Outstanding</div>
          <div className="p-2 rounded-xl bg-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{toMoney(overviewStats.totalOutstanding)}</div>
        <div className="text-xs text-gray-500">Expected − Paid</div>
      </div>
    </div>
  );

  // -----------------------------
  // Tabs
  // -----------------------------
  const TuitionTab = () => (
    <div className="space-y-6">
      <OverviewCards />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Student Tuition Management</h3>
            <p className="text-sm text-gray-500">Clearly shows Total Fee, Paid and Outstanding.</p>
          </div>

          <button
            onClick={() => {
              setTuitionStudentId('');
              setTuitionGradeId('');
              setTuitionHostel(false);
              setTuitionBreakfast(false);
              setTuitionLunch(false);
              setTuitionStudentQuery('');
              setShowTuitionModal(true);
            }}
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
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Total Paid</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Outstanding</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Last Payment</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map((s) => {
                const tuition = tuitionByStudentId.get(s.registration_id);
                const gName = s.current_grade_id ? gradeNameById.get(s.current_grade_id) : null;

                if (!tuition) {
                  return (
                    <tr key={s.registration_id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">
                          {s.first_name} {s.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{s.registration_id}</div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900">{gName ?? '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">—</td>
                      <td className="py-4 px-4 text-sm text-gray-500">—</td>
                      <td className="py-4 px-4 text-sm text-gray-500">—</td>
                      <td className="py-4 px-4 text-sm text-gray-500">No profile</td>
                      <td className="py-4 px-4 text-sm text-gray-500">—</td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => openTuitionModalForStudent(s)}
                          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                        >
                          Create Tuition
                        </button>
                      </td>
                    </tr>
                  );
                }

                const computed = computedTuitionRows.find((x) => x.tuition.id === tuition.id);
                const total = computed?.total ?? Number(tuition.total_fee ?? 0);
                const paid = computed?.paid ?? 0;
                const outstanding = computed?.outstanding ?? Math.max(total - paid, 0);
                const status = computed?.status ?? 'pending';
                const lastPayment = computed?.lastPayment ?? null;

                // FIXED: Removed the 'overdue' check since status can only be 'pending', 'partial', or 'paid'
                const badge =
                  status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : status === 'partial'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-800';

                return (
                  <tr key={s.registration_id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">
                        {s.first_name} {s.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{s.registration_id}</div>
                    </td>

                    <td className="py-4 px-4 text-sm text-gray-900">{gName ?? '—'}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-gray-900">{toMoney(total)}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-gray-900">{toMoney(paid)}</td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          outstanding > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {toMoney(outstanding)}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge}`}>
                        {status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-sm text-gray-600">{lastPayment ?? '—'}</td>

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
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-500">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-gray-400" />
          Outstanding is calculated as <span className="font-medium">student_tuition_description.total_fee − SUM(fee_transaction.amount_paid)</span>.
        </div>
      </div>
    </div>
  );

  const TransactionsTab = () => (
    <div className="space-y-6">
      <OverviewCards />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
            <p className="text-sm text-gray-500">Payments recorded. Tuition balance is shown in Tuition tab.</p>
          </div>

          <button
            onClick={() => {
              setPayStudentTuitionId('');
              setPayProfileQuery('');
              setShowPaymentModal(true);
            }}
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
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Method</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Reference</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.map((t) => {
                const stu = t.student_tuition?.student;
                const name = stu ? `${stu.first_name ?? ''} ${stu.last_name ?? ''}`.trim() : '—';

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
                    <td className="py-4 px-4 text-sm text-gray-700">{t.payment_method}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{t.payment_reference ?? '—'}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{t.created}</td>
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

        <div className="p-4 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-gray-400" />
          To see outstanding per student, use the <span className="font-medium">Tuition</span> tab.
        </div>
      </div>
    </div>
  );

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <AppShell />

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

            {activeTab === 'tuition' && <TuitionTab />}
            {activeTab === 'transactions' && <TransactionsTab />}
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
                <p className="text-sm text-gray-500">Hostel auto-selects Breakfast & Lunch.</p>
              </div>
              <button onClick={() => setShowTuitionModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveTuition} className="space-y-4">
              <div ref={tuitionStudentBoxRef as any} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Student *</label>

                <input
                  value={tuitionStudentQuery}
                  onChange={(e) => {
                    setTuitionStudentQuery(e.target.value);
                    setTuitionStudentOpen(true);
                    setTuitionStudentId('');
                    setTuitionGradeId('');
                    setTuitionHostel(false);
                    setTuitionBreakfast(false);
                    setTuitionLunch(false);
                  }}
                  onFocus={() => setTuitionStudentOpen(true)}
                  placeholder="Type name or registration number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />

                {tuitionStudentOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="max-h-72 overflow-auto">
                      {tuitionStudentSuggestions.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No matches.</div>
                      ) : (
                        tuitionStudentSuggestions.map((s) => (
                          <button
                            type="button"
                            key={s.registration_id}
                            onClick={() => selectStudentForTuition(s)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50"
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {s.first_name} {s.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{s.registration_id}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {!tuitionStudentId && tuitionStudentQuery.trim() && (
                  <p className="text-xs text-amber-700 mt-2">Select a student from the list to continue.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Grade *</label>
                <select
                  value={tuitionGradeId}
                  onChange={(e) => setTuitionGradeId(e.target.value)}
                  required
                  disabled={!tuitionStudentId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="">Select grade</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.grade_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tuitionHostel}
                    onChange={(e) => setHostelWithRule(e.target.checked)}
                    disabled={!tuitionStudentId}
                  />
                  <span className="text-sm text-gray-700">Hostel</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-3 rounded-xl border border-gray-200 cursor-pointer ${
                    tuitionHostel ? 'bg-gray-50 opacity-80' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tuitionBreakfast}
                    onChange={(e) => setTuitionBreakfast(e.target.checked)}
                    disabled={!tuitionStudentId || tuitionHostel}
                  />
                  <span className="text-sm text-gray-700">Breakfast</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-3 rounded-xl border border-gray-200 cursor-pointer ${
                    tuitionHostel ? 'bg-gray-50 opacity-80' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tuitionLunch}
                    onChange={(e) => setTuitionLunch(e.target.checked)}
                    disabled={!tuitionStudentId || tuitionHostel}
                  />
                  <span className="text-sm text-gray-700">Lunch</span>
                </label>
              </div>

              {tuitionHostel && (
                <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  Hostel selected → Breakfast and Lunch are automatically included.
                </div>
              )}

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
                  disabled={savingTuition || !tuitionStudentId}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingTuition ? 'Saving…' : 'Save Tuition'}
                </button>
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
                <p className="text-sm text-gray-500">Adds a new fee_transaction row.</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div ref={payProfileBoxRef as any} className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Student Tuition Profile *</label>

                <input
                  value={payProfileQuery}
                  onChange={(e) => {
                    setPayProfileQuery(e.target.value);
                    setPayProfileOpen(true);
                    setPayStudentTuitionId('');
                  }}
                  onFocus={() => setPayProfileOpen(true)}
                  placeholder="Type student name, reg no, grade..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />

                {payProfileOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="max-h-72 overflow-auto">
                      {payProfileSuggestions.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No matches.</div>
                      ) : (
                        payProfileSuggestions.map((t) => {
                          const st = t.student;
                          const name = st ? `${st.first_name ?? ''} ${st.last_name ?? ''}`.trim() : t.student_id;
                          const g = st?.current_grade_id ? gradeNameById.get(st.current_grade_id) : undefined;

                          return (
                            <button
                              type="button"
                              key={t.id}
                              onClick={() => selectPayProfile(t)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50"
                            >
                              <div className="text-sm font-medium text-gray-900">
                                {name} {g ? <span className="text-xs text-gray-500">({g})</span> : null}
                              </div>
                              <div className="text-xs text-gray-500">
                                {t.student_id} • Profile #{t.id}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
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
                  disabled={savingPayment || !payStudentTuitionId}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                >
                  {savingPayment ? 'Saving…' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
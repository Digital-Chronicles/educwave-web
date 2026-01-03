'use client';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  Clipboard,
  CreditCard,
  Download,
  GraduationCap,
  IdCard,
  Mail,
  Pencil,
  Plus,
  Save,
  Shield,
  Trash2,
  User,
  Users,
  Wallet,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';

/* ---------------- Types (match your DB tables) ---------------- */
type Role = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT' | string;

interface ProfileRow {
  user_id: string; // uuid
  email: string | null;
  full_name: string | null;
  role: Role;
  school_id: string | null; // uuid
  created_at: string;
  updated_at: string;
}

interface SchoolRow {
  id: string; // uuid
  school_name: string;
}

interface TeacherRow {
  registration_id: string;
  user_id: string; // uuid
  initials: string | null;
  first_name: string;
  last_name: string;
  gender: string;
  year_of_entry: string;
  profile_picture_url: string | null;
  school_id: string; // uuid
  registered_by: string | null; // uuid
  created_at: string;
}

interface CurrentEmploymentRow {
  id: number;
  teacher_id: string;
  school_id: string | null;
  position: string;
  department: string;
}

interface EducationBackgroundRow {
  id: number;
  teacher_id: string;
  school_id: string | null;
  education_award: string;
  institution: string;
  graduation_year: number;
  result_obtained: string;
  additional_certifications: string | null;
}

interface EmploymentHistoryRow {
  id: number;
  teacher_id: string;
  school_id: string | null;
  organization: string;
  department: string;
  role: string;
  start_date: string;
  end_date: string | null;
  responsibilities: string;
}

interface PayrollInformationRow {
  id: number;
  teacher_id: string;
  school_id: string | null;
  salary: number;
  bank_name: string;
  account_number: string;
  tax_identification_number: string;
  nssf_number: string;
  payment_frequency: 'monthly' | 'bi-weekly' | 'weekly' | string;
}

interface NextOfKinRow {
  id: number;
  teacher_id: string;
  school_id: string | null;
  name: string;
  relationship: string;
  contact_number: string;
  address: string;
}

type TeacherTab = 'overview' | 'employment' | 'education' | 'payroll' | 'kin';

/* ---------------- Helpers ---------------- */
function formatDate(dateString?: string | null) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function moneyUGX(n?: number | null) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `UGX ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function initialsOf(first?: string | null, last?: string | null) {
  const a = (first?.[0] || '').toUpperCase();
  const b = (last?.[0] || '').toUpperCase();
  return (a + b) || '—';
}

function roleBadge(role?: string | null) {
  switch (role) {
    case 'ADMIN':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'FINANCE':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'ACADEMIC':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'TEACHER':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

/* ---------------- UI Components ---------------- */
function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  widthClass = 'max-w-2xl',
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  widthClass?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div className={`w-full ${widthClass} rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden`}>
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-orange-50 flex items-center justify-between">
          <h3 className="text-sm md:text-base font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 bg-white">{footer}</div>}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 text-right break-words">{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent = 'blue',
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent?: 'blue' | 'orange' | 'gray';
}) {
  const accentMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl border ${accentMap[accent]}`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-sm font-semibold text-gray-900 truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}

function TeacherTabs({
  tab,
  setTab,
  counts,
}: {
  tab: TeacherTab;
  setTab: (t: TeacherTab) => void;
  counts: { edu: number; hist: number };
}) {
  const tabs: { key: TeacherTab; label: string; badge?: number; icon: React.ReactNode; tone?: 'blue' | 'orange' }[] = [
    { key: 'overview', label: 'Overview', icon: <User size={16} />, tone: 'blue' },
    { key: 'employment', label: 'Employment', badge: counts.hist, icon: <Briefcase size={16} />, tone: 'orange' },
    { key: 'education', label: 'Education', badge: counts.edu, icon: <GraduationCap size={16} />, tone: 'blue' },
    { key: 'payroll', label: 'Payroll', icon: <CreditCard size={16} />, tone: 'orange' },
    { key: 'kin', label: 'Next of Kin', icon: <Users size={16} />, tone: 'blue' },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(t => {
            const active = tab === t.key;
            const activeClass =
              t.tone === 'orange'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm border border-orange-600'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm border border-blue-700';

            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={[
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition border',
                  active ? activeClass : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200',
                ].join(' ')}
              >
                <span className={active ? 'text-white' : 'text-gray-600'}>{t.icon}</span>
                {t.label}
                {typeof t.badge === 'number' && (
                  <span
                    className={[
                      'ml-1 px-2 py-0.5 rounded-full text-xs font-bold border',
                      active ? 'bg-white/15 text-white border-white/20' : 'bg-white text-gray-700 border-gray-200',
                    ].join(' ')}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Main ---------------- */
export default function TeacherDetailClient() {
  const router = useRouter();
  const params = useParams<{ registration_id: string }>();

  const registrationId = useMemo(() => {
    const raw = params?.registration_id ?? '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params]);

  const [authChecking, setAuthChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [myProfile, setMyProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<Pick<ProfileRow, 'email' | 'full_name' | 'role'> | null>(null);

  const [currentEmployment, setCurrentEmployment] = useState<CurrentEmploymentRow | null>(null);
  const [payroll, setPayroll] = useState<PayrollInformationRow | null>(null);
  const [nextOfKin, setNextOfKin] = useState<NextOfKinRow | null>(null);
  const [education, setEducation] = useState<EducationBackgroundRow[]>([]);
  const [history, setHistory] = useState<EmploymentHistoryRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [tab, setTab] = useState<TeacherTab>('overview');

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2200);
  };

  const [copied, setCopied] = useState<string | null>(null);

  /* ---------------- Auth ---------------- */
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/');
        return;
      }
      const u = data.session.user;
      setUserEmail(u.email ?? null);
      setUserName((u.user_metadata as any)?.full_name || 'Admin User');
      setAuthChecking(false);
    };
    checkAuth();
  }, [router]);

  /* ---------------- Reload helpers ---------------- */
  const reloadAll = async (teacherRegId: string) => {
    const { data: ce } = await supabase
      .from('current_employment')
      .select('id, teacher_id, school_id, position, department')
      .eq('teacher_id', teacherRegId)
      .maybeSingle();
    setCurrentEmployment((ce as any) ?? null);

    const { data: pr } = await supabase
      .from('payroll_information')
      .select('id, teacher_id, school_id, salary, bank_name, account_number, tax_identification_number, nssf_number, payment_frequency')
      .eq('teacher_id', teacherRegId)
      .maybeSingle();
    setPayroll((pr as any) ?? null);

    const { data: nk } = await supabase
      .from('next_of_kin')
      .select('id, teacher_id, school_id, name, relationship, contact_number, address')
      .eq('teacher_id', teacherRegId)
      .maybeSingle();
    setNextOfKin((nk as any) ?? null);

    const { data: edu } = await supabase
      .from('education_background')
      .select('id, teacher_id, school_id, education_award, institution, graduation_year, result_obtained, additional_certifications')
      .eq('teacher_id', teacherRegId)
      .order('graduation_year', { ascending: false });
    setEducation((edu as any) ?? []);

    const { data: hist } = await supabase
      .from('employment_history')
      .select('id, teacher_id, school_id, organization, department, role, start_date, end_date, responsibilities')
      .eq('teacher_id', teacherRegId)
      .order('start_date', { ascending: false });
    setHistory((hist as any) ?? []);
  };

  /* ---------------- Load Data (USES ONLY REAL COLUMNS) ---------------- */
  useEffect(() => {
    if (authChecking) return;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;

        if (!authUser?.id) {
          setErrorMsg('Could not find authenticated user.');
          setLoading(false);
          return;
        }

        // ✅ My profile (profiles has NO id column - use user_id)
        const { data: myP, error: myPErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id, created_at, updated_at')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (myPErr || !myP) {
          setErrorMsg(myPErr?.message || 'Your profile is missing in profiles table.');
          setLoading(false);
          return;
        }

        const myProfileRow = myP as ProfileRow;
        setMyProfile(myProfileRow);

        if (!myProfileRow.school_id) {
          setErrorMsg('Your account is not linked to a school (profiles.school_id is NULL).');
          setLoading(false);
          return;
        }

        // school
        const { data: sch, error: schError } = await supabase
          .from('general_information')
          .select('id, school_name')
          .eq('id', myProfileRow.school_id)
          .single();

        if (schError || !sch) {
          setErrorMsg(schError?.message || 'Failed to load school.');
          setLoading(false);
          return;
        }

        const schoolRow = sch as SchoolRow;
        setSchool(schoolRow);

        // ✅ teacher (uses your teachers table columns)
        const { data: t, error: tError } = await supabase
          .from('teachers')
          .select(
            'registration_id, user_id, initials, first_name, last_name, gender, year_of_entry, profile_picture_url, school_id, registered_by, created_at'
          )
          .eq('registration_id', registrationId)
          .eq('school_id', schoolRow.id)
          .single();

        if (tError || !t) {
          setErrorMsg(tError?.message || 'Teacher not found.');
          setLoading(false);
          return;
        }

        const teacherRow = t as TeacherRow;
        setTeacher(teacherRow);

        // ✅ teacher's account profile (profiles.user_id, not profiles.id)
        const { data: tp } = await supabase
          .from('profiles')
          .select('email, full_name, role')
          .eq('user_id', teacherRow.user_id)
          .maybeSingle();

        setTeacherProfile((tp as any) ?? null);

        await reloadAll(teacherRow.registration_id);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Unexpected error while loading teacher profile.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authChecking, registrationId]);

  /* ---------------- Computed (NO DUPLICATES) ---------------- */
  const fullName = useMemo(() => {
    if (!teacher) return '';
    return `${teacher.first_name} ${teacher.last_name}`;
  }, [teacher]);

  const avatarText = useMemo(() => {
    if (!teacher) return '—';
    return teacher.initials || initialsOf(teacher.first_name, teacher.last_name);
  }, [teacher]);

  /* ---------------- Modals state ---------------- */
  const [employmentModalOpen, setEmploymentModalOpen] = useState(false);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const [kinModalOpen, setKinModalOpen] = useState(false);

  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [eduMode, setEduMode] = useState<'add' | 'edit'>('add');
  const [eduEditId, setEduEditId] = useState<number | null>(null);

  const [histModalOpen, setHistModalOpen] = useState(false);
  const [histMode, setHistMode] = useState<'add' | 'edit'>('add');
  const [histEditId, setHistEditId] = useState<number | null>(null);

  /* ---------------- Forms ---------------- */
  const [empDepartment, setEmpDepartment] = useState('');
  const [empPosition, setEmpPosition] = useState('');

  const [prSalary, setPrSalary] = useState<string>('');
  const [prBankName, setPrBankName] = useState('');
  const [prAccountNumber, setPrAccountNumber] = useState('');
  const [prTin, setPrTin] = useState('');
  const [prNssf, setPrNssf] = useState('');
  const [prFrequency, setPrFrequency] = useState<'monthly' | 'bi-weekly' | 'weekly' | string>('monthly');

  const [kinName, setKinName] = useState('');
  const [kinRelationship, setKinRelationship] = useState('');
  const [kinContact, setKinContact] = useState('');
  const [kinAddress, setKinAddress] = useState('');

  const [eduAward, setEduAward] = useState('');
  const [eduInstitution, setEduInstitution] = useState('');
  const [eduYear, setEduYear] = useState<string>('');
  const [eduResult, setEduResult] = useState('');
  const [eduCerts, setEduCerts] = useState('');

  const [histOrg, setHistOrg] = useState('');
  const [histDept, setHistDept] = useState('');
  const [histRole, setHistRole] = useState('');
  const [histStart, setHistStart] = useState('');
  const [histEnd, setHistEnd] = useState('');
  const [histResp, setHistResp] = useState('');

  /* ---------------- Open modal helpers ---------------- */
  const openEmploymentModal = () => {
    setEmpDepartment(currentEmployment?.department || '');
    setEmpPosition(currentEmployment?.position || '');
    setEmploymentModalOpen(true);
  };

  const openPayrollModal = () => {
    setPrSalary(payroll?.salary != null ? String(payroll.salary) : '');
    setPrBankName(payroll?.bank_name || '');
    setPrAccountNumber(payroll?.account_number || '');
    setPrTin(payroll?.tax_identification_number || '');
    setPrNssf(payroll?.nssf_number || '');
    setPrFrequency(payroll?.payment_frequency || 'monthly');
    setPayrollModalOpen(true);
  };

  const openKinModal = () => {
    setKinName(nextOfKin?.name || '');
    setKinRelationship(nextOfKin?.relationship || '');
    setKinContact(nextOfKin?.contact_number || '');
    setKinAddress(nextOfKin?.address || '');
    setKinModalOpen(true);
  };

  const openAddEducation = () => {
    setEduMode('add');
    setEduEditId(null);
    setEduAward('');
    setEduInstitution('');
    setEduYear('');
    setEduResult('');
    setEduCerts('');
    setEduModalOpen(true);
  };

  const openEditEducation = (row: EducationBackgroundRow) => {
    setEduMode('edit');
    setEduEditId(row.id);
    setEduAward(row.education_award);
    setEduInstitution(row.institution);
    setEduYear(String(row.graduation_year));
    setEduResult(row.result_obtained);
    setEduCerts(row.additional_certifications || '');
    setEduModalOpen(true);
  };

  const openAddHistory = () => {
    setHistMode('add');
    setHistEditId(null);
    setHistOrg('');
    setHistDept('');
    setHistRole('');
    setHistStart('');
    setHistEnd('');
    setHistResp('');
    setHistModalOpen(true);
  };

  const openEditHistory = (row: EmploymentHistoryRow) => {
    setHistMode('edit');
    setHistEditId(row.id);
    setHistOrg(row.organization);
    setHistDept(row.department);
    setHistRole(row.role);
    setHistStart(row.start_date);
    setHistEnd(row.end_date || '');
    setHistResp(row.responsibilities);
    setHistModalOpen(true);
  };

  /* ---------------- Actions ---------------- */
  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      // ignore
    }
  };

  /* ---------------- Save handlers ---------------- */
  const saveEmployment = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacher || !school) return;

    if (!empDepartment.trim() || !empPosition.trim()) {
      showToast('error', 'Department and Position are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        teacher_id: teacher.registration_id,
        school_id: school.id,
        department: empDepartment.trim(),
        position: empPosition.trim(),
      };

      const { data, error } = await supabase
        .from('current_employment')
        .upsert(payload, { onConflict: 'teacher_id' })
        .select('id, teacher_id, school_id, position, department')
        .single();

      if (error) throw error;

      setCurrentEmployment(data as any);
      showToast('success', 'Employment saved.');
      setEmploymentModalOpen(false);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save employment.');
    } finally {
      setSubmitting(false);
    }
  };

  const savePayroll = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacher || !school) return;

    const salaryNum = prSalary ? Number(prSalary) : NaN;
    if (Number.isNaN(salaryNum) || salaryNum < 0) {
      showToast('error', 'Enter a valid salary amount.');
      return;
    }
    if (!prBankName.trim() || !prAccountNumber.trim() || !prFrequency) {
      showToast('error', 'Bank name, account number, and frequency are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        teacher_id: teacher.registration_id,
        school_id: school.id,
        salary: salaryNum,
        bank_name: prBankName.trim(),
        account_number: prAccountNumber.trim(),
        tax_identification_number: prTin.trim(),
        nssf_number: prNssf.trim(),
        payment_frequency: prFrequency,
      };

      const { data, error } = await supabase
        .from('payroll_information')
        .upsert(payload, { onConflict: 'teacher_id' })
        .select('id, teacher_id, school_id, salary, bank_name, account_number, tax_identification_number, nssf_number, payment_frequency')
        .single();

      if (error) throw error;

      setPayroll(data as any);
      showToast('success', 'Payroll saved.');
      setPayrollModalOpen(false);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save payroll.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveKin = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacher || !school) return;

    if (!kinName.trim() || !kinRelationship.trim() || !kinContact.trim()) {
      showToast('error', 'Name, relationship, and contact are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        teacher_id: teacher.registration_id,
        school_id: school.id,
        name: kinName.trim(),
        relationship: kinRelationship.trim(),
        contact_number: kinContact.trim(),
        address: kinAddress.trim(),
      };

      const { data, error } = await supabase
        .from('next_of_kin')
        .upsert(payload, { onConflict: 'teacher_id' })
        .select('id, teacher_id, school_id, name, relationship, contact_number, address')
        .single();

      if (error) throw error;

      setNextOfKin(data as any);
      showToast('success', 'Next of kin saved.');
      setKinModalOpen(false);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save next of kin.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveEducation = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacher || !school) return;

    const yearNum = eduYear ? Number(eduYear) : NaN;
    if (!eduAward.trim() || !eduInstitution.trim() || Number.isNaN(yearNum) || yearNum < 1900) {
      showToast('error', 'Award, institution, and valid graduation year are required.');
      return;
    }
    if (!eduResult.trim()) {
      showToast('error', 'Result obtained is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (eduMode === 'add') {
        const { error } = await supabase.from('education_background').insert({
          teacher_id: teacher.registration_id,
          school_id: school.id,
          education_award: eduAward.trim(),
          institution: eduInstitution.trim(),
          graduation_year: yearNum,
          result_obtained: eduResult.trim(),
          additional_certifications: eduCerts.trim() || null,
        });
        if (error) throw error;
        showToast('success', 'Education added.');
      } else {
        if (!eduEditId) return;
        const { error } = await supabase
          .from('education_background')
          .update({
            education_award: eduAward.trim(),
            institution: eduInstitution.trim(),
            graduation_year: yearNum,
            result_obtained: eduResult.trim(),
            additional_certifications: eduCerts.trim() || null,
          })
          .eq('id', eduEditId)
          .eq('teacher_id', teacher.registration_id);

        if (error) throw error;
        showToast('success', 'Education updated.');
      }

      await reloadAll(teacher.registration_id);
      setEduModalOpen(false);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save education.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEducation = async (id: number) => {
    if (!teacher) return;
    if (!confirm('Delete this education record?')) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('education_background').delete().eq('id', id).eq('teacher_id', teacher.registration_id);
      if (error) throw error;

      setEducation(prev => prev.filter(x => x.id !== id));
      showToast('success', 'Education deleted.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete education.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveHistory = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacher || !school) return;

    if (!histOrg.trim() || !histDept.trim() || !histRole.trim() || !histStart) {
      showToast('error', 'Organization, department, role, and start date are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        teacher_id: teacher.registration_id,
        school_id: school.id,
        organization: histOrg.trim(),
        department: histDept.trim(),
        role: histRole.trim(),
        start_date: histStart,
        end_date: histEnd || null,
        responsibilities: histResp.trim(),
      };

      if (histMode === 'add') {
        const { error } = await supabase.from('employment_history').insert(payload);
        if (error) throw error;
        showToast('success', 'History added.');
      } else {
        if (!histEditId) return;
        const { error } = await supabase.from('employment_history').update(payload).eq('id', histEditId).eq('teacher_id', teacher.registration_id);
        if (error) throw error;
        showToast('success', 'History updated.');
      }

      await reloadAll(teacher.registration_id);
      setHistModalOpen(false);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save history.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteHistory = async (id: number) => {
    if (!teacher) return;
    if (!confirm('Delete this employment history record?')) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('employment_history').delete().eq('id', id).eq('teacher_id', teacher.registration_id);
      if (error) throw error;

      setHistory(prev => prev.filter(x => x.id !== id));
      showToast('success', 'History deleted.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete history.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Loading / Errors ---------------- */
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-blue-600 to-orange-400 animate-pulse mb-4" />
          <p className="text-sm text-gray-700">Loading teacher profile…</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !teacher || !school) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50 flex flex-col">
        <Navbar/>
        <div className="flex flex-1">
          <AppShell />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-orange-50 border border-orange-200">
                  <AlertTriangle className="text-orange-600" size={18} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">Couldn’t open teacher profile</h2>
                  <p className="text-sm text-gray-600 mt-1">{errorMsg || 'Unknown error.'}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => router.back()}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={() => router.push('/teachers')}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm hover:from-blue-700 hover:to-blue-800"
                    >
                      Teachers List
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50 flex flex-col">
      <Navbar/>

      <div className="flex flex-1 overflow-hidden">
        <AppShell />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toast */}
          {toast && (
            <div className="fixed z-[90] top-5 right-5">
              <div
                className={[
                  'rounded-2xl border shadow-lg px-4 py-3 bg-white flex items-start gap-3',
                  toast.type === 'success' ? 'border-blue-200' : 'border-orange-200',
                ].join(' ')}
              >
                <div
                  className={`p-2 rounded-xl border ${
                    toast.type === 'success'
                      ? 'bg-blue-50 border-blue-100 text-blue-700'
                      : 'bg-orange-50 border-orange-100 text-orange-700'
                  }`}
                >
                  {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                </div>
                <div className="text-sm font-semibold text-gray-900">{toast.msg}</div>
              </div>
            </div>
          )}

          {/* Hero Header */}
          <div className="relative overflow-hidden border-b border-gray-200 bg-white">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50" />
            <div className="relative p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => router.push('/teachers')}
                    className="mt-1 p-2 rounded-xl border border-gray-200 bg-white/80 backdrop-blur hover:bg-white text-gray-700 transition"
                    title="Back"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-orange-400 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                      {avatarText}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">{fullName}</h1>

                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${roleBadge(teacherProfile?.role || 'TEACHER')}`}>
                          {teacherProfile?.role || 'TEACHER'}
                        </span>

                        <span
                          className={[
                            'px-3 py-1 rounded-full text-xs font-semibold border',
                            currentEmployment ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200',
                          ].join(' ')}
                        >
                          {currentEmployment ? 'Active Employment' : 'Employment Not Set'}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700">
                        <button
                          type="button"
                          onClick={() => copyText(teacher.registration_id, 'Registration ID')}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-50 transition"
                          title="Copy registration id"
                        >
                          <IdCard size={16} className="text-blue-700" />
                          <span className="font-mono font-semibold text-gray-900">{teacher.registration_id}</span>
                          <Clipboard size={14} className="text-blue-700/70" />
                        </button>

                        <span className="inline-flex items-center gap-2">
                          <Building2 size={16} className="text-blue-700" />
                          {school.school_name}
                        </span>

                        <span className="inline-flex items-center gap-2">
                          <CalendarDays size={16} className="text-orange-600" />
                          Year of entry: {teacher.year_of_entry || '—'}
                        </span>
                      </div>

                      {copied && (
                        <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
                          <CheckCircle2 size={14} />
                          Copied {copied}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
                  >
                    <Download size={16} className="text-gray-700" />
                    Export
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold shadow-sm hover:from-blue-700 hover:to-blue-800 transition"
                    onClick={() => router.push(`/teachers/${encodeURIComponent(teacher.registration_id)}/edit`)}
                  >
                    <BadgeCheck size={16} />
                    Edit Profile
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Account Email" value={teacherProfile?.email || '—'} icon={<Mail size={18} />} accent="blue" />
                <StatCard label="Department" value={currentEmployment?.department || '—'} icon={<Briefcase size={18} />} accent="orange" />
                <StatCard label="Position" value={currentEmployment?.position || '—'} icon={<Shield size={18} />} accent="blue" />
                <StatCard label="Salary" value={payroll ? moneyUGX(payroll.salary) : '—'} icon={<Wallet size={18} />} accent="orange" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <TeacherTabs tab={tab} setTab={setTab} counts={{ edu: education.length, hist: history.length }} />

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Overview */}
              {tab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl border bg-blue-50 border-blue-100 text-blue-700">
                            <User size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">Profile Summary</h3>
                            <p className="text-sm text-gray-600">Core identity & account information.</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-blue-50/40">
                          <div className="text-xs text-gray-500">Full Name</div>
                          <div className="mt-1 font-semibold text-gray-900">{fullName}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-blue-50/40">
                          <div className="text-xs text-gray-500">Gender</div>
                          <div className="mt-1 font-semibold text-gray-900">{teacher.gender || '—'}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-orange-50/40">
                          <div className="text-xs text-gray-500">Account Email</div>
                          <div className="mt-1 font-semibold text-gray-900 truncate">{teacherProfile?.email || '—'}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-orange-50/40">
                          <div className="text-xs text-gray-500">Account Role</div>
                          <div className="mt-1 font-semibold text-gray-900">{teacherProfile?.role || '—'}</div>
                        </div>

                        <div className="md:col-span-2 rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-gray-50">
                          <div className="text-xs text-gray-500">Registration ID</div>
                          <div className="mt-1 font-semibold text-gray-900 font-mono">{teacher.registration_id}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl border bg-orange-50 border-orange-100 text-orange-700">
                            <Briefcase size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">Current Employment</h3>
                            <p className="text-sm text-gray-600">Position and department (current).</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={openEmploymentModal}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
                        >
                          <Pencil size={16} />
                          {currentEmployment ? 'Edit' : 'Add'}
                        </button>
                      </div>

                      <div className="p-6">
                        <div className="rounded-2xl border border-gray-200 p-4">
                          <InfoLine label="Department" value={currentEmployment?.department || '—'} />
                          <div className="border-t border-gray-100" />
                          <InfoLine label="Position" value={currentEmployment?.position || '—'} />
                        </div>

                        {!currentEmployment && (
                          <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                            Current employment not set yet. Click <b>Add</b> to create it.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 lg:sticky lg:top-6 h-fit">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl border bg-blue-50 border-blue-100 text-blue-700">
                            <Shield size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
                            <p className="text-sm text-gray-600">Fill missing details fast.</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-3">
                        <button
                          type="button"
                          onClick={openPayrollModal}
                          className="w-full inline-flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-4 hover:bg-gray-50"
                        >
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <CreditCard size={16} className="text-orange-600" /> Payroll
                          </span>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full border ${
                              payroll ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {payroll ? 'Edit' : 'Add'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={openKinModal}
                          className="w-full inline-flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-4 hover:bg-gray-50"
                        >
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <Users size={16} className="text-blue-700" /> Next of Kin
                          </span>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full border ${
                              nextOfKin ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {nextOfKin ? 'Edit' : 'Add'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={openAddEducation}
                          className="w-full inline-flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-4 hover:bg-gray-50"
                        >
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <GraduationCap size={16} className="text-blue-700" /> Education
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                            + Add
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={openAddHistory}
                          className="w-full inline-flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-4 hover:bg-gray-50"
                        >
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <Briefcase size={16} className="text-orange-600" /> Employment History
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                            + Add
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white flex items-center gap-2">
                        <div className="p-2 rounded-xl border bg-orange-50 border-orange-100 text-orange-700">
                          <Wallet size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Payroll Preview</h3>
                          <p className="text-sm text-gray-600">Masked for privacy.</p>
                        </div>
                      </div>

                      <div className="p-6">
                        <InfoLine label="Salary" value={payroll ? moneyUGX(payroll.salary) : '—'} />
                        <div className="border-t border-gray-100" />
                        <InfoLine label="Bank" value={payroll?.bank_name || '—'} />
                        <div className="border-t border-gray-100" />
                        <InfoLine label="Account" value={payroll?.account_number ? `•••• ${payroll.account_number.slice(-4)}` : '—'} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Employment */}
              {tab === 'employment' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl border bg-orange-50 border-orange-100 text-orange-700">
                          <Briefcase size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Current Employment</h3>
                          <p className="text-sm text-gray-600">Position and department.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openEmploymentModal}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
                      >
                        <Pencil size={16} />
                        {currentEmployment ? 'Edit' : 'Add'}
                      </button>
                    </div>

                    <div className="p-6">
                      <div className="rounded-2xl border border-gray-200 p-4">
                        <InfoLine label="Department" value={currentEmployment?.department || '—'} />
                        <div className="border-t border-gray-100" />
                        <InfoLine label="Position" value={currentEmployment?.position || '—'} />
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl border bg-blue-50 border-blue-100 text-blue-700">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Employment History</h3>
                          <p className="text-sm text-gray-600">Previous work experience.</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openAddHistory}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      {history.length === 0 ? (
                        <div className="p-10 text-center text-gray-600">No employment history yet.</div>
                      ) : (
                        history.map(h => (
                          <div key={h.id} className="rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900">{h.organization}</div>
                                <div className="text-sm text-gray-600">
                                  {h.role} • {h.department}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {formatDate(h.start_date)} — {h.end_date ? formatDate(h.end_date) : 'Present'}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditHistory(h)}
                                  className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                                >
                                  <Pencil size={14} className="inline mr-1" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => deleteHistory(h.id)}
                                  className="px-3 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 text-sm font-semibold disabled:opacity-60"
                                >
                                  <Trash2 size={14} className="inline mr-1" />
                                  Delete
                                </button>
                              </div>
                            </div>

                            {h.responsibilities && (
                              <div className="mt-3 text-sm text-gray-700 whitespace-pre-line">{h.responsibilities}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Education */}
              {tab === 'education' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl border bg-blue-50 border-blue-100 text-blue-700">
                        <GraduationCap size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Education Background</h3>
                        <p className="text-sm text-gray-600">Awards, institutions, results & certifications.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={openAddEducation}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold hover:from-orange-600 hover:to-orange-700"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {education.length === 0 ? (
                      <div className="p-10 text-center text-gray-600">No education records yet.</div>
                    ) : (
                      education.map(e => (
                        <div key={e.id} className="rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900">{e.education_award}</div>
                              <div className="text-sm text-gray-600">
                                {e.institution} • {e.graduation_year}
                              </div>
                              <div className="mt-2 inline-flex items-center gap-2">
                                <span className="text-xs px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                                  {e.result_obtained}
                                </span>
                                {e.additional_certifications && (
                                  <span className="text-xs px-2.5 py-1 rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                                    {e.additional_certifications}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditEducation(e)}
                                className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                              >
                                <Pencil size={14} className="inline mr-1" />
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => deleteEducation(e.id)}
                                className="px-3 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 text-sm font-semibold disabled:opacity-60"
                              >
                                <Trash2 size={14} className="inline mr-1" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Payroll */}
              {tab === 'payroll' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl border bg-orange-50 border-orange-100 text-orange-700">
                          <CreditCard size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Payroll Information</h3>
                          <p className="text-sm text-gray-600">Salary and payment identifiers.</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openPayrollModal}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
                      >
                        <Pencil size={16} />
                        {payroll ? 'Edit' : 'Add'}
                      </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-orange-50/40">
                        <div className="text-xs text-gray-500">Salary</div>
                        <div className="mt-1 font-semibold text-gray-900">{payroll ? moneyUGX(payroll.salary) : '—'}</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-orange-50/40">
                        <div className="text-xs text-gray-500">Frequency</div>
                        <div className="mt-1 font-semibold text-gray-900">{payroll?.payment_frequency || '—'}</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-blue-50/40">
                        <div className="text-xs text-gray-500">Bank</div>
                        <div className="mt-1 font-semibold text-gray-900">{payroll?.bank_name || '—'}</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-blue-50/40">
                        <div className="text-xs text-gray-500">Account</div>
                        <div className="mt-1 font-semibold text-gray-900 font-mono">
                          {payroll?.account_number ? `•••• ${payroll.account_number.slice(-4)}` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center gap-2">
                      <div className="p-2 rounded-xl border bg-blue-50 border-blue-100 text-blue-700">
                        <Shield size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Privacy</h3>
                        <p className="text-sm text-gray-600">Sensitive fields masked.</p>
                      </div>
                    </div>
                    <div className="p-6 text-sm text-gray-700">Account number, TIN and NSSF are shown with only the last 4 digits.</div>
                  </div>
                </div>
              )}

              {/* Kin */}
              {tab === 'kin' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl border bg-blue-50 border-blue-100 text-blue-700">
                          <Users size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Next of Kin</h3>
                          <p className="text-sm text-gray-600">Emergency contact information.</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openKinModal}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
                      >
                        <Pencil size={16} />
                        {nextOfKin ? 'Edit' : 'Add'}
                      </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-blue-50/40">
                        <div className="text-xs text-gray-500">Name</div>
                        <div className="mt-1 font-semibold text-gray-900">{nextOfKin?.name || '—'}</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-blue-50/40">
                        <div className="text-xs text-gray-500">Relationship</div>
                        <div className="mt-1 font-semibold text-gray-900">{nextOfKin?.relationship || '—'}</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-orange-50/40">
                        <div className="text-xs text-gray-500">Contact</div>
                        <div className="mt-1 font-semibold text-gray-900">{nextOfKin?.contact_number || '—'}</div>
                      </div>
                      <div className="md:col-span-2 rounded-2xl border border-gray-200 p-4 bg-gradient-to-b from-white to-gray-50">
                        <div className="text-xs text-gray-500">Address</div>
                        <div className="mt-1 font-semibold text-gray-900 whitespace-pre-line">{nextOfKin?.address || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white flex items-center gap-2">
                      <div className="p-2 rounded-xl border bg-orange-50 border-orange-100 text-orange-700">
                        <Shield size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Tip</h3>
                        <p className="text-sm text-gray-600">Keep contacts updated.</p>
                      </div>
                    </div>
                    <div className="p-6 text-sm text-gray-700">
                      Ensure phone number is reachable and address is clear for quick assistance.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ---------------- MODALS ---------------- */}

      {/* Current Employment Modal */}
      <Modal
        open={employmentModalOpen}
        title={currentEmployment ? 'Edit Current Employment' : 'Add Current Employment'}
        onClose={() => setEmploymentModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEmploymentModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="employment-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-60"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <form id="employment-form" onSubmit={saveEmployment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Department *</label>
            <input
              value={empDepartment}
              onChange={e => setEmpDepartment(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="e.g. Academics"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Position *</label>
            <input
              value={empPosition}
              onChange={e => setEmpPosition(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="e.g. Head Teacher"
            />
          </div>
        </form>
      </Modal>

      {/* Payroll Modal */}
      <Modal
        open={payrollModalOpen}
        title={payroll ? 'Edit Payroll Information' : 'Add Payroll Information'}
        onClose={() => setPayrollModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPayrollModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="payroll-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-60"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <form id="payroll-form" onSubmit={savePayroll} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Salary (UGX) *</label>
            <input
              type="number"
              value={prSalary}
              onChange={e => setPrSalary(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. 800000"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Payment Frequency *</label>
            <select
              value={prFrequency}
              onChange={e => setPrFrequency(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="monthly">Monthly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Bank Name *</label>
            <input
              value={prBankName}
              onChange={e => setPrBankName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Stanbic"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Account Number *</label>
            <input
              value={prAccountNumber}
              onChange={e => setPrAccountNumber(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. 0123456789"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">TIN</label>
            <input
              value={prTin}
              onChange={e => setPrTin(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tax ID number"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">NSSF</label>
            <input
              value={prNssf}
              onChange={e => setPrNssf(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="NSSF number"
            />
          </div>
        </form>
      </Modal>

      {/* Next of Kin Modal */}
      <Modal
        open={kinModalOpen}
        title={nextOfKin ? 'Edit Next of Kin' : 'Add Next of Kin'}
        onClose={() => setKinModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setKinModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="kin-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-60"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <form id="kin-form" onSubmit={saveKin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Name *</label>
            <input
              value={kinName}
              onChange={e => setKinName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Relationship *</label>
            <input
              value={kinRelationship}
              onChange={e => setKinRelationship(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Contact Number *</label>
            <input
              value={kinContact}
              onChange={e => setKinContact(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700">Address</label>
            <textarea
              value={kinAddress}
              onChange={e => setKinAddress(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              rows={3}
            />
          </div>
        </form>
      </Modal>

      {/* Education Modal */}
      <Modal
        open={eduModalOpen}
        title={eduMode === 'add' ? 'Add Education Record' : 'Edit Education Record'}
        onClose={() => setEduModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEduModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edu-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-60"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <form id="edu-form" onSubmit={saveEducation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700">Award *</label>
            <input
              value={eduAward}
              onChange={e => setEduAward(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Diploma in Education"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700">Institution *</label>
            <input
              value={eduInstitution}
              onChange={e => setEduInstitution(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Kyambogo University"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Graduation Year *</label>
            <input
              type="number"
              value={eduYear}
              onChange={e => setEduYear(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. 2021"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Result Obtained *</label>
            <input
              value={eduResult}
              onChange={e => setEduResult(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Credit"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700">Additional Certifications</label>
            <input
              value={eduCerts}
              onChange={e => setEduCerts(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional"
            />
          </div>
        </form>
      </Modal>

      {/* Employment History Modal */}
      <Modal
        open={histModalOpen}
        title={histMode === 'add' ? 'Add Employment History' : 'Edit Employment History'}
        onClose={() => setHistModalOpen(false)}
        widthClass="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setHistModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="hist-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-60"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <form id="hist-form" onSubmit={saveHistory} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700">Organization *</label>
            <input
              value={histOrg}
              onChange={e => setHistOrg(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Department *</label>
            <input
              value={histDept}
              onChange={e => setHistDept(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Role *</label>
            <input
              value={histRole}
              onChange={e => setHistRole(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Start Date *</label>
            <input
              type="date"
              value={histStart}
              onChange={e => setHistStart(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">End Date (optional)</label>
            <input
              type="date"
              value={histEnd}
              onChange={e => setHistEnd(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700">Responsibilities</label>
            <textarea
              value={histResp}
              onChange={e => setHistResp(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              rows={4}
              placeholder="What did they do in this role?"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

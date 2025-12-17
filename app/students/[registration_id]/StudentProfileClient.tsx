'use client';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  UserCircle2,
  GraduationCap,
  Phone,
  CalendarDays,
  Shield,
  Pencil,
  Save,
  Trash2,
  MapPin,
  Plus,
  X,
  Users,
  Wallet,
  Receipt,
  AlertTriangle,
} from 'lucide-react';

/* ---------------- Types ---------------- */
type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  school_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SchoolRow {
  id: string;
  school_name: string;
}

interface GradeRow {
  id: number;
  grade_name: string;
}

interface StudentDetailRow {
  registration_id: string;
  lin_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  current_status: string;
  gender: string | null;
  school_type: string | null;
  grade_of_entry: string | null;
  year_of_entry: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  current_grade_id: number | null;
  father_name: string | null;
  father_phone: string | null;
  father_nin: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  mother_nin: string | null;
  profile_picture_url: string | null;
  school_id: string;
  registered_by: string | null;
  created: string;
  updated: string;

  class?: { grade_name: string } | null;
  school?: { school_name: string } | null;
}

interface StudentAddressRow {
  id: number;
  student_id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  created: string;
  updated: string;
}

interface CaretakerRow {
  id: number;
  student_id: string;
  name: string;
  relationship: string;
  contact_number: string;
  email: string | null;
  created: string;
  updated: string;
}

/** Fees (Finance) */
interface SchoolFeesRow {
  id: number;
  grade_id: number;
  school_id: string | null;
  tuitionfee: number;
  hostelfee: number;
  breakfastfee: number;
  lunchfee: number;
  description: string;
  created_by: string;
  created: string;
  updated: string;
}

interface StudentTuitionDescriptionRow {
  id: number;
  student_id: string;
  tuition_id: number;
  school_id: string | null;
  hostel: boolean;
  lunch: boolean;
  breakfast: boolean;
  total_fee: number;
}

type TabKey = 'overview' | 'guardians' | 'address' | 'caretakers' | 'academic' | 'record';

/* ---------------- Constants ---------------- */
const STATUS_CHOICES = [
  { value: 'active', label: 'Active' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'dropped out', label: 'Dropped Out' },
];

const GENDER_CHOICES = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

const SCHOOL_TYPE_CHOICES = [
  { value: 'day', label: 'Day' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'bursary', label: 'Bursary' },
  { value: 'scholarship', label: 'Scholarship' },
];

/* ---------------- Helpers ---------------- */
function formatDate(dateString?: string | null) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusChip(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'graduated':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'dropped out':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function money(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString('en-UG', { maximumFractionDigits: 2 });
}

function daysBetween(a: string, b: string) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 10_000;
  const diff = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/* ---------------- UI ---------------- */
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`w-full ${widthClass} bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-200 bg-white">{footer}</div>}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
        active
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ---------------- Main ---------------- */
export default function StudentProfileClient() {
  const router = useRouter();
  const params = useParams<{ registration_id?: string }>();

  const rawRegistrationId = useMemo(() => {
    const raw = (params?.registration_id as string) || 'new';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params]);

  const isCreateMode = rawRegistrationId === 'new';

  const [tab, setTab] = useState<TabKey>('overview');

  const [authChecking, setAuthChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);

  const [student, setStudent] = useState<StudentDetailRow | null>(null);
  const [address, setAddress] = useState<StudentAddressRow | null>(null);
  const [caretakers, setCaretakers] = useState<CaretakerRow[]>([]);

  // Finance state
  const [schoolFees, setSchoolFees] = useState<SchoolFeesRow | null>(null);
  const [tuitionDesc, setTuitionDesc] = useState<StudentTuitionDescriptionRow | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(isCreateMode);

  const needsSchoolLink = !!profile && !profile.school_id;

  /* ---------------- Form State (Student) ---------------- */
  const [registrationIdInput, setRegistrationIdInput] = useState('');
  const [linId, setLinId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [currentStatus, setCurrentStatus] = useState('active');
  const [gender, setGender] = useState('');
  const [schoolType, setSchoolType] = useState('day');
  const [gradeOfEntry, setGradeOfEntry] = useState('');
  const [yearOfEntry, setYearOfEntry] = useState('');
  const [currentGradeId, setCurrentGradeId] = useState<number | ''>('');

  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [fatherNIN, setFatherNIN] = useState('');

  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [motherNIN, setMotherNIN] = useState('');

  /* ---------------- Form State (Address) ---------------- */
  const [addrAddress, setAddrAddress] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrZip, setAddrZip] = useState('');

  /* ---------------- Caretaker Modal ---------------- */
  const [caretakerModalOpen, setCaretakerModalOpen] = useState(false);
  const [caretakerMode, setCaretakerMode] = useState<'add' | 'edit'>('add');
  const [caretakerEditingId, setCaretakerEditingId] = useState<number | null>(null);
  const [ctName, setCtName] = useState('');
  const [ctRelationship, setCtRelationship] = useState('');
  const [ctContact, setCtContact] = useState('');
  const [ctEmail, setCtEmail] = useState('');

  /* ---------------- Modals ---------------- */
  const [dropModalOpen, setDropModalOpen] = useState(false);

  /* ---------------- Auth ---------------- */
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        router.replace('/');
        return;
      }

      const u = session.user;
      setUserEmail(u.email ?? null);
      setUserName((u.user_metadata as any)?.full_name || 'Admin User');
      setAuthChecking(false);
    };

    checkAuth();
  }, [router]);

  /* ---------------- Load Helpers ---------------- */
  const reloadCaretakers = async (studentId: string) => {
    const { data: cts } = await supabase
      .from('caretaker')
      .select('id, student_id, name, relationship, contact_number, email, created, updated')
      .eq('student_id', studentId)
      .order('created', { ascending: false });

    setCaretakers((cts as CaretakerRow[]) || []);
  };

  const hydrateFromStudent = (st: StudentDetailRow) => {
    setRegistrationIdInput(st.registration_id);
    setLinId(st.lin_id || '');
    setFirstName(st.first_name || '');
    setLastName(st.last_name || '');
    setDateOfBirth(st.date_of_birth || '');
    setCurrentStatus(st.current_status || 'active');
    setGender(st.gender || '');
    setSchoolType(st.school_type || 'day');
    setGradeOfEntry(st.grade_of_entry || '');
    setYearOfEntry(st.year_of_entry || '');
    setCurrentGradeId(st.current_grade_id ?? '');

    setGuardianName(st.guardian_name || '');
    setGuardianPhone(st.guardian_phone || '');

    setFatherName(st.father_name || '');
    setFatherPhone(st.father_phone || '');
    setFatherNIN(st.father_nin || '');

    setMotherName(st.mother_name || '');
    setMotherPhone(st.mother_phone || '');
    setMotherNIN(st.mother_nin || '');
  };

  const clearForCreate = () => {
    setStudent(null);
    setRegistrationIdInput('');
    setLinId('');
    setFirstName('');
    setLastName('');
    setDateOfBirth('');
    setCurrentStatus('active');
    setGender('');
    setSchoolType('day');
    setGradeOfEntry('');
    setYearOfEntry('');
    setCurrentGradeId('');
    setGuardianName('');
    setGuardianPhone('');
    setFatherName('');
    setFatherPhone('');
    setFatherNIN('');
    setMotherName('');
    setMotherPhone('');
    setMotherNIN('');

    setAddress(null);
    setAddrAddress('');
    setAddrCity('');
    setAddrState('');
    setAddrZip('');

    setCaretakers([]);

    // Finance
    setSchoolFees(null);
    setTuitionDesc(null);
  };

  /* ---------------- Finance Helpers ---------------- */

  const canEditFeesDescription = useMemo(() => {
    // Rule: within 30 days user can edit; otherwise only ADMIN
    if (!student) return false;
    if (profile?.role === 'ADMIN') return true;

    const today = new Date().toISOString().slice(0, 10);
    const created = student.created || today;
    return daysBetween(created, today) <= 30;
  }, [student, profile?.role]);

  const defaultOptionsForStudent = useMemo(() => {
    // Example default: if boarding -> hostel true.
    const isBoarding = (student?.school_type || schoolType) === 'boarding';
    return {
      hostel: isBoarding,
      lunch: false,
      breakfast: false,
    };
  }, [student?.school_type, schoolType]);

  const loadFeesForGrade = async (gradeId: number, schoolId: string) => {
    const { data, error } = await supabase
      .from('assessment_schoolfees')
      .select(
        'id, grade_id, school_id, tuitionfee, hostelfee, breakfastfee, lunchfee, description, created_by, created, updated'
      )
      .eq('grade_id', gradeId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (error) throw error;
    return (data as SchoolFeesRow | null) ?? null;
  };

  const loadTuitionDescription = async (studentId: string, tuitionId: number, schoolId: string) => {
    const { data, error } = await supabase
      .from('student_tuition_description')
      .select('id, student_id, tuition_id, school_id, hostel, lunch, breakfast, total_fee')
      .eq('student_id', studentId)
      .eq('tuition_id', tuitionId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (error) throw error;
    return (data as StudentTuitionDescriptionRow | null) ?? null;
  };

  const ensureStudentTuitionDescription = async (opts?: {
    studentId: string;
    gradeId: number;
    schoolId: string;
    forceOptions?: { hostel: boolean; lunch: boolean; breakfast: boolean };
  }) => {
    const studentId = opts?.studentId;
    const gradeId = opts?.gradeId;
    const schoolId = opts?.schoolId;

    if (!studentId || !gradeId || !schoolId) return;

    setFeeLoading(true);

    try {
      // 1) Grade fees row
      const feesRow = await loadFeesForGrade(gradeId, schoolId);
      setSchoolFees(feesRow);

      if (!feesRow) {
        setTuitionDesc(null);
        return;
      }

      // 2) Existing student tuition description?
      const existing = await loadTuitionDescription(studentId, feesRow.id, schoolId);

      const optionPayload = opts.forceOptions ?? defaultOptionsForStudent;

      // We DO NOT rely on upsert with onConflict unless you have a unique constraint.
      if (!existing) {
        const { data: inserted, error: insErr } = await supabase
          .from('student_tuition_description')
          .insert({
            student_id: studentId,
            tuition_id: feesRow.id,
            school_id: schoolId,
            hostel: !!optionPayload.hostel,
            lunch: !!optionPayload.lunch,
            breakfast: !!optionPayload.breakfast,
            // total_fee is computed by trigger (but column has default 0.00)
          })
          .select('id, student_id, tuition_id, school_id, hostel, lunch, breakfast, total_fee')
          .single();

        if (insErr) throw insErr;

        setTuitionDesc(inserted as StudentTuitionDescriptionRow);
      } else {
        // Update only options (trigger recalculates total_fee)
        const { data: updated, error: upErr } = await supabase
          .from('student_tuition_description')
          .update({
            hostel: !!optionPayload.hostel,
            lunch: !!optionPayload.lunch,
            breakfast: !!optionPayload.breakfast,
          })
          .eq('id', existing.id)
          .select('id, student_id, tuition_id, school_id, hostel, lunch, breakfast, total_fee')
          .single();

        if (upErr) throw upErr;

        setTuitionDesc(updated as StudentTuitionDescriptionRow);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to setup student tuition description.');
    } finally {
      setFeeLoading(false);
    }
  };

  const refreshFinance = async () => {
    if (!profile?.school_id) return;
    const stId = student?.registration_id;
    const gId = student?.current_grade_id ?? (currentGradeId === '' ? null : Number(currentGradeId));
    if (!stId || !gId) return;

    await ensureStudentTuitionDescription({
      studentId: stId,
      gradeId: gId,
      schoolId: profile.school_id,
    });
  };

  const updateFeeOptions = async (next: { hostel: boolean; lunch: boolean; breakfast: boolean }) => {
    if (!profile?.school_id) return;
    const stId = student?.registration_id;
    const gId = student?.current_grade_id ?? (currentGradeId === '' ? null : Number(currentGradeId));
    if (!stId || !gId) return;

    if (!canEditFeesDescription) {
      setErrorMsg('Fee options can only be changed within 30 days. Ask an ADMIN to update.');
      return;
    }

    await ensureStudentTuitionDescription({
      studentId: stId,
      gradeId: gId,
      schoolId: profile.school_id,
      forceOptions: next,
    });

    setSuccessMsg('Fee options updated.');
  };

  /* ---------------- Load Page Data ---------------- */
  useEffect(() => {
    if (authChecking) return;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const { data: ures, error: uerr } = await supabase.auth.getUser();
        if (uerr) throw uerr;
        if (!ures.user?.id) throw new Error('Could not find authenticated user.');

        const { data: pr, error: prError } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id, created_at, updated_at')
          .eq('user_id', ures.user.id)
          .single();

        if (prError || !pr) throw new Error(prError?.message || 'No profile found in profiles.');

        const prRow = pr as ProfileRow;
        setProfile(prRow);

        if (!prRow.school_id) {
          setSchool(null);
          if (isCreateMode) clearForCreate();
          return;
        }

        const { data: schoolRow, error: schoolError } = await supabase
          .from('general_information')
          .select('id, school_name')
          .eq('id', prRow.school_id)
          .single();
        if (schoolError || !schoolRow) throw new Error(schoolError?.message || 'Failed to load school.');

        const schoolData = schoolRow as SchoolRow;
        setSchool(schoolData);

        const { data: gradeRows } = await supabase
          .from('class')
          .select('id, grade_name')
          .eq('school_id', schoolData.id)
          .order('grade_name', { ascending: true });
        setGrades((gradeRows as GradeRow[]) || []);

        // CREATE MODE
        if (isCreateMode) {
          clearForCreate();
          setIsEditing(true);
          setLoading(false);
          return;
        }

        // EDIT MODE: load student
        const { data: st, error: stError } = await supabase
          .from('students')
          .select(
            `
            registration_id,
            lin_id,
            first_name,
            last_name,
            date_of_birth,
            current_status,
            gender,
            school_type,
            grade_of_entry,
            year_of_entry,
            guardian_name,
            guardian_phone,
            current_grade_id,
            father_name,
            father_phone,
            father_nin,
            mother_name,
            mother_phone,
            mother_nin,
            profile_picture_url,
            school_id,
            registered_by,
            created,
            updated,
            class:current_grade_id (grade_name),
            school:school_id (school_name)
          `
          )
          .eq('registration_id', rawRegistrationId)
          .eq('school_id', prRow.school_id)
          .single();

        if (stError || !st) throw new Error(stError?.message || 'Student not found or access denied.');

        const stRow = st as StudentDetailRow;
        setStudent(stRow);
        hydrateFromStudent(stRow);
        setIsEditing(false);

        // address
        const { data: addr } = await supabase
          .from('students_address')
          .select('id, student_id, address, city, state, zip_code, created, updated')
          .eq('student_id', stRow.registration_id)
          .maybeSingle();

        if (addr) {
          const addrRow = addr as StudentAddressRow;
          setAddress(addrRow);
          setAddrAddress(addrRow.address || '');
          setAddrCity(addrRow.city || '');
          setAddrState(addrRow.state || '');
          setAddrZip(addrRow.zip_code || '');
        } else {
          setAddress(null);
          setAddrAddress('');
          setAddrCity('');
          setAddrState('');
          setAddrZip('');
        }

        await reloadCaretakers(stRow.registration_id);

        // Finance: auto-ensure tuition desc when grade is set
        if (prRow.school_id && stRow.current_grade_id) {
          await ensureStudentTuitionDescription({
            studentId: stRow.registration_id,
            gradeId: stRow.current_grade_id,
            schoolId: prRow.school_id,
          });
        } else {
          setSchoolFees(null);
          setTuitionDesc(null);
        }
      } catch (e: any) {
        setErrorMsg(e?.message || 'Unexpected error while loading student profile.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authChecking, rawRegistrationId, isCreateMode]);

  /* ---------------- Create / Update Student ---------------- */
  const saveStudent = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!profile?.school_id) throw new Error('Your account is not linked to a school.');
      const { data: ures } = await supabase.auth.getUser();
      const userId = ures.user?.id;
      if (!userId) throw new Error('No authenticated user.');

      // Required fields
      const regId = (isCreateMode ? registrationIdInput : student?.registration_id) || '';
      if (!regId.trim()) throw new Error('Registration ID is required.');
      if (!firstName.trim()) throw new Error('First name is required.');
      if (!lastName.trim()) throw new Error('Last name is required.');
      if (!dateOfBirth) throw new Error('Date of birth is required.');

      const today = new Date().toISOString().slice(0, 10);

      if (isCreateMode) {
        // INSERT
        const insertPayload = {
          registration_id: regId.trim(),
          lin_id: linId.trim() || null,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: dateOfBirth,
          current_status: currentStatus,
          gender: gender || null,
          school_type: schoolType || null,
          grade_of_entry: gradeOfEntry.trim() || null,
          year_of_entry: yearOfEntry.trim() || null,
          guardian_name: guardianName.trim() || null,
          guardian_phone: guardianPhone.trim() || null,
          current_grade_id: currentGradeId === '' ? null : Number(currentGradeId),
          father_name: fatherName.trim() || null,
          father_phone: fatherPhone.trim() || null,
          father_nin: fatherNIN.trim() || null,
          mother_name: motherName.trim() || null,
          mother_phone: motherPhone.trim() || null,
          mother_nin: motherNIN.trim() || null,
          profile_picture_url: null,
          school_id: profile.school_id,
          registered_by: userId,
          created: today,
          updated: today,
        };

        const { data: createdRow, error } = await supabase
          .from('students')
          .insert(insertPayload)
          .select(
            `
            registration_id,
            lin_id,
            first_name,
            last_name,
            date_of_birth,
            current_status,
            gender,
            school_type,
            grade_of_entry,
            year_of_entry,
            guardian_name,
            guardian_phone,
            current_grade_id,
            father_name,
            father_phone,
            father_nin,
            mother_name,
            mother_phone,
            mother_nin,
            profile_picture_url,
            school_id,
            registered_by,
            created,
            updated,
            class:current_grade_id (grade_name),
            school:school_id (school_name)
          `
          )
          .single();

        if (error) throw error;

        const stRow = createdRow as StudentDetailRow;
        setStudent(stRow);
        setSuccessMsg('Student created successfully.');
        router.replace(`/students/${encodeURIComponent(regId.trim())}`);
        setIsEditing(false);

        // Finance auto-create if grade exists
        if (stRow.current_grade_id) {
          await ensureStudentTuitionDescription({
            studentId: stRow.registration_id,
            gradeId: stRow.current_grade_id,
            schoolId: profile.school_id,
          });
        }

        return;
      }

      // UPDATE
      if (!student) throw new Error('Student not loaded.');

      const nextGradeId = currentGradeId === '' ? null : Number(currentGradeId);

      const updatePayload = {
        lin_id: linId.trim() || null,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dateOfBirth,
        current_status: currentStatus,
        gender: gender || null,
        school_type: schoolType || null,
        grade_of_entry: gradeOfEntry.trim() || null,
        year_of_entry: yearOfEntry.trim() || null,
        guardian_name: guardianName.trim() || null,
        guardian_phone: guardianPhone.trim() || null,
        current_grade_id: nextGradeId,
        father_name: fatherName.trim() || null,
        father_phone: fatherPhone.trim() || null,
        father_nin: fatherNIN.trim() || null,
        mother_name: motherName.trim() || null,
        mother_phone: motherPhone.trim() || null,
        mother_nin: motherNIN.trim() || null,
        updated: today,
      };

      const { error } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('registration_id', student.registration_id)
        .eq('school_id', profile.school_id);

      if (error) throw error;

      // update local state
      setStudent((prev) =>
        prev
          ? ({
              ...prev,
              ...updatePayload,
              class:
                updatePayload.current_grade_id == null
                  ? null
                  : {
                      grade_name:
                        grades.find((g) => g.id === updatePayload.current_grade_id)?.grade_name ||
                        prev.class?.grade_name ||
                        '',
                    },
            } as StudentDetailRow)
          : prev
      );

      setSuccessMsg('Student updated successfully.');
      setIsEditing(false);

      // Finance: if grade set -> ensure tuition description
      if (updatePayload.current_grade_id) {
        await ensureStudentTuitionDescription({
          studentId: student.registration_id,
          gradeId: updatePayload.current_grade_id,
          schoolId: profile.school_id,
        });
      } else {
        setSchoolFees(null);
        setTuitionDesc(null);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Address Upsert ---------------- */
  const upsertAddress = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const stId = student?.registration_id;
      if (!stId) throw new Error('Save student first, then add address.');

      if (!addrAddress.trim() || !addrCity.trim() || !addrState.trim() || !addrZip.trim()) {
        throw new Error('Address, City, State, and Zip Code are required.');
      }

      const today = new Date().toISOString().slice(0, 10);

      const payload = {
        student_id: stId,
        address: addrAddress.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        zip_code: addrZip.trim(),
        updated: today,
      };

      const { data, error } = await supabase
        .from('students_address')
        .upsert(payload, { onConflict: 'student_id' })
        .select('id, student_id, address, city, state, zip_code, created, updated')
        .single();

      if (error) throw error;

      setAddress(data as StudentAddressRow);
      setSuccessMsg('Address saved successfully.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Caretakers CRUD ---------------- */
  const openAddCaretaker = () => {
    setCaretakerMode('add');
    setCaretakerEditingId(null);
    setCtName('');
    setCtRelationship('');
    setCtContact('');
    setCtEmail('');
    setCaretakerModalOpen(true);
  };

  const openEditCaretaker = (ct: CaretakerRow) => {
    setCaretakerMode('edit');
    setCaretakerEditingId(ct.id);
    setCtName(ct.name);
    setCtRelationship(ct.relationship);
    setCtContact(ct.contact_number);
    setCtEmail(ct.email || '');
    setCaretakerModalOpen(true);
  };

  const saveCaretaker = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const stId = student?.registration_id;
      if (!stId) throw new Error('Save student first, then add caretakers.');

      if (!ctName.trim() || !ctRelationship.trim() || !ctContact.trim()) {
        throw new Error('Name, relationship and contact number are required.');
      }

      const today = new Date().toISOString().slice(0, 10);

      if (caretakerMode === 'add') {
        const { error } = await supabase.from('caretaker').insert({
          student_id: stId,
          name: ctName.trim(),
          relationship: ctRelationship.trim(),
          contact_number: ctContact.trim(),
          email: ctEmail.trim() || null,
          updated: today,
        });
        if (error) throw error;
        setSuccessMsg('Caretaker added successfully.');
      } else {
        if (!caretakerEditingId) return;

        const { error } = await supabase
          .from('caretaker')
          .update({
            name: ctName.trim(),
            relationship: ctRelationship.trim(),
            contact_number: ctContact.trim(),
            email: ctEmail.trim() || null,
            updated: today,
          })
          .eq('id', caretakerEditingId)
          .eq('student_id', stId);

        if (error) throw error;
        setSuccessMsg('Caretaker updated successfully.');
      }

      await reloadCaretakers(stId);
      setCaretakerModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCaretaker = async (caretakerId: number) => {
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const stId = student?.registration_id;
      if (!stId) throw new Error('No student loaded.');

      const { error } = await supabase
        .from('caretaker')
        .delete()
        .eq('id', caretakerId)
        .eq('student_id', stId);
      if (error) throw error;

      setCaretakers((prev) => prev.filter((c) => c.id !== caretakerId));
      setSuccessMsg('Caretaker removed.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Dropped Out ---------------- */
  const markStudentDroppedOut = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!student || !profile?.school_id) throw new Error('Student not loaded.');

      const today = new Date().toISOString().slice(0, 10);

      const { error } = await supabase
        .from('students')
        .update({ current_status: 'dropped out', updated: today })
        .eq('registration_id', student.registration_id)
        .eq('school_id', profile.school_id);

      if (error) throw error;

      setStudent((prev) =>
        prev ? ({ ...prev, current_status: 'dropped out', updated: today } as StudentDetailRow) : prev
      );
      setCurrentStatus('dropped out');
      setSuccessMsg('Student marked as dropped out.');
      setDropModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Loading / Guard ---------------- */
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-blue-600 to-orange-500 animate-pulse mb-4" />
          <p className="text-sm text-gray-600">Loading student profile…</p>
        </div>
      </div>
    );
  }

  if (needsSchoolLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        <Navbar userEmail={userEmail} userName={userName} />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm">
              <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white font-bold mb-4">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-sm text-gray-600 mb-4">Your account is not fully linked to a school.</p>
              <button
                onClick={() => router.push('/students')}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                Back to Students
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* ---------------- Render ---------------- */
  const displayStudent = student;
  const initials = displayStudent
    ? `${displayStudent.first_name?.[0] || 'S'}${displayStudent.last_name?.[0] || 'T'}`
    : 'ST';
  const isDroppedOut = displayStudent?.current_status === 'dropped out';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Navbar userEmail={userEmail} userName={userName} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/students')}
                  className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
                  type="button"
                  title="Back"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {isCreateMode
                          ? 'Add New Student'
                          : `${displayStudent?.first_name || ''} ${displayStudent?.last_name || ''}`}
                      </h1>

                      {!isCreateMode && displayStudent && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${statusChip(
                            displayStudent.current_status
                          )}`}
                        >
                          {displayStudent.current_status}
                        </span>
                      )}

                      {!isCreateMode && displayStudent?.school_type && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200">
                          {displayStudent.school_type}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      School: <span className="font-semibold text-gray-900">{school?.school_name}</span>
                      {!isCreateMode && displayStudent && (
                        <>
                          {' '}
                          • Registration ID:{' '}
                          <span className="font-mono font-semibold text-gray-900">
                            {displayStudent.registration_id}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    disabled={isDroppedOut}
                    className="inline-flex items-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-60"
                    title={isDroppedOut ? 'Dropped out students are read-only' : 'Edit Profile'}
                  >
                    <Pencil size={16} className="mr-2" />
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (displayStudent) hydrateFromStudent(displayStudent);
                      if (isCreateMode && !displayStudent) clearForCreate();
                      setIsEditing(isCreateMode);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="inline-flex items-center px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}

                {!isCreateMode && (
                  <button
                    type="button"
                    onClick={() => setDropModalOpen(true)}
                    className="inline-flex items-center px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium shadow-sm hover:bg-amber-700 transition-all"
                  >
                    <Shield size={16} className="mr-2" />
                    Dropped Out
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            {errorMsg && (
              <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 flex items-start">
                <XCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
                <div className="text-sm text-red-700">{errorMsg}</div>
              </div>
            )}
            {successMsg && (
              <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mr-3 flex-shrink-0" />
                <div className="text-sm text-emerald-800 font-medium">{successMsg}</div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <TabButton
                active={tab === 'overview'}
                onClick={() => setTab('overview')}
                icon={<UserCircle2 size={16} />}
                label="Overview"
              />
              <TabButton
                active={tab === 'guardians'}
                onClick={() => setTab('guardians')}
                icon={<Phone size={16} />}
                label="Guardians"
              />
              <TabButton
                active={tab === 'address'}
                onClick={() => setTab('address')}
                icon={<MapPin size={16} />}
                label="Address"
              />
              <TabButton
                active={tab === 'caretakers'}
                onClick={() => setTab('caretakers')}
                icon={<Users size={16} />}
                label="Caretakers"
              />
              <TabButton
                active={tab === 'academic'}
                onClick={() => setTab('academic')}
                icon={<GraduationCap size={16} />}
                label="Academic & Fees"
              />
              <TabButton
                active={tab === 'record'}
                onClick={() => setTab('record')}
                icon={<Shield size={16} />}
                label="Record"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* SAVE BAR */}
            {isEditing && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-gray-700">
                  {isCreateMode
                    ? 'Fill in the student details then click Save to create.'
                    : 'Make changes then click Save.'}
                </div>
                <button
                  type="submit"
                  form="student-form"
                  disabled={submitting || isDroppedOut}
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-60"
                >
                  <Save size={16} className="mr-2" />
                  {submitting ? 'Saving...' : 'Save Student'}
                </button>
              </div>
            )}

            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <form id="student-form" onSubmit={saveStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isCreateMode && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Registration ID *
                      </label>
                      <input
                        value={registrationIdInput}
                        onChange={(e) => setRegistrationIdInput(e.target.value)}
                        disabled={!isEditing}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                        placeholder="e.g. 2025/PCS/001"
                      />
                      <p className="text-xs text-gray-500">
                        This becomes the primary key in your students table.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">LIN ID</label>
                    <input
                      value={linId}
                      onChange={(e) => setLinId(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">First Name *</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Last Name *</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Date of Birth *</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Current Status *</label>
                    <select
                      value={currentStatus}
                      onChange={(e) => setCurrentStatus(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    >
                      {STATUS_CHOICES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    >
                      <option value="">—</option>
                      {GENDER_CHOICES.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">School Type</label>
                    <select
                      value={schoolType}
                      onChange={(e) => setSchoolType(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    >
                      {SCHOOL_TYPE_CHOICES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Grade of Entry</label>
                    <input
                      value={gradeOfEntry}
                      onChange={(e) => setGradeOfEntry(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Year of Entry</label>
                    <input
                      value={yearOfEntry}
                      onChange={(e) => setYearOfEntry(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                      placeholder="e.g. 2025"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700">Current Class</label>
                    <select
                      value={currentGradeId}
                      onChange={(e) => setCurrentGradeId(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    >
                      <option value="">Not assigned</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.grade_name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">
                      When a class is set and saved, the system auto-creates/updates the student tuition record.
                    </p>
                  </div>
                </form>
              </div>
            )}

            {/* GUARDIANS TAB */}
            {tab === 'guardians' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <form onSubmit={saveStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Guardian Name</label>
                    <input
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Guardian Phone</label>
                    <input
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2" />

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Father Name</label>
                    <input
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Father Phone</label>
                    <input
                      value={fatherPhone}
                      onChange={(e) => setFatherPhone(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700">Father NIN</label>
                    <input
                      value={fatherNIN}
                      onChange={(e) => setFatherNIN(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2" />

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Mother Name</label>
                    <input
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Mother Phone</label>
                    <input
                      value={motherPhone}
                      onChange={(e) => setMotherPhone(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700">Mother NIN</label>
                    <input
                      value={motherNIN}
                      onChange={(e) => setMotherNIN(e.target.value)}
                      disabled={!isEditing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  </div>

                  {isEditing && (
                    <div className="md:col-span-2 pt-3">
                      <button
                        type="submit"
                        disabled={submitting || isDroppedOut}
                        className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                      >
                        <Save size={16} className="mr-2" />
                        {submitting ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* ADDRESS TAB */}
            {tab === 'address' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                {!student ? (
                  <div className="text-sm text-gray-700">Save the student first, then you can add the address.</div>
                ) : (
                  <form onSubmit={upsertAddress} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700">Address *</label>
                      <input
                        value={addrAddress}
                        onChange={(e) => setAddrAddress(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">City *</label>
                      <input
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">State *</label>
                      <input
                        value={addrState}
                        onChange={(e) => setAddrState(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700">Zip Code *</label>
                      <input
                        value={addrZip}
                        onChange={(e) => setAddrZip(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Save size={16} className="mr-2" />
                        {submitting ? 'Saving...' : address ? 'Update Address' : 'Save Address'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* CARETAKERS TAB */}
            {tab === 'caretakers' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                {!student ? (
                  <div className="text-sm text-gray-700">Save the student first, then you can add caretakers.</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Caretakers</h3>
                        <p className="text-sm text-gray-600">You can add multiple caretakers for one student.</p>
                      </div>
                      <button
                        type="button"
                        onClick={openAddCaretaker}
                        className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                      >
                        <Plus size={16} className="mr-2" />
                        Add Caretaker
                      </button>
                    </div>

                    {caretakers.length === 0 ? (
                      <div className="text-sm text-gray-700">No caretakers yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {caretakers.map((ct) => (
                          <div
                            key={ct.id}
                            className="rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900">{ct.name}</div>
                              <div className="text-sm text-gray-600">
                                {ct.relationship} • {ct.contact_number}
                              </div>
                              {ct.email && <div className="text-sm text-gray-500">{ct.email}</div>}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditCaretaker(ct)}
                                className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                              >
                                <Pencil size={14} className="inline mr-1" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCaretaker(ct.id)}
                                disabled={submitting}
                                className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-sm disabled:opacity-60"
                              >
                                <Trash2 size={14} className="inline mr-1" />
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ACADEMIC TAB (includes FEES) */}
            {tab === 'academic' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Fees (Auto Tuition Setup)</h3>
                      <p className="text-sm text-gray-600">
                        When a student has a current class, the tuition record is created automatically.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={refreshFinance}
                        disabled={feeLoading || !student?.current_grade_id}
                        className="inline-flex items-center px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm disabled:opacity-60"
                      >
                        <Wallet size={16} className="mr-2" />
                        {feeLoading ? 'Refreshing…' : 'Refresh'}
                      </button>
                      {!canEditFeesDescription && (
                        <span className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                          <AlertTriangle size={14} />
                          Fee options locked (30 days passed)
                        </span>
                      )}
                    </div>
                  </div>

                  {!student?.current_grade_id ? (
                    <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700">
                      Set <b>Current Class</b> in the Overview tab, then Save — fees will be generated.
                    </div>
                  ) : !schoolFees ? (
                    <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
                      No fee setup found for this grade in <b>assessment_schoolfees</b>. Create a fee record for the
                      student’s class.
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="rounded-2xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-gray-700">Base Fees</div>
                          <Receipt size={18} className="text-gray-400" />
                        </div>
                        <div className="mt-4 space-y-2 text-sm text-gray-700">
                          <div className="flex items-center justify-between">
                            <span>Tuition</span>
                            <span className="font-semibold">UGX {money(schoolFees.tuitionfee)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Hostel</span>
                            <span className="font-semibold">UGX {money(schoolFees.hostelfee)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Breakfast</span>
                            <span className="font-semibold">UGX {money(schoolFees.breakfastfee)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Lunch</span>
                            <span className="font-semibold">UGX {money(schoolFees.lunchfee)}</span>
                          </div>
                        </div>
                        <div className="mt-4 text-xs text-gray-500">{schoolFees.description}</div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 p-5 lg:col-span-2">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <div className="text-sm font-semibold text-gray-700">Student Fee Options</div>
                            <div className="text-xs text-gray-500">
                              Editable within 30 days (Admins can override).
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-gray-500">Computed Total</div>
                            <div className="text-2xl font-bold text-gray-900">
                              UGX {money(tuitionDesc?.total_fee ?? 0)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                          {([
                            { key: 'hostel', label: 'Hostel', hint: 'Boarding students usually need this.' },
                            { key: 'breakfast', label: 'Breakfast', hint: 'Optional breakfast charge.' },
                            { key: 'lunch', label: 'Lunch', hint: 'Optional lunch charge.' },
                          ] as const).map((item) => {
                            const checked = (tuitionDesc as any)?.[item.key] ?? false;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                disabled={!canEditFeesDescription || feeLoading}
                                onClick={() =>
                                  updateFeeOptions({
                                    hostel: item.key === 'hostel' ? !checked : (tuitionDesc?.hostel ?? false),
                                    breakfast:
                                      item.key === 'breakfast'
                                        ? !checked
                                        : (tuitionDesc?.breakfast ?? false),
                                    lunch: item.key === 'lunch' ? !checked : (tuitionDesc?.lunch ?? false),
                                  })
                                }
                                className={`text-left rounded-2xl border p-4 transition-all ${
                                  checked
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                } disabled:opacity-60`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold text-gray-900">{item.label}</div>
                                  <div
                                    className={`h-5 w-10 rounded-full relative transition-all ${
                                      checked ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                  >
                                    <div
                                      className={`h-4 w-4 bg-white rounded-full absolute top-0.5 transition-all ${
                                        checked ? 'right-0.5' : 'left-0.5'
                                      }`}
                                    />
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{item.hint}</div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                          <b>Note:</b> Total fee is calculated by your DB trigger on{' '}
                          <span className="font-mono">student_tuition_description</span>.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Next Step</h3>
                      <p className="text-sm text-gray-600">
                        If you want, we can now create the student’s term transactions in{' '}
                        <span className="font-mono">fee_transaction</span> and carry balances forward.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push('/finance')}
                      className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium shadow-sm hover:from-emerald-700 hover:to-emerald-800 transition-all"
                    >
                      <Wallet size={16} className="mr-2" />
                      Go to Finance
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* RECORD TAB - keep placeholder as before */}
            {tab === 'record' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Record</h3>
                <p className="text-sm text-gray-600">
                  Add disciplinary / record history screens here (same as your previous plan).
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Caretaker modal */}
      <Modal
        open={caretakerModalOpen}
        title={caretakerMode === 'add' ? 'Add Caretaker' : 'Edit Caretaker'}
        onClose={() => setCaretakerModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCaretakerModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="caretaker-form"
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Save size={16} className="mr-2" />
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <form id="caretaker-form" onSubmit={saveCaretaker} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700 block">Name *</label>
            <input
              value={ctName}
              onChange={(e) => setCtName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">Relationship *</label>
            <input
              value={ctRelationship}
              onChange={(e) => setCtRelationship(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">Contact *</label>
            <input
              value={ctContact}
              onChange={(e) => setCtContact(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700 block">Email</label>
            <input
              value={ctEmail}
              onChange={(e) => setCtEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
            />
          </div>
        </form>
      </Modal>

      {/* Dropped out confirm modal */}
      <Modal
        open={dropModalOpen}
        title="Mark Student Dropped Out"
        onClose={() => setDropModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDropModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={markStudentDroppedOut}
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
            >
              <Shield size={16} className="mr-2" />
              {submitting ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        }
      >
        <div className="text-sm text-gray-700">
          This will set <b>current_status</b> to <b>dropped out</b>. You can still view the profile, but editing can be
          restricted.
        </div>
      </Modal>
    </div>
  );
}

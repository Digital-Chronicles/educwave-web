'use client';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Users,
  Shield,
  Edit2,
  Save,
  Trash2,
  Plus,
  X,
  Wallet,
  GraduationCap,
  Home,
  Heart,
  Briefcase,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Star,
  FileText,
  CreditCard,
  BookOpen,
  Award,
  Building,
  DollarSign,
  UserCircle,
  Book,
  UserCheck,
  Calculator,
  BarChart3,
  Utensils,
  Coffee,
  Bed,
  MoreVertical,
  ExternalLink,
  Copy,
  Download,
  Printer,
  Share2,
  Eye,
  EyeOff,
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

/* ---------------- UI Components ---------------- */
function Modal({
  open,
  title,
  children,
  onClose,
  widthClass = 'max-w-lg',
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  widthClass?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className={`w-full ${widthClass} bg-gradient-to-b from-white to-gray-50/50 rounded-2xl shadow-2xl shadow-black/10 border border-gray-200 animate-scaleIn`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105"
            type="button"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { 
      color: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-600', 
      icon: <UserCheck size={14} /> 
    },
    graduated: { 
      color: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600', 
      icon: <Award size={14} /> 
    },
    'dropped out': { 
      color: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-600', 
      icon: <Shield size={14} /> 
    },
  }[status] || { 
    color: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-600', 
    icon: <User size={14} /> 
  };

  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 shadow-sm ${config.color}`}>
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function InfoCard({
  icon,
  title,
  value,
  subtitle,
  onClick,
  color = 'blue',
  gradient = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'indigo' | 'gray';
  gradient?: boolean;
}) {
  const colorClasses = {
    blue: gradient 
      ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
      : 'bg-blue-500/10 text-blue-600',
    green: gradient 
      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
      : 'bg-emerald-500/10 text-emerald-600',
    purple: gradient 
      ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
      : 'bg-purple-500/10 text-purple-600',
    amber: gradient 
      ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
      : 'bg-amber-500/10 text-amber-600',
    red: gradient 
      ? 'bg-gradient-to-br from-red-500 to-red-600' 
      : 'bg-red-500/10 text-red-600',
    indigo: gradient 
      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' 
      : 'bg-indigo-500/10 text-indigo-600',
    gray: gradient 
      ? 'bg-gradient-to-br from-gray-500 to-gray-600' 
      : 'bg-gray-500/10 text-gray-600',
  }[color];

  return (
    <div
      onClick={onClick}
      className={`relative group overflow-hidden bg-white rounded-2xl border border-gray-200/80 p-5 hover:shadow-lg hover:shadow-${color}-500/10 hover:border-${color}-200 transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
    >
      {gradient && (
        <div className={`absolute top-0 right-0 w-24 h-24 -translate-y-1/2 translate-x-1/2 rounded-full opacity-10 ${colorClasses}`} />
      )}
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl ${gradient ? `${colorClasses} text-white shadow-sm` : colorClasses}`}>
                {icon}
              </div>
              <span className="text-sm font-semibold text-gray-700 tracking-wide">{title}</span>
            </div>
            <div className="text-lg font-bold text-gray-900 mb-1">{value}</div>
            {subtitle && <div className="text-sm text-gray-500 font-medium">{subtitle}</div>}
          </div>
          {onClick && (
            <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ 
  title, 
  icon, 
  children, 
  action,
  className = ''
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
            <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mt-1"></div>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, trend, icon }: { label: string; value: string; trend?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
          {icon}
        </div>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {trend && <div className="text-xs font-medium text-emerald-600 mt-1">{trend}</div>}
    </div>
  );
}

function ActionButton({ 
  children, 
  variant = 'primary', 
  icon, 
  onClick, 
  className = ''
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm',
    danger: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800 shadow-lg shadow-amber-500/25',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 ${variants[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------------- Main Component ---------------- */
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

  const [authChecking, setAuthChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [student, setStudent] = useState<StudentDetailRow | null>(null);
  const [address, setAddress] = useState<StudentAddressRow | null>(null);
  const [caretakers, setCaretakers] = useState<CaretakerRow[]>([]);
  const [schoolFees, setSchoolFees] = useState<SchoolFeesRow | null>(null);
  const [tuitionDesc, setTuitionDesc] = useState<StudentTuitionDescriptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [editPersonalModal, setEditPersonalModal] = useState(false);
  const [editGuardiansModal, setEditGuardiansModal] = useState(false);
  const [editAcademicModal, setEditAcademicModal] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [caretakerModalOpen, setCaretakerModalOpen] = useState(false);
  const [feesModalOpen, setFeesModalOpen] = useState(false);
  const [dropModalOpen, setDropModalOpen] = useState(false);

  // Form states
  const [personalForm, setPersonalForm] = useState({
    registration_id: '',
    lin_id: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    current_status: 'active',
    gender: '',
    school_type: 'day',
    profile_picture_url: '',
  });

  const [guardiansForm, setGuardiansForm] = useState({
    guardian_name: '',
    guardian_phone: '',
    father_name: '',
    father_phone: '',
    father_nin: '',
    mother_name: '',
    mother_phone: '',
    mother_nin: '',
  });

  const [academicForm, setAcademicForm] = useState({
    grade_of_entry: '',
    year_of_entry: '',
    current_grade_id: '' as number | '',
  });

  const [addressForm, setAddressForm] = useState({
    address: '',
    city: '',
    state: '',
    zip_code: '',
  });

  const [caretakerForm, setCaretakerForm] = useState({
    name: '',
    relationship: '',
    contact_number: '',
    email: '',
  });

  const [editingCaretakerId, setEditingCaretakerId] = useState<number | null>(null);

  /* ---------------- Auth Check ---------------- */
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        router.replace('/');
        return;
      }
      const user = data.session.user;
      setUserEmail(user.email ?? null);
      setUserName((user.user_metadata as any)?.full_name || 'Admin');
      setAuthChecking(false);
    };
    checkAuth();
  }, [router]);

  /* ---------------- Load Data ---------------- */
  useEffect(() => {
    if (authChecking) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const { data: ures } = await supabase.auth.getUser();
        if (!ures.user) throw new Error('No user found');

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', ures.user.id)
          .single();

        if (!profileData) throw new Error('Profile not found');
        setProfile(profileData as ProfileRow);

        if (!profileData.school_id) return;

        const { data: schoolData } = await supabase
          .from('general_information')
          .select('*')
          .eq('id', profileData.school_id)
          .single();
        setSchool(schoolData as SchoolRow);

        const { data: gradesData } = await supabase
          .from('class')
          .select('*')
          .eq('school_id', profileData.school_id);
        setGrades((gradesData || []) as GradeRow[]);

        if (!isCreateMode) {
          const { data: studentData } = await supabase
            .from('students')
            .select(`
              *,
              class:current_grade_id (grade_name),
              school:school_id (school_name)
            `)
            .eq('registration_id', rawRegistrationId)
            .eq('school_id', profileData.school_id)
            .single();

          if (studentData) {
            const st = studentData as StudentDetailRow;
            setStudent(st);
            
            // Set form data
            setPersonalForm({
              registration_id: st.registration_id,
              lin_id: st.lin_id || '',
              first_name: st.first_name,
              last_name: st.last_name,
              date_of_birth: st.date_of_birth,
              current_status: st.current_status,
              gender: st.gender || '',
              school_type: st.school_type || 'day',
              profile_picture_url: st.profile_picture_url || '',
            });

            setGuardiansForm({
              guardian_name: st.guardian_name || '',
              guardian_phone: st.guardian_phone || '',
              father_name: st.father_name || '',
              father_phone: st.father_phone || '',
              father_nin: st.father_nin || '',
              mother_name: st.mother_name || '',
              mother_phone: st.mother_phone || '',
              mother_nin: st.mother_nin || '',
            });

            setAcademicForm({
              grade_of_entry: st.grade_of_entry || '',
              year_of_entry: st.year_of_entry || '',
              current_grade_id: st.current_grade_id ?? '',
            });

            const { data: addrData } = await supabase
              .from('students_address')
              .select('*')
              .eq('student_id', st.registration_id)
              .single();

            if (addrData) {
              const addr = addrData as StudentAddressRow;
              setAddress(addr);
              setAddressForm({
                address: addr.address,
                city: addr.city,
                state: addr.state,
                zip_code: addr.zip_code,
              });
            }

            const { data: caretakersData } = await supabase
              .from('caretaker')
              .select('*')
              .eq('student_id', st.registration_id);
            setCaretakers((caretakersData || []) as CaretakerRow[]);

            if (st.current_grade_id) {
              await loadFeesData(st.registration_id, st.current_grade_id, profileData.school_id);
            }
          }
        }
      } catch (error: any) {
        setErrorMsg(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authChecking, rawRegistrationId, isCreateMode]);

  /* ---------------- Fees Functions ---------------- */
  const loadFeesData = async (studentId: string, gradeId: number, schoolId: string) => {
    try {
      const { data: feesData } = await supabase
        .from('assessment_schoolfees')
        .select('*')
        .eq('grade_id', gradeId)
        .eq('school_id', schoolId)
        .single();

      setSchoolFees(feesData as SchoolFeesRow);

      const { data: tuitionData } = await supabase
        .from('student_tuition_description')
        .select('*')
        .eq('student_id', studentId)
        .eq('tuition_id', feesData?.id)
        .single();

      setTuitionDesc(tuitionData as StudentTuitionDescriptionRow);
    } catch (error) {
      // Fees might not be set up yet
    }
  };

  /* ---------------- Form Handlers ---------------- */
  const handleSavePersonalInfo = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (!profile?.school_id) throw new Error('School not linked');

      // Create base payload
      const basePayload = {
        ...personalForm,
        school_id: profile.school_id,
        updated: new Date().toISOString().slice(0, 10),
      };

      if (isCreateMode) {
        // Create full payload for insert
        const insertPayload = {
          ...basePayload,
          registered_by: (await supabase.auth.getUser()).data.user?.id || null,
          created: new Date().toISOString().slice(0, 10),
        };

        const { error } = await supabase.from('students').insert(insertPayload);
        if (error) throw error;
        
        setSuccessMsg('Student created successfully');
        router.push(`/students/${encodeURIComponent(insertPayload.registration_id)}`);
      } else {
        // For update, use base payload only
        const { error } = await supabase
          .from('students')
          .update(basePayload)
          .eq('registration_id', student?.registration_id);

        if (error) throw error;
        setSuccessMsg('Personal information updated');
        setEditPersonalModal(false);
      }
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGuardiansInfo = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...guardiansForm,
        updated: new Date().toISOString().slice(0, 10),
      };

      const { error } = await supabase
        .from('students')
        .update(payload)
        .eq('registration_id', student?.registration_id);

      if (error) throw error;
      
      setSuccessMsg('Guardian information updated');
      setEditGuardiansModal(false);
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAcademicInfo = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...academicForm,
        current_grade_id: academicForm.current_grade_id === '' ? null : Number(academicForm.current_grade_id),
        updated: new Date().toISOString().slice(0, 10),
      };

      const { error } = await supabase
        .from('students')
        .update(payload)
        .eq('registration_id', student?.registration_id);

      if (error) throw error;
      
      setSuccessMsg('Academic information updated');
      setEditAcademicModal(false);
      
      // Reload fees if grade changed
      if (payload.current_grade_id && student) {
        await loadFeesData(student.registration_id, payload.current_grade_id, profile!.school_id!);
      }
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAddress = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        student_id: student?.registration_id,
        ...addressForm,
        updated: new Date().toISOString().slice(0, 10),
      };

      const { error } = await supabase
        .from('students_address')
        .upsert(payload, { onConflict: 'student_id' });

      if (error) throw error;
      
      setSuccessMsg('Address saved successfully');
      setAddressModalOpen(false);
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCaretaker = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        student_id: student?.registration_id,
        name: caretakerForm.name.trim(),
        relationship: caretakerForm.relationship.trim(),
        contact_number: caretakerForm.contact_number.trim(),
        email: caretakerForm.email.trim() || null,
        updated: new Date().toISOString().slice(0, 10),
      };

      if (editingCaretakerId) {
        const { error } = await supabase
          .from('caretaker')
          .update(payload)
          .eq('id', editingCaretakerId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('caretaker').insert(payload);
        if (error) throw error;
      }

      setSuccessMsg(editingCaretakerId ? 'Caretaker updated' : 'Caretaker added');
      setCaretakerModalOpen(false);
      setCaretakerForm({ name: '', relationship: '', contact_number: '', email: '' });
      setEditingCaretakerId(null);
      
      // Refresh caretakers list
      const { data: caretakersData } = await supabase
        .from('caretaker')
        .select('*')
        .eq('student_id', student?.registration_id);
      setCaretakers((caretakersData || []) as CaretakerRow[]);
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCaretaker = async (id: number) => {
    if (!confirm('Are you sure you want to delete this caretaker?')) return;

    try {
      const { error } = await supabase.from('caretaker').delete().eq('id', id);
      if (error) throw error;
      
      setCaretakers(caretakers.filter(c => c.id !== id));
      setSuccessMsg('Caretaker deleted');
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  const updateFeeOptions = async (option: 'hostel' | 'breakfast' | 'lunch') => {
    if (!tuitionDesc || !profile?.school_id) return;
    
    setSubmitting(true);
    try {
      const updatedOptions = {
        hostel: option === 'hostel' ? !tuitionDesc.hostel : tuitionDesc.hostel,
        breakfast: option === 'breakfast' ? !tuitionDesc.breakfast : tuitionDesc.breakfast,
        lunch: option === 'lunch' ? !tuitionDesc.lunch : tuitionDesc.lunch,
      };

      const { error } = await supabase
        .from('student_tuition_description')
        .update(updatedOptions)
        .eq('id', tuitionDesc.id);

      if (error) throw error;
      
      setTuitionDesc({ ...tuitionDesc, ...updatedOptions });
      setSuccessMsg('Fee options updated');
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Loading State ---------------- */
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse mb-4 shadow-lg" />
            <div className="absolute inset-0 border-2 border-blue-500/30 rounded-2xl animate-ping"></div>
          </div>
          <p className="text-sm text-gray-600 font-medium tracking-wide mt-4">Loading student profile...</p>
        </div>
      </div>
    );
  }

  /* ---------------- Main Render ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white">
      <Navbar />
      
      <div className="flex">
        <AppShell />
        
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => router.push('/students')}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium group transition-all duration-200"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Students
              </button>
              
              <div className="flex items-center gap-3">
                <ActionButton
                  variant="ghost"
                  icon={<Printer size={18} />}
                  onClick={() => window.print()}
                >
                  Print
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  icon={<Share2 size={18} />}
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                >
                  Share
                </ActionButton>
              </div>
            </div>
            
            {/* Student Header Card */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl border border-gray-200/50 p-8 mb-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {student ? `${student.first_name[0]}${student.last_name[0]}` : 'NS'}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-lg">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center">
                        <UserCheck size={12} className="text-white" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                        {isCreateMode ? 'New Student' : `${student?.first_name} ${student?.last_name}`}
                      </h1>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={student?.current_status || 'active'} />
                        {student?.school_type && (
                          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white border border-purple-600 shadow-sm">
                            {student.school_type}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <Building size={16} />
                        <span>{school?.school_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <UserCircle size={16} />
                        <span>ID: {student?.registration_id || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <Calendar size={16} />
                        <span>Joined: {student?.created ? new Date(student.created).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!isCreateMode && student && (
                    <>
                      <ActionButton
                        variant="secondary"
                        icon={<Edit2 size={18} />}
                        onClick={() => setEditPersonalModal(true)}
                      >
                        Edit Profile
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        icon={<Shield size={18} />}
                        onClick={() => setDropModalOpen(true)}
                      >
                        Drop Out
                      </ActionButton>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            {errorMsg && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200 rounded-2xl flex items-center gap-3 animate-fadeIn">
                <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertCircle className="text-red-600" size={20} />
                </div>
                <div className="text-red-700 font-medium">{errorMsg}</div>
              </div>
            )}
            
            {successMsg && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl flex items-center gap-3 animate-fadeIn">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="text-emerald-600" size={20} />
                </div>
                <div className="text-emerald-700 font-medium">{successMsg}</div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Student ID"
                value={student?.registration_id || '—'}
                icon={<Copy size={18} />}
              />
              <StatCard
                label="Date of Birth"
                value={student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'Not set'}
                trend={`Age: ${student?.date_of_birth ? Math.floor((new Date().getTime() - new Date(student.date_of_birth).getTime()) / 31536000000) : '—'} years`}
                icon={<Calendar size={18} />}
              />
              <StatCard
                label="Current Grade"
                value={student?.class?.grade_name || 'Not assigned'}
                trend={`Entry: ${student?.grade_of_entry || '—'}`}
                icon={<GraduationCap size={18} />}
              />
              <StatCard
                label="School Type"
                value={student?.school_type ? student.school_type.charAt(0).toUpperCase() + student.school_type.slice(1) : 'Not set'}
                trend={`Year: ${student?.year_of_entry || '—'}`}
                icon={<Building size={18} />}
              />
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Personal & Academic */}
            <div className="lg:col-span-2 space-y-8">
              {/* Personal Information */}
              <SectionCard
                title="Personal Information"
                icon={<User size={20} />}
                action={
                  <ActionButton
                    variant="ghost"
                    icon={<Edit2 size={16} />}
                    onClick={() => setEditPersonalModal(true)}
                    className="text-sm"
                  >
                    Edit
                  </ActionButton>
                }
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Full Name</div>
                    <div className="text-lg font-semibold text-gray-900">{student?.first_name} {student?.last_name}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Gender</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {student?.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'Not set'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Registration Date</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {student?.created ? new Date(student.created).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Last Updated</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {student?.updated ? new Date(student.updated).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Academic Information */}
              <SectionCard
                title="Academic Information"
                icon={<BookOpen size={20} />}
                action={
                  <ActionButton
                    variant="ghost"
                    icon={<Edit2 size={16} />}
                    onClick={() => setEditAcademicModal(true)}
                    className="text-sm"
                  >
                    Edit
                  </ActionButton>
                }
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Current Class</div>
                    <div className="text-lg font-semibold text-gray-900">{student?.class?.grade_name || 'Not assigned'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Grade of Entry</div>
                    <div className="text-lg font-semibold text-gray-900">{student?.grade_of_entry || 'Not set'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Year of Entry</div>
                    <div className="text-lg font-semibold text-gray-900">{student?.year_of_entry || 'Not set'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Status</div>
                    <div>
                      <StatusBadge status={student?.current_status || 'active'} />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Guardians Information */}
              <SectionCard
                title="Family & Guardians"
                icon={<Users size={20} />}
                action={
                  <ActionButton
                    variant="ghost"
                    icon={<Edit2 size={16} />}
                    onClick={() => setEditGuardiansModal(true)}
                    className="text-sm"
                  >
                    Edit
                  </ActionButton>
                }
              >
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <UserCircle size={16} />
                      Primary Guardian
                    </h4>
                    <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200/50">
                      <div className="font-semibold text-gray-900">{student?.guardian_name || 'Not set'}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                        <Phone size={14} />
                        {student?.guardian_phone || 'No phone'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Father</h4>
                      <div className="space-y-2">
                        <div className="font-semibold text-gray-900">{student?.father_name || 'Not set'}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <Phone size={14} />
                          {student?.father_phone || 'No phone'}
                        </div>
                        {student?.father_nin && (
                          <div className="text-xs font-medium text-gray-500 bg-gray-100 rounded-lg px-2 py-1 inline-block">
                            NIN: {student.father_nin}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Mother</h4>
                      <div className="space-y-2">
                        <div className="font-semibold text-gray-900">{student?.mother_name || 'Not set'}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <Phone size={14} />
                          {student?.mother_phone || 'No phone'}
                        </div>
                        {student?.mother_nin && (
                          <div className="text-xs font-medium text-gray-500 bg-gray-100 rounded-lg px-2 py-1 inline-block">
                            NIN: {student.mother_nin}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Caretakers */}
              <SectionCard
                title="Additional Caretakers"
                icon={<Users size={20} />}
                action={
                  <ActionButton
                    variant="primary"
                    icon={<Plus size={16} />}
                    onClick={() => {
                      setCaretakerForm({ name: '', relationship: '', contact_number: '', email: '' });
                      setEditingCaretakerId(null);
                      setCaretakerModalOpen(true);
                    }}
                    className="text-sm"
                  >
                    Add Caretaker
                  </ActionButton>
                }
              >
                {caretakers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-3">
                      <Users size={24} className="text-gray-400" />
                    </div>
                    <div className="text-gray-500 font-medium">No additional caretakers added yet</div>
                    <div className="text-sm text-gray-400 mt-1">Add caretakers to provide emergency contacts</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {caretakers.map((ct) => (
                      <div key={ct.id} className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-200/50 hover:border-blue-200 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                            <User size={20} className="text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{ct.name}</div>
                            <div className="text-sm text-gray-600">
                              {ct.relationship} • {ct.contact_number}
                            </div>
                            {ct.email && (
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <Mail size={12} />
                                {ct.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setCaretakerForm({
                                name: ct.name,
                                relationship: ct.relationship,
                                contact_number: ct.contact_number,
                                email: ct.email || '',
                              });
                              setEditingCaretakerId(ct.id);
                              setCaretakerModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCaretaker(ct.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Right Column - Address & Fees */}
            <div className="space-y-8">
              {/* Address Information */}
              <SectionCard
                title="Address"
                icon={<MapPin size={20} />}
                action={
                  <ActionButton
                    variant="ghost"
                    icon={address ? <Edit2 size={16} /> : <Plus size={16} />}
                    onClick={() => setAddressModalOpen(true)}
                    className="text-sm"
                  >
                    {address ? 'Edit' : 'Add'}
                  </ActionButton>
                }
              >
                {address ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-500">Address</div>
                      <div className="font-semibold text-gray-900">{address.address}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-500">City</div>
                        <div className="font-semibold text-gray-900">{address.city}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-500">State</div>
                        <div className="font-semibold text-gray-900">{address.state}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-500">Zip Code</div>
                      <div className="font-semibold text-gray-900">{address.zip_code}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-3">
                      <MapPin size={24} className="text-gray-400" />
                    </div>
                    <div className="text-gray-500 font-medium">No address added yet</div>
                    <ActionButton
                      variant="primary"
                      onClick={() => setAddressModalOpen(true)}
                      className="mt-4 text-sm"
                    >
                      Add Address
                    </ActionButton>
                  </div>
                )}
              </SectionCard>

              {/* Fee Information */}
              <SectionCard
                title="Fee Details"
                icon={<CreditCard size={20} />}
                action={
                  <ActionButton
                    variant="ghost"
                    icon={<DollarSign size={16} />}
                    onClick={() => setFeesModalOpen(true)}
                    className="text-sm"
                  >
                    View Details
                  </ActionButton>
                }
              >
                {schoolFees ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50/50 to-blue-100/30 rounded-2xl p-5 border border-blue-200/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-blue-800">Total Fee</div>
                          <div className="text-2xl font-bold text-blue-900">
                            UGX {(tuitionDesc?.total_fee || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-blue-600 mt-1">For {student?.class?.grade_name}</div>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Calculator size={24} className="text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-700">Selected Options</h4>
                      <div className="space-y-2">
                        {[
                          { key: 'hostel', label: 'Hostel', icon: <Bed size={16} />, selected: tuitionDesc?.hostel },
                          { key: 'breakfast', label: 'Breakfast', icon: <Coffee size={16} />, selected: tuitionDesc?.breakfast },
                          { key: 'lunch', label: 'Lunch', icon: <Utensils size={16} />, selected: tuitionDesc?.lunch },
                        ].map((option) => (
                          <div
                            key={option.key}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${option.selected ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-gray-50/50'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${option.selected ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                {option.icon}
                              </div>
                              <span className="font-medium">{option.label}</span>
                            </div>
                            <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${option.selected ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                              {option.selected ? 'Selected' : 'Not selected'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <ActionButton
                      variant="primary"
                      icon={<ExternalLink size={18} />}
                      onClick={() => router.push('/finance')}
                      className="w-full"
                    >
                      Go to Finance Portal
                    </ActionButton>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-3">
                      <CreditCard size={24} className="text-gray-400" />
                    </div>
                    <div className="text-gray-500 font-medium">No fee setup for this grade</div>
                    <div className="text-sm text-gray-400 mt-1">Assign a class to view fees</div>
                  </div>
                )}
              </SectionCard>

              {/* Quick Stats */}
              <SectionCard title="Quick Stats" icon={<BarChart3 size={20} />}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-200/50">
                    <span className="text-sm font-medium text-gray-600">Caretakers</span>
                    <span className="font-bold text-gray-900">{caretakers.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-200/50">
                    <span className="text-sm font-medium text-gray-600">Enrollment Days</span>
                    <span className="font-bold text-gray-900">
                      {student?.created ? Math.floor((new Date().getTime() - new Date(student.created).getTime()) / 86400000) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-200/50">
                    <span className="text-sm font-medium text-gray-600">Last Updated</span>
                    <span className="font-bold text-gray-900">
                      {student?.updated ? Math.floor((new Date().getTime() - new Date(student.updated).getTime()) / 86400000) : '—'} days ago
                    </span>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </main>
      </div>

      {/* Personal Information Modal */}
      <Modal
        open={editPersonalModal}
        title={isCreateMode ? "Create Student" : "Edit Personal Information"}
        onClose={() => setEditPersonalModal(false)}
        widthClass="max-w-2xl"
      >
        <form onSubmit={handleSavePersonalInfo} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
              <input
                type="text"
                required
                value={personalForm.first_name}
                onChange={(e) => setPersonalForm({...personalForm, first_name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
              <input
                type="text"
                required
                value={personalForm.last_name}
                onChange={(e) => setPersonalForm({...personalForm, last_name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Registration ID *</label>
              <input
                type="text"
                required={isCreateMode}
                disabled={!isCreateMode}
                value={personalForm.registration_id}
                onChange={(e) => setPersonalForm({...personalForm, registration_id: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">LIN ID</label>
              <input
                type="text"
                value={personalForm.lin_id}
                onChange={(e) => setPersonalForm({...personalForm, lin_id: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth *</label>
              <input
                type="date"
                required
                value={personalForm.date_of_birth}
                onChange={(e) => setPersonalForm({...personalForm, date_of_birth: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
              <select
                value={personalForm.gender}
                onChange={(e) => setPersonalForm({...personalForm, gender: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">School Type</label>
              <select
                value={personalForm.school_type}
                onChange={(e) => setPersonalForm({...personalForm, school_type: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              >
                <option value="day">Day</option>
                <option value="boarding">Boarding</option>
                <option value="bursary">Bursary</option>
                <option value="scholarship">Scholarship</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={personalForm.current_status}
                onChange={(e) => setPersonalForm({...personalForm, current_status: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              >
                <option value="active">Active</option>
                <option value="graduated">Graduated</option>
                <option value="dropped out">Dropped Out</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditPersonalModal(false)}
              className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : isCreateMode ? 'Create Student' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Guardians Modal */}
      <Modal
        open={editGuardiansModal}
        title="Edit Guardian Information"
        onClose={() => setEditGuardiansModal(false)}
        widthClass="max-w-lg"
      >
        <form onSubmit={handleSaveGuardiansInfo} className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UserCircle size={18} />
              Primary Guardian
            </h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={guardiansForm.guardian_name}
                  onChange={(e) => setGuardiansForm({...guardiansForm, guardian_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={guardiansForm.guardian_phone}
                  onChange={(e) => setGuardiansForm({...guardiansForm, guardian_phone: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Father's Information</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={guardiansForm.father_name}
                    onChange={(e) => setGuardiansForm({...guardiansForm, father_name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={guardiansForm.father_phone}
                    onChange={(e) => setGuardiansForm({...guardiansForm, father_phone: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">National ID (NIN)</label>
                <input
                  type="text"
                  value={guardiansForm.father_nin}
                  onChange={(e) => setGuardiansForm({...guardiansForm, father_nin: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Mother's Information</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={guardiansForm.mother_name}
                    onChange={(e) => setGuardiansForm({...guardiansForm, mother_name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={guardiansForm.mother_phone}
                    onChange={(e) => setGuardiansForm({...guardiansForm, mother_phone: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">National ID (NIN)</label>
                <input
                  type="text"
                  value={guardiansForm.mother_nin}
                  onChange={(e) => setGuardiansForm({...guardiansForm, mother_nin: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditGuardiansModal(false)}
              className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Academic Modal */}
      <Modal
        open={editAcademicModal}
        title="Edit Academic Information"
        onClose={() => setEditAcademicModal(false)}
      >
        <form onSubmit={handleSaveAcademicInfo} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Current Class</label>
            <select
              value={academicForm.current_grade_id}
              onChange={(e) => setAcademicForm({...academicForm, current_grade_id: e.target.value === '' ? '' : Number(e.target.value)})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
            >
              <option value="">Not assigned</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.grade_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Grade of Entry</label>
              <input
                type="text"
                value={academicForm.grade_of_entry}
                onChange={(e) => setAcademicForm({...academicForm, grade_of_entry: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                placeholder="e.g., P.1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Year of Entry</label>
              <input
                type="text"
                value={academicForm.year_of_entry}
                onChange={(e) => setAcademicForm({...academicForm, year_of_entry: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                placeholder="e.g., 2023"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditAcademicModal(false)}
              className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Address Modal */}
      <Modal
        open={addressModalOpen}
        title="Update Address"
        onClose={() => setAddressModalOpen(false)}
      >
        <form onSubmit={handleSaveAddress} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Address *</label>
            <input
              type="text"
              required
              value={addressForm.address}
              onChange={(e) => setAddressForm({...addressForm, address: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">City *</label>
              <input
                type="text"
                required
                value={addressForm.city}
                onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">State *</label>
              <input
                type="text"
                required
                value={addressForm.state}
                onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Zip Code *</label>
            <input
              type="text"
              required
              value={addressForm.zip_code}
              onChange={(e) => setAddressForm({...addressForm, zip_code: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setAddressModalOpen(false)}
              className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Caretaker Modal */}
      <Modal
        open={caretakerModalOpen}
        title={editingCaretakerId ? "Edit Caretaker" : "Add Caretaker"}
        onClose={() => {
          setCaretakerModalOpen(false);
          setCaretakerForm({ name: '', relationship: '', contact_number: '', email: '' });
          setEditingCaretakerId(null);
        }}
      >
        <form onSubmit={handleSaveCaretaker} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              required
              value={caretakerForm.name}
              onChange={(e) => setCaretakerForm({...caretakerForm, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship *</label>
              <input
                type="text"
                required
                value={caretakerForm.relationship}
                onChange={(e) => setCaretakerForm({...caretakerForm, relationship: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                placeholder="e.g., Aunt, Uncle, Grandparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Number *</label>
              <input
                type="tel"
                required
                value={caretakerForm.contact_number}
                onChange={(e) => setCaretakerForm({...caretakerForm, contact_number: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={caretakerForm.email}
              onChange={(e) => setCaretakerForm({...caretakerForm, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setCaretakerModalOpen(false);
                setCaretakerForm({ name: '', relationship: '', contact_number: '', email: '' });
                setEditingCaretakerId(null);
              }}
              className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : editingCaretakerId ? 'Update' : 'Add Caretaker'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Fees Modal */}
      <Modal
        open={feesModalOpen}
        title="Student Fee Details"
        onClose={() => setFeesModalOpen(false)}
        widthClass="max-w-lg"
      >
        {schoolFees ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200/50">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-semibold text-blue-800">Total Computed Fee</div>
                <Calculator size={20} className="text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">
                UGX {(tuitionDesc?.total_fee || 0).toLocaleString()}
              </div>
              <div className="text-sm text-blue-600 mt-1 font-medium">For {student?.class?.grade_name}</div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Base Fee Structure</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <Book size={16} />
                    </div>
                    <span className="font-medium">Tuition Fee</span>
                  </div>
                  <span className="font-bold text-gray-900">UGX {schoolFees.tuitionfee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                      <Bed size={16} />
                    </div>
                    <span className="font-medium">Hostel Fee</span>
                  </div>
                  <span className="font-bold text-gray-900">UGX {schoolFees.hostelfee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                      <Coffee size={16} />
                    </div>
                    <span className="font-medium">Breakfast Fee</span>
                  </div>
                  <span className="font-bold text-gray-900">UGX {schoolFees.breakfastfee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                      <Utensils size={16} />
                    </div>
                    <span className="font-medium">Lunch Fee</span>
                  </div>
                  <span className="font-bold text-gray-900">UGX {schoolFees.lunchfee.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Selected Options</h4>
              <div className="space-y-3">
                {['hostel', 'breakfast', 'lunch'].map((option) => {
                  const isSelected = tuitionDesc?.[option as keyof StudentTuitionDescriptionRow] as boolean;
                  const icons = {
                    hostel: <Bed size={16} />,
                    breakfast: <Coffee size={16} />,
                    lunch: <Utensils size={16} />,
                  };
                  const labels = {
                    hostel: 'Hostel Accommodation',
                    breakfast: 'Breakfast Service',
                    lunch: 'Lunch Service',
                  };
                  
                  return (
                    <div key={option} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                          {icons[option as keyof typeof icons]}
                        </div>
                        <div>
                          <div className="font-medium">{labels[option as keyof typeof labels]}</div>
                          <div className="text-sm text-gray-500">
                            {option === 'hostel' ? 'Boarding accommodation' : 
                             option === 'breakfast' ? 'Morning meal service' : 'Midday meal service'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => updateFeeOptions(option as 'hostel' | 'breakfast' | 'lunch')}
                        disabled={submitting}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                          isSelected 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 shadow-sm' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        } disabled:opacity-50`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <ActionButton
                variant="primary"
                icon={<ExternalLink size={18} />}
                onClick={() => router.push('/finance')}
                className="w-full"
              >
                View Full Fee Transactions
              </ActionButton>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
              <CreditCard size={32} className="text-gray-400" />
            </div>
            <div className="text-lg font-bold text-gray-900 mb-2">No Fee Setup</div>
            <div className="text-sm text-gray-600 mb-4">
              Fees have not been configured for {student?.class?.grade_name || 'this grade'} yet.
            </div>
            <div className="text-xs text-gray-500">
              Please assign a class to the student and set up grade fees in the finance section.
            </div>
          </div>
        )}
      </Modal>

      {/* Drop Out Confirmation Modal */}
      <Modal
        open={dropModalOpen}
        title="Mark Student as Dropped Out"
        onClose={() => setDropModalOpen(false)}
      >
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-50 to-amber-50/50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 text-amber-800 mb-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <div className="font-semibold">Important Notice</div>
            </div>
            <p className="text-sm text-amber-700 font-medium mb-3">
              Marking a student as "dropped out" will:
            </p>
            <ul className="text-sm text-amber-700 space-y-2">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-600"></div>
                <span>Change their status to inactive</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-600"></div>
                <span>Restrict profile editing</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-600"></div>
                <span>Remove them from active student lists</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-600"></div>
                <span>Preserve all historical records</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDropModalOpen(false)}
              className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const { error } = await supabase
                    .from('students')
                    .update({ 
                      current_status: 'dropped out',
                      updated: new Date().toISOString().slice(0, 10)
                    })
                    .eq('registration_id', student?.registration_id);

                  if (error) throw error;
                  
                  setDropModalOpen(false);
                  setSuccessMsg('Student marked as dropped out');
                  // Refresh student data
                  if (student) {
                    setStudent({
                      ...student,
                      current_status: 'dropped out'
                    });
                  }
                } catch (error: any) {
                  setErrorMsg(error.message);
                }
              }}
              className="px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl hover:from-amber-700 hover:to-amber-800 font-medium flex items-center gap-2 transition-all shadow-lg shadow-amber-500/25"
            >
              <Shield size={16} />
              Confirm Drop Out
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
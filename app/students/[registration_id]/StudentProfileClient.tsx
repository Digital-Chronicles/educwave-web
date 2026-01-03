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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`w-full ${widthClass} bg-white rounded-2xl shadow-2xl animate-fadeIn`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
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
    active: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <UserCheck size={14} /> },
    graduated: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Award size={14} /> },
    'dropped out': { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Shield size={14} /> },
  }[status] || { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <User size={14} /> };

  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${config.color}`}>
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
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'indigo';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  }[color];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all ${onClick ? 'cursor-pointer hover:border-gray-300' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${colorClasses}`}>
              {icon}
            </div>
            <span className="text-sm font-medium text-gray-700">{title}</span>
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-1">{value}</div>
          {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
        </div>
        {onClick && <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />}
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            {icon}
          </div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 animate-pulse mb-4" />
          <p className="text-sm text-gray-600">Loading student profile...</p>
        </div>
      </div>
    );
  }

  /* ---------------- Main Render ---------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Removed props from Navbar since it likely doesn't need them */}
      <Navbar />
      
      <div className="flex">
        <AppShell />
        
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/students')}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft size={20} />
              Back to Students
            </button>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                  {student ? `${student.first_name[0]}${student.last_name[0]}` : 'NS'}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isCreateMode ? 'New Student' : `${student?.first_name} ${student?.last_name}`}
                  </h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-gray-600">{school?.school_name}</span>
                    {student && <StatusBadge status={student.current_status} />}
                    {student?.school_type && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        {student.school_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isCreateMode && student && (
                  <>
                    <button
                      onClick={() => setEditPersonalModal(true)}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit2 size={16} />
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setDropModalOpen(true)}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
                    >
                      <Shield size={16} />
                      Drop Out
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            {errorMsg && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <AlertCircle className="text-red-600" size={20} />
                <div className="text-red-700">{errorMsg}</div>
              </div>
            )}
            
            {successMsg && (
              <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle className="text-emerald-600" size={20} />
                <div className="text-emerald-700">{successMsg}</div>
              </div>
            )}

            {/* Quick Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <InfoCard
                icon={<UserCircle size={20} />}
                title="Student ID"
                value={student?.registration_id || '—'}
                subtitle={`LIN: ${student?.lin_id || 'Not set'}`}
                color="blue"
              />
              
              <InfoCard
                icon={<Calendar size={20} />}
                title="Date of Birth"
                value={student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'Not set'}
                subtitle={`Age: ${student?.date_of_birth ? Math.floor((new Date().getTime() - new Date(student.date_of_birth).getTime()) / 31536000000) : '—'} years`}
                color="green"
              />
              
              <InfoCard
                icon={<GraduationCap size={20} />}
                title="Current Grade"
                value={student?.class?.grade_name || 'Not assigned'}
                subtitle={`Entry: ${student?.grade_of_entry || '—'}`}
                color="purple"
              />
              
              <InfoCard
                icon={<Building size={20} />}
                title="School Type"
                value={student?.school_type ? student.school_type.charAt(0).toUpperCase() + student.school_type.slice(1) : 'Not set'}
                subtitle={`Year: ${student?.year_of_entry || '—'}`}
                color="amber"
              />
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Personal & Academic */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <SectionCard
                title="Personal Information"
                icon={<User size={20} />}
                action={
                  <button
                    onClick={() => setEditPersonalModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                }
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Full Name</div>
                    <div className="font-medium">{student?.first_name} {student?.last_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Gender</div>
                    <div className="font-medium">{student?.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Registration Date</div>
                    <div className="font-medium">{student?.created ? new Date(student.created).toLocaleDateString() : 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Last Updated</div>
                    <div className="font-medium">{student?.updated ? new Date(student.updated).toLocaleDateString() : 'Not set'}</div>
                  </div>
                </div>
              </SectionCard>

              {/* Academic Information */}
              <SectionCard
                title="Academic Information"
                icon={<BookOpen size={20} />}
                action={
                  <button
                    onClick={() => setEditAcademicModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                }
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Current Class</div>
                    <div className="font-medium">{student?.class?.grade_name || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Grade of Entry</div>
                    <div className="font-medium">{student?.grade_of_entry || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Year of Entry</div>
                    <div className="font-medium">{student?.year_of_entry || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Status</div>
                    <div className="font-medium">
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
                  <button
                    onClick={() => setEditGuardiansModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                }
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Primary Guardian</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium">{student?.guardian_name || 'Not set'}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone size={14} />
                        {student?.guardian_phone || 'No phone'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Father</h4>
                      <div className="space-y-1">
                        <div className="font-medium">{student?.father_name || 'Not set'}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone size={14} />
                          {student?.father_phone || 'No phone'}
                        </div>
                        {student?.father_nin && (
                          <div className="text-xs text-gray-500">NIN: {student.father_nin}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Mother</h4>
                      <div className="space-y-1">
                        <div className="font-medium">{student?.mother_name || 'Not set'}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone size={14} />
                          {student?.mother_phone || 'No phone'}
                        </div>
                        {student?.mother_nin && (
                          <div className="text-xs text-gray-500">NIN: {student.mother_nin}</div>
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
                  <button
                    onClick={() => {
                      setCaretakerForm({ name: '', relationship: '', contact_number: '', email: '' });
                      setEditingCaretakerId(null);
                      setCaretakerModalOpen(true);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                }
              >
                {caretakers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No additional caretakers added yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {caretakers.map((ct) => (
                      <div key={ct.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{ct.name}</div>
                          <div className="text-sm text-gray-600">
                            {ct.relationship} • {ct.contact_number}
                          </div>
                          {ct.email && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail size={12} />
                              {ct.email}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
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
                            className="p-1.5 text-gray-500 hover:text-blue-600"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCaretaker(ct.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600"
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
            <div className="space-y-6">
              {/* Address Information */}
              <SectionCard
                title="Address"
                icon={<MapPin size={20} />}
                action={
                  <button
                    onClick={() => setAddressModalOpen(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {address ? <Edit2 size={14} /> : <Plus size={14} />}
                    {address ? 'Edit' : 'Add'}
                  </button>
                }
              >
                {address ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Address</div>
                      <div className="font-medium">{address.address}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">City</div>
                        <div className="font-medium">{address.city}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">State</div>
                        <div className="font-medium">{address.state}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Zip Code</div>
                      <div className="font-medium">{address.zip_code}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <MapPin size={24} className="mx-auto mb-2 text-gray-400" />
                    <div>No address added yet</div>
                    <button
                      onClick={() => setAddressModalOpen(true)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Add address
                    </button>
                  </div>
                )}
              </SectionCard>

              {/* Fee Information */}
              <SectionCard
                title="Fee Details"
                icon={<CreditCard size={20} />}
                action={
                  <button
                    onClick={() => setFeesModalOpen(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <DollarSign size={14} />
                    View Details
                  </button>
                }
              >
                {schoolFees ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-blue-800">Total Fee</div>
                          <div className="text-2xl font-bold text-blue-900">
                            UGX {(tuitionDesc?.total_fee || 0).toLocaleString()}
                          </div>
                        </div>
                        <Calculator size={24} className="text-blue-600" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Selected Options</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <Bed size={16} className="text-gray-400" />
                            <span>Hostel</span>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${tuitionDesc?.hostel ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                            {tuitionDesc?.hostel ? 'Selected' : 'Not selected'}
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <Coffee size={16} className="text-gray-400" />
                            <span>Breakfast</span>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${tuitionDesc?.breakfast ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                            {tuitionDesc?.breakfast ? 'Selected' : 'Not selected'}
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <Utensils size={16} className="text-gray-400" />
                            <span>Lunch</span>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${tuitionDesc?.lunch ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                            {tuitionDesc?.lunch ? 'Selected' : 'Not selected'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push('/finance')}
                      className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Wallet size={16} />
                      Go to Finance
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <CreditCard size={24} className="mx-auto mb-2 text-gray-400" />
                    <div>No fee setup for this grade</div>
                    <div className="text-sm mt-1">Set class to view fees</div>
                  </div>
                )}
              </SectionCard>

              {/* Quick Stats */}
              <SectionCard title="Quick Stats" icon={<BarChart3 size={20} />}>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2">
                    <span className="text-sm text-gray-600">Caretakers</span>
                    <span className="font-semibold">{caretakers.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-2">
                    <span className="text-sm text-gray-600">Enrollment Days</span>
                    <span className="font-semibold">
                      {student?.created ? Math.floor((new Date().getTime() - new Date(student.created).getTime()) / 86400000) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2">
                    <span className="text-sm text-gray-600">Last Updated</span>
                    <span className="font-semibold">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
              <input
                type="text"
                required
                value={personalForm.first_name}
                onChange={(e) => setPersonalForm({...personalForm, first_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
              <input
                type="text"
                required
                value={personalForm.last_name}
                onChange={(e) => setPersonalForm({...personalForm, last_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Registration ID *</label>
              <input
                type="text"
                required={isCreateMode}
                disabled={!isCreateMode}
                value={personalForm.registration_id}
                onChange={(e) => setPersonalForm({...personalForm, registration_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">LIN ID</label>
              <input
                type="text"
                value={personalForm.lin_id}
                onChange={(e) => setPersonalForm({...personalForm, lin_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
              <input
                type="date"
                required
                value={personalForm.date_of_birth}
                onChange={(e) => setPersonalForm({...personalForm, date_of_birth: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={personalForm.gender}
                onChange={(e) => setPersonalForm({...personalForm, gender: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">School Type</label>
              <select
                value={personalForm.school_type}
                onChange={(e) => setPersonalForm({...personalForm, school_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="day">Day</option>
                <option value="boarding">Boarding</option>
                <option value="bursary">Bursary</option>
                <option value="scholarship">Scholarship</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={personalForm.current_status}
                onChange={(e) => setPersonalForm({...personalForm, current_status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
            <h4 className="font-medium text-gray-900 mb-3">Primary Guardian</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={guardiansForm.guardian_name}
                  onChange={(e) => setGuardiansForm({...guardiansForm, guardian_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={guardiansForm.guardian_phone}
                  onChange={(e) => setGuardiansForm({...guardiansForm, guardian_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Father's Information</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={guardiansForm.father_name}
                    onChange={(e) => setGuardiansForm({...guardiansForm, father_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={guardiansForm.father_phone}
                    onChange={(e) => setGuardiansForm({...guardiansForm, father_phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">National ID (NIN)</label>
                <input
                  type="text"
                  value={guardiansForm.father_nin}
                  onChange={(e) => setGuardiansForm({...guardiansForm, father_nin: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Mother's Information</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={guardiansForm.mother_name}
                    onChange={(e) => setGuardiansForm({...guardiansForm, mother_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={guardiansForm.mother_phone}
                    onChange={(e) => setGuardiansForm({...guardiansForm, mother_phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">National ID (NIN)</label>
                <input
                  type="text"
                  value={guardiansForm.mother_nin}
                  onChange={(e) => setGuardiansForm({...guardiansForm, mother_nin: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditGuardiansModal(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Class</label>
            <select
              value={academicForm.current_grade_id}
              onChange={(e) => setAcademicForm({...academicForm, current_grade_id: e.target.value === '' ? '' : Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade of Entry</label>
              <input
                type="text"
                value={academicForm.grade_of_entry}
                onChange={(e) => setAcademicForm({...academicForm, grade_of_entry: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., P.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year of Entry</label>
              <input
                type="text"
                value={academicForm.year_of_entry}
                onChange={(e) => setAcademicForm({...academicForm, year_of_entry: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 2023"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditAcademicModal(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
            <input
              type="text"
              required
              value={addressForm.address}
              onChange={(e) => setAddressForm({...addressForm, address: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <input
                type="text"
                required
                value={addressForm.city}
                onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
              <input
                type="text"
                required
                value={addressForm.state}
                onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code *</label>
            <input
              type="text"
              required
              value={addressForm.zip_code}
              onChange={(e) => setAddressForm({...addressForm, zip_code: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setAddressModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              required
              value={caretakerForm.name}
              onChange={(e) => setCaretakerForm({...caretakerForm, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Relationship *</label>
              <input
                type="text"
                required
                value={caretakerForm.relationship}
                onChange={(e) => setCaretakerForm({...caretakerForm, relationship: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Aunt, Uncle, Grandparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
              <input
                type="tel"
                required
                value={caretakerForm.contact_number}
                onChange={(e) => setCaretakerForm({...caretakerForm, contact_number: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={caretakerForm.email}
              onChange={(e) => setCaretakerForm({...caretakerForm, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-blue-800">Total Computed Fee</div>
                <Calculator size={20} className="text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">
                UGX {(tuitionDesc?.total_fee || 0).toLocaleString()}
              </div>
              <div className="text-sm text-blue-600 mt-1">For {student?.class?.grade_name}</div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Base Fee Structure</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Book size={16} className="text-gray-400" />
                    <span>Tuition Fee</span>
                  </div>
                  <span className="font-semibold">UGX {schoolFees.tuitionfee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Bed size={16} className="text-gray-400" />
                    <span>Hostel Fee</span>
                  </div>
                  <span className="font-semibold">UGX {schoolFees.hostelfee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Coffee size={16} className="text-gray-400" />
                    <span>Breakfast Fee</span>
                  </div>
                  <span className="font-semibold">UGX {schoolFees.breakfastfee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Utensils size={16} className="text-gray-400" />
                    <span>Lunch Fee</span>
                  </div>
                  <span className="font-semibold">UGX {schoolFees.lunchfee.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Selected Options</h4>
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
                    <div key={option} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
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
                        className={`px-3 py-1.5 rounded text-sm font-medium ${
                          isSelected 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        } disabled:opacity-50`}
                      >
                        {isSelected ? 'Selected' : 'Not Selected'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => router.push('/finance')}
                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Wallet size={18} />
                View Full Fee Transactions
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard size={48} className="mx-auto mb-4 text-gray-400" />
            <div className="text-lg font-medium text-gray-900 mb-2">No Fee Setup</div>
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
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-3 text-amber-800 mb-3">
              <AlertCircle size={24} />
              <div className="font-medium">Important Notice</div>
            </div>
            <p className="text-sm text-amber-700">
              Marking a student as "dropped out" will:
            </p>
            <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside ml-2">
              <li>Change their status to inactive</li>
              <li>Restrict profile editing</li>
              <li>Remove them from active student lists</li>
              <li>Preserve all historical records</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDropModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
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
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
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
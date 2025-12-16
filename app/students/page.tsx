'use client';

import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  Search,
  Plus,
  Upload,
  Download,
  Loader2,
  XCircle,
  CheckCircle,
  Users,
  Grid,
  List,
  GraduationCap,
  Phone,
  IdCard,
  Building2,
  Calendar,
  UserPlus,
  Filter,
  ChevronRight,
  BookOpen,
  BarChart3,
  MoreVertical,
} from 'lucide-react';

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  school_id: string | null;
};

type SchoolRow = {
  id: string;
  school_name: string;
};

type ClassRow = { id: number; grade_name: string };

type StudentRow = {
  registration_id: string;
  first_name: string;
  last_name: string;
  current_status: string;
  date_of_birth: string;
  guardian_phone: string | null;
  created: string;
  class?: { grade_name: string } | null;
};

const STATUS_CHOICES = [
  { value: 'active', label: 'Active', color: 'bg-emerald-500' },
  { value: 'graduated', label: 'Graduated', color: 'bg-blue-500' },
  { value: 'dropped out', label: 'Dropped Out', color: 'bg-rose-500' },
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

function getSchoolAbbr(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function computeYearOfEntry(grade: string) {
  const y = new Date().getFullYear();
  const map: Record<string, number> = {
    grade_7: y - 6,
    grade_6: y - 5,
    grade_5: y - 4,
    grade_4: y - 3,
    grade_3: y - 2,
    grade_2: y - 1,
    grade_1: y,
  };
  return String(map[grade] ?? y);
}

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));
    return obj;
  });
  return rows;
}

function initials(first: string, last: string) {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`;
}

function statusPill(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    case 'graduated':
      return 'bg-blue-50 text-blue-700 border border-blue-100';
    case 'dropped out':
      return 'bg-rose-50 text-rose-700 border border-rose-100';
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-100';
  }
}

function StatCard({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
}) {
  return (
    <div className="group relative rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 p-5 hover:-translate-y-0.5">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-indigo-50/0 group-hover:from-blue-50/50 group-hover:to-indigo-50/30 transition-all duration-300 rounded-2xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {trend && (
            <div className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
              <span>↗</span> {trend}
            </div>
          )}
        </div>
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Alert({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error';
  message: string;
  onClose?: () => void;
}) {
  const Icon = type === 'success' ? CheckCircle : XCircle;
  const styles =
    type === 'success'
      ? 'border-emerald-100 bg-gradient-to-r from-emerald-50 to-white text-emerald-800'
      : 'border-rose-100 bg-gradient-to-r from-rose-50 to-white text-rose-800';

  return (
    <div className={`rounded-xl border ${styles} p-4 flex items-start justify-between gap-3 animate-in slide-in-from-top duration-300`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="text-sm font-medium">{message}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-semibold opacity-70 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
  description,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        {required && <span className="text-xs text-rose-500">*</span>}
      </div>
      {description && (
        <div className="text-xs text-gray-500 mb-2">{description}</div>
      )}
      {children}
    </label>
  );
}

export default function StudentsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  // Add panel
  const [showAdd, setShowAdd] = useState(false);

  // Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [status, setStatus] = useState('active');
  const [gender, setGender] = useState<string>('');
  const [schoolType, setSchoolType] = useState('day');
  const [gradeOfEntry, setGradeOfEntry] = useState('grade_1');
  const [linId, setLinId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [currentGradeId, setCurrentGradeId] = useState<number | ''>('');

  const [submitting, setSubmitting] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);

  const resetAlerts = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const fetchStudents = async (schoolId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select(
        'registration_id,first_name,last_name,current_status,date_of_birth,guardian_phone,created,class:current_grade_id(grade_name)'
      )
      .eq('school_id', schoolId)
      .order('created', { ascending: false })
      .limit(2000);

    if (error) throw error;
    setStudents((data ?? []) as any);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) return router.replace('/');

        const uid = sess.session.user.id;

        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id,email,full_name,role,school_id')
          .eq('user_id', uid)
          .single();

        if (pErr) throw pErr;
        setProfile(p as any);

        if (!p?.school_id) {
          setSchool(null);
          setStudents([]);
          setClasses([]);
          setLoading(false);
          setErrorMsg('Your profile is not linked to any school. Please configure your school in Settings.');
          return;
        }

        const { data: sch, error: schErr } = await supabase
          .from('general_information')
          .select('id,school_name')
          .eq('id', p.school_id)
          .single();

        if (schErr) throw schErr;
        setSchool(sch as any);

        const { data: cls, error: clsErr } = await supabase
          .from('class')
          .select('id,grade_name')
          .eq('school_id', p.school_id)
          .order('grade_name', { ascending: true });

        if (clsErr) throw clsErr;
        setClasses((cls ?? []) as any);

        await fetchStudents(p.school_id);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to load module');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter(s => {
      if (q) {
        const hit =
          s.registration_id.toLowerCase().includes(q) ||
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (statusFilter !== 'all' && s.current_status !== statusFilter) return false;
      if (classFilter !== 'all' && (s.class?.grade_name ?? '') !== classFilter) return false;
      return true;
    });
  }, [students, search, statusFilter, classFilter]);

  const activeCount = useMemo(() => students.filter(s => s.current_status === 'active').length, [students]);
  const graduatedCount = useMemo(() => students.filter(s => s.current_status === 'graduated').length, [students]);

  async function getNextRegistrationId(schoolId: string, schoolName: string, yearOfEntry: string) {
    const abbr = getSchoolAbbr(schoolName);
    const { data, error } = await supabase.rpc('generate_student_registration_id', {
      p_school_id: schoolId,
      p_school_abbr: abbr,
      p_year_of_entry: yearOfEntry,
    });
    if (error) throw error;
    if (!data) throw new Error('Registration ID generator returned null.');
    return String(data);
  }

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    resetAlerts();

    try {
      setSubmitting(true);

      if (!profile?.school_id || !school) throw new Error('School not linked.');
      if (!firstName.trim() || !lastName.trim() || !dob) throw new Error('First name, last name and Date of Birth are required.');

      const yearOfEntry = computeYearOfEntry(gradeOfEntry);
      const registration_id = await getNextRegistrationId(profile.school_id, school.school_name, yearOfEntry);

      const { error } = await supabase.from('students').insert({
        registration_id,
        lin_id: linId.trim() || null,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dob,
        current_status: status,
        gender: gender || null,
        school_type: schoolType || null,
        grade_of_entry: gradeOfEntry || null,
        year_of_entry: yearOfEntry,
        guardian_name: guardianName.trim() || null,
        guardian_phone: guardianPhone.trim() || null,
        current_grade_id: currentGradeId === '' ? null : Number(currentGradeId),
        father_name: null,
        father_phone: null,
        father_nin: null,
        mother_name: null,
        mother_phone: null,
        mother_nin: null,
        profile_picture_url: null,
        school_id: profile.school_id,
        registered_by: profile.user_id,
      });

      if (error) throw error;

      setSuccessMsg(`Student added: ${registration_id}`);
      await fetchStudents(profile.school_id);

      // reset
      setFirstName('');
      setLastName('');
      setDob('');
      setStatus('active');
      setGender('');
      setSchoolType('day');
      setGradeOfEntry('grade_1');
      setLinId('');
      setGuardianName('');
      setGuardianPhone('');
      setCurrentGradeId('');
      setShowAdd(false);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadCSVTemplate = () => {
    const headers = [
      'first_name',
      'last_name',
      'date_of_birth',
      'grade_of_entry',
      'current_status',
      'gender',
      'school_type',
      'lin_id',
      'guardian_name',
      'guardian_phone',
      'current_grade_id',
    ];
    const example = [
      'John',
      'Doe',
      '2016-05-21',
      'grade_1',
      'active',
      'Male',
      'day',
      '',
      'Jane Doe',
      '0700000000',
      '1',
    ];

    const csv = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const uploadCSV = async (file: File) => {
    resetAlerts();
    try {
      setCsvUploading(true);
      if (!profile?.school_id || !school) throw new Error('School not linked.');

      const rows = parseCSV(await file.text());
      if (!rows.length) throw new Error('CSV is empty.');

      const classNameToId = new Map<string, number>();
      classes.forEach(c => classNameToId.set(c.grade_name.toLowerCase(), c.id));

      const inserts: any[] = [];

      for (const r of rows) {
        const fn = (r.first_name || '').trim();
        const ln = (r.last_name || '').trim();
        const date_of_birth = (r.date_of_birth || '').trim();
        const grade_of_entry = (r.grade_of_entry || 'grade_1').trim();
        const current_status = (r.current_status || 'active').trim();

        if (!fn || !ln || !date_of_birth) continue;

        const yearOfEntry = computeYearOfEntry(grade_of_entry);
        const registration_id = await getNextRegistrationId(profile.school_id, school.school_name, yearOfEntry);

        let current_grade_id: number | null = null;
        const rawClass = (r.current_grade_id || '').trim();
        if (rawClass) {
          const maybe = Number(rawClass);
          if (!Number.isNaN(maybe)) current_grade_id = maybe;
          else current_grade_id = classNameToId.get(rawClass.toLowerCase()) ?? null;
        }

        inserts.push({
          registration_id,
          lin_id: (r.lin_id || '').trim() || null,
          first_name: fn,
          last_name: ln,
          date_of_birth,
          current_status,
          gender: (r.gender || '').trim() || null,
          school_type: (r.school_type || '').trim() || null,
          grade_of_entry,
          year_of_entry: yearOfEntry,
          guardian_name: (r.guardian_name || '').trim() || null,
          guardian_phone: (r.guardian_phone || '').trim() || null,
          current_grade_id,
          father_name: null,
          father_phone: null,
          father_nin: null,
          mother_name: null,
          mother_phone: null,
          mother_nin: null,
          profile_picture_url: null,
          school_id: profile.school_id,
          registered_by: profile.user_id,
        });
      }

      if (!inserts.length) throw new Error('No valid rows found.');

      const chunkSize = 200;
      for (let i = 0; i < inserts.length; i += chunkSize) {
        const chunk = inserts.slice(i, i + chunkSize);
        const { error } = await supabase.from('students').insert(chunk);
        if (error) throw error;
      }

      setSuccessMsg(`Imported ${inserts.length} students successfully.`);
      await fetchStudents(profile.school_id);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      setErrorMsg(e?.message || 'CSV upload failed');
    } finally {
      setCsvUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        <div className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 animate-pulse mx-auto flex items-center justify-center">
            <Users className="h-7 w-7 text-white" />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-600 animate-pulse">Loading student records...</p>
        </div>
      </div>
    );
  }

  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex flex-col">
        <Navbar userEmail={profile?.email ?? null} userName={profile?.full_name ?? 'User'} />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm p-8 text-center">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900 tracking-tight">Account Configuration Required</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Your profile is not linked to a school. Please configure school settings before accessing student records.
              </p>
              <button
                onClick={() => router.push('/settings')}
                className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                Go to Settings
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex flex-col font-sans">
      <Navbar userEmail={profile.email} userName={profile.full_name ?? 'User'} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto scroll-smooth">
          {/* Top header */}
          <div className="sticky top-0 z-20 bg-gradient-to-b from-white/95 via-white/90 to-white/80 backdrop-blur-xl border-b border-gray-200/60">
            <div className="px-6 lg:px-8 py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                      <Users className="h-7 w-7" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-center text-xs font-bold border-2 border-white">
                      {students.length}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Building2 className="h-4 w-4" />
                      <span className="font-semibold">{school.school_name}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Registry</h1>
                    <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                      Manage student records, track academic progress, and streamline admissions.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={downloadCSVTemplate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white shadow-sm hover:shadow-md hover:border-gray-400 transition-all duration-200 group"
                  >
                    <Download className="h-4 w-4 text-gray-600 group-hover:text-gray-800" />
                    <span className="text-sm font-medium text-gray-700">Template</span>
                  </button>

                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={csvUploading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 group"
                  >
                    {csvUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    ) : (
                      <Upload className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                    )}
                    <span className="text-sm font-medium text-blue-700">
                      {csvUploading ? 'Importing…' : 'Import CSV'}
                    </span>
                  </button>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) uploadCSV(f);
                    }}
                  />

                  <button
                    onClick={() => {
                      resetAlerts();
                      setShowAdd(v => !v);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <UserPlus className="h-4 w-4" />
                    {showAdd ? 'Close Form' : 'Add Student'}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                  icon={<Users className="h-5 w-5" />} 
                  label="Total Students" 
                  value={students.length}
                  trend="+12% this year"
                />
                <StatCard 
                  icon={<BookOpen className="h-5 w-5" />} 
                  label="Active Students" 
                  value={activeCount}
                />
                <StatCard 
                  icon={<GraduationCap className="h-5 w-5" />} 
                  label="Graduated" 
                  value={graduatedCount}
                  trend="+5% this term"
                />
              </div>

              {/* Alerts */}
              <div className="mt-6 space-y-3 max-w-3xl">
                {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}
                {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="px-6 lg:px-8 py-6">
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-white to-gray-50 border border-gray-200 shadow-sm p-5">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="relative max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search students by name, registration ID, or class…"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Filter className="h-4 w-4" />
                    <span className="font-medium">Filter by:</span>
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    {STATUS_CHOICES.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={classFilter}
                    onChange={e => setClassFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.grade_name}>
                        {c.grade_name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center bg-gray-100 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === 'grid' 
                          ? 'bg-white shadow-md text-blue-600' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                      }`}
                      title="Grid View"
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === 'list' 
                          ? 'bg-white shadow-md text-blue-600' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                      }`}
                      title="List View"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-sm font-bold border border-blue-200">
                    {filtered.length} results
                  </div>
                </div>
              </div>

              {/* Add panel */}
              {showAdd && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">Add New Student</div>
                        <div className="text-sm text-gray-600">Registration ID will be generated automatically</div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <Field label="First Name" required>
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="John"
                      />
                    </Field>

                    <Field label="Last Name" required>
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Doe"
                      />
                    </Field>

                    <Field label="Date of Birth" required>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          className="w-full pl-10 px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          value={dob}
                          onChange={e => setDob(e.target.value)}
                        />
                      </div>
                    </Field>

                    <Field label="Status" required>
                      <select
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                      >
                        {STATUS_CHOICES.map(s => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Gender">
                      <select
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                      >
                        <option value="">Select Gender</option>
                        {GENDER_CHOICES.map(g => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="School Type">
                      <select
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={schoolType}
                        onChange={e => setSchoolType(e.target.value)}
                      >
                        {SCHOOL_TYPE_CHOICES.map(s => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Grade of Entry" description="Format: grade_1, grade_2, etc.">
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={gradeOfEntry}
                        onChange={e => setGradeOfEntry(e.target.value)}
                        placeholder="grade_1"
                      />
                    </Field>

                    <Field label="LIN ID (Optional)">
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={linId}
                        onChange={e => setLinId(e.target.value)}
                        placeholder="Optional national ID"
                      />
                    </Field>

                    <Field label="Assign Class (Optional)">
                      <select
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={currentGradeId}
                        onChange={e => setCurrentGradeId(e.target.value ? Number(e.target.value) : '')}
                      >
                        <option value="">Not Assigned</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.grade_name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Guardian Name">
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={guardianName}
                        onChange={e => setGuardianName(e.target.value)}
                        placeholder="Parent/Guardian name"
                      />
                    </Field>

                    <Field label="Guardian Phone">
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={guardianPhone}
                        onChange={e => setGuardianPhone(e.target.value)}
                        placeholder="0700000000"
                      />
                    </Field>

                    <div className="md:col-span-3 flex items-center justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAdd(false)}
                        className="px-5 py-3 rounded-xl border border-gray-300 bg-white font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {submitting ? 'Saving…' : 'Save Student'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="mb-8">
              {filtered.length === 0 ? (
                <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 p-12 text-center shadow-sm">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                    <Users className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-gray-900">No students found</h3>
                  <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                    Try adjusting your search criteria or add a new student to the registry.
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filtered.map(s => (
                    <div
                      key={s.registration_id}
                      className="group relative rounded-2xl bg-gradient-to-b from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                    >
                      <div className="absolute top-4 right-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusPill(s.current_status)}`}>
                          {s.current_status}
                        </span>
                      </div>
                      
                      <div className="p-5">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                            {initials(s.first_name, s.last_name)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 leading-tight">
                              {s.first_name} {s.last_name}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 font-mono flex items-center gap-1.5">
                              <IdCard className="h-3.5 w-3.5" />
                              {s.registration_id}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              <GraduationCap className="h-3.5 w-3.5 text-gray-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Class</div>
                              <div className="font-semibold text-gray-900">{s.class?.grade_name ?? 'Not assigned'}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Calendar className="h-3.5 w-3.5 text-gray-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Date of Birth</div>
                              <div className="font-semibold text-gray-900">{s.date_of_birth}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Phone className="h-3.5 w-3.5 text-gray-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Guardian Phone</div>
                              <div className="font-semibold text-gray-900">{s.guardian_phone ?? '—'}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => router.push(`/students/${encodeURIComponent(s.registration_id)}`)}
                        className="w-full px-5 py-3.5 border-t border-gray-200 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group-hover:bg-blue-50/50"
                      >
                        View Profile
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-gray-700 uppercase tracking-wide">Student Registry</div>
                      <div className="text-xs font-medium text-gray-500">{filtered.length} students</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50/50">
                        <tr className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                          <th className="py-4 px-6 text-left">Student</th>
                          <th className="py-4 px-6 text-left">Registration</th>
                          <th className="py-4 px-6 text-left">Class</th>
                          <th className="py-4 px-6 text-left">Status</th>
                          <th className="py-4 px-6 text-left">Guardian</th>
                          <th className="py-4 px-6 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filtered.map(s => (
                          <tr 
                            key={s.registration_id} 
                            className="hover:bg-gray-50/60 transition-colors duration-150 group"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                                  {initials(s.first_name, s.last_name)}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {s.first_name} {s.last_name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">{s.date_of_birth}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-mono text-sm text-gray-800 bg-gray-50 px-3 py-1.5 rounded-lg inline-block">
                                {s.registration_id}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-sm font-semibold text-gray-800">
                                {s.class?.grade_name ?? '—'}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusPill(s.current_status)}`}>
                                {s.current_status}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-sm text-gray-700">{s.guardian_phone ?? '—'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <button
                                onClick={() => router.push(`/students/${encodeURIComponent(s.registration_id)}`)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 font-semibold hover:from-blue-100 hover:to-blue-200 border border-blue-200 transition-all duration-200 hover:shadow-sm"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
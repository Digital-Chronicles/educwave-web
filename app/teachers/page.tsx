'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  Search,
  Users,
  UserPlus,
  X,
  XCircle,
  CheckCircle,
  Grid,
  List,
  Eye,
  Edit,
  Download,
  Printer,
  Clock,
  Shield,
  Mail,
  KeyRound,
  User,
  GraduationCap,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';

type ProfileRow = {
  user_id: string; // uuid
  email: string | null;
  full_name: string | null;
  role: AppRole;
  school_id: string | null; // uuid
};

type SchoolRow = {
  id: string; // uuid
  school_name: string;
};

type TeacherRow = {
  registration_id: string;
  user_id: string; // uuid -> auth.users.id (and profiles.user_id)
  first_name: string;
  last_name: string;
  gender: string | null;
  year_of_entry: string;
  school_id: string;
  initials: string | null;
  created_at?: string;

  // merged profile fields
  email?: string | null;
  full_name?: string | null;
  role?: AppRole | null;
};

const ROLE_CHOICES: { value: AppRole; label: string }[] = [
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'PARENT', label: 'Parent' },
];

const GENDER_CHOICES = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

function getSchoolAbbr(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => (w[0] ? w[0].toUpperCase() : ''))
    .join('');
}

function rolePill(role?: string | null) {
  switch (role) {
    case 'ADMIN':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'ACADEMIC':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'TEACHER':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'FINANCE':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'STUDENT':
      return 'bg-slate-50 text-slate-700 border-slate-200';
    case 'PARENT':
      return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

/**
 * ✅ Safe fetch: teachers then profiles (NO embedded join required)
 */
async function fetchTeachersForSchool(schoolId: string): Promise<TeacherRow[]> {
  const { data: teachers, error: tErr } = await supabase
    .from('teachers')
    .select('registration_id,user_id,first_name,last_name,gender,year_of_entry,school_id,initials,created_at')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (tErr) throw new Error(tErr.message);
  if (!teachers?.length) return [];

  const userIds = Array.from(new Set((teachers as any[]).map(t => t.user_id).filter(Boolean)));
  const profilesById = new Map<string, ProfileRow>();

  if (userIds.length) {
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('user_id,email,full_name,role,school_id')
      .in('user_id', userIds);

    if (pErr) throw new Error(pErr.message);
    (profiles || []).forEach((p: any) => profilesById.set(p.user_id, p as ProfileRow));
  }

  return (teachers as any[]).map(t => {
    const p = profilesById.get(t.user_id);
    return {
      ...t,
      email: p?.email ?? null,
      full_name: p?.full_name ?? null,
      role: (p?.role as AppRole) ?? null,
    } as TeacherRow;
  });
}

export default function TeachersPage() {
  const router = useRouter();

  // auth
  const [authChecking, setAuthChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // profile + school
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  // list
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ui
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // modal
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  // step 1 (create auth user)
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [teacherRole, setTeacherRole] = useState<AppRole>('TEACHER');

  // step 2 (teacher row)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('male');
  const [yearOfEntry, setYearOfEntry] = useState(String(new Date().getFullYear()));

  // ---------------------------
  // AUTH CHECK + LOAD PROFILE
  // ---------------------------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace('/');
        return;
      }

      const u = session.user;
      setAuthUserId(u.id);
      setUserEmail(u.email ?? null);
      setUserName((u.user_metadata?.full_name as string) || 'User');
      setAuthChecking(false);
    })();
  }, [router]);

  // ---------------------------
  // LOAD profile -> school -> teachers
  // ---------------------------
  useEffect(() => {
    if (authChecking) return;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const { data: auth } = await supabase.auth.getUser();
        const u = auth.user;
        if (!u) throw new Error('Could not find authenticated user.');

        // profile row
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id,email,full_name,role,school_id')
          .eq('user_id', u.id)
          .maybeSingle();

        if (pErr) throw new Error(pErr.message);
        if (!p) throw new Error('Profile not found. Ensure your auth trigger (handle_new_user) is enabled.');

        setProfile(p as ProfileRow);

        if (!(p as ProfileRow).school_id) {
          setSchool(null);
          setTeachers([]);
          setErrorMsg('Your account is not linked to any school. Please configure your school in Settings.');
          return;
        }

        // school row
        const { data: sch, error: schErr } = await supabase
          .from('general_information')
          .select('id,school_name')
          .eq('id', (p as ProfileRow).school_id)
          .single();

        if (schErr || !sch) throw new Error(schErr?.message || 'Failed to load school info.');
        setSchool(sch as SchoolRow);

        // teachers
        const rows = await fetchTeachersForSchool(sch.id);
        setTeachers(rows);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to load module.');
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecking]);

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachers.filter(t => {
      if (q) {
        const hit =
          t.registration_id.toLowerCase().includes(q) ||
          t.first_name.toLowerCase().includes(q) ||
          t.last_name.toLowerCase().includes(q) ||
          (t.email || '').toLowerCase().includes(q) ||
          (t.full_name || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (roleFilter !== 'all' && (t.role || '') !== roleFilter) return false;
      return true;
    });
  }, [teachers, search, roleFilter]);

  // ---------------------------
  // ACTIONS
  // ---------------------------
  const handleView = (registrationId: string) => router.push(`/teachers/${encodeURIComponent(registrationId)}`);
  const handleEdit = (registrationId: string) => router.push(`/teachers/${encodeURIComponent(registrationId)}/edit`);

  const resetModal = () => {
    setStep(1);
    setEmail('');
    setPass('');
    setPass2('');
    setCreatedUserId(null);
    setTeacherRole('TEACHER');

    setFirstName('');
    setLastName('');
    setGender('male');
    setYearOfEntry(String(new Date().getFullYear()));
  };

  const closeModal = () => {
    resetModal();
    setOpen(false);
  };

  const openModal = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    resetModal();
    setOpen(true);
  };

  const downloadCSV = () => {
    const rows = filteredTeachers.map(t => ({
      registration_id: t.registration_id,
      first_name: t.first_name,
      last_name: t.last_name,
      gender: t.gender || '',
      year_of_entry: t.year_of_entry || '',
      email: t.email || '',
      role: t.role || '',
    }));

    const headers = Object.keys(
      rows[0] || { registration_id: '', first_name: '', last_name: '', gender: '', year_of_entry: '', email: '', role: '' }
    );

    const escape = (v: any) => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `teachers_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    const title = `${school?.school_name ?? 'School'} - Teachers List`;
    const rowsHtml = filteredTeachers
      .map(
        (t, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${t.registration_id}</td>
          <td>${t.first_name} ${t.last_name}</td>
          <td>${t.gender ?? '—'}</td>
          <td>${t.year_of_entry ?? '—'}</td>
          <td>${t.email ?? '—'}</td>
          <td>${t.role ?? '—'}</td>
        </tr>
      `
      )
      .join('');

    const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 14mm; }
          body { font-family: Arial, sans-serif; color: #111; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          p { margin: 0 0 10px; font-size: 12px; color: #444; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Reg ID</th><th>Name</th><th>Gender</th><th>Year</th><th>Email</th><th>Role</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="7">No teachers found.</td></tr>`}
          </tbody>
        </table>
        <script>
          window.focus();
          window.print();
          window.onafterprint = () => window.close();
        </script>
      </body>
    </html>
    `;

    const w = window.open('', '_blank', 'width=900,height=650');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // ---------------------------
  // STEP 1: Create auth user (server route with service role)
  // ---------------------------
  const step1CreateAuth = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!school?.id || !school.school_name) throw new Error('School not loaded.');
      if (!email.trim()) throw new Error('Email is required.');
      if (!pass || !pass2) throw new Error('Please enter and confirm password.');
      if (pass !== pass2) throw new Error('Passwords do not match.');
      if (pass.length < 6) throw new Error('Password must be at least 6 characters.');

      // ✅ your route must create auth user, and should set metadata role/full_name if you want
      const res = await fetch('/api/admin/create-teacher-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: pass,
          role: teacherRole, // should be app_role
          school_id: school.id, // ✅ uuid
        }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          'API returned HTML (route not found / server error). Ensure app/api/admin/create-teacher-user/route.ts exists and restart dev server.'
        );
      }

      if (!res.ok) throw new Error(data?.error || 'Failed to create auth user.');

      // we expect your API to return: { user_id: "uuid" }
      if (!data?.user_id) throw new Error('API did not return user_id.');

      setCreatedUserId(data.user_id);
      setStep(2);
      setSuccessMsg('Step 1 complete: Auth user created. Now create Teacher profile.');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to create auth user.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------
  // STEP 2: Create teacher row + ensure profile is linked to school
  // ---------------------------
  const step2CreateTeacher = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!createdUserId) throw new Error('Missing created user id from Step 1.');
      if (!profile?.school_id || !school?.id) throw new Error('Admin profile is not linked to a school.');
      if (!firstName.trim() || !lastName.trim()) throw new Error('First and last name are required.');
      if (String(yearOfEntry).length !== 4) throw new Error('Year of entry must be a 4-digit year.');

      // ✅ ensure new user's profile exists (trigger) and link school + role + name
      const { data: p2, error: p2Err } = await supabase
        .from('profiles')
        .select('user_id,email,full_name,role,school_id')
        .eq('user_id', createdUserId)
        .maybeSingle();

      if (p2Err) throw new Error(p2Err.message);

      // If trigger didn’t create it (rare), create it (may require RLS policy)
      if (!p2) {
        const { error: insPErr } = await supabase.from('profiles').insert({
          user_id: createdUserId,
          email: email.trim().toLowerCase(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          role: teacherRole,
          school_id: school.id,
        });
        if (insPErr) throw new Error(insPErr.message);
      } else {
        // update role/school/name to match
        const { error: upPErr } = await supabase
          .from('profiles')
          .update({
            school_id: school.id,
            role: teacherRole,
            full_name: `${firstName.trim()} ${lastName.trim()}`,
          })
          .eq('user_id', createdUserId);

        if (upPErr) throw new Error(upPErr.message);
      }

      // generate reg id
      const { count, error: cErr } = await supabase
        .from('teachers')
        .select('registration_id', { count: 'exact', head: true })
        .eq('school_id', school.id)
        .eq('year_of_entry', String(yearOfEntry));

      if (cErr) throw new Error(cErr.message);

      const seq = String((count ?? 0) + 1).padStart(3, '0');
      const abbr = getSchoolAbbr(school.school_name);
      const regId = `${abbr}/T/${yearOfEntry}/${seq}`;
      const initials = `${firstName.trim()[0] || ''}${lastName.trim()[0] || ''}`.toUpperCase();

      const { error: insErr } = await supabase.from('teachers').insert({
        registration_id: regId,
        user_id: createdUserId, // ✅ uuid
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender,
        year_of_entry: String(yearOfEntry),
        school_id: school.id,
        initials: initials || null,
        registered_by: authUserId, // ✅ uuid (your schema uses registered_by uuid)
      });

      if (insErr) throw new Error(insErr.message);

      setSuccessMsg(`Teacher created successfully! Reg ID: ${regId}`);

      // refresh list
      const rows = await fetchTeachersForSchool(school.id);
      setTeachers(rows);

      setTimeout(() => closeModal(), 900);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to create teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------
  // RENDER STATES
  // ---------------------------
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-orange-500 animate-pulse mb-4" />
          <p className="text-sm text-gray-600">Loading teachers module…</p>
        </div>
      </div>
    );
  }

  // Not linked
  if (!profile || !profile.school_id || !school) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        <Navbar userEmail={userEmail} userName={userName} />
        <div className="flex flex-1">
          <AppShell />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white">
                  <Shield size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">Account Configuration Required</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Your account is not linked to any school.
                    <span className="block mt-1 text-xs text-gray-500">
                      Fix: set <b>profiles.school_id</b> for this user in Settings (or admin panel).
                    </span>
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 flex items-start">
                  <XCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
                  <div className="text-sm text-red-700">{errorMsg}</div>
                </div>
              )}

              <button
                onClick={() => router.push('/settings')}
                className="mt-5 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                Go to Settings
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ---------------------------
  // MAIN UI
  // ---------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Navbar userEmail={userEmail} userName={userName} />

      <div className="flex flex-1 overflow-hidden">
        <AppShell />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Teacher Management</h1>
                <p className="text-gray-600 mt-1">
                  Manage teachers at <span className="font-medium text-blue-700">{school.school_name}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center text-sm text-gray-500">
                  <Clock size={16} className="mr-2" />
                  <span>{filteredTeachers.length} teachers</span>
                </div>

                <button
                  onClick={openModal}
                  className="inline-flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all"
                >
                  <UserPlus size={18} className="mr-2" />
                  Add Teacher
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 flex items-start">
                <XCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
                <div className="text-sm text-red-700">{errorMsg}</div>
              </div>
            )}

            {successMsg && (
              <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start">
                <CheckCircle className="h-5 w-5 text-emerald-600 mr-3 flex-shrink-0" />
                <div className="text-sm text-emerald-800">{successMsg}</div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, email, or registration ID..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value as any)}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Roles</option>
                  {ROLE_CHOICES.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg ${
                      viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    type="button"
                    title="Grid"
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg ${
                      viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    type="button"
                    title="List"
                  >
                    <List size={18} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={printList}
                  className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700"
                  title="Print"
                >
                  <Printer size={18} />
                </button>

                <button
                  type="button"
                  onClick={downloadCSV}
                  className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700"
                  title="Download CSV"
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTeachers.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
                    <Users size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {teachers.length === 0 ? 'No Teachers Found' : 'No Matching Teachers'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {search || roleFilter !== 'all' ? 'Try adjusting your search/filters.' : 'Start by adding your first teacher.'}
                  </p>
                  <button
                    onClick={openModal}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all"
                  >
                    <UserPlus size={18} className="mr-2" />
                    Add Teacher
                  </button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeachers.map(t => (
                  <div
                    key={t.registration_id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg mr-4">
                          {t.first_name?.[0] || 'T'}
                          {t.last_name?.[0] || ''}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {t.first_name} {t.last_name}
                          </h3>
                          <p className="text-sm text-gray-500 font-mono">{t.registration_id}</p>
                        </div>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${rolePill(t.role)}`}>
                        {t.role || 'TEACHER'}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500 inline-flex items-center gap-2">
                          <Mail size={14} /> Email
                        </span>
                        <span className="font-medium text-gray-900 truncate max-w-[220px]">{t.email || '—'}</span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500 inline-flex items-center gap-2">
                          <GraduationCap size={14} /> Year
                        </span>
                        <span className="font-medium text-gray-900">{t.year_of_entry}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <button
                        onClick={() => handleView(t.registration_id)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        type="button"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(t.registration_id)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
                        type="button"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Teacher
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Registration ID
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {filteredTeachers.map(t => (
                        <tr key={t.registration_id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm mr-3">
                                {t.first_name?.[0] || 'T'}
                                {t.last_name?.[0] || ''}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {t.first_name} {t.last_name}
                                </p>
                                <p className="text-xs text-gray-500">{t.year_of_entry}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-sm text-gray-900">{t.registration_id}</td>

                          <td className="py-3 px-4 text-sm truncate max-w-xs">{t.email || '—'}</td>

                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${rolePill(t.role)}`}>
                              {t.role || 'TEACHER'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleView(t.registration_id)}
                                className="p-2 rounded-xl hover:bg-blue-50 text-blue-600"
                                title="View"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleEdit(t.registration_id)}
                                className="p-2 rounded-xl hover:bg-gray-100 text-gray-600"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl mx-4 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Add Teacher</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Step {step} of 2 • <span className="font-medium text-blue-700">{school.school_name}</span>
                </p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-200 text-gray-600" type="button">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 text-sm text-blue-800">
                    <b>Step 1:</b> Create Supabase Auth user (via your API route).
                    <div className="text-xs text-blue-700 mt-1">
                      This will trigger creation of the <code className="px-1 bg-white rounded">profiles</code> row.
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Teacher Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="teacher@example.com"
                        type="email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <div className="relative">
                        <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={pass}
                          onChange={e => setPass(e.target.value)}
                          type="password"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                      <div className="relative">
                        <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={pass2}
                          onChange={e => setPass2(e.target.value)}
                          type="password"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Account Role</label>
                    <select
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={teacherRole}
                      onChange={e => setTeacherRole(e.target.value as AppRole)}
                    >
                      {ROLE_CHOICES.map(r => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={step1CreateAuth}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-60"
                    >
                      {submitting ? 'Creating...' : 'Continue'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
                    <b>Step 2:</b> Create Teacher profile (links to <code className="px-1 bg-white rounded">profiles.user_id</code>).
                    <div className="text-xs text-emerald-700 mt-1">User created: <b>{email.trim().toLowerCase()}</b></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">First Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          placeholder="John"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Gender</label>
                      <select
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                      >
                        {GENDER_CHOICES.map(g => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Year of Entry</label>
                      <input
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={yearOfEntry}
                        onChange={e => setYearOfEntry(e.target.value)}
                        type="number"
                        min={2000}
                        max={2035}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium bg-white hover:bg-gray-50"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={step2CreateTeacher}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium shadow-sm hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60"
                    >
                      {submitting ? 'Saving...' : 'Create Teacher'}
                    </button>
                  </div>
                </div>
              )}

              {/* Inline errors in modal */}
              {errorMsg && (
                <div className="mt-5 p-4 rounded-xl border border-red-200 bg-red-50 flex items-start">
                  <XCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
                  <div className="text-sm text-red-700">{errorMsg}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

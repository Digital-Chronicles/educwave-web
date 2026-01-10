'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Save,
  User,
  GraduationCap,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  school_id: string | null;
};

type SchoolRow = {
  id: string;
  school_name: string;
};

type TeacherRow = {
  registration_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  year_of_entry: string;
  school_id: string;
  initials: string | null;
  created_at?: string;

  // merged (best-effort)
  email?: string | null;
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

function getInitials(first: string, last: string) {
  const a = (first?.trim()?.[0] || '').toUpperCase();
  const b = (last?.trim()?.[0] || '').toUpperCase();
  return (a + b).trim() || null;
}

/**
 * Best-effort: fetch teacher profile info (email/role) if RLS allows profiles SELECT.
 * If blocked, still works (email/role will be null).
 */
async function fetchTeacherProfileBits(userId: string): Promise<{ email: string | null; role: AppRole | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email,role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return { email: null, role: null };
  return { email: (data as any).email ?? null, role: ((data as any).role as AppRole) ?? null };
}

export default function EditTeacherPage() {
  const router = useRouter();
  const params = useParams();

  const registrationIdRaw = (params?.registration_id ?? '') as string;
  const registrationId = decodeURIComponent(registrationIdRaw);

  // auth + base data
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [teacher, setTeacher] = useState<TeacherRow | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('male');
  const [yearOfEntry, setYearOfEntry] = useState(String(new Date().getFullYear()));
  const [accountRole, setAccountRole] = useState<AppRole>('TEACHER');

  const isAdmin = profile?.role === 'ADMIN';

  const canSubmit = useMemo(() => {
    if (!isAdmin) return false;
    if (!teacher) return false;
    if (!firstName.trim() || !lastName.trim()) return false;
    if (String(yearOfEntry).length !== 4) return false;
    return !submitting;
  }, [isAdmin, teacher, firstName, lastName, yearOfEntry, submitting]);

  // ---------------------------
  // AUTH + LOAD PROFILE + SCHOOL + TEACHER
  // ---------------------------
  useEffect(() => {
    (async () => {
      try {
        setAuthChecking(true);
        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        // session check
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          router.replace('/');
          return;
        }

        // get user
        const { data: authResp, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw new Error(authErr.message);
        if (!authResp.user) throw new Error('Could not find authenticated user.');

        const uid = authResp.user.id;

        // profile
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id,email,full_name,role,school_id')
          .eq('user_id', uid)
          .maybeSingle();

        if (pErr) throw new Error(pErr.message);
        if (!p) throw new Error('Profile not found. Ensure handle_new_user trigger creates profiles.');

        const prof = p as ProfileRow;
        setProfile(prof);

        if (!prof.school_id) throw new Error('Your account is not linked to a school. Set profiles.school_id first.');

        // school
        const { data: sch, error: schErr } = await supabase
          .from('general_information')
          .select('id,school_name')
          .eq('id', prof.school_id)
          .maybeSingle();

        if (schErr) throw new Error(schErr.message);
        if (!sch) {
          throw new Error(
            'Your profile is linked to a school, but you are not allowed to view that school record. Fix RLS on general_information (SELECT policy).'
          );
        }
        setSchool(sch as SchoolRow);

        // teacher row
        const { data: t, error: tErr } = await supabase
          .from('teachers')
          .select('registration_id,user_id,first_name,last_name,gender,year_of_entry,school_id,initials,created_at')
          .eq('registration_id', registrationId)
          .maybeSingle();

        if (tErr) throw new Error(tErr.message);
        if (!t) throw new Error('Teacher not found.');

        const teacherRow = t as TeacherRow;

        // safety: must belong to same school
        if (teacherRow.school_id !== prof.school_id) {
          throw new Error('Access denied. This teacher is not in your school.');
        }

        // merge profile bits best-effort
        const bits = await fetchTeacherProfileBits(teacherRow.user_id);

        const merged: TeacherRow = {
          ...teacherRow,
          email: bits.email,
          role: bits.role,
        };

        setTeacher(merged);

        // populate form
        setFirstName(merged.first_name ?? '');
        setLastName(merged.last_name ?? '');
        setGender((merged.gender as any) || 'male');
        setYearOfEntry(String(merged.year_of_entry ?? new Date().getFullYear()));
        setAccountRole((merged.role as AppRole) || 'TEACHER');
      } catch (e: any) {
        setTeacher(null);
        setErrorMsg(e?.message || 'Failed to load teacher.');
      } finally {
        setLoading(false);
        setAuthChecking(false);
      }
    })();
  }, [router, registrationId]);

  // ---------------------------
  // SAVE: Use server route (service role)
  // ---------------------------
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!isAdmin) throw new Error('Access denied. Only ADMIN can edit teachers.');
      if (!school?.id) throw new Error('School not loaded.');
      if (!teacher) throw new Error('Teacher not loaded.');

      if (!firstName.trim() || !lastName.trim()) throw new Error('First and last name are required.');
      if (String(yearOfEntry).length !== 4) throw new Error('Year of entry must be a 4-digit year.');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Missing access token. Please sign in again.');

      const payload = {
        registration_id: teacher.registration_id,
        school_id: school.id,
        user_id: teacher.user_id, // helpful for API
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender,
        year_of_entry: String(yearOfEntry),
        initials: getInitials(firstName, lastName),
        role: accountRole, // profile role update (API should handle)
      };

      const res = await fetch('/api/admin/update-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('API returned invalid response. Ensure /api/admin/update-teacher route exists.');
      }

      if (!res.ok) throw new Error(data?.error || 'Failed to update teacher.');

      // Update local view
      const updated: TeacherRow = {
        ...teacher,
        first_name: payload.first_name,
        last_name: payload.last_name,
        gender: payload.gender,
        year_of_entry: payload.year_of_entry,
        initials: payload.initials,
        role: payload.role,
      };
      setTeacher(updated);

      setSuccessMsg('Teacher updated successfully.');
      setTimeout(() => router.push(`/teachers/${encodeURIComponent(teacher.registration_id)}`), 800);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------
  // RENDER
  // ---------------------------
  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-orange-500 animate-pulse mb-4" />
          <p className="text-sm text-gray-600">Loading teacher…</p>
        </div>
      </div>
    );
  }

  // error / not loaded
  if (!profile || !school || !teacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        <Navbar />
        <div className="flex flex-1">
          <AppShell />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white">
                  <Shield size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">Cannot Continue</h3>
                  <p className="text-sm text-gray-600 mt-1">{errorMsg || 'Teacher record not available.'}</p>
                </div>
              </div>

              <button
                onClick={() => router.push('/teachers')}
                className="mt-5 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                Back to Teachers
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // non-admin block
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        <Navbar />
        <div className="flex flex-1">
          <AppShell />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white">
                  <Shield size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">Access Denied</h3>
                  <p className="text-sm text-gray-600 mt-1">Only ADMIN can edit teachers.</p>
                </div>
              </div>

              <button
                onClick={() => router.push(`/teachers/${encodeURIComponent(teacher.registration_id)}`)}
                className="mt-5 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                Back to Teacher
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <AppShell />

        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
              <div>
                <button
                  type="button"
                  onClick={() => router.push(`/teachers/${encodeURIComponent(teacher.registration_id)}`)}
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Teacher
                </button>

                <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900">Edit Teacher</h1>
                <p className="text-gray-600 mt-1">
                  <span className="font-mono text-sm">{teacher.registration_id}</span> •{' '}
                  <span className="font-medium text-blue-700">{school.school_name}</span>
                </p>
              </div>

              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => {
                  // trigger form submission via event
                  const el = document.getElementById('teacher-edit-form') as HTMLFormElement | null;
                  el?.requestSubmit();
                }}
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium shadow-sm hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
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

          {/* Form */}
          <div className="p-6">
            <div className="max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <h2 className="font-bold text-gray-900">Teacher Details</h2>
                <p className="text-sm text-gray-600 mt-1">Update teacher bio details and account role.</p>
              </div>

              <form id="teacher-edit-form" onSubmit={handleSave} className="p-6 space-y-6">
                {/* Read-only account bits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Account Email</p>
                    <p className="text-sm font-medium text-gray-900 break-all">{teacher.email || '— (RLS blocked / unknown)'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">User ID</p>
                    <p className="text-sm font-medium text-gray-900 break-all">{teacher.user_id}</p>
                  </div>
                </div>

                {/* Names */}
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

                {/* Gender + Year */}
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
                    <div className="relative">
                      <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={yearOfEntry}
                        onChange={e => setYearOfEntry(e.target.value)}
                        type="number"
                        min={2000}
                        max={2035}
                      />
                    </div>
                  </div>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Account Role</label>
                  <select
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={accountRole}
                    onChange={e => setAccountRole(e.target.value as AppRole)}
                  >
                    {ROLE_CHOICES.map(r => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    This updates the user’s role in <b>profiles</b> (handled by your API route).
                  </p>
                </div>

                {/* Mobile Save */}
                <div className="md:hidden pt-2">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium shadow-sm hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                    {submitting ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700">
                  <b>Note:</b> This page calls <b>/api/admin/update-teacher</b> using service-role on the server to avoid RLS issues.
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

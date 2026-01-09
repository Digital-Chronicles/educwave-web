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
 * NOTE: profiles select may be restricted by RLS — if so, we still return teachers without email/role
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

    // If profiles are blocked by RLS, don’t kill the page — just return teachers without merged fields
    if (!pErr) (profiles || []).forEach((p: any) => profilesById.set(p.user_id, p as ProfileRow));
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

  // ---------------------------
  // AUTH CHECK
  // ---------------------------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace('/');
        return;
      }

      setAuthChecking(false);
    })();
  }, [router]);

  // ---------------------------
  // LOAD profile -> school -> teachers (RLS-SAFE)
  // ---------------------------
  useEffect(() => {
    if (authChecking) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw new Error(authErr.message);
        if (!auth.user) throw new Error('Could not find authenticated user.');

        const u = auth.user;

        // profile
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id,email,full_name,role,school_id')
          .eq('user_id', u.id)
          .maybeSingle();

        if (pErr) throw new Error(pErr.message);
        if (!p) throw new Error('Profile not found. Ensure your auth trigger (handle_new_user) is enabled.');

        const prof = p as ProfileRow;
        setProfile(prof);

        // must be linked
        if (!prof.school_id) {
          setSchool(null);
          setTeachers([]);
          setErrorMsg('Your account is not linked to any school. Please configure your school in Settings.');
          return;
        }

        // school (✅ maybeSingle prevents “Cannot coerce…”)
        const { data: sch, error: schErr } = await supabase
          .from('general_information')
          .select('id,school_name')
          .eq('id', prof.school_id)
          .maybeSingle();

        if (schErr) throw new Error(schErr.message);

        // If RLS blocks reading general_information, sch will be null
        if (!sch) {
          setSchool(null);
          setTeachers([]);
          setErrorMsg(
            'Your profile is linked to a school, but you are not allowed to view that school record. Fix RLS on general_information (SELECT policy).'
          );
          return;
        }

        setSchool(sch as SchoolRow);

        const rows = await fetchTeachersForSchool((sch as SchoolRow).id);
        setTeachers(rows);
      } catch (e: any) {
        setSchool(null);
        setTeachers([]);
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

  const goToNewTeacher = () => router.push('/teachers/new');

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
      rows[0] || {
        registration_id: '',
        first_name: '',
        last_name: '',
        gender: '',
        year_of_entry: '',
        email: '',
        role: '',
      }
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

  // Not linked OR cannot read school
  if (!profile || !profile.school_id || !school) {
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
                  <h3 className="text-lg font-bold text-gray-900">Account Configuration Required</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Your account is not linked to any school (or you can’t access the school record).
                    <span className="block mt-1 text-xs text-gray-500">
                      Fix: set <b>profiles.school_id</b> in Settings (or admin panel) and ensure you have SELECT access on{' '}
                      <b>general_information</b>.
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
      <Navbar />

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
                  onClick={goToNewTeacher}
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
                    onClick={goToNewTeacher}
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
                                type="button"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleEdit(t.registration_id)}
                                className="p-2 rounded-xl hover:bg-gray-100 text-gray-600"
                                title="Edit"
                                type="button"
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
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import {
  ArrowLeft,
  Building2,
  Mail,
  Shield,
  UserCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Settings,
  LogOut,
  Calendar,
  User,
  Key,
  ChevronRight,
  Edit,
  MoreVertical,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  school_id: string | null;
  created_at?: string | null;
};

type SchoolRow = {
  id: string;
  school_name: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRoleColor(role: string) {
  switch (role?.toLowerCase()) {
    case 'admin':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    case 'teacher':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    case 'staff':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || '');

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [viewer, setViewer] = useState<ProfileRow | null>(null);
  const [viewerSchool, setViewerSchool] = useState<SchoolRow | null>(null);

  const [target, setTarget] = useState<ProfileRow | null>(null);
  const [targetSchool, setTargetSchool] = useState<SchoolRow | null>(null);

  const [copied, setCopied] = useState(false);

  const titleName = useMemo(() => {
    if (!target) return 'User';
    return target.full_name?.trim() || target.email?.trim() || 'User';
  }, [target]);

  const roleLabel = useMemo(
    () => (target?.role || 'STUDENT').toString().toUpperCase(),
    [target]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        const authUser = authData?.user;
        if (!authUser) {
          setErr('You are not logged in.');
          return;
        }

        const { data: v, error: vErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id, created_at')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (vErr) throw vErr;
        if (!v) {
          setErr('Your profile is missing. Please contact admin.');
          return;
        }

        let vSchool: SchoolRow | null = null;
        if (v.school_id) {
          const { data: s, error: sErr } = await supabase
            .from('general_information')
            .select('id, school_name')
            .eq('id', v.school_id)
            .maybeSingle();
          if (!sErr && s) vSchool = s;
        }

        const { data: t, error: tErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id, created_at')
          .eq('user_id', id)
          .maybeSingle();

        if (tErr) throw tErr;
        if (!t) {
          setErr('User not found.');
          return;
        }

        if (!v.school_id || !t.school_id || v.school_id !== t.school_id) {
          setErr("Access denied. You can only view users from your school.");
          return;
        }

        let tSchool: SchoolRow | null = null;
        if (t.school_id) {
          const { data: s2, error: s2Err } = await supabase
            .from('general_information')
            .select('id, school_name')
            .eq('id', t.school_id)
            .maybeSingle();
          if (!s2Err && s2) tSchool = s2;
        }

        if (cancelled) return;

        setViewer(v as ProfileRow);
        setViewerSchool(vSchool);
        setTarget(t as ProfileRow);
        setTargetSchool(tSchool);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="sticky top-0 z-40 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="py-4">
            <Navbar />
            
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                >
                  <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
                  Back
                </button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  User Profile
                </h1>
              </div>

              <button
                onClick={() => router.push('/users')}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg"
              >
                <ExternalLink size={18} />
                All Users
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mt-6">
          {loading && (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-600 dark:border-t-blue-500" />
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  Loading user profile...
                </p>
              </div>
            </div>
          )}

          {!loading && err && (
            <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-8 shadow-sm dark:border-red-900/40 dark:from-red-950/20 dark:to-rose-950/20">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                  <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
                    Unable to load user profile
                  </h3>
                  <p className="mt-2 text-red-700 dark:text-red-300">{err}</p>
                  <button
                    onClick={() => router.push('/users')}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    <ArrowLeft size={16} />
                    Return to Users
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !err && target && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Column - Profile Overview */}
              <div className="lg:col-span-2 space-y-6">
                {/* Profile Header Card */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-lg dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
                  <div className="relative p-8">
                    <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg" />
                          <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg dark:bg-slate-800">
                            <UserCircle2 className="text-blue-600 dark:text-blue-400" size={20} />
                          </div>
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {titleName}
                          </h1>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                              <Building2 size={16} />
                              {targetSchool?.school_name || 'Unassigned School'}
                            </div>
                            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                              <Mail size={16} />
                              {target.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 rounded-full border px-4 py-2 ${getRoleColor(target.role || '')}`}>
                        <Shield size={16} />
                        <span className="text-sm font-semibold">{roleLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 gap-4 border-t border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                          <User className="text-blue-600 dark:text-blue-400" size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">User ID</p>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">
                              {target.user_id.slice(0, 8)}...
                            </p>
                            <button
                              onClick={copyId}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                                copied
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                              }`}
                            >
                              {copied ? <Check size={14} /> : <Copy size={14} />}
                              {copied ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40">
                          <Shield className="text-purple-600 dark:text-purple-400" size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Role</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                            {roleLabel}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                          <Calendar className="text-amber-600 dark:text-amber-400" size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Created</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                            {formatDate(target.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
                          <Key className="text-green-600 dark:text-green-400" size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</p>
                          <p className="mt-1 text-sm font-semibold text-green-600 dark:text-green-400">
                            Active
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Information */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
                    Detailed Information
                  </h2>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Contact Details
                      </h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Email Address</p>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                            {target.email || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Full Name</p>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                            {target.full_name || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        School Information
                      </h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">School Name</p>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                            {targetSchool?.school_name || 'Not assigned'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">School ID</p>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                            {target.school_id || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Quick Actions & Viewer Info */}
              <div className="space-y-6">
                {/* Viewer Info Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
                    Your Account
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-slate-800 dark:from-blue-950/20 dark:to-indigo-950/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                            Current School
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                            {viewerSchool?.school_name || '—'}
                          </p>
                        </div>
                        <Building2 className="text-blue-500 dark:text-blue-400" size={20} />
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                          Your Role
                        </p>
                        <div className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${getRoleColor(viewer?.role || '')}`}>
                          <Shield size={14} />
                          <span className="text-sm font-semibold">
                            {(viewer?.role || 'STUDENT').toString().toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => router.push('/settings')}
                        className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-3">
                          <Settings size={18} />
                          Account Settings
                        </span>
                        <ChevronRight size={18} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
                      </button>

                      <button
                        onClick={async () => {
                          await supabase.auth.signOut();
                          router.replace('/');
                        }}
                        className="group flex w-full items-center justify-between rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-sm font-semibold text-red-700 transition-all hover:from-red-100 hover:to-rose-100 dark:border-red-900/40 dark:from-red-950/20 dark:to-rose-950/20 dark:text-red-300 dark:hover:from-red-950/40 dark:hover:to-rose-950/40"
                      >
                        <span className="flex items-center gap-3">
                          <LogOut size={18} />
                          Sign Out
                        </span>
                        <ChevronRight size={18} className="text-red-400 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
                    Quick Actions
                  </h2>
                  <div className="space-y-2">
                    <button className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg">
                      <span className="flex items-center justify-center gap-2">
                        <Edit size={18} />
                        Edit Profile
                      </span>
                    </button>
                    <button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                      Send Message
                    </button>
                    <button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                      Reset Password
                    </button>
                  </div>
                </div>

                {/* Help Card */}
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm dark:border-slate-800 dark:from-slate-900/50 dark:to-slate-900">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Need Help?
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    If you need edit permissions or encounter issues, ensure your role and school assignments are correct in the system settings.
                  </p>
                  <button className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                    Contact Support →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>Profile last updated • {formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft,
  Check,
  X,
  Mail,
  Lock,
  User,
  GraduationCap,
  Building,
  Save,
  Plus,
  Link2,
  Eye,
  EyeOff,
  Calendar,
  ChevronDown,
  Shield,
  Sparkles,
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

export default function NewTeacherPage() {
  const router = useRouter();

  // auth/profile/school
  const [authChecking, setAuthChecking] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // form fields
  const [email, setEmail] = useState('');
  const [createNewUser, setCreateNewUser] = useState(true);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [teacherRole, setTeacherRole] = useState<AppRole>('TEACHER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('male');
  const [yearOfEntry, setYearOfEntry] = useState(String(new Date().getFullYear()));

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (!firstName.trim() || !lastName.trim()) return false;
    if (String(yearOfEntry).length !== 4) return false;

    if (createNewUser) {
      if (!password || !password2) return false;
      if (password !== password2) return false;
      if (password.length < 6) return false;
    }
    return true;
  }, [email, firstName, lastName, yearOfEntry, createNewUser, password, password2]);

  // Load session, profile, and school
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.replace('/');
          return;
        }

        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error('Could not find user.');

        // Get profile
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id,email,full_name,role,school_id')
          .eq('user_id', auth.user.id)
          .maybeSingle();

        if (pErr) throw new Error(pErr.message);
        if (!p) throw new Error('Profile not found.');

        const prof = p as ProfileRow;

        // Only ADMIN can create teachers
        if (prof.role !== 'ADMIN') {
          throw new Error('Access denied. Only ADMIN can create teachers.');
        }

        setProfile(prof);

        if (!prof.school_id) {
          throw new Error('Your account is not linked to a school.');
        }

        // Get school
        const { data: sch } = await supabase
          .from('general_information')
          .select('id,school_name')
          .eq('id', prof.school_id)
          .maybeSingle();

        if (!sch) throw new Error('School not found.');
        setSchool(sch as SchoolRow);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to load.');
      } finally {
        setLoading(false);
        setAuthChecking(false);
      }
    })();
  }, [router]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!profile || profile.role !== 'ADMIN') {
        throw new Error('Access denied.');
      }

      if (!school?.id) throw new Error('School not loaded.');

      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw new Error('Email is required.');
      if (!firstName.trim() || !lastName.trim()) throw new Error('Name is required.');
      if (String(yearOfEntry).length !== 4) throw new Error('Year must be 4 digits.');

      if (createNewUser) {
        if (password !== password2) throw new Error('Passwords do not match.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Please sign in again.');

      const res = await fetch('/api/admin/upsert-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: createNewUser ? password : null,
          role: teacherRole,
          school_id: school.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          gender,
          year_of_entry: String(yearOfEntry),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save teacher.');

      setSuccessMsg(`Teacher created successfully! Registration ID: ${data?.registration_id}`);

      setTimeout(() => {
        if (data?.registration_id) {
          router.push(`/teachers/${encodeURIComponent(data.registration_id)}`);
        } else {
          router.push('/teachers');
        }
      }, 1500);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-orange-400 animate-pulse mb-4" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile || !school) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex flex-col">
        <Navbar />
        <div className="flex flex-1">
          <AppShell />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <div className="text-center">
                <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white mb-4">
                  <Shield size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-600 mb-6">{errorMsg || 'Account not configured.'}</p>
                <button
                  onClick={() => router.push('/teachers')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
                >
                  Back to Teachers
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <AppShell />

        <main className="flex-1 overflow-y-auto">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white">
            <div className="px-6 py-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => router.push('/teachers')}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h1 className="text-2xl font-semibold">Add New Teacher</h1>
                      <div className="flex items-center text-blue-100 text-sm mt-1">
                        <Building size={16} className="mr-2" />
                        {school.school_name}
                        <span className="mx-2">•</span>
                        <span className="px-2 py-0.5 bg-white/20 rounded-md text-xs">ADMIN</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center space-x-2"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <GraduationCap size={18} />
                        <span>Create Teacher</span>
                        <Sparkles size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-w-7xl mx-auto">
            {/* Status Messages */}
            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X size={14} className="text-red-600" />
                </div>
                <div className="text-red-800">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{errorMsg}</p>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-emerald-600" />
                </div>
                <div className="text-emerald-800">
                  <p className="font-medium">Success!</p>
                  <p className="text-sm">{successMsg}</p>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Panel - Options */}
              <div className="lg:col-span-1 space-y-6">
                {/* Account Type Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 text-lg">Account Type</h3>
                  <div className="space-y-4">
                    <button
                      onClick={() => setCreateNewUser(true)}
                      className={`w-full p-5 rounded-xl border-2 transition-all ${
                        createNewUser
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                          createNewUser 
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Plus size={24} />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">New Account</p>
                          <p className="text-sm text-gray-500 mt-1">Create new user with password</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setCreateNewUser(false)}
                      className={`w-full p-5 rounded-xl border-2 transition-all ${
                        !createNewUser
                          ? 'border-orange-500 bg-orange-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                          !createNewUser 
                            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Link2 size={24} />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">Existing Account</p>
                          <p className="text-sm text-gray-500 mt-1">Link by email address</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 text-lg flex items-center">
                    <Sparkles size={20} className="mr-2 text-blue-600" />
                    How It Works
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-700">1</span>
                      </div>
                      <span className="text-sm text-gray-700">Enter teacher's email address</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-700">2</span>
                      </div>
                      <span className="text-sm text-gray-700">System checks existing accounts</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-700">3</span>
                      </div>
                      <span className="text-sm text-gray-700">Creates or links account automatically</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Panel - Form */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900 text-xl">Teacher Information</h2>
                    <p className="text-gray-500 text-sm mt-1">Fill in the details below</p>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* Email Section */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="teacher@school.edu"
                          type="email"
                          className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <p className="text-xs text-gray-500">This will be used as the login username</p>
                    </div>

                    {/* Password Section (Conditional) */}
                    {createNewUser && (
                      <div className="space-y-6 p-5 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl border border-blue-200">
                        <h4 className="font-semibold text-gray-900">Set Password</h4>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">
                              Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                              <input
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                type={showPassword ? "text" : "password"}
                                className="w-full pl-11 pr-10 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                              </button>
                            </div>
                            {password && (
                              <div className={`text-xs ${
                                password.length >= 6 ? 'text-emerald-600' : 'text-orange-600'
                              }`}>
                                {password.length >= 6 ? '✓ Password meets requirements' : 'Password must be at least 6 characters'}
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">
                              Confirm Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                              <input
                                value={password2}
                                onChange={e => setPassword2(e.target.value)}
                                type="password"
                                className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            {password2 && password !== password2 && (
                              <div className="text-xs text-red-600">✗ Passwords do not match</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Name Section */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            placeholder="John"
                            className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            placeholder="Doe"
                            className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Gender & Year Section */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">
                          Gender
                        </label>
                        <div className="relative">
                          <select
                            value={gender}
                            onChange={e => setGender(e.target.value)}
                            className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                          >
                            {GENDER_CHOICES.map(g => (
                              <option key={g.value} value={g.value}>
                                {g.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">
                          Year of Entry <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            value={yearOfEntry}
                            onChange={e => setYearOfEntry(e.target.value)}
                            type="number"
                            min="2000"
                            max="2035"
                            className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        {yearOfEntry && (parseInt(yearOfEntry) < 2000 || parseInt(yearOfEntry) > 2035) && (
                          <div className="text-xs text-orange-600">Please enter a valid year (2000-2035)</div>
                        )}
                      </div>
                    </div>

                    {/* Role Section */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900">
                        Account Role
                      </label>
                      <div className="relative">
                        <select
                          value={teacherRole}
                          onChange={e => setTeacherRole(e.target.value as AppRole)}
                          className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                        >
                          {ROLE_CHOICES.map(r => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      <p className="text-xs text-gray-500">
                        Most teachers should be assigned the <span className="font-semibold">TEACHER</span> role
                      </p>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => router.push('/teachers')}
                        className="px-5 py-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <div className="flex items-center space-x-3">
                        {!canSubmit && (
                          <span className="text-sm text-gray-500">Please fill all required fields</span>
                        )}
                        <button
                          onClick={handleSubmit}
                          disabled={!canSubmit || submitting}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center space-x-2"
                        >
                          {submitting ? (
                            <>
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save size={18} />
                              <span>Create Teacher Account</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
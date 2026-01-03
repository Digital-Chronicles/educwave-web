'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';

type Role = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';

type ProfileRow = {
  user_id: string; // uuid from auth.users.id
  email: string | null;
  full_name: string | null;
  role: Role;
  school_id: string | null; // ✅ uuid (matches general_information.id)
  created_at?: string;
  updated_at?: string;
};

type SchoolRow = {
  id: string; // ✅ uuid
  school_name: string;
  school_badge: string | null;
  box_no: string | null;
  location: string;
  contact_number: string;
  email: string;
  website: string | null;
  established_year: number | null;
  registered_by_user_id: string | null; // uuid
  created_at: string;
  updated_at: string;
};

function safeNameFromMeta(meta: any) {
  const full =
    meta?.full_name ||
    meta?.name ||
    [meta?.first_name, meta?.last_name].filter(Boolean).join(' ') ||
    null;

  return typeof full === 'string' && full.trim().length > 0 ? full.trim() : null;
}

export default function SettingsPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  // form state
  const [schoolName, setSchoolName] = useState('');
  const [boxNo, setBoxNo] = useState('');
  const [location, setLocation] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      !!schoolName &&
      !!location &&
      !!contactNumber &&
      !!schoolEmail &&
      !saving
    );
  }, [schoolName, location, contactNumber, schoolEmail, saving]);

  // 1) Auth check
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        router.replace('/');
        return;
      }

      setUserEmail(session.user.email ?? null);
      setUserId(session.user.id);
      setAuthChecking(false);
    };

    run();
  }, [router]);

  // 2) Load or auto-create Profile, then load School
  useEffect(() => {
    if (authChecking) return;

    const loadAll = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) throw new Error(userErr.message);
        if (!user) throw new Error('Could not find authenticated user.');

        const uid = user.id;
        const email = user.email ?? null;

        setUserEmail(email);
        setUserId(uid);

        // --- A) PROFILE: fetch; if missing, auto-create ---
        const { data: existingProfile, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id, created_at, updated_at')
          .eq('user_id', uid)
          .maybeSingle();

        if (pErr) throw new Error(`Error loading profile: ${pErr.message}`);

        let profileRow: ProfileRow;

        if (!existingProfile) {
          const fullName = safeNameFromMeta(user.user_metadata);

          const { data: insertedProfile, error: insPErr } = await supabase
            .from('profiles')
            .insert({
              user_id: uid,
              email,
              full_name: fullName,
              role: 'TEACHER',
              school_id: null,
            })
            .select('user_id, email, full_name, role, school_id, created_at, updated_at')
            .single();

          if (insPErr || !insertedProfile) {
            throw new Error(
              insPErr?.message ||
                'Failed to auto-create profile in profiles table. Check RLS/policies.'
            );
          }

          profileRow = insertedProfile as ProfileRow;
        } else {
          profileRow = existingProfile as ProfileRow;
        }

        setProfile(profileRow);

        // --- B) SCHOOL: load if profile has school_id ---
        if (profileRow.school_id) {
          const { data: schoolRow, error: sErr } = await supabase
            .from('general_information')
            .select(
              'id, school_name, school_badge, box_no, location, contact_number, email, website, established_year, registered_by_user_id, created_at, updated_at'
            )
            .eq('id', profileRow.school_id)
            .single();

          if (sErr) throw new Error(`Error loading school: ${sErr.message}`);

          const s = schoolRow as SchoolRow;
          setSchool(s);

          // populate form
          setSchoolName(s.school_name);
          setBoxNo(s.box_no ?? '');
          setLocation(s.location);
          setContactNumber(s.contact_number);
          setSchoolEmail(s.email);
          setWebsite(s.website ?? '');
          setEstablishedYear(s.established_year ? String(s.established_year) : '');
        } else {
          setSchool(null);
        }
      } catch (e: any) {
        setErrorMsg(e?.message || 'Unexpected error while loading settings.');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [authChecking]);

  const handleSaveSchool = async (e: FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (!profile || !userId) throw new Error('Profile not loaded yet.');

      // validation
      if (!schoolName || !location || !contactNumber || !schoolEmail) {
        throw new Error('Please fill in all required fields.');
      }

      const yearNum =
        establishedYear.trim().length > 0 ? Number(establishedYear) : null;

      if (establishedYear.trim().length > 0 && (yearNum === null || Number.isNaN(yearNum))) {
        throw new Error('Established year must be a valid number.');
      }

      if (yearNum !== null) {
        const y = new Date().getFullYear();
        if (yearNum < 1800 || yearNum > y) throw new Error(`Established year must be between 1800 and ${y}.`);
      }

      // UPDATE school
      if (school?.id) {
        const { error: updErr } = await supabase
          .from('general_information')
          .update({
            school_name: schoolName,
            box_no: boxNo || null,
            location,
            contact_number: contactNumber,
            email: schoolEmail,
            website: website || null,
            established_year: yearNum,
            // updated_at trigger exists, but setting explicitly is ok too:
            updated_at: new Date().toISOString(),
          })
          .eq('id', school.id);

        if (updErr) throw new Error(updErr.message);

        setSchool(prev =>
          prev
            ? {
                ...prev,
                school_name: schoolName,
                box_no: boxNo || null,
                location,
                contact_number: contactNumber,
                email: schoolEmail,
                website: website || null,
                established_year: yearNum,
                updated_at: new Date().toISOString(),
              }
            : prev
        );

        setSuccessMsg('School settings updated successfully.');
        return;
      }

      // INSERT new school (only if profile has none)
      if (profile.school_id) {
        throw new Error('Your profile is already linked to a school. You cannot create another.');
      }

      // optional extra guard: user registers only one school
      const { data: already, error: alreadyErr } = await supabase
        .from('general_information')
        .select('id')
        .eq('registered_by_user_id', userId)
        .limit(1);

      if (alreadyErr) throw new Error(alreadyErr.message);
      if (already && already.length > 0) {
        throw new Error('You have already registered a school. You can only register one school.');
      }

      const { data: newSchool, error: insErr } = await supabase
        .from('general_information')
        .insert({
          school_name: schoolName,
          box_no: boxNo || null,
          location,
          contact_number: contactNumber,
          email: schoolEmail,
          website: website || null,
          established_year: yearNum,
          registered_by_user_id: userId,
        })
        .select(
          'id, school_name, school_badge, box_no, location, contact_number, email, website, established_year, registered_by_user_id, created_at, updated_at'
        )
        .single();

      if (insErr || !newSchool) throw new Error(insErr?.message || 'Failed to create school.');

      const createdSchool = newSchool as SchoolRow;
      setSchool(createdSchool);

      // Link school to profile
      const { data: updatedProfile, error: linkErr } = await supabase
        .from('profiles')
        .update({ school_id: createdSchool.id })
        .eq('user_id', userId)
        .select('user_id, email, full_name, role, school_id, created_at, updated_at')
        .single();

      if (linkErr || !updatedProfile) {
        throw new Error(linkErr?.message || 'School created, but linking to profile failed.');
      }

      setProfile(updatedProfile as ProfileRow);
      setSuccessMsg('School created and linked to your profile.');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Unexpected error while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-sm">Checking your session…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Remove the userEmail prop from Navbar */}
      <Navbar />

      <div className="flex flex-1">
        <AppShell />

        <main className="flex-1 px-4 md:px-6 py-4 md:py-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Settings</h1>
              <p className="text-xs text-slate-500">
                Your profile is auto-created on first login. Then you can create one school and link it to your profile.
              </p>
              {userEmail && (
                <p className="text-xs text-slate-400 mt-1">
                  Signed in as: <span className="font-medium text-slate-600">{userEmail}</span>
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {successMsg}
              </div>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Profile */}
              <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4">
                <h2 className="text-sm font-semibold text-slate-900 mb-2">Profile</h2>

                {loading && !profile ? (
                  <p className="text-xs text-slate-400">Loading profile…</p>
                ) : profile ? (
                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="text-slate-500">Auth User ID</p>
                      <p className="font-medium text-slate-900 break-all">{profile.user_id}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Email</p>
                      <p className="font-medium text-slate-900">{profile.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Full Name</p>
                      <p className="font-medium text-slate-900">{profile.full_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-0.5">Role</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                        {profile.role}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-0.5">Linked School</p>
                      <p className="text-slate-900 text-xs">
                        {school ? school.school_name : profile.school_id ? `School ID: ${profile.school_id}` : 'Not linked yet'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No profile loaded.</p>
                )}
              </div>

              {/* School Settings */}
              <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">School Settings</h2>
                    <p className="text-[11px] text-slate-500">
                      {school ? 'Update your school profile details.' : 'Create your school profile.'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveSchool} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label htmlFor="school_name" className="block font-medium text-slate-700">
                      School Name *
                    </label>
                    <input
                      id="school_name"
                      type="text"
                      value={schoolName}
                      onChange={e => setSchoolName(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      placeholder="e.g. Great Pearl Academy"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="box_no" className="block font-medium text-slate-700">
                      P.O. Box
                    </label>
                    <input
                      id="box_no"
                      type="text"
                      value={boxNo}
                      onChange={e => setBoxNo(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      placeholder="P.O. Box 123, Kasese"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="location" className="block font-medium text-slate-700">
                      Location *
                    </label>
                    <input
                      id="location"
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      placeholder="Kasese, Uganda"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="contact_number" className="block font-medium text-slate-700">
                      Contact Number *
                    </label>
                    <input
                      id="contact_number"
                      type="text"
                      value={contactNumber}
                      onChange={e => setContactNumber(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      placeholder="+2567XXXXXXXX"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="school_email" className="block font-medium text-slate-700">
                      School Email *
                    </label>
                    <input
                      id="school_email"
                      type="email"
                      value={schoolEmail}
                      onChange={e => setSchoolEmail(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      placeholder="info@school.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="website" className="block font-medium text-slate-700">
                      Website
                    </label>
                    <input
                      id="website"
                      type="url"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      placeholder="https://www.school.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="established_year" className="block font-medium text-slate-700">
                      Established Year
                    </label>
                    <input
                      id="established_year"
                      type="number"
                      value={establishedYear}
                      onChange={e => setEstablishedYear(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      placeholder="2005"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving…' : school ? 'Save Changes' : 'Create School'}
                    </button>
                  </div>
                </form>

                <div className="mt-3 text-[11px] text-slate-400">
                  If insert/update fails with "permission denied", your RLS policies for <b>profiles</b> and <b>general_information</b> must allow the logged-in user.
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
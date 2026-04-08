'use client';

import { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import { AlertTriangle, CheckCircle2, Loader2, School, User2, Shield, Upload, X } from 'lucide-react';
import Image from 'next/image';

type Role = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  school_id: string | null;
  created_at?: string;
  updated_at?: string;
};

type SchoolRow = {
  id: string;
  school_name: string;
  school_badge: string | null;
  box_no: string | null;
  location: string;
  contact_number: string;
  email: string;
  website: string | null;
  established_year: number | null;
  registered_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeMetaName(meta: any) {
  const full =
    meta?.full_name ||
    meta?.name ||
    [meta?.first_name, meta?.last_name].filter(Boolean).join(' ') ||
    null;

  return typeof full === 'string' && full.trim().length > 0 ? full.trim() : null;
}

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // auth + loading
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // identity
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // data
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  // messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // form
  const [schoolName, setSchoolName] = useState('');
  const [boxNo, setBoxNo] = useState('');
  const [location, setLocation] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');
  const [schoolBadge, setSchoolBadge] = useState<string | null>(null);
  const [tempImagePreview, setTempImagePreview] = useState<string | null>(null);

  const isAdmin = profile?.role === 'ADMIN';

  const canSubmit = useMemo(() => {
    // only admin can submit, also require fields
    if (!isAdmin) return false;
    return !!schoolName.trim() && !!location.trim() && !!contactNumber.trim() && !!schoolEmail.trim() && !saving;
  }, [isAdmin, schoolName, location, contactNumber, schoolEmail, saving]);

  // ---------------------------
  // 1) AUTH CHECK
  // ---------------------------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        router.replace('/');
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email ?? null);
      setAuthChecking(false);
    })();
  }, [router]);

  // ---------------------------
  // 2) LOAD PROFILE + SCHOOL
  // ---------------------------
  useEffect(() => {
    if (authChecking) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw new Error(userErr.message);
        if (!userResp.user) throw new Error('Could not find authenticated user.');

        const u = userResp.user;
        const uid = u.id;

        setUserId(uid);
        setUserEmail(u.email ?? null);

        // profile
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id,email,full_name,role,school_id,created_at,updated_at')
          .eq('user_id', uid)
          .maybeSingle();

        if (pErr) throw new Error(`Error loading profile: ${pErr.message}`);
        if (!p) {
          const metaName = safeMetaName(u.user_metadata);
          throw new Error(
            `Profile not found for this user. Ensure your handle_new_user trigger inserts into public.profiles. ${
              metaName ? `(User meta name: ${metaName})` : ''
            }`
          );
        }

        const prof = p as ProfileRow;
        setProfile(prof);

        // reset school UI
        setSchool(null);

        // If not linked yet: keep empty form
        if (!prof.school_id) {
          // for non-admin, show a clear message
          if (prof.role !== 'ADMIN') {
            setErrorMsg('Only ADMIN can create a school. Please contact your school ADMIN to configure the school details.');
          }
          return;
        }

        // Validate UUID
        if (!UUID_RE.test(prof.school_id)) {
          throw new Error('Your profile has an invalid school_id. Please contact admin.');
        }

        // Load school
        const { data: s, error: sErr } = await supabase
          .from('general_information')
          .select(
            'id,school_name,school_badge,box_no,location,contact_number,email,website,established_year,registered_by_user_id,created_at,updated_at'
          )
          .eq('id', prof.school_id)
          .maybeSingle();

        if (sErr) throw new Error(`Error loading school: ${sErr.message}`);
        if (!s) {
          throw new Error(
            'Your profile is linked to a school, but you are not allowed to view it (or the school does not exist). Fix RLS on general_information.'
          );
        }

        const schoolRow = s as SchoolRow;
        setSchool(schoolRow);

        // populate form
        setSchoolName(schoolRow.school_name ?? '');
        setBoxNo(schoolRow.box_no ?? '');
        setLocation(schoolRow.location ?? '');
        setContactNumber(schoolRow.contact_number ?? '');
        setSchoolEmail(schoolRow.email ?? '');
        setWebsite(schoolRow.website ?? '');
        setEstablishedYear(schoolRow.established_year ? String(schoolRow.established_year) : '');
        setSchoolBadge(schoolRow.school_badge ?? null);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Unexpected error while loading settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecking]);

  // ---------------------------
  // UPLOAD SCHOOL BADGE
  // ---------------------------
  const handleImageUpload = async (file: File) => {
    if (!isAdmin) {
      setErrorMsg('Only ADMIN can upload school badge.');
      return null;
    }

    if (!school?.id && !profile?.school_id) {
      setErrorMsg('Please create/save the school first before uploading a badge.');
      return null;
    }

    const schoolId = school?.id || profile?.school_id;
    if (!schoolId) return null;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Only JPEG, PNG, WEBP, and GIF images are allowed.');
      return null;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg('Image size must be less than 2MB.');
      return null;
    }

    setUploadingImage(true);
    setErrorMsg(null);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${schoolId}_${Date.now()}.${fileExt}`;
      const filePath = `school-badges/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('school-assets') // Make sure this bucket exists in your Supabase project
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('school-assets')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update school record with new badge URL
      const { error: updateError } = await supabase
        .from('general_information')
        .update({ school_badge: publicUrl })
        .eq('id', schoolId);

      if (updateError) throw new Error(updateError.message);

      // Update local state
      setSchoolBadge(publicUrl);
      if (school) {
        setSchool({ ...school, school_badge: publicUrl });
      }
      
      setSuccessMsg('School badge uploaded successfully!');
      return publicUrl;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to upload image.');
      return null;
    } finally {
      setUploadingImage(false);
      setTempImagePreview(null);
    }
  };

  const handleRemoveBadge = async () => {
    if (!isAdmin) {
      setErrorMsg('Only ADMIN can remove school badge.');
      return;
    }

    if (!school?.id) return;

    setUploadingImage(true);
    setErrorMsg(null);

    try {
      // Extract filename from URL if exists
      if (schoolBadge) {
        const urlParts = schoolBadge.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `school-badges/${fileName}`;
        
        // Try to delete from storage (optional - you might want to keep the file)
        await supabase.storage
          .from('school-assets')
          .remove([filePath]);
      }

      // Update school record
      const { error: updateError } = await supabase
        .from('general_information')
        .update({ school_badge: null })
        .eq('id', school.id);

      if (updateError) throw new Error(updateError.message);

      // Update local state
      setSchoolBadge(null);
      if (school) {
        setSchool({ ...school, school_badge: null });
      }
      
      setSuccessMsg('School badge removed successfully!');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to remove badge.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload immediately
      handleImageUpload(file);
    }
  };

  // ---------------------------
  // SAVE SCHOOL (CREATE OR UPDATE)
  // ---------------------------
  const handleSaveSchool = async (e: FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!userId) throw new Error('Missing user id.');
      if (!profile) throw new Error('Profile not loaded yet.');

      // ✅ Hard block (server-side enforcement is also needed, but this blocks UI calls)
      if (profile.role !== 'ADMIN') {
        throw new Error('Access denied. Only ADMIN can create or edit the school.');
      }

      const name = schoolName.trim();
      const loc = location.trim();
      const phone = contactNumber.trim();
      const em = schoolEmail.trim();

      if (!name || !loc || !phone || !em) throw new Error('Please fill in all required fields.');

      const yearNum = establishedYear.trim() ? Number(establishedYear) : null;
      if (establishedYear.trim() && (yearNum === null || Number.isNaN(yearNum))) {
        throw new Error('Established year must be a valid number.');
      }
      if (yearNum !== null) {
        const y = new Date().getFullYear();
        if (yearNum < 1800 || yearNum > y) throw new Error(`Established year must be between 1800 and ${y}.`);
      }

      // UPDATE
      if (school?.id) {
        const { error: updErr } = await supabase
          .from('general_information')
          .update({
            school_name: name,
            box_no: boxNo.trim() ? boxNo.trim() : null,
            location: loc,
            contact_number: phone,
            email: em,
            website: website.trim() ? website.trim() : null,
            established_year: yearNum,
            // Keep existing school_badge
          })
          .eq('id', school.id);

        if (updErr) throw new Error(updErr.message);

        const nextSchool: SchoolRow = {
          ...school,
          school_name: name,
          box_no: boxNo.trim() ? boxNo.trim() : null,
          location: loc,
          contact_number: phone,
          email: em,
          website: website.trim() ? website.trim() : null,
          established_year: yearNum,
          updated_at: new Date().toISOString(),
        };

        setSchool(nextSchool);
        setSuccessMsg('School settings updated successfully.');
        return;
      }

      // CREATE (only if profile not linked)
      if (profile.school_id) {
        throw new Error('Your profile is already linked to a school. You cannot create another.');
      }

      // optional guard: one school per user
      const { data: already, error: alreadyErr } = await supabase
        .from('general_information')
        .select('id')
        .eq('registered_by_user_id', userId)
        .limit(1);

      if (alreadyErr) throw new Error(alreadyErr.message);
      if (already && already.length > 0) {
        throw new Error('You have already registered a school. You can only register one school.');
      }

      const { data: created, error: insErr } = await supabase
        .from('general_information')
        .insert({
          school_name: name,
          box_no: boxNo.trim() ? boxNo.trim() : null,
          location: loc,
          contact_number: phone,
          email: em,
          website: website.trim() ? website.trim() : null,
          established_year: yearNum,
          registered_by_user_id: userId,
          school_badge: null, // Initially null, can be added after creation
        })
        .select(
          'id,school_name,school_badge,box_no,location,contact_number,email,website,established_year,registered_by_user_id,created_at,updated_at'
        )
        .single();

      if (insErr || !created) throw new Error(insErr?.message || 'Failed to create school.');
      const createdSchool = created as SchoolRow;

      // Link to profile (own row only)
      const { data: updatedProfile, error: linkErr } = await supabase
        .from('profiles')
        .update({ school_id: createdSchool.id })
        .eq('user_id', userId)
        .select('user_id,email,full_name,role,school_id,created_at,updated_at')
        .single();

      if (linkErr || !updatedProfile) {
        throw new Error(linkErr?.message || 'School created, but linking to profile failed.');
      }

      setSchool(createdSchool);
      setProfile(updatedProfile as ProfileRow);
      setSuccessMsg('School created and linked to your profile.');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Unexpected error while saving.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------
  // RENDER
  // ---------------------------
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-sm">Checking your session…</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar />
        <div className="flex flex-1">
          <AppShell />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              <p className="text-sm text-slate-700">Loading settings…</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const readonly = !isAdmin;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <div className="flex flex-1">
        <AppShell />

        <main className="flex-1 px-4 md:px-6 py-4 md:py-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Settings</h1>
              <p className="text-xs text-slate-500">
                Every account must be linked to a school (General Information). Only ADMIN can create/update school details.
              </p>
              {userEmail && (
                <p className="text-xs text-slate-400 mt-1">
                  Signed in as: <span className="font-medium text-slate-600">{userEmail}</span>
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>{errorMsg}</div>
              </div>
            )}

            {successMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>{successMsg}</div>
              </div>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Profile */}
              <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
                    <User2 className="h-4 w-4 text-slate-700" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
                    <p className="text-[11px] text-slate-500">Your account details</p>
                  </div>
                </div>

                {profile ? (
                  <div className="space-y-3 text-xs">
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
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-slate-500 mb-1">Role</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                          {profile.role}
                        </span>
                      </div>

                      {profile.role !== 'ADMIN' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-medium">
                          School is read-only
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Linked School</p>
                      <p className="text-slate-900">
                        {school ? school.school_name : profile.school_id ? `School ID: ${profile.school_id}` : 'Not linked yet'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No profile loaded.</p>
                )}
              </div>

              {/* School Settings */}
              <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
                      <School className="h-4 w-4 text-slate-700" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">School Settings</h2>
                      <p className="text-[11px] text-slate-500">
                        {school ? 'Update your school profile details.' : 'Create your school profile.'}
                      </p>
                    </div>
                  </div>

                  {!isAdmin && (
                    <div className="inline-flex items-center gap-2 text-[11px] text-slate-600">
                      <Shield className="h-4 w-4 text-slate-500" />
                      Only ADMIN can edit
                    </div>
                  )}
                </div>

                {!isAdmin && !school && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      This account is <b>{profile?.role}</b>. Only <b>ADMIN</b> can create the school record. Please ask the ADMIN to set up the school in Settings.
                    </div>
                  </div>
                )}

                {/* School Badge Upload Section */}
                {isAdmin && school && (
                  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label className="block font-medium text-slate-700 text-xs mb-2">School Badge / Logo</label>
                    <div className="flex items-start gap-4 flex-wrap">
                      {/* Current Badge Preview */}
                      {(schoolBadge || tempImagePreview) && (
                        <div className="relative">
                          <div className="w-24 h-24 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                            <Image
                              src={tempImagePreview || schoolBadge || ''}
                              alt="School badge"
                              width={96}
                              height={96}
                              className="object-contain"
                            />
                          </div>
                          {isAdmin && !uploadingImage && (
                            <button
                              onClick={handleRemoveBadge}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              title="Remove badge"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Upload Button */}
                      <div className="flex-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleFileSelect}
                          className="hidden"
                          disabled={uploadingImage || !isAdmin}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage || !isAdmin}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {uploadingImage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {uploadingImage ? 'Uploading...' : schoolBadge ? 'Change Badge' : 'Upload Badge'}
                        </button>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Recommended: Square image, max 2MB (JPEG, PNG, WEBP, GIF)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                      disabled={readonly}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
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
                      disabled={readonly}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
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
                      disabled={readonly}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
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
                      disabled={readonly}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
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
                      disabled={readonly}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
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
                      disabled={readonly}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
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
                      disabled={readonly}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                      placeholder="2005"
                      min={1800}
                      max={new Date().getFullYear()}
                    />
                  </div>

                  {isAdmin && (
                    <div className="md:col-span-2 flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={!canSubmit}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {saving ? 'Saving…' : school ? 'Save Changes' : 'Create School'}
                      </button>
                    </div>
                  )}
                </form>

                <div className="mt-3 text-[11px] text-slate-400">
                  If school loading fails, it's usually an RLS issue on <b>general_information</b>. Ensure the logged-in user can read their linked school.
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
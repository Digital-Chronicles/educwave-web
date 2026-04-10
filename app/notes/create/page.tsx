"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";
import supabase from "@/lib/supabaseClient";

type SubjectRow = {
  id: number;
  name: string;
};

type ClassRow = {
  id: number;
  grade_name: string;
};

type TeacherRow = {
  registration_id: string;
  school_id: string | null;
  user_id: string | null;
};

const NOTES_BUCKET = "notes-files";

export default function CreateNotesPage() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [teacherName, setTeacherName] = useState<string>("");

  const [subjectId, setSubjectId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [description, setDescription] = useState("");
  const [notesContent, setNotesContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loadingPage, setLoadingPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(() => {
    return (
      !!teacher &&
      !!subjectId &&
      notesContent.trim().length > 0 &&
      !submitting &&
      !uploading
    );
  }, [teacher, subjectId, notesContent, submitting, uploading]);

  useEffect(() => {
    async function loadPageData() {
      try {
        setLoadingPage(true);
        setErrorMessage("");

        // Get current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
          throw new Error("No logged-in user found.");
        }

        // Fetch subjects and classes in parallel
        const [subjectsResult, classesResult] = await Promise.all([
          supabase.from("subject").select("id, name").order("name"),
          supabase.from("class").select("id, grade_name").order("grade_name"),
        ]);

        if (subjectsResult.error) throw subjectsResult.error;
        if (classesResult.error) throw classesResult.error;

        setSubjects((subjectsResult.data ?? []) as SubjectRow[]);
        setClasses((classesResult.data ?? []) as ClassRow[]);

        // Find teacher by user_id
        const { data: teacherData, error: teacherError } = await supabase
          .from("teachers")
          .select("registration_id, school_id, user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (teacherError) throw teacherError;

        if (!teacherData) {
          throw new Error("Teacher profile not found for the current user. Please contact administrator.");
        }

        setTeacher(teacherData as TeacherRow);

        // Fetch teacher's full name from profiles or auth.users
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profileError && profileData?.full_name) {
          setTeacherName(profileData.full_name);
        } else {
          // Fallback: use email from user object
          setTeacherName(user.email?.split('@')[0] || "Teacher");
        }

      } catch (error: any) {
        console.error("Error loading page:", error);
        setErrorMessage(error.message || "Failed to load page data.");
      } finally {
        setLoadingPage(false);
      }
    }

    loadPageData();
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  async function uploadNotesFile(file: File, teacherRegistrationId: string) {
    setUploading(true);

    try {
      // Sanitize filename
      const safeFileName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = safeFileName.includes(".") ? safeFileName.split(".").pop() : "";
      const baseName = safeFileName.includes(".") ? safeFileName.substring(0, safeFileName.lastIndexOf(".")) : safeFileName;
      const uniqueName = `${baseName}_${timestamp}_${randomStr}${extension ? `.${extension}` : ""}`;

      const filePath = `teacher-notes/${teacherRegistrationId}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from(NOTES_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(NOTES_BUCKET)
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error("File upload error:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!teacher) {
      setErrorMessage("Teacher profile not found.");
      return;
    }

    if (!subjectId) {
      setErrorMessage("Please select a subject.");
      return;
    }

    if (!notesContent.trim()) {
      setErrorMessage("Notes content is required.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      let fileUrl: string | null = null;

      if (selectedFile) {
        fileUrl = await uploadNotesFile(selectedFile, teacher.registration_id);
      }

      const payload = {
        subject_id: Number(subjectId),
        notes_file_url: fileUrl,
        notes_content: notesContent.trim(),
        description: description.trim() || null,
        grade_id: gradeId ? Number(gradeId) : null,
        created_by_id: teacher.registration_id,
        school_id: teacher.school_id,
      };

      const { data, error } = await supabase
        .from("notes")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error(error.message || "Failed to save note.");
      }

      // Redirect to the newly created note
      router.push(`/notes/${data.id}`);
      
    } catch (error: any) {
      console.error("Error creating note:", error);
      setErrorMessage(error.message || "Failed to save note. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1">
            <div className="mx-auto max-w-5xl p-4 md:p-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="flex flex-col items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
                  <p className="mt-4 text-sm text-slate-600">Loading page data...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <AppShell />

        <main className="flex-1">
          <div className="mx-auto max-w-5xl p-4 md:p-6">
            <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Add Notes
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Teachers can create lesson notes, attach a file, and save
                    everything directly to Supabase.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                  Bucket: <span className="font-semibold">{NOTES_BUCKET}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Notes Details
                    </h2>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Subject <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={subjectId}
                          onChange={(e) => setSubjectId(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-slate-500"
                          required
                        >
                          <option value="">Select subject</option>
                          {subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Class / Grade
                        </label>
                        <select
                          value={gradeId}
                          onChange={(e) => setGradeId(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-slate-500"
                        >
                          <option value="">Select class (optional)</option>
                          {classes.map((grade) => (
                            <option key={grade.id} value={grade.id}>
                              {grade.grade_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Description
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Example: Introduction to Algebra"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                    </div>

                    <div className="mt-5 space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Notes Content <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={notesContent}
                        onChange={(e) => setNotesContent(e.target.value)}
                        placeholder="Write the actual lesson notes here..."
                        rows={14}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                        required
                      />
                      <p className="text-xs text-slate-500">
                        This field is required. Write your lesson notes in plain text, or use Markdown for formatting.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                      File Upload
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Upload PDF, DOCX, PPTX, images, or any supporting material to Supabase Storage.
                    </p>

                    <div className="mt-5 space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Attach File (Optional)
                      </label>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
                      />
                      {selectedFile && (
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          Selected: <span className="font-medium">{selectedFile.name}</span>
                          <span className="ml-2 text-xs text-slate-500">
                            ({(selectedFile.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Teacher Info
                    </h2>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="block text-slate-500">Name</span>
                        <span className="font-medium text-slate-900">
                          {teacherName || "-"}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="block text-slate-500">
                          Registration ID
                        </span>
                        <span className="font-mono text-sm text-slate-900">
                          {teacher?.registration_id || "-"}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="block text-slate-500">School ID</span>
                        <span className="font-mono text-xs break-all text-slate-900">
                          {teacher?.school_id || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Save Notes
                    </h2>

                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <p>
                        The note will be saved into the <span className="font-semibold">notes</span> table.
                      </p>
                      <p>
                        {selectedFile ? (
                          <>
                            A file has been selected. Its public URL will be saved in{" "}
                            <span className="font-semibold">notes_file_url</span>.
                          </>
                        ) : (
                          "If a file is selected, its public URL will be saved in notes_file_url."
                        )}
                      </p>
                      <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                        <span className="font-semibold">Note:</span> All notes are automatically associated with your teacher profile.
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploading ? (
                        <>
                          <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Uploading file...
                        </>
                      ) : submitting ? (
                        <>
                          <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving note...
                        </>
                      ) : (
                        "Save Notes"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
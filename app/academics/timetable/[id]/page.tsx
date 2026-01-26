"use client";

import React, { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Save,
  Trash2,
  RefreshCcw,
  CalendarDays,
  Users,
  BookOpen,
  Eye,
  Edit,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";

// Types
type UUID = string;

type ProfileRow = {
  user_id: UUID;
  role: "ADMIN" | "ACADEMIC" | "TEACHER" | "FINANCE" | "STUDENT" | "PARENT";
  school_id: UUID | null;
  full_name: string | null;
};

type TimetableStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type TimetableRow = {
  id: string;
  school_id: string;
  term_id: number;
  class_id: number;
  title: string;
  status: TimetableStatus;
  created_at: string;
  updated_at: string;
};

type TermRow = { id: number; term_name: string; year: number };
type ClassRow = { id: number; grade_name: string };

type SubjectRow = {
  id: number;
  name: string;
  code: string | null;
  grade_id: number;
};

type TeacherRow = {
  user_id: string;
  registration_id: string;
  first_name: string;
  last_name: string;
};

type ProfileNameRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type TimeSlotRow = {
  id: number;
  term_id: number;
  name: string;
  start_time: string;
  end_time: string;
  sort_order: number;
};

type EntryRow = {
  id: string;
  timetable_id: string;
  day_of_week: number;
  time_slot_id: number;
  subject_id: number;
  teacher_user_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type ActiveCell = { day: number; slotId: number } | null;

// Constants
const DAYS = [
  { k: 1, label: "Monday", short: "Mon" },
  { k: 2, label: "Tuesday", short: "Tue" },
  { k: 3, label: "Wednesday", short: "Wed" },
  { k: 4, label: "Thursday", short: "Thu" },
  { k: 5, label: "Friday", short: "Fri" },
];

// Utility functions
function clsx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(timeString: string) {
  if (!timeString) return "";
  return timeString.slice(0, 5);
}

// Components
function StatusBadge({ status }: { status: TimetableStatus }) {
  const config = {
    DRAFT: { 
      bg: "bg-slate-100", 
      border: "border-slate-200", 
      text: "text-slate-700", 
      icon: Edit 
    },
    PUBLISHED: { 
      bg: "bg-emerald-50", 
      border: "border-emerald-200", 
      text: "text-emerald-800", 
      icon: CheckCircle2 
    },
    ARCHIVED: { 
      bg: "bg-rose-50", 
      border: "border-rose-200", 
      text: "text-rose-800", 
      icon: AlertCircle 
    },
  };
  
  const { bg, border, text, icon: Icon } = config[status];
  
  return (
    <div className={`inline-flex items-center gap-2 rounded-xl border ${border} ${bg} ${text} px-3 py-1.5`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-semibold">{status}</span>
    </div>
  );
}

interface CellEditorProps {
  day: number;
  slotId: number;
  entry: EntryRow | undefined;
  subjects: SubjectRow[];
  teachers: TeacherRow[];
  teacherLabelById: Map<string, string>;
  onSave: (day: number, slotId: number, patch: Partial<EntryRow>) => void;
  onCancel: () => void;
}

function CellEditor({
  day,
  slotId,
  entry,
  subjects,
  teachers,
  teacherLabelById,
  onSave,
  onCancel,
}: CellEditorProps) {
  const [subjectId, setSubjectId] = useState(entry?.subject_id || 0);
  const [teacherId, setTeacherId] = useState(entry?.teacher_user_id || "");
  const [note, setNote] = useState(entry?.note || "");

  const handleSave = () => {
    if (subjectId && teacherId) {
      onSave(day, slotId, {
        subject_id: subjectId,
        teacher_user_id: teacherId,
        note: note || null,
      });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1 block">Subject</label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(Number(e.target.value))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={0}>Select subject...</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1 block">Teacher</label>
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select teacher...</option>
          {teachers.map((teacher) => (
            <option key={teacher.user_id} value={teacher.user_id}>
              {teacherLabelById.get(teacher.user_id) || `${teacher.first_name} ${teacher.last_name}`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1 block">Note (Optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Lab session"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!subjectId || !teacherId}
          className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Main Component
export default function TimetableEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const timetableId = params?.id;

  // State
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState<TimetableRow | null>(null);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [slots, setSlots] = useState<TimeSlotRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [profileNames, setProfileNames] = useState<ProfileNameRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCell, setActiveCell] = useState<ActiveCell>(null);
  const [showClashWarning, setShowClashWarning] = useState(false);

  // Memoized values
  const canEdit = useMemo(() => {
    return profile?.role === "ADMIN" || profile?.role === "ACADEMIC";
  }, [profile]);

  const isReadOnly = useMemo(() => {
    if (!canEdit) return true;
    if (timetable?.status === "ARCHIVED") return true;
    return false;
  }, [canEdit, timetable]);

  const classLabelById = useMemo(() => 
    new Map(classes.map((cls) => [cls.id, cls.grade_name])), 
    [classes]
  );

  const termLabelById = useMemo(() => 
    new Map(terms.map((term) => [term.id, `${term.term_name.replaceAll("_", " ")} • ${term.year}`])), 
    [terms]
  );

  const teacherLabelById = useMemo(() => {
    const profileMap = new Map(profileNames.map((p) => [p.user_id, p.full_name || p.email || p.user_id]));
    const teacherMap = new Map(teachers.map((t) => [t.user_id, `${t.first_name} ${t.last_name}`.trim()]));
    const result = new Map<string, string>();
    
    teachers.forEach((teacher) => {
      const label = profileMap.get(teacher.user_id) ?? teacherMap.get(teacher.user_id) ?? teacher.user_id;
      result.set(teacher.user_id, label);
    });
    
    return result;
  }, [teachers, profileNames]);

  const subjectLabelById = useMemo(() => 
    new Map(subjects.map((subject) => [subject.id, subject.name])), 
    [subjects]
  );

  const entryMap = useMemo(() => {
    const map = new Map<string, EntryRow>();
    entries.forEach((entry) => {
      map.set(`${entry.day_of_week}:${entry.time_slot_id}`, entry);
    });
    return map;
  }, [entries]);

  const clashes = useMemo(() => {
    const teacherClashes = new Map<string, Array<{day: number, slotId: number, entry: EntryRow}>>();
    const clashCells = new Set<string>();
    
    entries.forEach((entry) => {
      if (!entry.teacher_user_id) return;
      const key = `${entry.teacher_user_id}:${entry.day_of_week}:${entry.time_slot_id}`;
      
      if (!teacherClashes.has(key)) {
        teacherClashes.set(key, []);
      }
      teacherClashes.get(key)!.push({ 
        day: entry.day_of_week, 
        slotId: entry.time_slot_id, 
        entry 
      });
    });

    // Mark cells with clashes
    teacherClashes.forEach((entries, key) => {
      if (entries.length > 1) {
        entries.forEach(({ day, slotId }) => {
          clashCells.add(`${day}:${slotId}`);
        });
      }
    });

    return {
      teacherClashes,
      clashCells,
      hasClashes: clashCells.size > 0,
    };
  }, [entries]);

  // Effects
  useEffect(() => {
    let isMounted = true;

    const initializePage = async () => {
      setLoading(true);
      setMessage(null);

      try {
        // Check authentication
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          router.push("/login");
          return;
        }

        // Load profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, role, school_id, full_name")
          .eq("user_id", authData.user.id)
          .single();

        if (!isMounted) return;
        setProfile(profileData as ProfileRow | null);

        // Load timetable
        const { data: timetableData, error: timetableError } = await supabase
          .from("timetables")
          .select("*")
          .eq("id", timetableId)
          .single();

        if (!isMounted) return;

        if (timetableError || !timetableData) {
          setMessage({ 
            type: "error", 
            text: timetableError?.message ?? "Timetable not found." 
          });
          return;
        }

        const timetable = timetableData as TimetableRow;
        setTimetable(timetable);

        // Load all reference data in parallel
        await loadReferenceData(timetable);
        await loadEntries(timetable.id);

      } catch (error) {
        console.error("Failed to initialize page:", error);
        setMessage({ 
          type: "error", 
          text: "Failed to load timetable data. Please try again." 
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const loadReferenceData = async (timetable: TimetableRow) => {
      const [
        termsResponse,
        classesResponse,
        subjectsResponse,
        slotsResponse,
        teachersResponse
      ] = await Promise.all([
        supabase.from("term_exam_session").select("id, term_name, year"),
        supabase.from("class").select("id, grade_name"),
        supabase.from("subject").select("id, name, code, grade_id"),
        supabase
          .from("time_slots")
          .select("id, term_id, name, start_time, end_time, sort_order")
          .eq("term_id", timetable.term_id)
          .order("sort_order", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase
          .from("teachers")
          .select("user_id, registration_id, first_name, last_name")
          .eq("school_id", timetable.school_id),
      ]);

      if (!isMounted) return;

      setTerms((termsResponse.data as TermRow[]) ?? []);
      setClasses((classesResponse.data as ClassRow[]) ?? []);
      setSubjects(
        ((subjectsResponse.data as SubjectRow[]) ?? []).filter(
          (subject) => subject.grade_id === timetable.class_id
        )
      );
      setSlots((slotsResponse.data as TimeSlotRow[]) ?? []);
      setTeachers((teachersResponse.data as TeacherRow[]) ?? []);

      // Load teacher profile names
      if (teachersResponse.data && teachersResponse.data.length > 0) {
        const teacherUserIds = teachersResponse.data.map((t) => t.user_id);
        const { data: profileNamesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", teacherUserIds);

        if (isMounted) {
          setProfileNames((profileNamesData as ProfileNameRow[]) ?? []);
        }
      }
    };

    initializePage();

    return () => {
      isMounted = false;
    };
  }, [timetableId, router]);

  // Functions
  const loadEntries = async (timetableId: string) => {
    const { data, error } = await supabase
      .from("timetable_entries")
      .select("*")
      .eq("timetable_id", timetableId);

    if (error) {
      setMessage({ type: "error", text: error.message });
      setEntries([]);
      return;
    }

    setEntries((data as EntryRow[]) ?? []);
  };

  const setCell = (day: number, slotId: number, patch: Partial<EntryRow>) => {
    if (isReadOnly || !timetable) return;

    const existing = entries.find((entry) => 
      entry.day_of_week === day && entry.time_slot_id === slotId
    );

    if (!existing) {
      // Create new entry
      const newEntry: EntryRow = {
        id: `temp-${crypto.randomUUID()}`,
        timetable_id: timetable.id,
        day_of_week: day,
        time_slot_id: slotId,
        subject_id: patch.subject_id || 0,
        teacher_user_id: patch.teacher_user_id || "",
        note: patch.note || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setEntries(prev => [...prev, newEntry]);
    } else {
      // Update existing entry
      setEntries(prev =>
        prev.map((entry) =>
          entry.id === existing.id ? { ...entry, ...patch } : entry
        )
      );
    }
    setActiveCell(null);
  };

  const clearCell = async (day: number, slotId: number) => {
    if (isReadOnly) return;
    setMessage(null);

    const existing = entries.find((entry) => 
      entry.day_of_week === day && entry.time_slot_id === slotId
    );
    
    if (!existing) return;

    // If temp entry, remove locally
    if (existing.id.startsWith("temp-")) {
      setEntries((prev) => prev.filter((entry) => entry.id !== existing.id));
      setMessage({ type: "success", text: "Cell cleared." });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("timetable_entries")
      .delete()
      .eq("id", existing.id);
    
    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== existing.id));
    setMessage({ type: "success", text: "Cell cleared." });
  };

  const refresh = async () => {
    if (!timetable) return;
    
    setRefreshing(true);
    setMessage(null);
    
    try {
      await loadEntries(timetable.id);
      setMessage({ type: "success", text: "Timetable refreshed." });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to refresh timetable." });
    } finally {
      setRefreshing(false);
    }
  };

  const saveAll = async () => {
    if (!timetable) {
      setMessage({ 
        type: "error", 
        text: "Timetable not found. Please refresh the page." 
      });
      return;
    }
    
    if (isReadOnly) return;

    setMessage(null);
    setSaving(true);

    // Validate entries
    const incomplete = entries.filter(entry => 
      entry.subject_id === 0 || !entry.teacher_user_id
    );
    
    if (incomplete.length > 0) {
      setSaving(false);
      setMessage({ 
        type: "error", 
        text: `Please fill both Subject and Teacher for ${incomplete.length} cell(s).` 
      });
      return;
    }

    // Check for clashes
    if (clashes.hasClashes) {
      setShowClashWarning(true);
      setSaving(false);
      return;
    }

    await saveEntries();
  };

  const saveEntries = async () => {
    if (!timetable) return;

    try {
      // Split into inserts and updates
      const inserts = entries
        .filter((entry) => entry.id.startsWith("temp-"))
        .map(({ id, ...rest }) => ({
          timetable_id: rest.timetable_id,
          day_of_week: rest.day_of_week,
          time_slot_id: rest.time_slot_id,
          subject_id: rest.subject_id,
          teacher_user_id: rest.teacher_user_id,
          note: rest.note,
        }));

      const updates = entries
        .filter((entry) => !entry.id.startsWith("temp-"))
        .map(({ id, created_at, updated_at, ...rest }) => ({
          id,
          ...rest,
        }));

      // Save to database
      if (inserts.length > 0) {
        const { error } = await supabase.from("timetable_entries").insert(inserts);
        if (error) throw error;
      }

      if (updates.length > 0) {
        const { error } = await supabase.from("timetable_entries").upsert(updates);
        if (error) throw error;
      }

      // Update timetable timestamp
      await supabase
        .from("timetables")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", timetable.id);

      // Reload entries
      await loadEntries(timetable.id);
      
      setMessage({ type: "success", text: "Timetable saved successfully!" });
    } catch (error: any) {
      setMessage({ 
        type: "error", 
        text: error.message || "Failed to save timetable. Please try again." 
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmSaveWithClashes = async () => {
    if (!timetable) {
      setMessage({ 
        type: "error", 
        text: "Timetable not found. Please refresh the page." 
      });
      return;
    }

    setShowClashWarning(false);
    setSaving(true);

    try {
      // Proceed with save despite clashes
      const inserts = entries
        .filter((entry) => entry.id.startsWith("temp-"))
        .map(({ id, ...rest }) => ({
          timetable_id: rest.timetable_id,
          day_of_week: rest.day_of_week,
          time_slot_id: rest.time_slot_id,
          subject_id: rest.subject_id,
          teacher_user_id: rest.teacher_user_id,
          note: rest.note,
        }));

      const updates = entries
        .filter((entry) => !entry.id.startsWith("temp-"))
        .map(({ id, created_at, updated_at, ...rest }) => ({
          id,
          ...rest,
        }));

      if (inserts.length > 0) {
        const { error } = await supabase.from("timetable_entries").insert(inserts);
        if (error) throw error;
      }

      if (updates.length > 0) {
        const { error } = await supabase.from("timetable_entries").upsert(updates);
        if (error) throw error;
      }

      await supabase
        .from("timetables")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", timetable.id);

      await loadEntries(timetable.id);
      setMessage({ 
        type: "success", 
        text: "Timetable saved with clashes. Please resolve teacher conflicts." 
      });
    } catch (error: any) {
      setMessage({ 
        type: "error", 
        text: error.message || "Failed to save timetable." 
      });
    } finally {
      setSaving(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <AppShell />
          <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm mb-4">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-semibold">Loading Timetable Editor...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!timetable) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <AppShell />
          <main className="flex-1 overflow-y-auto flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Timetable Not Found</div>
                    <div className="text-sm text-slate-600 mt-1">The requested timetable could not be found.</div>
                  </div>
                </div>
                <Link
                  href="/academics/timetable"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Timetables
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <AppShell />
        
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
            <div className="px-6 lg:px-8 py-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Link
                    href="/academics/timetable"
                    className="h-10 w-10 rounded-2xl border border-slate-200 bg-white text-slate-700 flex items-center justify-center hover:bg-slate-50 transition"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{timetable.title}</h1>
                    <div className="flex items-center gap-3 mt-1">
                      <StatusBadge status={timetable.status} />
                      <span className="text-sm text-slate-600">
                        Updated {new Date(timetable.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
                  >
                    <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                  {!isReadOnly && (
                    <button
                      onClick={saveAll}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? "Saving..." : "Save Timetable"}
                    </button>
                  )}
                </div>
              </div>

              {/* Info Bar */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600">Class</div>
                    <div className="text-sm font-bold text-slate-900">
                      {classLabelById.get(timetable.class_id) || "Unknown"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600">Term</div>
                    <div className="text-sm font-bold text-slate-900">
                      {termLabelById.get(timetable.term_id) || "Unknown"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600">Status</div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="capitalize">{timetable.status.toLowerCase()}</span>
                      {isReadOnly ? (
                        <span className="text-xs text-slate-500">(View Only)</span>
                      ) : (
                        <span className="text-xs text-blue-600">(Edit Mode)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 lg:px-8 py-8">
            {/* Message Alert */}
            {message && (
              <div
                className={clsx(
                  "mb-6 flex items-start gap-3 rounded-2xl border p-4",
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                )}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5" />
                )}
                <div className="flex-1 text-sm font-medium">{message.text}</div>
                <button
                  onClick={() => setMessage(null)}
                  className="rounded-lg p-1 hover:bg-white/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Permissions Notice */}
            {!canEdit && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-amber-700 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-amber-800">View Only Mode</div>
                    <div className="text-sm text-amber-700 mt-1">
                      You have view-only access. Only ADMIN and ACADEMIC roles can edit timetables.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Clash Warning */}
            {clashes.hasClashes && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-amber-800">Teacher Clash Detected</div>
                    <div className="text-sm text-amber-700 mt-1">
                      Some teachers are scheduled in multiple cells at the same time. Please resolve conflicts before publishing.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timetable Grid */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-slate-900">Timetable Grid</div>
                  <div className="text-xs text-slate-500">
                    {DAYS.length} days × {slots.length} periods
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isReadOnly ? (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                      <Eye className="h-4 w-4" />
                      View Only
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700">
                      <Edit className="h-4 w-4" />
                      Edit Mode
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="sticky left-0 z-10 min-w-[120px] border-r border-slate-200 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700">
                        Time / Day
                      </th>
                      {DAYS.map((day) => (
                        <th
                          key={day.k}
                          className="min-w-[200px] border-b border-slate-200 px-4 py-3 text-center font-semibold text-slate-700"
                        >
                          <div className="text-sm font-bold">{day.label}</div>
                          <div className="text-xs text-slate-500 font-normal">Day {day.k}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="sticky left-0 z-10 min-w-[120px] border-r border-slate-200 bg-white px-4 py-3">
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-900">{slot.name}</div>
                            <div className="text-xs text-slate-600">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </div>
                          </div>
                        </td>
                        {DAYS.map((day) => {
                          const entry = entryMap.get(`${day.k}:${slot.id}`);
                          const isClash = clashes.clashCells.has(`${day.k}:${slot.id}`);
                          const isActive = activeCell?.day === day.k && activeCell?.slotId === slot.id;
                          
                          return (
                            <td
                              key={`${slot.id}-${day.k}`}
                              className={clsx(
                                "min-w-[200px] px-4 py-3 transition",
                                isClash ? "bg-rose-50/50 hover:bg-rose-100/50" : "hover:bg-slate-50",
                                isActive && "ring-2 ring-blue-500 ring-inset bg-blue-50"
                              )}
                              onClick={() => !isReadOnly && setActiveCell({ day: day.k, slotId: slot.id })}
                            >
                              {entry ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="font-semibold text-slate-900">
                                        {subjectLabelById.get(entry.subject_id) || "Unknown"}
                                      </div>
                                      <div className="text-xs text-slate-600">
                                        {teacherLabelById.get(entry.teacher_user_id) || "No teacher"}
                                      </div>
                                    </div>
                                    {!isReadOnly && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          clearCell(day.k, slot.id);
                                        }}
                                        className="rounded-lg p-1.5 hover:bg-white text-slate-500 hover:text-rose-600"
                                        aria-label="Clear cell"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                  {entry.note && (
                                    <div className="text-xs text-slate-500 bg-slate-100 rounded-lg px-2 py-1">
                                      {entry.note}
                                    </div>
                                  )}
                                  {isClash && (
                                    <div className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Teacher clash
                                    </div>
                                  )}
                                </div>
                              ) : isActive ? (
                                <CellEditor
                                  day={day.k}
                                  slotId={slot.id}
                                  entry={entry}
                                  subjects={subjects}
                                  teachers={teachers}
                                  teacherLabelById={teacherLabelById}
                                  onSave={setCell}
                                  onCancel={() => setActiveCell(null)}
                                />
                              ) : (
                                <div className="text-center py-4">
                                  {!isReadOnly ? (
                                    <div className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer">
                                      Click to add subject
                                    </div>
                                  ) : (
                                    <div className="text-sm text-slate-400">— Empty —</div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend & Instructions */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-bold text-slate-900 mb-4">How to Use</div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {!isReadOnly ? (
                    <>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>Click on empty cells to assign subjects and teachers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Edit className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Click on filled cells to edit or remove assignments</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Save className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <span>Click Save Timetable to persist changes to database</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <span>Teacher clashes are highlighted in red - avoid scheduling same teacher in multiple places at once</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <Eye className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" />
                        <span>This timetable is in view-only mode</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                        <span>Only ADMIN and ACADEMIC roles can edit timetables</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Contact your administrator if you need to make changes</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold">Quick Stats</div>
                    <div className="mt-2 text-sm text-white/90 leading-relaxed">
                      • {entries.length} cells filled<br />
                      • {subjects.length} subjects available<br />
                      • {teachers.length} teachers assigned<br />
                      • {clashes.hasClashes ? "⚠️ Teacher clashes present" : "✅ No teacher clashes"}
                    </div>
                  </div>
                  <Sparkles className="h-5 w-5 text-white/90" />
                </div>
                {!isReadOnly && (
                  <button
                    onClick={saveAll}
                    disabled={saving}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-sm font-semibold disabled:opacity-60 transition"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving..." : "Save Timetable"}
                  </button>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-600">
                {isReadOnly ? (
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    View-only mode • Timetable is {timetable.status}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Edit mode • Make changes and click Save
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={refresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
                >
                  <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                {!isReadOnly && (
                  <button
                    onClick={saveAll}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving..." : "Save Timetable"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Clash Warning Modal */}
      {showClashWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">Teacher Clashes Detected</div>
                  <div className="text-sm text-slate-600">Some teachers are scheduled in multiple places</div>
                </div>
              </div>
              <button
                onClick={() => setShowClashWarning(false)}
                className="rounded-xl p-2 hover:bg-slate-100 transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-sm text-slate-700 mb-4">
                There are teacher scheduling conflicts in this timetable. Do you want to save anyway?
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  onClick={() => setShowClashWarning(false)}
                  className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveWithClashes}
                  className="w-full sm:w-auto inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition"
                >
                  <Save className="h-4 w-4" />
                  Save with Clashes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import React, { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  LayoutGrid,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Eye,
  Edit,
  Trash2,
  Send,
  RefreshCcw,
  Clock,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Users,
  BookOpen,
  CalendarDays,
  Grid3x3,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";

type UUID = string;

type ProfileRow = {
  user_id: UUID;
  role: "ADMIN" | "ACADEMIC" | "TEACHER" | "FINANCE" | "STUDENT" | "PARENT";
  school_id: UUID | null;
  full_name: string | null;
};

// Add User type for auth user
type User = {
  id: string;
  email?: string;
};

type TermRow = { id: number; term_name: string; year: number };
type ClassRow = { id: number; grade_name: string };
type TimeSlotRow = {
  id: number;
  school_id: string;
  term_id: number;
  name: string;
  start_time: string;
  end_time: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type TimetableStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type TimetableRow = {
  id: string;
  school_id: string;
  term_id: number;
  class_id: number;
  title: string;
  status: TimetableStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function clsx(...s: (string | false | null | undefined)[]) {
  return s.filter(Boolean).join(" ");
}

const StatusBadge = ({ status }: { status: TimetableStatus }) => {
  const config = {
    DRAFT: { bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-700", icon: Clock },
    PUBLISHED: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", icon: CheckCircle2 },
    ARCHIVED: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", icon: AlertCircle },
  };
  
  const { bg, border, text, icon: Icon } = config[status];
  
  return (
    <div className={`inline-flex items-center gap-2 rounded-xl border ${border} ${bg} ${text} px-3 py-1.5`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-semibold">{status}</span>
    </div>
  );
};

export default function TimetableHomePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [user, setUser] = useState<User | null>(null); // Store auth user separately
  const [loading, setLoading] = useState(true);

  const [terms, setTerms] = useState<TermRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [timetables, setTimetables] = useState<TimetableRow[]>([]);
  const [slots, setSlots] = useState<TimeSlotRow[]>([]);

  const [selectedTermId, setSelectedTermId] = useState<number | "">("");
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");
  const [selectedTimetableId, setSelectedTimetableId] = useState<string | "">("");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal: create timetable
  const [openTTModal, setOpenTTModal] = useState(false);
  const [ttTitle, setTtTitle] = useState("");
  const [ttTermId, setTtTermId] = useState<number | "">("");
  const [ttClassId, setTtClassId] = useState<number | "">("");
  const [savingTT, setSavingTT] = useState(false);

  // Modal: time slot
  const [openSlotModal, setOpenSlotModal] = useState(false);
  const [slotMode, setSlotMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [slotTermId, setSlotTermId] = useState<number | "">("");
  const [slotName, setSlotName] = useState("");
  const [slotStart, setSlotStart] = useState("08:00");
  const [slotEnd, setSlotEnd] = useState("09:00");
  const [slotOrder, setSlotOrder] = useState(0);
  const [savingSlot, setSavingSlot] = useState(false);

  const canManage = useMemo(() => profile?.role === "ADMIN" || profile?.role === "ACADEMIC", [profile]);

  const termLabel = (t: TermRow) => `${t.term_name.replaceAll("_", " ")} • ${t.year}`;

  const classNameById = useMemo(() => {
    const m = new Map<number, string>();
    classes.forEach((c) => m.set(c.id, c.grade_name));
    return m;
  }, [classes]);

  const termLabelById = useMemo(() => {
    const m = new Map<number, string>();
    terms.forEach((t) => m.set(t.id, termLabel(t)));
    return m;
  }, [terms]);

  // Load auth/user + profile + reference
  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      setMessage(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authData.user) {
        router.push("/login");
        return;
      }

      // Store auth user
      setUser({
        id: authData.user.id,
        email: authData.user.email || undefined
      });

      const uid = authData.user.id;

      const profRes = await supabase
        .from("profiles")
        .select("user_id, role, school_id, full_name")
        .eq("user_id", uid)
        .single();

      if (!alive) return;

      if (profRes.error || !profRes.data) {
        setMessage({ type: "error", text: profRes.error?.message || "Profile not found" });
        setLoading(false);
        return;
      }

      setProfile(profRes.data as ProfileRow);

      const [termsRes, classesRes] = await Promise.all([
        supabase.from("term_exam_session").select("id, term_name, year").order("year", { ascending: false }).order("id", { ascending: false }),
        supabase.from("class").select("id, grade_name").order("grade_name", { ascending: true }),
      ]);

      if (termsRes.error) setMessage({ type: "error", text: `Failed to load terms: ${termsRes.error.message}` });
      if (classesRes.error) setMessage({ type: "error", text: `Failed to load classes: ${classesRes.error.message}` });

      setTerms((termsRes.data as TermRow[]) ?? []);
      setClasses((classesRes.data as ClassRow[]) ?? []);

      setLoading(false);
    };

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  // Load timetables when term/class changes
  useEffect(() => {
    const run = async () => {
      if (!selectedTermId || !selectedClassId) {
        setTimetables([]);
        setSelectedTimetableId("");
        return;
      }

      setMessage(null);

      const res = await supabase
        .from("timetables")
        .select("*")
        .eq("term_id", selectedTermId)
        .eq("class_id", selectedClassId)
        .order("updated_at", { ascending: false });

      if (res.error) {
        setMessage({ type: "error", text: res.error.message });
        return;
      }

      const rows = (res.data as TimetableRow[]) ?? [];
      setTimetables(rows);
      setSelectedTimetableId(rows[0]?.id ?? "");
    };

    run();
  }, [selectedTermId, selectedClassId]);

  // Load slots when term changes
  useEffect(() => {
    const run = async () => {
      if (!selectedTermId) {
        setSlots([]);
        return;
      }

      const res = await supabase
        .from("time_slots")
        .select("*")
        .eq("term_id", selectedTermId)
        .order("sort_order", { ascending: true })
        .order("start_time", { ascending: true });

      if (res.error) {
        setMessage({ type: "error", text: res.error.message });
        return;
      }

      setSlots((res.data as TimeSlotRow[]) ?? []);
    };

    run();
  }, [selectedTermId]);

  const refreshSlots = async () => {
    if (!selectedTermId) return;
    const res = await supabase
      .from("time_slots")
      .select("*")
      .eq("term_id", selectedTermId)
      .order("sort_order", { ascending: true })
      .order("start_time", { ascending: true });
    if (res.error) setMessage({ type: "error", text: res.error.message });
    else setSlots((res.data as TimeSlotRow[]) ?? []);
  };

  const refreshTimetables = async () => {
    if (!selectedTermId || !selectedClassId) return;
    const res = await supabase
      .from("timetables")
      .select("*")
      .eq("term_id", selectedTermId)
      .eq("class_id", selectedClassId)
      .order("updated_at", { ascending: false });
    if (res.error) setMessage({ type: "error", text: res.error.message });
    else {
      const rows = (res.data as TimetableRow[]) ?? [];
      setTimetables(rows);
      setSelectedTimetableId(rows[0]?.id ?? "");
    }
  };

  const openCreateTimetable = () => {
    if (!canManage) return;
    setTtTitle("");
    setTtTermId(selectedTermId || "");
    setTtClassId(selectedClassId || "");
    setOpenTTModal(true);
  };

  const createTimetable = async () => {
    if (!canManage) return;
    setMessage(null);

    if (!ttTitle.trim()) {
      setMessage({ type: "error", text: "Enter timetable title." });
      return;
    }
    if (!ttTermId || !ttClassId) {
      setMessage({ type: "error", text: "Select term and class." });
      return;
    }

    if (!user?.id) {
      router.push("/login");
      return;
    }

    setSavingTT(true);
    const res = await supabase.from("timetables").insert({
      school_id: profile?.school_id,
      term_id: ttTermId,
      class_id: ttClassId,
      title: ttTitle.trim(),
      created_by: user.id,
      status: "DRAFT",
    });

    setSavingTT(false);

    if (res.error) {
      setMessage({ type: "error", text: res.error.message });
      return;
    }

    setMessage({ type: "success", text: "Timetable created." });
    setOpenTTModal(false);

    // update dropdown selections
    setSelectedTermId(ttTermId);
    setSelectedClassId(ttClassId);
    await refreshTimetables();
  };

  const publishTimetable = async (id: string) => {
    if (!canManage) return;
    setMessage(null);

    const res = await supabase.from("timetables").update({ status: "PUBLISHED" }).eq("id", id);
    if (res.error) {
      setMessage({ type: "error", text: res.error.message });
      return;
    }
    setMessage({ type: "success", text: "Timetable published." });
    await refreshTimetables();
  };

  const archiveTimetable = async (id: string) => {
    if (!canManage) return;
    setMessage(null);

    const res = await supabase.from("timetables").update({ status: "ARCHIVED" }).eq("id", id);
    if (res.error) {
      setMessage({ type: "error", text: res.error.message });
      return;
    }
    setMessage({ type: "success", text: "Timetable archived." });
    await refreshTimetables();
  };

  const deleteTimetable = async (id: string) => {
    if (!canManage) return;
    setMessage(null);

    const res = await supabase.from("timetables").delete().eq("id", id);
    if (res.error) {
      setMessage({ type: "error", text: res.error.message });
      return;
    }
    setMessage({ type: "success", text: "Timetable deleted." });
    await refreshTimetables();
  };

  const openSlotCreate = () => {
    if (!canManage) return;
    setSlotMode("CREATE");
    setEditingSlotId(null);
    setSlotTermId(selectedTermId || "");
    setSlotName("");
    setSlotStart("08:00");
    setSlotEnd("09:00");
    setSlotOrder(0);
    setOpenSlotModal(true);
  };

  const openSlotEdit = (s: TimeSlotRow) => {
    if (!canManage) return;
    setSlotMode("EDIT");
    setEditingSlotId(s.id);
    setSlotTermId(s.term_id);
    setSlotName(s.name);
    setSlotStart(s.start_time);
    setSlotEnd(s.end_time);
    setSlotOrder(s.sort_order ?? 0);
    setOpenSlotModal(true);
  };

  const saveSlot = async () => {
    if (!canManage) return;
    setMessage(null);

    if (!slotTermId) return setMessage({ type: "error", text: "Select term for time slot." });
    if (!slotName.trim()) return setMessage({ type: "error", text: "Enter time slot name." });
    if (!slotStart || !slotEnd) return setMessage({ type: "error", text: "Enter start/end time." });

    setSavingSlot(true);

    let res;
    const payload = {
      school_id: profile?.school_id,
      term_id: slotTermId,
      name: slotName.trim(),
      start_time: slotStart,
      end_time: slotEnd,
      sort_order: slotOrder,
    };

    if (slotMode === "EDIT" && editingSlotId) {
      res = await supabase.from("time_slots").update(payload).eq("id", editingSlotId);
    } else {
      res = await supabase.from("time_slots").insert(payload);
    }

    setSavingSlot(false);

    if (res.error) {
      setMessage({ type: "error", text: res.error.message });
      return;
    }

    setMessage({ type: "success", text: "Time slot saved." });
    setOpenSlotModal(false);
    await refreshSlots();
  };

  const deleteSlot = async (id: number) => {
    if (!canManage) return;
    setMessage(null);

    const res = await supabase.from("time_slots").delete().eq("id", id);
    if (res.error) {
      setMessage({ type: "error", text: res.error.message });
      return;
    }
    setMessage({ type: "success", text: "Time slot deleted." });
    await refreshSlots();
  };

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
              <span className="text-sm font-semibold">Loading Timetable...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!profile?.school_id) {
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
                    <div className="font-bold text-slate-900">School Configuration Required</div>
                    <div className="text-sm text-slate-600 mt-1">Your account has no school_id. Ask the admin to assign your profile to a school.</div>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/settings")}
                  className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
                >
                  Go to Settings
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const selectedTT = timetables.find((t) => t.id === selectedTimetableId) || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <AppShell />
        
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
            <div className="px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Class Timetables</h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Create time slots (periods) and build class timetables for each term.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <div className="text-xs text-slate-600">
                    {profile.full_name ? (
                      <span>
                        Role: <span className="font-semibold text-slate-900">{profile.role}</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-900">{user?.email || "User"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Selection Row */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-2 block">Term</label>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      value={selectedTermId}
                      onChange={(e) => setSelectedTermId(e.target.value ? Number(e.target.value) : "")}
                    >
                      <option value="">Select term...</option>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>
                          {termLabel(t)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-2 block">Class</label>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : "")}
                    >
                      <option value="">Select class...</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.grade_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-2 block">Timetable</label>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      value={selectedTimetableId}
                      onChange={(e) => setSelectedTimetableId(e.target.value)}
                      disabled={!timetables.length}
                    >
                      <option value="">{timetables.length ? "Select timetable..." : "No timetable yet"}</option>
                      {timetables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} • {t.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={refreshTimetables}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {canManage && (
                    <button
                      onClick={openCreateTimetable}
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                    >
                      <Plus className="h-4 w-4" />
                      New Timetable
                    </button>
                  )}
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

            {/* Info Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">Current Selection</div>
                  <div className="mt-2 text-sm text-slate-600">
                    {selectedTermId && selectedClassId ? (
                      <span>
                        Term: <span className="font-semibold text-slate-900">{termLabelById.get(selectedTermId) ?? selectedTermId}</span> • 
                        Class: <span className="font-semibold text-slate-900">{classNameById.get(selectedClassId) ?? selectedClassId}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">Select a term and class to continue.</span>
                    )}
                  </div>
                </div>
                
                {selectedTT && (
                  <Link
                    href={`/academics/timetable/${selectedTT.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Open Grid Builder
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Time Slots Section */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Time Slots</div>
                      <div className="text-xs text-slate-500">
                        {selectedTermId ? "Define periods like P1, BREAK, LUNCH" : "Select a term first"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={refreshSlots}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                    {canManage && (
                      <button
                        onClick={openSlotCreate}
                        disabled={!selectedTermId}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
                      >
                        <Plus className="h-4 w-4" />
                        Add Slot
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Period</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Start</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">End</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Order</th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {slots.length ? (
                        slots.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900">{s.name}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{s.start_time}</td>
                            <td className="px-6 py-4 text-slate-600">{s.end_time}</td>
                            <td className="px-6 py-4 text-slate-600">{s.sort_order}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {canManage ? (
                                  <>
                                    <button
                                      onClick={() => openSlotEdit(s)}
                                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                    >
                                      <Edit className="h-4 w-4" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteSlot(s.id)}
                                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100 transition"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-500">Read only</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="mx-auto max-w-sm">
                              <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-4">
                                <Clock className="h-8 w-8" />
                              </div>
                              <div className="text-sm font-semibold text-slate-700">
                                {selectedTermId ? "No time slots yet" : "Select a term to view slots"}
                              </div>
                              <div className="text-sm text-slate-500 mt-1">
                                {selectedTermId ? "Add periods like P1, P2, BREAK, LUNCH to build your timetable." : "Choose a term to start defining time slots."}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Timetable Actions Section */}
              <div className="space-y-6">
                {selectedTT ? (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{selectedTT.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <StatusBadge status={selectedTT.status} />
                              <span className="text-xs text-slate-500">
                                Updated {new Date(selectedTT.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="h-4 w-4" />
                            <span>{classNameById.get(selectedTT.class_id)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>{termLabelById.get(selectedTT.term_id)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/academics/timetable/${selectedTT.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                        >
                          <LayoutGrid className="h-4 w-4" />
                          Build Grid
                        </Link>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {canManage && selectedTT.status !== "PUBLISHED" && (
                        <button
                          onClick={() => publishTimetable(selectedTT.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition"
                        >
                          <Send className="h-4 w-4" />
                          Publish
                        </button>
                      )}

                      {canManage && selectedTT.status !== "ARCHIVED" && (
                        <button
                          onClick={() => archiveTimetable(selectedTT.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition"
                        >
                          <Clock className="h-4 w-4" />
                          Archive
                        </button>
                      )}

                      {canManage && (
                        <button
                          onClick={() => deleteTimetable(selectedTT.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-4">
                      <CalendarDays className="h-8 w-8" />
                    </div>
                    <div className="text-sm font-semibold text-slate-700">No timetable selected</div>
                    <div className="text-sm text-slate-500 mt-1">
                      Create a new timetable or select an existing one to manage.
                    </div>
                    {canManage && (
                      <button
                        onClick={openCreateTimetable}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
                      >
                        <Plus className="h-4 w-4" />
                        Create Timetable
                      </button>
                    )}
                  </div>
                )}

                {/* Quick Tip */}
                <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold">Quick Tip</div>
                      <div className="mt-2 text-sm text-white/90 leading-relaxed">
                        1. First, select a term and create time slots (periods)<br />
                        2. Then create a timetable for a specific class<br />
                        3. Use the Grid Builder to assign subjects to periods
                      </div>
                    </div>
                    <Sparkles className="h-5 w-5 text-white/90" />
                  </div>

                  {selectedTT && (
                    <Link
                      href={`/academics/timetable/${selectedTT.id}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-sm font-semibold transition"
                    >
                      <Grid3x3 className="h-4 w-4" />
                      Open Grid Builder
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Permissions Note */}
            {!canManage && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">View Only Access</div>
                    <div className="text-sm text-slate-600 mt-1">
                      Only ADMIN and ACADEMIC roles can create and edit time slots and timetables. 
                      You can view published timetables and use the grid builder.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Timetable Modal */}
      {openTTModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">Create Timetable</div>
                  <div className="text-sm text-slate-600">Set up a new timetable for a class</div>
                </div>
              </div>
              <button onClick={() => setOpenTTModal(false)} className="rounded-xl p-2 hover:bg-slate-100 transition">
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Timetable Title</label>
                <input
                  value={ttTitle}
                  onChange={(e) => setTtTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="e.g. Senior 2 Timetable 2024"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">Term</label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={ttTermId}
                    onChange={(e) => setTtTermId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Select term...</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {termLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">Class</label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={ttClassId}
                    onChange={(e) => setTtClassId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Select class...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.grade_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-semibold">Note</div>
                <p className="mt-1 text-sm text-slate-600">
                  Timetables start as DRAFT. After creating time slots, use the Grid Builder to assign subjects to periods.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setOpenTTModal(false)} 
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createTimetable}
                  disabled={savingTT}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {savingTT ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingTT ? "Creating..." : "Create Timetable"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slot Modal */}
      {openSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {slotMode === "EDIT" ? "Edit Time Slot" : "Add Time Slot"}
                  </div>
                  <div className="text-sm text-slate-600">Define a period for the timetable</div>
                </div>
              </div>
              <button onClick={() => setOpenSlotModal(false)} className="rounded-xl p-2 hover:bg-slate-100 transition">
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Term</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={slotTermId}
                  onChange={(e) => setSlotTermId(e.target.value ? Number(e.target.value) : "")}
                  disabled={slotMode === "EDIT"}
                >
                  <option value="">Select term...</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {termLabel(t)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">Period Name</label>
                  <input 
                    value={slotName} 
                    onChange={(e) => setSlotName(e.target.value)} 
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                    placeholder="P1 / BREAK / LUNCH" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">Display Order</label>
                  <input
                    type="number"
                    value={slotOrder}
                    onChange={(e) => setSlotOrder(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">Start Time</label>
                  <input 
                    type="time" 
                    value={slotStart} 
                    onChange={(e) => setSlotStart(e.target.value)} 
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">End Time</label>
                  <input 
                    type="time" 
                    value={slotEnd} 
                    onChange={(e) => setSlotEnd(e.target.value)} 
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setOpenSlotModal(false)} 
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSlot}
                  disabled={savingSlot}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {savingSlot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingSlot ? "Saving..." : "Save Time Slot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
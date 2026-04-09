"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";
import {
  ArrowLeft,
  BookOpen,
  Download,
  FileText,
  GraduationCap,
  Search,
  Filter,
  BookMarked,
  Sparkles,
  Calendar,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  Eye,
  TrendingUp,
  Users,
  File,
  Image,
  FileArchive,
  FileSpreadsheet,
  FileJson,
  FileType,
  FileVideo,
  FileAudio,
  Copy,
  CheckCircle,
  Tag,
  School,
} from "lucide-react";

type ClassRow = {
  id: number;
  grade_name: string;
};

type SubjectRow = {
  id: number;
  name: string;
  code?: string | null;
  grade_id: number | null;
  class?: {
    id: number;
    grade_name: string;
  } | null;
};

type NoteRow = {
  id: number;
  description: string | null;
  notes_content: string;
  notes_file_url: string | null;
  created: string;
  subject_id: number | null;
  grade_id: number | null;
  subject: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  class: {
    id: number;
    grade_name: string;
  } | null;
};

type RawSubjectRow = {
  id: number;
  name: string;
  code?: string | null;
  grade_id: number | null;
  class:
    | {
        id: number;
        grade_name: string;
      }[]
    | {
        id: number;
        grade_name: string;
      }
    | null;
};

type RawNoteRow = {
  id: number;
  description: string | null;
  notes_content: string;
  notes_file_url: string | null;
  created: string;
  subject_id: number | null;
  grade_id: number | null;
  subject:
    | {
        id: number;
        name: string;
        code?: string | null;
      }[]
    | {
        id: number;
        name: string;
        code?: string | null;
      }
    | null;
  class:
    | {
        id: number;
        grade_name: string;
      }[]
    | {
        id: number;
        grade_name: string;
      }
    | null;
};

const getSingleRelation = <T,>(value: T[] | T | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
};

const normalizeSubject = (row: RawSubjectRow): SubjectRow => ({
  id: row.id,
  name: row.name,
  code: row.code ?? null,
  grade_id: row.grade_id,
  class: getSingleRelation(row.class),
});

const normalizeNote = (row: RawNoteRow): NoteRow => ({
  id: row.id,
  description: row.description,
  notes_content: row.notes_content,
  notes_file_url: row.notes_file_url,
  created: row.created,
  subject_id: row.subject_id,
  grade_id: row.grade_id,
  subject: getSingleRelation(row.subject),
  class: getSingleRelation(row.class),
});

// Helper function to get file icon based on extension
const getFileIcon = (url: string | null) => {
  if (!url) return File;

  const extension = url.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return FileText;
    case "doc":
    case "docx":
      return FileText;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return Image;
    case "mp4":
    case "mov":
      return FileVideo;
    case "mp3":
    case "wav":
      return FileAudio;
    case "xls":
    case "xlsx":
      return FileSpreadsheet;
    case "zip":
    case "rar":
      return FileArchive;
    case "json":
      return FileJson;
    default:
      return FileType;
  }
};

const getFileTypeName = (url: string | null): string => {
  if (!url) return "No file";

  const extension = url.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "PDF Document";
    case "doc":
    case "docx":
      return "Word Document";
    case "jpg":
      return "JPEG Image";
    case "jpeg":
      return "JPEG Image";
    case "png":
      return "PNG Image";
    case "mp4":
      return "Video File";
    case "mp3":
      return "Audio File";
    default:
      return `${extension?.toUpperCase() || "File"} File`;
  }
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

export default function StudentNotesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedNote, setSelectedNote] = useState<NoteRow | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [copied, setCopied] = useState(false);

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "subject">("newest");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [classesRes, subjectsRes, notesRes] = await Promise.all([
          supabase
            .from("class")
            .select("id, grade_name")
            .order("grade_name", { ascending: true }),

          supabase
            .from("subject")
            .select(`
              id,
              name,
              code,
              grade_id,
              class:grade_id (
                id,
                grade_name
              )
            `)
            .order("name", { ascending: true }),

          supabase
            .from("notes")
            .select(`
              id,
              description,
              notes_content,
              notes_file_url,
              created,
              subject_id,
              grade_id,
              subject:subject_id (
                id,
                name,
                code
              ),
              class:grade_id (
                id,
                grade_name
              )
            `)
            .order("id", { ascending: false }),
        ]);

        if (classesRes.error) throw classesRes.error;
        if (subjectsRes.error) throw subjectsRes.error;
        if (notesRes.error) throw notesRes.error;

        const normalizedSubjects: SubjectRow[] = ((subjectsRes.data || []) as RawSubjectRow[]).map(
          normalizeSubject
        );

        const normalizedNotes: NoteRow[] = ((notesRes.data || []) as RawNoteRow[]).map(
          normalizeNote
        );

        setClasses((classesRes.data as ClassRow[]) ?? []);
        setSubjects(normalizedSubjects);
        setNotes(normalizedNotes);
      } catch (error: any) {
        console.error("Failed to load student notes:", error);
        setError(error.message || "Failed to load notes. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredSubjects = useMemo(() => {
    let result = subjects;

    if (gradeFilter) {
      result = result.filter(
        (subject) => String(subject.grade_id ?? "") === gradeFilter
      );
    }

    return [...result].sort((a, b) => {
      const aLabel = `${a.name} (${a.class?.grade_name ?? ""})`;
      const bLabel = `${b.name} (${b.class?.grade_name ?? ""})`;
      return aLabel.localeCompare(bLabel);
    });
  }, [subjects, gradeFilter]);

  const filteredNotes = useMemo(() => {
    const filtered = notes.filter((note) => {
      const haystack = [
        note.description ?? "",
        note.notes_content ?? "",
        note.subject?.name ?? "",
        note.class?.grade_name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(search.toLowerCase());

      const matchesGrade = gradeFilter
        ? String(note.grade_id ?? "") === gradeFilter
        : true;

      const matchesSubject = subjectFilter
        ? String(note.subject_id ?? "") === subjectFilter
        : true;

      return matchesSearch && matchesGrade && matchesSubject;
    });

    if (sortBy === "newest") {
      filtered.sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
      );
    } else if (sortBy === "oldest") {
      filtered.sort(
        (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
      );
    } else if (sortBy === "subject") {
      filtered.sort((a, b) =>
        (a.subject?.name || "").localeCompare(b.subject?.name || "")
      );
    }

    return filtered;
  }, [notes, search, gradeFilter, subjectFilter, sortBy]);

  const handleGradeChange = (value: string) => {
    setGradeFilter(value);
    setSubjectFilter("");
  };

  const clearFilters = () => {
    setSearch("");
    setGradeFilter("");
    setSubjectFilter("");
    setSortBy("newest");
  };

  const handleQuickView = (note: NoteRow) => {
    setSelectedNote(note);
    setShowQuickView(true);
  };

  const closeQuickView = () => {
    setShowQuickView(false);
    setSelectedNote(null);
    setCopied(false);
  };

  const copyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const totalNotes = filteredNotes.length;
  const activeFilters = gradeFilter || subjectFilter || search ? 1 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 blur-lg opacity-30" />
              <div className="relative rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-white shadow-lg">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                Student Notes
              </h1>
              <p className="text-sm text-slate-500">
                Browse and explore learning resources
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/student/quizzes"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm"
            >
              <GraduationCap className="h-4 w-4" />
              Quizzes
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-8 shadow-xl md:p-10">
          <div className="absolute inset-0 opacity-10" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              Learning Resources
            </div>

            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Explore Study Materials
            </h2>

            <p className="mt-3 max-w-2xl text-base leading-relaxed text-blue-50">
              Access comprehensive notes, study guides, and learning materials organized by grade and subject.
              Filter through our collection to find exactly what you need.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white">
                <BookMarked className="h-4 w-4" />
                <span>{notes.length} Notes Available</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white">
                <Users className="h-4 w-4" />
                <span>Student-Friendly</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white">
                <TrendingUp className="h-4 w-4" />
                <span>Regularly Updated</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex w-full items-center justify-between p-5 text-left"
            type="button"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-slate-900">Filters & Search</span>
              {activeFilters > 0 && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Active
                </span>
              )}
            </div>
            <ChevronRight
              className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
                showFilters ? "rotate-90" : ""
              }`}
            />
          </button>

          {showFilters && (
            <div className="border-t border-slate-100 p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="relative md:col-span-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search notes by title or content..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <select
                  value={gradeFilter}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">All Grades</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.grade_name}
                    </option>
                  ))}
                </select>

                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  disabled={!gradeFilter}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {gradeFilter ? "All Subjects" : "Select grade first"}
                  </option>
                  {filteredSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                      {subject.code ? ` (${subject.code})` : ""}
                      {subject.class?.grade_name ? ` - ${subject.class.grade_name}` : ""}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="subject">Sort by Subject</option>
                </select>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-700">
                  <span className="font-semibold">{totalNotes}</span> notes found
                </div>

                {(gradeFilter || subjectFilter || search) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 md:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="mt-4 text-sm text-slate-500">Loading notes...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center shadow-sm">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
            <h3 className="mt-4 text-lg font-semibold text-red-800">Error Loading Notes</h3>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              type="button"
            >
              Try Again
            </button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No notes found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {gradeFilter || subjectFilter || search
                ? "Try adjusting your filters to see more notes."
                : "Notes will appear here once they're added."}
            </p>
            {(gradeFilter || subjectFilter || search) && (
              <button
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                type="button"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Available Notes
                </h3>
                <p className="text-sm text-slate-500">
                  Showing {totalNotes} note{totalNotes === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Eye className="h-3.5 w-3.5" />
                <span>Click "Preview" to view full content</span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredNotes.map((note) => {
                const FileIcon = getFileIcon(note.notes_file_url);
                const hasFile = note.notes_file_url !== null;
                const contentPreview =
                  note.notes_content.slice(0, 200) +
                  (note.notes_content.length > 200 ? "..." : "");

                return (
                  <div
                    key={note.id}
                    className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 blur transition-opacity group-hover:opacity-20" />

                    <div className="relative p-6">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 text-white shadow-md">
                          <BookOpen className="h-5 w-5" />
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            <Calendar className="h-3 w-3" />
                            {formatDate(note.created)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="line-clamp-2 text-xl font-bold text-slate-900 transition-colors group-hover:text-blue-700">
                          {note.description || "Untitled Note"}
                        </h3>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {note.subject && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              <Tag className="h-3 w-3" />
                              {note.subject.name}
                              {note.subject.code ? ` (${note.subject.code})` : ""}
                            </span>
                          )}

                          {note.class && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                              <School className="h-3 w-3" />
                              {note.class.grade_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="line-clamp-4 text-sm leading-relaxed text-slate-600">
                          {contentPreview}
                        </p>
                      </div>

                      {hasFile && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-3">
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4 text-slate-500" />
                            <span className="flex-1 truncate text-xs text-slate-600">
                              {note.notes_file_url?.split("/").pop()}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {getFileTypeName(note.notes_file_url)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 flex gap-3">
                        <button
                          onClick={() => handleQuickView(note)}
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          type="button"
                        >
                          <Eye className="mr-1.5 inline h-4 w-4" />
                          Preview
                        </button>

                        {hasFile && (
                          <a
                            href={note.notes_file_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md"
                          >
                            <Download className="mr-1.5 inline h-4 w-4" />
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showQuickView && selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-2.5 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedNote.description || "Note Preview"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedNote.subject?.name} • {selectedNote.class?.grade_name}
                  </p>
                </div>
              </div>
              <button
                onClick={closeQuickView}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Added on</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {new Date(selectedNote.created).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Subject</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {selectedNote.subject?.name || "General"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <School className="h-3.5 w-3.5" />
                    <span>Grade</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {selectedNote.class?.grade_name || "All Grades"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Notes Content
                </h3>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {selectedNote.notes_content}
                  </p>
                </div>

                <button
                  onClick={() => copyContent(selectedNote.notes_content)}
                  className="mt-4 inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700"
                  type="button"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Copied to clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy content
                    </>
                  )}
                </button>
              </div>

              {selectedNote.notes_file_url && (
                <div className="rounded-xl border border-slate-200 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Attached File
                  </h3>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const Icon = getFileIcon(selectedNote.notes_file_url);
                        return <Icon className="h-8 w-8 text-blue-600" />;
                      })()}
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {selectedNote.notes_file_url.split("/").pop()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {getFileTypeName(selectedNote.notes_file_url)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={selectedNote.notes_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white p-5">
              <button
                onClick={closeQuickView}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                type="button"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
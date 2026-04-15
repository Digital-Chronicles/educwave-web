"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import supabase from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FileText,
  Filter,
  Loader2,
  Save,
  Search,
  Users,
  XCircle,
  Upload,
  Download,
  Edit3,
  Grid,
  List,
} from "lucide-react";

type AppRole =
  | "ADMIN"
  | "ACADEMIC"
  | "TEACHER"
  | "FINANCE"
  | "STUDENT"
  | "PARENT";

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  school_id: string | null;
}

interface SchoolRow {
  id: string;
  school_name: string;
}

interface ClassRow {
  id: number;
  grade_name: string;
}

interface SubjectRow {
  id: number;
  name: string;
  grade_id: number | null;
}

interface TermExamSessionRow {
  id: number;
  term_name: "TERM_1" | "TERM_2" | "TERM_3";
  year: number;
}

interface ExamSessionRow {
  id: number;
  term_id: number;
  exam_type: "BOT" | "MOT" | "EOT";
  term?: { term_name: string; year: number }[] | null;
}

interface ParsedExamSession {
  id: number;
  term_id: number;
  exam_type: "BOT" | "MOT" | "EOT";
  term_name: string;
  term_year: number;
}

interface StudentRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  current_grade_id: number | null;
}

type MarksMatrix = Record<string, Record<string, number | "">>;

interface PlaceholderQuestionMap {
  [subjectId: string]: {
    id: number;
    max_score: number;
  } | null;
}

export default function PercentageEntryPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [termSessions, setTermSessions] = useState<TermExamSessionRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);
  const [parsedExamSessions, setParsedExamSessions] = useState<
    ParsedExamSession[]
  >([]);

  const [termExamId, setTermExamId] = useState("");
  const [examSessionId, setExamSessionId] = useState("");
  const [classId, setClassId] = useState("");

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjectsForClass, setSubjectsForClass] = useState<SubjectRow[]>([]);
  const [placeholderQuestions, setPlaceholderQuestions] =
    useState<PlaceholderQuestionMap>({});

  const [marksMatrix, setMarksMatrix] = useState<MarksMatrix>({});
  const [saving, setSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/");
        return;
      }

      setUserEmail(session.user.email ?? null);
      setAuthChecking(false);
    })();
  }, [router]);

  useEffect(() => {
    if (authChecking) return;

    const loadBase = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) {
        setErrorMsg(userErr.message);
        setLoading(false);
        return;
      }
      if (!user) {
        setErrorMsg("Could not find authenticated user.");
        setLoading(false);
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, role, school_id")
        .eq("user_id", user.id)
        .single();

      if (pErr || !p) {
        setErrorMsg(pErr?.message || "Profile not found.");
        setLoading(false);
        return;
      }
      setProfile(p as ProfileRow);

      if (!p.school_id) {
        setLoading(false);
        return;
      }

      const { data: sch, error: sErr } = await supabase
        .from("general_information")
        .select("id, school_name")
        .eq("id", p.school_id)
        .single();

      if (sErr || !sch) {
        setErrorMsg(
          sErr?.message || "School not found in general_information.",
        );
        setLoading(false);
        return;
      }
      setSchool(sch as SchoolRow);

      const [classRes, subjRes, termRes, sessionRes] = await Promise.all([
        supabase
          .from("class")
          .select("id, grade_name")
          .eq("school_id", sch.id)
          .order("id"),
        supabase
          .from("subject")
          .select("id, name, grade_id")
          .eq("school_id", sch.id)
          .order("name"),
        supabase
          .from("term_exam_session")
          .select("id, term_name, year")
          .eq("school_id", sch.id)
          .order("id", { ascending: false }),
        supabase
          .from("exam_session")
          .select(
            "id, term_id, exam_type, term:term_exam_session(term_name, year)",
          )
          .eq("school_id", sch.id)
          .order("id", { ascending: false }),
      ]);

      if (classRes.error) setErrorMsg(classRes.error.message);
      if (subjRes.error) setErrorMsg(subjRes.error.message);
      if (termRes.error) setErrorMsg(termRes.error.message);
      if (sessionRes.error) setErrorMsg(sessionRes.error.message);

      setClasses((classRes.data ?? []) as ClassRow[]);
      setSubjects((subjRes.data ?? []) as SubjectRow[]);
      setTermSessions((termRes.data ?? []) as TermExamSessionRow[]);

      const sessionData = (sessionRes.data ?? []) as ExamSessionRow[];
      setExamSessions(sessionData);

      const parsedSessions: ParsedExamSession[] = sessionData.map(
        (session) => ({
          id: session.id,
          term_id: session.term_id,
          exam_type: session.exam_type,
          term_name: session.term?.[0]?.term_name || "",
          term_year: session.term?.[0]?.year || 0,
        }),
      );
      setParsedExamSessions(parsedSessions);

      setLoading(false);
    };

    loadBase();
  }, [authChecking]);

  const selectedExamSession = useMemo(() => {
    if (!examSessionId) return null;
    return (
      parsedExamSessions.find((x) => Number(x.id) === Number(examSessionId)) ??
      null
    );
  }, [parsedExamSessions, examSessionId]);

  const canLoad = useMemo(() => {
    if (!school?.id) return false;
    if (!termExamId || !examSessionId || !classId) return false;
    if (!selectedExamSession) return false;
    return Number(termExamId) === Number(selectedExamSession.term_id);
  }, [school?.id, termExamId, examSessionId, classId, selectedExamSession]);

  const filteredSubjects = useMemo(() => {
    if (!classId) return [];
    return subjects.filter((s) => Number(s.grade_id ?? 0) === Number(classId));
  }, [subjects, classId]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      return name.includes(q) || s.registration_id.toLowerCase().includes(q);
    });
  }, [students, studentSearch]);

  // Load students and create placeholder questions for all subjects
  useEffect(() => {
    if (!canLoad || !school?.id) {
      setStudents([]);
      setSubjectsForClass([]);
      setPlaceholderQuestions({});
      setMarksMatrix({});
      return;
    }

    const run = async () => {
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        // Load students
        const { data: st, error: sErr } = await supabase
          .from("students")
          .select("registration_id, first_name, last_name, current_grade_id")
          .eq("school_id", school.id)
          .eq("current_grade_id", Number(classId))
          .order("first_name");

        if (sErr) throw sErr;

        const studentsList = (st ?? []) as StudentRow[];
        setStudents(studentsList);
        setSubjectsForClass(filteredSubjects);

        // Initialize marks matrix
        const initialMatrix: MarksMatrix = {};
        for (const student of studentsList) {
          initialMatrix[student.registration_id] = {};
          for (const subject of filteredSubjects) {
            initialMatrix[student.registration_id][subject.id.toString()] = "";
          }
        }

        // Create placeholder questions for each subject
        const placeholderMap: PlaceholderQuestionMap = {};
        for (const subject of filteredSubjects) {
          // First, try to find existing PERCENTAGE question
          let { data: pq, error: qErr } = await supabase
            .from("assessment_question")
            .select("id, question_number, max_score")
            .eq("school_id", school.id)
            .eq("term_exam_id", Number(termExamId))
            .eq("grade_id", Number(classId))
            .eq("subject_id", subject.id)
            .in("question_number", ["PERCENTAGE", "PERCENT", "PCT"])
            .order("id", { ascending: true })
            .limit(1);

          if (qErr) throw qErr;

          let found = (pq?.[0] ?? null) as any;

          if (!found) {
            // Get or create topic (without topic_description if it doesn't exist)
            const { data: topicRows, error: tErr } = await supabase
              .from("assessment_topics")
              .select("id")
              .eq("school_id", school.id)
              .eq("grade_id", Number(classId))
              .eq("subject_id", subject.id)
              .order("id", { ascending: true })
              .limit(1);

            if (tErr) throw tErr;

            let topicId = topicRows?.[0]?.id;
            if (!topicId) {
              // Create default topic - only include fields that exist in your schema
              const topicData: any = {
                school_id: school.id,
                grade_id: Number(classId),
                subject_id: subject.id,
                name: "General Assessment",
              };

              // Try to add description only if column exists (catch error if it doesn't)
              try {
                const { data: newTopic, error: cTopicErr } = await supabase
                  .from("assessment_topics")
                  .insert(topicData)
                  .select("id")
                  .single();

                if (cTopicErr) throw cTopicErr;
                topicId = newTopic.id;
              } catch (topicErr: any) {
                // If error is about missing column, try without description
                if (topicErr.message?.includes("topic_description")) {
                  delete topicData.topic_description;
                  const { data: newTopic, error: cTopicErr2 } = await supabase
                    .from("assessment_topics")
                    .insert(topicData)
                    .select("id")
                    .single();

                  if (cTopicErr2) throw cTopicErr2;
                  topicId = newTopic.id;
                } else {
                  throw topicErr;
                }
              }
            }

            const payload = {
              term_exam_id: Number(termExamId),
              exam_type_id: Number(examSessionId),
              question_number: "PERCENTAGE",
              topic_id: Number(topicId),
              grade_id: Number(classId),
              subject_id: subject.id,
              max_score: 100,
              school_id: school.id,
            };

            const { data: created, error: cErr } = await supabase
              .from("assessment_question")
              .upsert(payload, {
                onConflict: "term_exam_id,question_number,grade_id,subject_id",
              })
              .select("id, question_number, max_score")
              .single();

            if (cErr) throw cErr;
            found = created;
          }

          placeholderMap[subject.id.toString()] = found;

          // Load existing marks for this subject
          if (found?.id) {
            const { data: existing, error: exErr } = await supabase
              .from("assessment_examresult")
              .select("student_id, percentage, score")
              .eq("school_id", school.id)
              .eq("exam_session_id", Number(examSessionId))
              .eq("grade_id", Number(classId))
              .eq("subject_id", subject.id)
              .eq("question_id", Number(found.id));

            if (exErr) throw exErr;

            if (existing?.length) {
              for (const r of existing as any[]) {
                // Use percentage field if available, otherwise use score
                const v = r.percentage ?? r.score ?? "";
                if (
                  initialMatrix[r.student_id] &&
                  initialMatrix[r.student_id][subject.id.toString()] !==
                    undefined
                ) {
                  initialMatrix[r.student_id][subject.id.toString()] =
                    v === null ? "" : Number(v);
                }
              }
            }
          }
        }

        setPlaceholderQuestions(placeholderMap);
        setMarksMatrix(initialMatrix);
      } catch (e: any) {
        console.error("Error loading data:", e);
        setErrorMsg(e?.message || "Failed to load data.");
      }
    };

    run();
  }, [
    canLoad,
    school?.id,
    termExamId,
    examSessionId,
    classId,
    filteredSubjects,
  ]);

  const setMark = (studentId: string, subjectId: string, value: string) => {
    const v = value === "" ? "" : Number(value);
    setMarksMatrix((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: v === "" ? "" : Number.isFinite(v) ? v : "",
      },
    }));
  };

  const handleSave = async () => {
    if (!school?.id) return;

    if (!canLoad) {
      setErrorMsg(
        "Select Term, Exam Session (matching term), and Class first.",
      );
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const rows: any[] = [];
      let savedCount = 0;

      for (const student of filteredStudents) {
        for (const subject of filteredSubjects) {
          const placeholder = placeholderQuestions[subject.id.toString()];
          if (!placeholder?.id) {
            console.warn(`No placeholder for subject ${subject.id}`);
            continue;
          }

          const value =
            marksMatrix[student.registration_id]?.[subject.id.toString()];
          if (value === "" || value === undefined || value === null) continue;

          const pct = Number(value);
          if (!Number.isFinite(pct)) continue;

          if (pct < 0 || pct > 100) {
            throw new Error(
              `Invalid percentage for ${student.registration_id} - ${subject.name}. Must be between 0 and 100.`,
            );
          }

          rows.push({
            student_id: student.registration_id,
            question_id: Number(placeholder.id),
            grade_id: Number(classId),
            subject_id: subject.id,
            topic_id: null,
            exam_session_id: Number(examSessionId),
            score: pct, // Store percentage as score
            total_score: null,
            max_possible: 100,
            percentage: Number(pct.toFixed(2)),
            school_id: school.id,
          });
        }
      }

      if (rows.length === 0) {
        setErrorMsg("Nothing to save. Enter at least one percentage.");
        setSaving(false);
        return;
      }

      // Save each row individually to better track errors
      for (const row of rows) {
        const { error } = await supabase
          .from("assessment_examresult")
          .upsert(row, {
            onConflict: "school_id,student_id,question_id,exam_session_id",
          });

        if (error) {
          console.error("Error saving row:", row, error);
          throw new Error(
            `Failed to save for ${row.student_id}: ${error.message}`,
          );
        }
        savedCount++;
      }

      setSuccessMsg(`Saved ${savedCount} percentage entries successfully.`);

      // Refresh data to show saved marks
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e: any) {
      console.error("Save error:", e);
      setErrorMsg(e?.message || "Failed to save percentages.");
    } finally {
      setSaving(false);
    }
  };

  const handleCSVUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const text = await file.text();
      const lines = text.split("\n");
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/^["']|["']$/g, ""));

      // Expected format: Registration ID, First Name, Last Name, Subject1, Subject2, ...
      const subjectColumns = headers.slice(3);

      // Map subject columns to actual subject IDs
      const subjectMap: { [columnName: string]: number } = {};
      for (const col of subjectColumns) {
        const subject = filteredSubjects.find(
          (s) => s.name.toLowerCase() === col.toLowerCase(),
        );
        if (subject) {
          subjectMap[col] = subject.id;
        }
      }

      const newMatrix = { ...marksMatrix };
      let processedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line handling quoted values
        const values: string[] = [];
        let inQuotes = false;
        let currentValue = "";

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = "";
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim());

        const registrationId = values[0]?.replace(/^["']|["']$/g, "");
        const firstName = values[1]?.replace(/^["']|["']$/g, "");
        const lastName = values[2]?.replace(/^["']|["']$/g, "");

        // Find student by registration ID or name
        const student = students.find(
          (s) =>
            s.registration_id === registrationId ||
            (s.first_name === firstName && s.last_name === lastName),
        );

        if (!student) continue;

        // Process marks for each subject
        for (let j = 0; j < subjectColumns.length; j++) {
          const colName = subjectColumns[j];
          const subjectId = subjectMap[colName];
          if (!subjectId) continue;

          const markValue = values[j + 3]?.replace(/^["']|["']$/g, "");
          if (markValue && !isNaN(Number(markValue))) {
            const mark = Number(markValue);
            if (mark >= 0 && mark <= 100) {
              if (!newMatrix[student.registration_id]) {
                newMatrix[student.registration_id] = {};
              }
              newMatrix[student.registration_id][subjectId.toString()] = mark;
              processedCount++;
            }
          }
        }
      }

      setMarksMatrix(newMatrix);
      setSuccessMsg(`Successfully imported ${processedCount} marks from CSV.`);
    } catch (e: any) {
      console.error("CSV parse error:", e);
      setErrorMsg("Failed to parse CSV file: " + e.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const downloadCSVTemplate = () => {
    if (!filteredSubjects.length || !filteredStudents.length) {
      setErrorMsg("Please select class first to generate template.");
      return;
    }

    const headers = [
      "Registration ID",
      "First Name",
      "Last Name",
      ...filteredSubjects.map((s) => s.name),
    ];
    const rows = filteredStudents.map((student) => [
      student.registration_id,
      student.first_name,
      student.last_name,
      ...filteredSubjects.map((subject) => {
        const existingMark =
          marksMatrix[student.registration_id]?.[subject.id.toString()];
        return existingMark !== undefined && existingMark !== ""
          ? existingMark
          : "";
      }),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marks_template_${classId}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSubjectMarksStatus = (subjectId: string) => {
    let filled = 0;
    let total = 0;
    for (const student of filteredStudents) {
      const mark = marksMatrix[student.registration_id]?.[subjectId];
      if (mark !== undefined && mark !== "") {
        filled++;
      }
      total++;
    }
    return {
      filled,
      total,
      percentage: total > 0 ? (filled / total) * 100 : 0,
    };
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading Percentage Entry...</p>
        </div>
      </div>
    );
  }

  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                School Configuration Required
              </h3>
              <p className="text-gray-600 mb-6">
                Your account needs to be linked to a school before you can enter
                marks.
              </p>
              <button
                onClick={() => router.push("/management/school-settings")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Configure School Settings
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex">
        <AppShell />

        <main className="flex-1 p-6">
          <div className="max-w-[95vw] mx-auto space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Link
                    href="/assessments"
                    className="hover:text-gray-700 inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Assessments
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-gray-700 font-medium">
                    Bulk Percentage Entry
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bulk Percentage Entry
                </h1>
                <p className="text-gray-600">
                  Enter marks for all subjects at once or upload via CSV file.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setViewMode(viewMode === "matrix" ? "list" : "matrix")
                  }
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                >
                  {viewMode === "matrix" ? (
                    <List className="w-4 h-4" />
                  ) : (
                    <Grid className="w-4 h-4" />
                  )}
                  {viewMode === "matrix" ? "Subject View" : "Matrix View"}
                </button>

                <button
                  onClick={downloadCSVTemplate}
                  disabled={!canLoad || filteredStudents.length === 0}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>

                <label className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 cursor-pointer disabled:opacity-50">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload CSV"}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    disabled={!canLoad || uploading}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleSave}
                  disabled={saving || !canLoad}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? "Saving..." : "Save All"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <p className="text-sm text-green-700">{successMsg}</p>
              </div>
            )}

            

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <h2 className="font-semibold text-gray-900">
                      Select Assessment
                    </h2>
                  </div>
                  <div className="text-sm text-gray-500">
                    {canLoad ? "Ready" : "Pick all fields"}
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Term *
                    </label>
                    <select
                      value={termExamId}
                      onChange={(e) => {
                        setTermExamId(e.target.value);
                        setExamSessionId(""); // Reset exam session when term changes
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select term</option>
                      {termSessions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.term_name.replace("_", " ")} {t.year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Session *
                    </label>
                    <select
                      value={examSessionId}
                      onChange={(e) => setExamSessionId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select session</option>
                      {parsedExamSessions
                        .filter(
                          (es) =>
                            !termExamId || es.term_id === Number(termExamId),
                        ) // Only show sessions for selected term
                        .map((es) => (
                          <option key={es.id} value={es.id}>
                            {es.exam_type}{" "}
                            {es.term_name
                              ? ` — ${es.term_name.replace("_", " ")} ${es.term_year}`
                              : ""}
                          </option>
                        ))}
                    </select>

                    {termExamId &&
                      examSessionId &&
                      selectedExamSession &&
                      Number(termExamId) !==
                        Number(selectedExamSession.term_id) && (
                        <p className="text-xs text-red-600 mt-2">
                          This session belongs to a different term.
                        </p>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class *
                    </label>
                    <select
                      value={classId}
                      onChange={(e) => {
                        setClassId(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select class</option>
                      {classes.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.grade_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            

            {canLoad &&
              filteredSubjects.length > 0 &&
              filteredStudents.length > 0 && (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          {filteredStudents.length} student(s) ×{" "}
                          {filteredSubjects.length} subject(s)
                        </span>
                      </div>

                      <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Search name or reg no..."
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
                        />
                      </div>
                    </div>

                    {viewMode === "matrix" ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="sticky left-0 bg-gray-50 text-left py-3 px-4 text-sm font-medium text-gray-700 min-w-[200px] z-10">
                                Student
                              </th>
                              {filteredSubjects.map((subject) => {
                                const status = getSubjectMarksStatus(
                                  subject.id.toString(),
                                );
                                return (
                                  <th
                                    key={subject.id}
                                    className="text-left py-3 px-4 text-sm font-medium text-gray-700 min-w-[120px]"
                                  >
                                    <div>{subject.name}</div>
                                    <div className="text-xs text-gray-400 font-normal mt-1">
                                      {status.filled}/{status.total}
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {filteredStudents.map((student) => (
                              <tr
                                key={student.registration_id}
                                className="hover:bg-gray-50"
                              >
                                <td className="sticky left-0 bg-white py-3 px-4 z-10">
                                  <div className="font-medium text-gray-900">
                                    {student.first_name} {student.last_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {student.registration_id}
                                  </div>
                                </td>
                                {filteredSubjects.map((subject) => {
                                  const value =
                                    marksMatrix[student.registration_id]?.[
                                      subject.id.toString()
                                    ] ?? "";
                                  const invalid =
                                    value !== "" &&
                                    (Number(value) < 0 || Number(value) > 100);
                                  const placeholder =
                                    placeholderQuestions[subject.id.toString()];

                                  return (
                                    <td key={subject.id} className="py-3 px-4">
                                      <input
                                        value={value}
                                        onChange={(e) =>
                                          setMark(
                                            student.registration_id,
                                            subject.id.toString(),
                                            e.target.value,
                                          )
                                        }
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        disabled={!placeholder?.id}
                                        className={`w-28 px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 disabled:opacity-60 ${
                                          invalid
                                            ? "border-red-300 focus:ring-red-300"
                                            : "border-gray-300 focus:ring-blue-500"
                                        }`}
                                        placeholder="—"
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div>
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                          <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select subject</option>
                            {filteredSubjects.map((subject) => {
                              const status = getSubjectMarksStatus(
                                subject.id.toString(),
                              );
                              return (
                                <option key={subject.id} value={subject.id}>
                                  {subject.name} ({status.filled}/{status.total}{" "}
                                  entered)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {selectedSubject && (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 min-w-[250px]">
                                    Student
                                  </th>
                                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                                    Percentage (0–100)
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {filteredStudents.map((student) => {
                                  const value =
                                    marksMatrix[student.registration_id]?.[
                                      selectedSubject
                                    ] ?? "";
                                  const invalid =
                                    value !== "" &&
                                    (Number(value) < 0 || Number(value) > 100);
                                  const placeholder =
                                    placeholderQuestions[selectedSubject];

                                  return (
                                    <tr
                                      key={student.registration_id}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="py-3 px-4">
                                        <div className="font-medium text-gray-900">
                                          {student.first_name}{" "}
                                          {student.last_name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {student.registration_id}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <input
                                          value={value}
                                          onChange={(e) =>
                                            setMark(
                                              student.registration_id,
                                              selectedSubject,
                                              e.target.value,
                                            )
                                          }
                                          type="number"
                                          min={0}
                                          max={100}
                                          step="0.01"
                                          disabled={!placeholder?.id}
                                          className={`w-44 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 disabled:opacity-60 ${
                                            invalid
                                              ? "border-red-300 focus:ring-red-300"
                                              : "border-gray-300 focus:ring-blue-500"
                                          }`}
                                          placeholder="—"
                                        />
                                        {invalid && (
                                          <div className="text-xs text-red-600 mt-1">
                                            Must be 0–100
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-5 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {Object.values(marksMatrix).reduce(
                          (total, studentMarks) => {
                            return (
                              total +
                              Object.values(studentMarks).filter(
                                (m) => m !== "",
                              ).length
                            );
                          },
                          0,
                        )}{" "}
                        marks entered
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={saving || !canLoad}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {saving ? "Saving..." : "Save All Marks"}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <strong>💡 Tips:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>
                        Use <strong>Matrix View</strong> to see all subjects at
                        once for each student
                      </li>
                      <li>
                        Use <strong>Subject View</strong> to focus on one
                        subject at a time
                      </li>
                      <li>
                        Download the CSV template, fill in marks in Excel/Google
                        Sheets, then upload back
                      </li>
                      <li>
                        CSV format: Registration ID, First Name, Last Name,
                        Subject1, Subject2, ...
                      </li>
                      <li>
                        All subjects are saved simultaneously when you click
                        "Save All Marks"
                      </li>
                    </ul>
                  </div>
                </>
              )}

            {canLoad && filteredSubjects.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500">
                  No subjects found for this class. Please add subjects first.
                </p>
              </div>
            )}

            {canLoad && filteredStudents.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500">
                  No students found in this class.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

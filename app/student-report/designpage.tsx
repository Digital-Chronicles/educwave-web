"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";
import {
  Award,
  BookOpen,
  Download,
  Printer,
  School,
  User,
  Wand2,
  TrendingUp,
  Target,
  Filter,
  BarChart3,
  Edit,
  Save,
  RefreshCw,
  Hash,
  Layers,
  Trophy,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Copy,
  Users,
} from "lucide-react";

// ============ TYPES ============
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
  location?: string | null;
  contact_number?: string | null;
  email?: string | null;
  website?: string | null;
  school_badge?: string | null;
}

interface GradeRow {
  id: number;
  grade_name: string;
}

interface SubjectRow {
  id: number;
  name: string;
  grade_id: number | null;
  teacher_id: string | null;
}

interface TermExamRow {
  id: number;
  term_name: "TERM_1" | "TERM_2" | "TERM_3";
  year: number;
  start_date: string;
  end_date: string;
}

interface ExamSessionRow {
  id: number;
  exam_type: "BOT" | "MOT" | "EOT";
  term_id: number;
}

interface StudentRow {
  registration_id: string;
  lin_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  profile_picture_url?: string | null;
  payment_code: string | null;
}

interface QuestionRow {
  id: number;
  max_score: number;
  grade_id: number;
  subject_id: number | null;
  exam_type_id: number;
  question_number?: string;
}

interface ExamResultRow {
  id: number;
  student_id: string;
  registration_id?: string;
  question_id: number | null;
  grade_id: number;
  exam_session_id: number | null;
  score: number;
  percentage?: number;
}

interface TeacherInfo {
  registration_id: string;
  first_name: string | null;
  last_name: string | null;
  initials: string | null;
}

interface SubjectRowWithDetails {
  subject_id: number;
  subject_name: string;
  perSession: Array<{
    sessionId: number;
    exam_type: "BOT" | "MOT" | "EOT";
    total: number;
    possible: number;
    pct: number;
  }>;
  termPct: number;
  grade_text: string;
  pill: string;
  colorClass: string;
  unebGrade: number;
}

interface PerformanceAnalysis {
  bestSubject: string;
  worstSubject: string;
  bestSubjectGrade: string;
  worstSubjectGrade: string;
  strengthCount: number;
  improvementCount: number;
  subjectsAboveAverage: number;
  subjectsBelowAverage: number;
}

interface SessionDivision {
  aggregate: number;
  division: string;
  pill: string;
  best4Grades: string[];
  hasF9: boolean;
}

// ============ HELPER FUNCTIONS ============
const fmtName = (s: StudentRow) =>
  `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function termLabel(t?: TermExamRow | null) {
  if (!t) return "—";
  const tn =
    t.term_name === "TERM_1"
      ? "Term 1"
      : t.term_name === "TERM_2"
        ? "Term 2"
        : "Term 3";
  return `${tn} ${t.year}`;
}

// Check if class is lower primary
function isLowerPrimary(gradeName: string): boolean {
  const lowerPrimaryGrades = [
    "baby",
    "baby class",
    "top class",
    "middle",
    "middle class",
    "p1",
    "p.1",
    "primary 1",
    "p2",
    "p.2",
    "primary 2",
    "p3",
    "p.3",
    "primary 3",
  ];
  const normalizedName = gradeName.toLowerCase().trim();
  return lowerPrimaryGrades.some((grade) => normalizedName.includes(grade));
}

// UNEB Grading System
function unebSubjectGrade(pct: number): number {
  if (pct >= 95) return 1;
  if (pct >= 80) return 2;
  if (pct >= 70) return 3;
  if (pct >= 60) return 4;
  if (pct >= 55) return 5;
  if (pct >= 50) return 6;
  if (pct >= 45) return 7;
  if (pct >= 40) return 8;
  return 9;
}

function unebGradeText(g: number) {
  if (g === 1) return "D1";
  if (g === 2) return "D2";
  if (g === 3) return "C3";
  if (g === 4) return "C4";
  if (g === 5) return "C5";
  if (g === 6) return "C6";
  if (g === 7) return "P7";
  if (g === 8) return "P8";
  return "F9";
}

// Division calculation with F9 demotion logic
function unebDivisionFromAggregate(agg: number, hasF9: boolean): string {
  let baseDivision = "";

  if (agg >= 4 && agg <= 12) {
    baseDivision = "Division 1";
  } else if (agg >= 13 && agg <= 24) {
    baseDivision = "Division 2";
  } else if (agg >= 25 && agg <= 28) {
    baseDivision = "Division 3";
  } else if (agg >= 29 && agg <= 32) {
    baseDivision = "Division 4";
  } else if (agg >= 33 && agg <= 36) {
    baseDivision = "U";
  } else {
    baseDivision = "U";
  }

  if (hasF9) {
    if (baseDivision === "Division 1") {
      return "Division 2";
    } else if (baseDivision === "Division 2") {
      return "Division 3";
    } else if (baseDivision === "Division 3") {
      return "Division 4";
    }
  }

  return baseDivision;
}

function gradePillClass(txt: string) {
  if (txt.startsWith("D"))
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (txt.startsWith("C"))
    return "bg-blue-50 text-blue-700 border border-blue-200";
  if (txt.startsWith("P"))
    return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-rose-50 text-rose-700 border border-rose-200";
}

function divisionPillClass(division: string) {
  if (division === "Division 1") return "bg-emerald-600";
  if (division === "Division 2") return "bg-blue-600";
  if (division === "Division 3") return "bg-amber-600";
  if (division === "Division 4") return "bg-orange-600";
  return "bg-slate-600";
}

function gradeColor(pct: number) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-blue-600";
  if (pct >= 50) return "text-amber-600";
  return "text-rose-600";
}

function stableHash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pickStable(list: string[], key: string) {
  if (!list.length) return "";
  return list[stableHash(key) % list.length];
}

function perfBand(pct: number) {
  if (pct >= 85) return "excellent";
  if (pct >= 70) return "very_good";
  if (pct >= 60) return "good";
  if (pct >= 50) return "fair";
  return "poor";
}

function getSubjectComment(gradeText: string, pct: number): string {
  const shortComments: Record<string, string[]> = {
    D1: ["Excellent work.", "Excellent.", "Excellent."],
    D2: ["Very good performance.", "Very good performance."],
    C3: ["Good Attempt.", "Good Attempt.", "Good Attempt."],
    C4: ["Promising."],
    C5: ["Aim higher."],
    C6: ["More effort."],
    P7: ["More Effort Needed."],
    P8: ["Next time."],
    F9: ["Next time"]
  };
  const comments = shortComments[gradeText as keyof typeof shortComments] || shortComments.C3;
  return pickStable(comments, `${gradeText}${pct}`);
}

function getClassTeacherComment(pct: number, studentName: string): string {
  const band = perfBand(pct);

  const templates: Record<string, string[]> = {
    excellent: [
      `${studentName} has performed excellently. Keep shining!`,
      `Outstanding performance by ${studentName}. Very proud!`,
      `Excellent work throughout the term. ${studentName} is a star!`,
    ],
    very_good: [
      `${studentName} performed very well. Good job!`,
      `Good consistent performance. Well done ${studentName}!`,
      `Strong work ethic demonstrated. Keep it up ${studentName}!`,
    ],
    good: [
      `${studentName}'s performance was satisfactory. Could do better.`,
      `Average performance with room for improvement.`,
      `Fair effort shown throughout. Aim higher next term.`,
    ],
    fair: [
      `${studentName}'s performance was satisfactory. Could do better.`,
      `Average performance with room for improvement.`,
      `Fair effort shown throughout. Aim higher next term.`,
    ],
    poor: [
      `${studentName}'s performance was satisfactory. Could do better.`,
      `Average performance with room for improvement.`,
      `Fair effort shown throughout. Aim higher next term.`,
    ],
  };

  return pickStable(templates[band] || templates.good, `${studentName}${pct}`);
}

function getHeadTeacherComment(pct: number, division: string): string {
  const band = perfBand(pct);
  const templates: Record<string, string[]> = {
    excellent: ["Excellent achievement. Top performance in class.", "Outstanding student. Sets a good example."],
    very_good: ["Very good performance. Maintain high standards.", "Strong academic showing. Keep it up."],
    good: ["Satisfactory performance. Room for improvement.", "Average results. Could do better with more effort."],
    fair: ["Satisfactory performance. Room for improvement.", "Average results. Could do better with more effort."],
    poor: ["Satisfactory performance. Room for improvement.", "Average results. Could do better with more effort."],
  };
  return pickStable(templates[band] || templates.good, `${division}${pct}`);
}

function tinyToast(message: string) {
  const el = document.createElement("div");
  el.className = "fixed top-4 right-4 z-50 rounded-lg bg-gray-900 text-white px-4 py-2 text-sm shadow-lg";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function buildLocalKey(schoolId: string, gradeId: string, termId: string) {
  return `report_data::${schoolId}::${gradeId}::${termId}`;
}

function analyzePerformance(subjectRows: SubjectRowWithDetails[]): PerformanceAnalysis {
  if (subjectRows.length === 0) {
    return {
      bestSubject: "—",
      worstSubject: "—",
      bestSubjectGrade: "—",
      worstSubjectGrade: "—",
      strengthCount: 0,
      improvementCount: 0,
      subjectsAboveAverage: 0,
      subjectsBelowAverage: 0,
    };
  }

  const bestSubject = subjectRows.reduce((best, current) => current.termPct > best.termPct ? current : best);
  const worstSubject = subjectRows.reduce((worst, current) => current.termPct < worst.termPct ? current : worst);
  const strengths = subjectRows.filter((s) => s.termPct >= 70);
  const improvements = subjectRows.filter((s) => s.termPct < 50);
  const aboveAverage = subjectRows.filter((s) => s.termPct >= 60);
  const belowAverage = subjectRows.filter((s) => s.termPct < 60);

  return {
    bestSubject: bestSubject.subject_name,
    worstSubject: worstSubject.subject_name,
    bestSubjectGrade: bestSubject.grade_text,
    worstSubjectGrade: worstSubject.grade_text,
    strengthCount: strengths.length,
    improvementCount: improvements.length,
    subjectsAboveAverage: aboveAverage.length,
    subjectsBelowAverage: belowAverage.length,
  };
}

function getNextTermDate(currentTerm: TermExamRow | null, allTerms: TermExamRow[]): string | null {
  if (!currentTerm || allTerms.length === 0) return null;
  const termOrder = { TERM_1: 1, TERM_2: 2, TERM_3: 3 };
  const currentTermNumber = termOrder[currentTerm.term_name];
  const currentYear = currentTerm.year;

  let nextTerm = null;
  if (currentTermNumber < 3) {
    nextTerm = allTerms.find((t) => t.year === currentYear && termOrder[t.term_name] === currentTermNumber + 1);
  }
  if (!nextTerm) {
    nextTerm = allTerms.find((t) => t.year === currentYear + 1 && t.term_name === "TERM_1");
  }
  if (!nextTerm) {
    const currentDate = new Date();
    const futureTerms = allTerms.filter((t) => new Date(t.start_date) > currentDate);
    if (futureTerms.length > 0) {
      futureTerms.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      nextTerm = futureTerms[0];
    }
  }
  return nextTerm ? formatDate(nextTerm.start_date) : null;
}

// Helper function to calculate rankings with proper tie handling
function calculateRankings<T>(
  items: T[],
  scoreExtractor: (item: T) => number,
  targetId: string,
  idExtractor: (item: T) => string
): { rank: number; outOf: number } {
  if (items.length === 0) return { rank: 0, outOf: 0 };
  
  const sorted = [...items].sort((a, b) => scoreExtractor(b) - scoreExtractor(a));
  
  let currentRank = 1;
  let i = 0;
  let targetRank = sorted.length;
  
  while (i < sorted.length) {
    const currentScore = scoreExtractor(sorted[i]);
    let tieCount = 0;
    
    while (i + tieCount < sorted.length && scoreExtractor(sorted[i + tieCount]) === currentScore) {
      if (idExtractor(sorted[i + tieCount]) === targetId) {
        targetRank = currentRank;
      }
      tieCount++;
    }
    
    currentRank += tieCount;
    i += tieCount;
  }
  
  return { rank: targetRank, outOf: sorted.length };
}

// Calculate session-specific aggregate and division
function calculateSessionAggregateAndDivision(
  sessionId: number,
  student: StudentRow,
  subjectsForGrade: SubjectRow[],
  totalsByStudentSessionSubject: Map<string, Map<number, Map<number, number>>>,
  isLowerPrimary: boolean
): SessionDivision {
  if (isLowerPrimary) {
    return { aggregate: 0, division: "—", pill: divisionPillClass("U"), best4Grades: [], hasF9: false };
  }
  
  const sMap = totalsByStudentSessionSubject.get(student.registration_id) ?? new Map();
  const totalsForSess = sMap.get(sessionId) ?? new Map();
  
  const gradesArr: number[] = [];
  let hasF9 = false;
  
  for (const sub of subjectsForGrade) {
    const mark = Number(totalsForSess.get(sub.id) ?? 0);
    if (mark > 0) {
      const grade = unebSubjectGrade(mark);
      gradesArr.push(grade);
      if (grade === 9) hasF9 = true;
    }
  }
  
  const sortedGrades = [...gradesArr].sort((a, b) => a - b);
  const best4 = sortedGrades.slice(0, 4);
  const aggregate = best4.reduce((a, g) => a + g, 0);
  const division = unebDivisionFromAggregate(aggregate, hasF9);
  
  return {
    aggregate,
    division,
    pill: divisionPillClass(division),
    best4Grades: best4.map(g => unebGradeText(g)),
    hasF9
  };
}

// ============ MAIN COMPONENT ============
export default function StudentReportPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [terms, setTerms] = useState<TermExamRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchPrinting, setBatchPrinting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  
  // Editable data storage with student ID in keys
  const [editableMarks, setEditableMarks] = useState<Record<string, number>>({});
  const [editablePositions, setEditablePositions] = useState<Record<string, number>>({});
  const [editableAggregates, setEditableAggregates] = useState<Record<string, number>>({});
  const [editableDivisions, setEditableDivisions] = useState<Record<string, string>>({});
  const [subjectComments, setSubjectComments] = useState<Record<string, string>>({});
  const [classTeacherComment, setClassTeacherComment] = useState("");
  const [headTeacherComment, setHeadTeacherComment] = useState("");
  const [subjectTeacherById, setSubjectTeacherById] = useState<Record<number, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextTermStartDate, setNextTermStartDate] = useState<string | null>(null);

  const selectedTerm = useMemo(() => selectedTermId ? terms.find((t) => t.id === Number(selectedTermId)) ?? null : null, [terms, selectedTermId]);
  const selectedGrade = useMemo(() => selectedGradeId ? grades.find((g) => g.id === Number(selectedGradeId)) ?? null : null, [grades, selectedGradeId]);
  const subjectsForGrade = useMemo(() => {
    if (!selectedGradeId) return [];
    return subjects.filter((s) => s.grade_id === Number(selectedGradeId));
  }, [subjects, selectedGradeId]);

  const examSessionsForTerm = useMemo(() => {
    if (!selectedTermId) return [];
    return examSessions.filter((es) => es.term_id === Number(selectedTermId)).sort((a, b) => {
      const ord = (x: ExamSessionRow["exam_type"]) => x === "BOT" ? 1 : x === "MOT" ? 2 : 3;
      return ord(a.exam_type) - ord(b.exam_type);
    });
  }, [examSessions, selectedTermId]);

  const canLoad = useMemo(() => Boolean(school?.id && selectedGradeId && selectedTermId), [school?.id, selectedGradeId, selectedTermId]);
  const sessions = examSessionsForTerm;
  const noSessions = canLoad && sessions.length === 0;

  useEffect(() => {
    if (selectedTerm && terms.length > 0) {
      setNextTermStartDate(getNextTermDate(selectedTerm, terms));
    } else {
      setNextTermStartDate(null);
    }
  }, [selectedTerm, terms]);

  // Auth check
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/");
        return;
      }
      setAuthChecking(false);
    })();
  }, [router]);

  // Load profile and school data
  useEffect(() => {
    if (authChecking) return;
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const { data: userData, error: uErr } = await supabase.auth.getUser();
        if (uErr || !userData.user) throw new Error(uErr?.message || "Could not load user.");
        const { data: p, error: pErr } = await supabase.from("profiles").select("user_id, email, full_name, role, school_id").eq("user_id", userData.user.id).single();
        if (pErr || !p) throw new Error(pErr?.message || "Profile not found.");
        const prof = p as ProfileRow;
        setProfile(prof);
        if (!prof.school_id) {
          setSchool(null);
          setLoading(false);
          return;
        }
        const { data: s, error: sErr } = await supabase.from("general_information").select("id, school_name, location, contact_number, email, website, school_badge").eq("id", prof.school_id).single();
        if (sErr || !s) throw new Error(sErr?.message || "School not found.");
        setSchool(s as SchoolRow);
        const [gradeRes, subjectRes, termRes, examSessRes] = await Promise.all([
          supabase.from("class").select("id, grade_name").eq("school_id", s.id).order("grade_name"),
          supabase.from("subject").select("id, name, grade_id").eq("school_id", s.id).order("name"),
          supabase.from("term_exam_session").select("id, term_name, year, start_date, end_date").eq("school_id", s.id).order("year", { ascending: false }).order("term_name"),
          supabase.from("exam_session").select("id, term_id, exam_type").eq("school_id", s.id).order("id"),
        ]);
        if (gradeRes.error) throw gradeRes.error;
        if (subjectRes.error) throw subjectRes.error;
        if (termRes.error) throw termRes.error;
        if (examSessRes.error) throw examSessRes.error;
        setGrades((gradeRes.data ?? []) as GradeRow[]);
        setSubjects((subjectRes.data ?? []) as SubjectRow[]);
        setTerms((termRes.data ?? []) as TermExamRow[]);
        setExamSessions((examSessRes.data ?? []) as ExamSessionRow[]);
      } catch (e: any) {
        setErrorMsg(e.message || "Failed to load setup.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecking]);

  // Load students, questions, results
  useEffect(() => {
    if (!school?.id) return;
    (async () => {
      setErrorMsg(null);
      if (!canLoad) {
        setStudents([]);
        setQuestions([]);
        setResults([]);
        setSelectedStudentId("");
        return;
      }
      setLoading(true);
      try {
        const gradeId = Number(selectedGradeId);
        const termId = Number(selectedTermId);
        
        const studentsRes = await supabase
          .from("students")
          .select("registration_id, lin_id, first_name, last_name, date_of_birth, gender, profile_picture_url, payment_code")
          .eq("school_id", school.id)
          .eq("current_grade_id", gradeId)
          .order("first_name");
        
        if (studentsRes.error) throw studentsRes.error;
        const studentsList = (studentsRes.data ?? []) as StudentRow[];
        setStudents(studentsList);
        
        const questionsRes = await supabase
          .from("assessment_question")
          .select("*")
          .eq("school_id", school.id)
          .eq("grade_id", gradeId)
          .eq("term_exam_id", termId);
        
        if ((questionsRes as any).error) throw (questionsRes as any).error;
        const qRows = ((questionsRes as any).data ?? []) as QuestionRow[];
        setQuestions(qRows);
        
        const qIds = qRows.map((q) => q.id);
        let resultsData: ExamResultRow[] = [];
        
        if (qIds.length > 0) {
          const { data: rawResults, error: resultsError } = await supabase
            .from("assessment_examresult")
            .select("*")
            .eq("school_id", school.id)
            .eq("grade_id", gradeId)
            .in("question_id", qIds);
          
          if (resultsError) throw resultsError;
          resultsData = (rawResults || []) as ExamResultRow[];
        }
        
        setResults(resultsData);
        
        if (!selectedStudentId && studentsList.length > 0) {
          setSelectedStudentId(studentsList[0].registration_id);
        }
        
      } catch (e: any) {
        console.error("Error loading data:", e);
        setErrorMsg(e.message || "Failed to load data.");
        setStudents([]);
        setQuestions([]);
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [school?.id, canLoad, selectedGradeId, selectedTermId]);

  const selectedStudent = useMemo(() => selectedStudentId ? students.find((s) => s.registration_id === selectedStudentId) ?? null : null, [students, selectedStudentId]);

  // Load subject teachers
  useEffect(() => {
    if (!school?.id || !selectedGradeId) return;
    (async () => {
      try {
        const { data, error } = await supabase.from("subject").select(`id, name, teacher_id, teacher:teachers (registration_id, first_name, last_name, initials)`).eq("school_id", school.id).eq("grade_id", Number(selectedGradeId));
        if (error) {
          console.error("Error loading subject teachers:", error);
          return;
        }
        const map: Record<string, string> = {};
        for (const subject of data || []) {
          if (subject.teacher_id && subject.teacher) {
            let teacherData: TeacherInfo | null = null;
            if (Array.isArray(subject.teacher) && subject.teacher.length > 0) {
              const teacher = subject.teacher[0] as any;
              teacherData = { registration_id: teacher.registration_id, first_name: teacher.first_name, last_name: teacher.last_name, initials: teacher.initials };
            } else if (subject.teacher && typeof subject.teacher === "object") {
              const teacher = subject.teacher as any;
              teacherData = { registration_id: teacher.registration_id, first_name: teacher.first_name, last_name: teacher.last_name, initials: teacher.initials };
            }
            if (teacherData) {
              let displayName = "";
              if (teacherData.initials && teacherData.initials.trim()) {
                displayName = teacherData.initials.trim();
              } else if (teacherData.first_name || teacherData.last_name) {
                const firstInitial = teacherData.first_name ? teacherData.first_name.charAt(0).toUpperCase() : "";
                const lastInitial = teacherData.last_name ? teacherData.last_name.charAt(0).toUpperCase() : "";
                displayName = `${firstInitial}${lastInitial}`;
              } else {
                displayName = "—";
              }
              map[subject.id] = displayName;
            } else {
              map[subject.id] = "—";
            }
          } else {
            map[subject.id] = "—";
          }
        }
        setSubjectTeacherById(map);
      } catch (err) {
        console.error("Error in subject teacher loading:", err);
      }
    })();
  }, [school?.id, selectedGradeId]);

  // Build totals from editable marks (per student)
  const totalsByStudentSessionSubject = useMemo(() => {
    const map = new Map<string, Map<number, Map<number, number>>>();
    
    for (const r of results) {
      if (!r.question_id || !r.exam_session_id) continue;
      
      const studentId = r.registration_id || r.student_id;
      const studentExists = students.some(s => s.registration_id === studentId);
      if (!studentExists) continue;
      
      const question = questions.find(q => q.id === Number(r.question_id));
      if (!question) continue;
      
      const subjectId = Number(question.subject_id ?? 0);
      if (!subjectId) continue;
      
      const sessionId = Number(r.exam_session_id);
      
      if (!map.has(studentId)) map.set(studentId, new Map());
      const bySess = map.get(studentId)!;
      if (!bySess.has(sessionId)) bySess.set(sessionId, new Map());
      const bySub = bySess.get(sessionId)!;
      
      let score = 0;
      if (r.percentage !== undefined && r.percentage !== null) {
        score = Number(r.percentage);
      } else {
        score = Number(r.score ?? 0);
        const maxScore = question.max_score || 100;
        score = (score / maxScore) * 100;
      }
      
      score = Math.min(100, Math.max(0, score));
      bySub.set(subjectId, score);
    }
    
    for (const student of students) {
      const studentId = student.registration_id;
      for (const [key, mark] of Object.entries(editableMarks)) {
        const parts = key.split('_');
        if (parts.length === 3 && parts[0] === studentId) {
          const sessionId = parseInt(parts[1]);
          const subjectId = parseInt(parts[2]);
          
          if (!map.has(studentId)) map.set(studentId, new Map());
          const bySess = map.get(studentId)!;
          if (!bySess.has(sessionId)) bySess.set(sessionId, new Map());
          const bySub = bySess.get(sessionId)!;
          bySub.set(subjectId, mark);
        }
      }
    }
    
    return map;
  }, [results, questions, students, editableMarks]);

  const getSubjectPosition = (subjectId: number, sessionId: number, studentId: string): number => {
    const ranking = calculateRankings(
      students,
      (student) => {
        const sMap = totalsByStudentSessionSubject.get(student.registration_id) ?? new Map();
        const totalsForSess = sMap.get(sessionId) ?? new Map();
        return Number(totalsForSess.get(subjectId) ?? 0);
      },
      studentId,
      (student) => student.registration_id
    );
    return ranking.rank;
  };

  const subjectRowsForStudent = useMemo(() => {
    if (!selectedStudent) return [];
    const sMap = totalsByStudentSessionSubject.get(selectedStudent.registration_id) ?? new Map();
    return subjectsForGrade.map((sub) => {
      const perSession = sessions.map((sess) => {
        const totalsForSess = sMap.get(sess.id) ?? new Map();
        const total = Number(totalsForSess.get(sub.id) ?? 0);
        const possible = 100;
        const pct = total;
        return { sessionId: sess.id, exam_type: sess.exam_type, total, possible, pct };
      });
      const valid = perSession.filter((x) => x.possible > 0);
      const totalAll = valid.reduce((a, x) => a + x.total, 0);
      const possibleAll = valid.reduce((a, x) => a + x.possible, 0);
      const termPct = possibleAll > 0 ? (totalAll / possibleAll) * 100 : 0;
      const unebGrade = unebSubjectGrade(termPct);
      const txt = unebGradeText(unebGrade);
      return { subject_id: sub.id, subject_name: sub.name, perSession, termPct, grade_text: txt, pill: gradePillClass(txt), colorClass: gradeColor(termPct), unebGrade };
    });
  }, [selectedStudent, subjectsForGrade, sessions, totalsByStudentSessionSubject]);

  const overall = useMemo(() => {
    if (!selectedStudent) return { pct: 0 };
    const valid = subjectRowsForStudent.map((r) => r.termPct).filter((x) => Number.isFinite(x) && x > 0);
    const pct = valid.length ? valid.reduce((a, x) => a + x, 0) / valid.length : 0;
    return { pct };
  }, [selectedStudent, subjectRowsForStudent]);

  const aggregateAndDivision = useMemo(() => {
    if (!selectedStudent) return { aggregate: 0, division: "—", pill: divisionPillClass("U"), best4Count: 0, best4Grades: [] };
    const gradesArr = subjectRowsForStudent.filter((s) => s.unebGrade > 0).map((s) => s.unebGrade).sort((a, b) => a - b);
    const hasF9 = gradesArr.includes(9);
    const best4 = gradesArr.slice(0, 4);
    const aggregate = best4.reduce((a, g) => a + g, 0);
    const division = unebDivisionFromAggregate(aggregate, hasF9);
    return { aggregate, division, pill: divisionPillClass(division), best4Count: best4.length, best4Grades: best4.map((g) => unebGradeText(g)) };
  }, [selectedStudent, subjectRowsForStudent]);

  const performanceAnalysis = useMemo(() => analyzePerformance(subjectRowsForStudent), [subjectRowsForStudent]);
  const canEditComments = useMemo(() => profile?.role === "ADMIN" || profile?.role === "TEACHER" || profile?.role === "ACADEMIC", [profile?.role]);

  const getCalculatedPosition = (sessionId: number, studentId: string): { rank: number; outOf: number } => {
    const positionKey = `${studentId}_${sessionId}`;
    if (isEditing && editablePositions[positionKey] !== undefined) {
      return { rank: editablePositions[positionKey], outOf: students.length };
    }
    
    return calculateRankings(
      students,
      (student) => {
        let total = 0;
        const sMap = totalsByStudentSessionSubject.get(student.registration_id) ?? new Map();
        const totalsForSess = sMap.get(sessionId) ?? new Map();
        let count = 0;
        for (const sub of subjectsForGrade) {
          const mark = Number(totalsForSess.get(sub.id) ?? 0);
          if (mark > 0) {
            total += mark;
            count++;
          }
        }
        return count > 0 ? total / count : 0;
      },
      studentId,
      (student) => student.registration_id
    );
  };

  const getSessionDivisionData = (sessionId: number, studentId: string): SessionDivision => {
    const aggregateKey = `${studentId}_${sessionId}`;
    const divisionKey = `${studentId}_${sessionId}`;
    
    if (isEditing && editableAggregates[aggregateKey] !== undefined && editableDivisions[divisionKey] !== undefined) {
      return {
        aggregate: editableAggregates[aggregateKey],
        division: editableDivisions[divisionKey],
        pill: divisionPillClass(editableDivisions[divisionKey]),
        best4Grades: [],
        hasF9: false
      };
    }
    
    const isLowerPrimaryClass = selectedGrade ? isLowerPrimary(selectedGrade.grade_name) : false;
    return calculateSessionAggregateAndDivision(
      sessionId,
      { registration_id: studentId } as StudentRow,
      subjectsForGrade,
      totalsByStudentSessionSubject,
      isLowerPrimaryClass
    );
  };

  // Load saved data from localStorage
  useEffect(() => {
    if (!school?.id || !selectedGradeId || !selectedTermId) return;
    const key = buildLocalKey(school.id, selectedGradeId, selectedTermId);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      if (parsed?.editableMarks) setEditableMarks(parsed.editableMarks);
      if (parsed?.editablePositions) setEditablePositions(parsed.editablePositions);
      if (parsed?.editableAggregates) setEditableAggregates(parsed.editableAggregates);
      if (parsed?.editableDivisions) setEditableDivisions(parsed.editableDivisions);
      if (parsed?.subjectComments) setSubjectComments(parsed.subjectComments || {});
      if (parsed?.classTeacherComments) {
        const studentKey = selectedStudentId;
        if (studentKey && parsed.classTeacherComments[studentKey]) {
          setClassTeacherComment(parsed.classTeacherComments[studentKey]);
        }
      }
      if (parsed?.headTeacherComments) {
        const studentKey = selectedStudentId;
        if (studentKey && parsed.headTeacherComments[studentKey]) {
          setHeadTeacherComment(parsed.headTeacherComments[studentKey]);
        }
      }
    } catch { }
  }, [school?.id, selectedGradeId, selectedTermId, selectedStudentId]);

  // Save all data to localStorage
  useEffect(() => {
    if (!school?.id || !selectedGradeId || !selectedTermId) return;
    const key = buildLocalKey(school.id, selectedGradeId, selectedTermId);
    
    let existingData: any = {};
    try {
      const raw = localStorage.getItem(key);
      if (raw) existingData = JSON.parse(raw);
    } catch { }
    
    const newData = {
      ...existingData,
      editableMarks,
      editablePositions,
      editableAggregates,
      editableDivisions,
      subjectComments: { ...existingData.subjectComments, ...subjectComments },
      classTeacherComments: { ...existingData.classTeacherComments, [selectedStudentId]: classTeacherComment },
      headTeacherComments: { ...existingData.headTeacherComments, [selectedStudentId]: headTeacherComment },
    };
    
    localStorage.setItem(key, JSON.stringify(newData));
  }, [school?.id, selectedGradeId, selectedTermId, selectedStudentId, editableMarks, editablePositions, editableAggregates, editableDivisions, subjectComments, classTeacherComment, headTeacherComment]);

  // Auto-generate subject comments for the current student only
  useEffect(() => {
    if (!selectedStudent || subjectRowsForStudent.length === 0 || sessions.length === 0) return;
    setSubjectComments((prev) => {
      const next = { ...prev };
      for (const sess of sessions) {
        for (const r of subjectRowsForStudent) {
          const key = `${selectedStudent.registration_id}_${sess.id}_${r.subject_id}`;
          const existing = (next[key] ?? "").trim();
          if (!existing) {
            const ps = r.perSession.find(p => p.sessionId === sess.id);
            const mark = ps?.total ?? 0;
            const gradeNum = mark > 0 ? unebSubjectGrade(mark) : null;
            const gradeText = gradeNum ? unebGradeText(gradeNum) : "—";
            next[key] = mark > 0 ? getSubjectComment(gradeText, mark) : "Not attempted";
          }
        }
      }
      return next;
    });
  }, [selectedStudent, subjectRowsForStudent, sessions]);

  // Auto-generate class and head teacher comments for current student
  useEffect(() => {
    if (!selectedStudent) return;
    const studentName = fmtName(selectedStudent);
    const div = aggregateAndDivision.division || "—";
    const pct = Number.isFinite(overall.pct) ? overall.pct : 0;
    if (!classTeacherComment) setClassTeacherComment(getClassTeacherComment(pct, studentName));
    if (!headTeacherComment) setHeadTeacherComment(getHeadTeacherComment(pct, div));
  }, [selectedStudentId, overall.pct, aggregateAndDivision.division]);

  // ============ ACTION HANDLERS ============
  const handleMarkChange = (sessionId: number, subjectId: number, value: string) => {
    if (!selectedStudent) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    const clampedValue = Math.min(100, Math.max(0, numValue));
    const key = `${selectedStudent.registration_id}_${sessionId}_${subjectId}`;
    setEditableMarks(prev => ({ ...prev, [key]: clampedValue }));
  };

  const handlePositionChange = (sessionId: number, value: string) => {
    if (!selectedStudent) return;
    const numValue = parseInt(value);
    if (isNaN(numValue)) return;
    const key = `${selectedStudent.registration_id}_${sessionId}`;
    setEditablePositions(prev => ({ ...prev, [key]: numValue }));
  };

  const handleAggregateChange = (sessionId: number, value: string) => {
    if (!selectedStudent) return;
    const numValue = parseInt(value);
    if (isNaN(numValue)) return;
    const key = `${selectedStudent.registration_id}_${sessionId}`;
    setEditableAggregates(prev => ({ ...prev, [key]: numValue }));
  };

  const handleDivisionChange = (sessionId: number, value: string) => {
    if (!selectedStudent) return;
    const key = `${selectedStudent.registration_id}_${sessionId}`;
    setEditableDivisions(prev => ({ ...prev, [key]: value }));
  };

  const autoFillAllComments = () => {
    if (!selectedStudent) return;
    setSubjectComments((prev) => {
      const next = { ...prev };
      for (const sess of sessions) {
        for (const r of subjectRowsForStudent) {
          const key = `${selectedStudent.registration_id}_${sess.id}_${r.subject_id}`;
          const ps = r.perSession.find(p => p.sessionId === sess.id);
          const mark = ps?.total ?? 0;
          const gradeNum = mark > 0 ? unebSubjectGrade(mark) : null;
          const gradeText = gradeNum ? unebGradeText(gradeNum) : "—";
          next[key] = mark > 0 ? getSubjectComment(gradeText, mark) : "Not attempted";
        }
      }
      return next;
    });
    const studentName = fmtName(selectedStudent);
    const div = aggregateAndDivision.division || "—";
    const pct = Number.isFinite(overall.pct) ? overall.pct : 0;
    setClassTeacherComment(getClassTeacherComment(pct, studentName));
    setHeadTeacherComment(getHeadTeacherComment(pct, div));
    tinyToast("Auto-filled comments");
  };

  const resetMarksForCurrentStudent = () => {
    if (!selectedStudent) return;
    const newMarks = { ...editableMarks };
    Object.keys(newMarks).forEach(key => {
      if (key.startsWith(selectedStudent.registration_id)) {
        delete newMarks[key];
      }
    });
    setEditableMarks(newMarks);
    
    const newPositions = { ...editablePositions };
    Object.keys(newPositions).forEach(key => {
      if (key.startsWith(selectedStudent.registration_id)) {
        delete newPositions[key];
      }
    });
    setEditablePositions(newPositions);
    
    const newAggregates = { ...editableAggregates };
    Object.keys(newAggregates).forEach(key => {
      if (key.startsWith(selectedStudent.registration_id)) {
        delete newAggregates[key];
      }
    });
    setEditableAggregates(newAggregates);
    
    const newDivisions = { ...editableDivisions };
    Object.keys(newDivisions).forEach(key => {
      if (key.startsWith(selectedStudent.registration_id)) {
        delete newDivisions[key];
      }
    });
    setEditableDivisions(newDivisions);
    
    tinyToast(`Reset all edits for ${fmtName(selectedStudent)}`);
  };

  const clearAllComments = () => {
    setSubjectComments({});
    setClassTeacherComment("");
    setHeadTeacherComment("");
    tinyToast("Cleared all comments");
  };

  const printReport = () => {
    if (!selectedStudent) return;
    window.print();
  };

  const handleRefresh = async () => {
    if (!school?.id || !selectedGradeId || !selectedTermId) return;
    setRefreshing(true);
    try {
      const gradeId = Number(selectedGradeId);
      const termId = Number(selectedTermId);
      const [studentsRes, questionsRes] = await Promise.all([
        supabase.from("students").select("*").eq("school_id", school.id).eq("current_grade_id", gradeId).order("first_name"),
        supabase.from("assessment_question").select("*").eq("school_id", school.id).eq("grade_id", gradeId).eq("term_exam_id", termId),
      ]);
      if (studentsRes.error) throw studentsRes.error;
      if ((questionsRes as any).error) throw (questionsRes as any).error;
      const qRows = ((questionsRes as any).data ?? []) as QuestionRow[];
      const qIds = qRows.map((q) => q.id);
      const resultsRes = qIds.length === 0 ? { data: [], error: null } : await supabase.from("assessment_examresult").select("*").eq("school_id", school.id).eq("grade_id", gradeId).in("question_id", qIds);
      if ((resultsRes as any).error) throw (resultsRes as any).error;
      setStudents((studentsRes.data ?? []) as StudentRow[]);
      setQuestions(qRows);
      setResults(((resultsRes as any).data ?? []) as ExamResultRow[]);
      tinyToast("Data refreshed");
    } catch (e: any) {
      setErrorMsg("Refresh failed: " + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const copyPaymentCode = () => {
    if (selectedStudent?.payment_code) {
      navigator.clipboard.writeText(selectedStudent.payment_code);
      tinyToast("Payment code copied to clipboard!");
    }
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    tinyToast(isEditing ? "Edit mode disabled" : "Edit mode enabled");
  };

  // ============ BATCH PRINT FUNCTION ============
  const printAllClassReports = async () => {
    if (!selectedGrade || !selectedTerm || students.length === 0) {
      tinyToast("Please select a grade and term first");
      return;
    }

    setBatchPrinting(true);
    try {
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute';
      printFrame.style.width = '0px';
      printFrame.style.height = '0px';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (!frameDoc) return;

      const isLowerPrimaryClass = selectedGrade && isLowerPrimary(selectedGrade.grade_name);
      const printInnerPadding = !isLowerPrimaryClass 
        ? "padding: 14mm 14mm 10mm 14mm;" 
        : "padding: 3mm 6mm 4mm 6mm;";

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${selectedGrade.grade_name} - ${termLabel(selectedTerm)} Reports</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: white; }
            .report-page {
              width: 210mm;
              min-height: 297mm;
              page-break-after: always;
              position: relative;
              background: white;
            }
            .report-page:last-child { page-break-after: auto; }
            .report-inner { ${printInnerPadding} box-sizing: border-box; }
            @page { size: A4; margin: 0; }
            @media print {
              body { margin: 0; padding: 0; }
              .report-page { page-break-after: always; }
            }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .gap-4 { gap: 1rem; }
            .gap-2 { gap: 0.5rem; }
            .gap-3 { gap: 0.75rem; }
            .mb-0 { margin-bottom: 0; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-2 { margin-top: 0.5rem; }
            .pb-4 { padding-bottom: 1rem; }
            .pt-2 { padding-top: 0.5rem; }
            .pl-2 { padding-left: 0.5rem; }
            .pr-4 { padding-right: 1rem; }
            .p-1 { padding: 0.25rem; }
            .p-2 { padding: 0.5rem; }
            .p-3 { padding: 0.75rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .py-0 { padding-top: 0; padding-bottom: 0; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .border { border: 1px solid #e5e7eb; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .rounded-lg { border-radius: 0.5rem; }
            .rounded-t-lg { border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; }
            .rounded-b-lg { border-bottom-left-radius: 0.5rem; border-bottom-right-radius: 0.5rem; }
            .bg-white { background-color: white; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .bg-blue-50 { background-color: #eff6ff; }
            .bg-blue-100 { background-color: #dbeafe; }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xl { font-size: 1.25rem; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .font-mono { font-family: monospace; }
            .text-gray-400 { color: #9ca3af; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-900 { color: #111827; }
            .text-blue-600 { color: #2563eb; }
            .text-blue-700 { color: #1d4ed8; }
            .text-green-700 { color: #15803d; }
            .w-full { width: 100%; }
            .w-20 { width: 5rem; }
            .h-20 { height: 5rem; }
            .h-10 { height: 2.5rem; }
            .w-10 { width: 2.5rem; }
            .overflow-hidden { overflow: hidden; }
            .object-contain { object-fit: contain; }
            .object-cover { object-fit: cover; }
            .flex-shrink-0 { flex-shrink: 0; }
            .flex-wrap { flex-wrap: wrap; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: center; }
            th { background-color: #f9fafb; font-weight: 600; }
            textarea { border: none; background: transparent; resize: none; width: 100%; font-family: inherit; font-size: 0.875rem; }
            input, select { border: 1px solid #e5e7eb; border-radius: 0.25rem; padding: 0.125rem 0.25rem; font-size: 0.75rem; text-align: center; }
          </style>
        </head>
        <body>
      `);

      for (const student of students) {
        const sMap = totalsByStudentSessionSubject.get(student.registration_id) ?? new Map();
        
        let totalMarksOverall = 0;
        let totalSubjects = 0;
        for (const sess of sessions) {
          const totalsForSess = sMap.get(sess.id) ?? new Map();
          for (const sub of subjectsForGrade) {
            const mark = Number(totalsForSess.get(sub.id) ?? 0);
            if (mark > 0) {
              totalMarksOverall += mark;
              totalSubjects++;
            }
          }
        }
        const overallPct = totalSubjects > 0 ? totalMarksOverall / totalSubjects : 0;

        frameDoc.write(`
          <div class="report-page">
            <div class="report-inner">
              <div class="flex items-center justify-between mb-0 pb-4 border-b">
                <div class="flex items-center gap-4">
                  ${school?.school_badge ? 
                    `<img src="${school.school_badge}" alt="School" width="100" height="100" class="object-contain" />` : 
                    `<div class="h-20 w-20 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg class="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"></path></svg>
                    </div>`
                  }
                  <div>
                    <h2 class="text-xl font-bold text-gray-900">${school?.school_name || ''}</h2>
                    <p class="text-xs text-gray-600">${school?.location ? `<span class="mr-3">${school.location}</span>` : ''}${school?.contact_number ? `<span>📞 ${school.contact_number}</span>` : ''}</p>
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">STUDENT REPORT CARD</div>
                  <p class="text-sm font-bold text-gray-900 mt-1">${termLabel(selectedTerm)}</p>
                </div>
                <div>
                  ${student.profile_picture_url ? 
                    `<div class="w-20 h-20 rounded-lg overflow-hidden border border-gray-200"><img src="${student.profile_picture_url}" alt="Student" class="w-full h-full object-cover" /></div>` : 
                    `<div class="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center"><svg class="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>`
                  }
                </div>
              </div>
              
              <div class="mb-0 border border-gray-200 rounded-lg bg-white">
                <div class="flex items-center justify-between p-3 gap-4">
                  <div class="flex items-center gap-3 flex-1">
                    <div class="flex items-center gap-4 flex-wrap">
                      <p class="text-sm font-bold text-gray-900">${student.first_name} ${student.last_name}</p>
                      <div class="flex items-center gap-3 text-xs text-gray-600">
                        <span>ID: <span class="font-semibold">${student.registration_id}</span></span>
                        <span>LIN: <span class="font-semibold">${student.lin_id || "—"}</span></span>
                        ${student.gender ? `<span>Gender: <span class="font-semibold">${student.gender}</span></span>` : ''}
                        <span>Class: <span class="font-semibold">${selectedGrade?.grade_name || "—"}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mb-0 space-y-0">
        `);

        for (const sess of sessions) {
          const totalsForSess = sMap.get(sess.id) ?? new Map();
          let sessionTotalMarks = 0;
          let sessionSubjectCount = 0;
          
          for (const sub of subjectsForGrade) {
            const mark = Number(totalsForSess.get(sub.id) ?? 0);
            if (mark > 0) {
              sessionTotalMarks += mark;
              sessionSubjectCount++;
            }
          }
          const sessionAvg = sessionSubjectCount > 0 ? sessionTotalMarks / sessionSubjectCount : 0;
          
          const sessionDivision = calculateSessionAggregateAndDivision(
            sess.id,
            student,
            subjectsForGrade,
            totalsByStudentSessionSubject,
            isLowerPrimaryClass
          );
          
          const sessionRanking = calculateRankings(
            students,
            (s) => {
              const sMapForStudent = totalsByStudentSessionSubject.get(s.registration_id) ?? new Map();
              const totalsForSessInner = sMapForStudent.get(sess.id) ?? new Map();
              let total = 0;
              let count = 0;
              for (const sub of subjectsForGrade) {
                const mark = Number(totalsForSessInner.get(sub.id) ?? 0);
                if (mark > 0) {
                  total += mark;
                  count++;
                }
              }
              return count > 0 ? total / count : 0;
            },
            student.registration_id,
            (s) => s.registration_id
          );
          
          frameDoc.write(`
            <div class="border border-gray-200 rounded-lg overflow-hidden mb-2">
              <div class="bg-gray-100 px-0 py-0 border-b">
                <p class="text-sm text-center font-bold text-gray-900 py-1">
                  ${sess.exam_type === "BOT" ? "BEGINNING OF TERM" : sess.exam_type === "MOT" ? "MID OF TERM" : "END OF TERM"}
                </p>
              </div>
              <table class="w-full text-xs border-collapse">
                <thead class="bg-gray-50 p-0 mt-0">
                  <tr>
                    <th class="border p-1 text-left pl-2">Subject</th>
                    <th class="border p-0 text-center">Full Marks</th>
                    <th class="border p-0 text-center">Mark Obtained</th>
                    ${!isLowerPrimaryClass ? '<th class="border p-0 text-center">Grade</th><th class="border p-0 text-center">Agg</th>' : '<th class="border p-0 text-center">Rank</th>'}
                    <th class="border pl-2 text-left">Subject Teacher Remark</th>
                    <th class="border p-0 text-center">Initials</th>
                  <tr>
                </thead>
                <tbody>
          `);
          
          for (const sub of subjectsForGrade) {
            const mark = Number(totalsForSess.get(sub.id) ?? 0);
            const gradeNum = mark > 0 ? unebSubjectGrade(mark) : null;
            const gradeText = gradeNum ? unebGradeText(gradeNum) : "—";
            const agg = gradeNum ?? "";
            
            let subjectPosition = null;
            if (isLowerPrimaryClass) {
              const subjectRanking = calculateRankings(
                students,
                (s) => {
                  const sMapForStudent = totalsByStudentSessionSubject.get(s.registration_id) ?? new Map();
                  const totalsForSessInner = sMapForStudent.get(sess.id) ?? new Map();
                  return Number(totalsForSessInner.get(sub.id) ?? 0);
                },
                student.registration_id,
                (s) => s.registration_id
              );
              subjectPosition = subjectRanking.rank;
            }
            
            const commentKey = `${student.registration_id}_${sess.id}_${sub.id}`;
            const savedComment = subjectComments[commentKey];
            const autoComment = mark > 0 ? getSubjectComment(gradeText, mark) : "Not attempted";
            
            frameDoc.write(`
              <tr>
                <td class="border p-1 font-medium pl-2">${sub.name}</td>
                <td class="border p-0 text-center">100</td>
                <td class="border p-0 text-center">${Math.round(mark)}</td>
                ${!isLowerPrimaryClass ? 
                  `<td class="border p-0 text-center font-semibold">${gradeText}</td>
                   <td class="border p-0 text-center font-semibold">${agg}</td>` : 
                  `<td class="border p-0 text-center font-semibold">${subjectPosition}</td>`
                }
                <td class="border pl-2">${savedComment || autoComment}</td>
                <td class="border p-1 text-center">${subjectTeacherById[sub.id] || "—"}</td>
              </tr>
            `);
          }
          
          frameDoc.write(`
                </tbody>
                <tfoot>
                  <tr class="font-bold bg-gray-100">
                    <td class="text-left p-1 font-semi-bold pl-2">Total</td>
                    <td class="text-center">100%</td>
                    <td class="text-center">${Math.round(sessionAvg)}%</td>
                    ${!isLowerPrimaryClass ? 
                      `<td colspan="2" class="text-center">
                        <div class="flex items-center justify-center gap-2">
                          <span class="text-xs">Agg: ${sessionDivision.aggregate}</span>
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white ${sessionDivision.pill}">
                            ${sessionDivision.division}
                          </span>
                          ${sessionDivision.hasF9 ? '<span class="text-xs text-red-600" title="Has F9 grade">⚠️ F9</span>' : ''}
                        </div>
                        </td>` : 
                      `<td class="text-center">—</td>`
                    }
                    <td colspan="2" class="text-right pr-4">
                      Position: ${sessionRanking.rank}/${sessionRanking.outOf}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          `);
        }
        
        frameDoc.write(`
              </div>
              
              <div class="space-y-0 mt-1">
                <div class="border border-gray-200 rounded-lg p-2.5">
                  <div class="flex items-center justify-between mb-0">
                    <p class="text-xs font-semibold text-gray-700 uppercase tracking-wider">Class Teacher</p>
                    <p class="text-xs text-gray-500">Class Performance Comment</p>
                  </div>
                  <textarea class="w-full bg-transparent text-sm text-gray-700 outline-none resize-none" rows="2" disabled>${getClassTeacherComment(overallPct, student.first_name)}</textarea>
                  <div class="mt-2 pt-2 border-t border-gray-100">
                    <p class="text-xs text-gray-500">Signature: ________________</p>
                  </div>
                </div>
                <div class="border border-gray-200 rounded-lg p-3 mt-1">
                  <div class="flex items-center justify-between mb-0">
                    <p class="text-xs font-semibold text-gray-700 uppercase tracking-wider">Head Teacher</p>
                    <p class="text-xs text-gray-500">School Performance Comment</p>
                  </div>
                  <textarea class="w-full bg-transparent text-sm text-gray-700 outline-none resize-none" rows="2" disabled>${getHeadTeacherComment(overallPct, "Division")}</textarea>
                  <div class="mt-0 pt-0 border-t border-gray-100">
                    <p class="text-xs text-gray-500">Signature: ________________</p>
                  </div>
                  <p class="text-sm font-semibold text-green-700 text-center">Next Term Begins on ${nextTermStartDate}</p>
                </div>
              </div>
            </div>
          </div>
        `);
      }

      frameDoc.write(`</body></html>`);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printFrame), 1000);
      }, 500);

      tinyToast(`Preparing ${students.length} reports for printing...`);
    } catch (error) {
      console.error('Batch print error:', error);
      tinyToast('Error generating batch reports');
    } finally {
      setBatchPrinting(false);
    }
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
            <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center mt-10">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <School className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No School</h3>
              <p className="text-gray-600 mb-6">Link your account to a school first.</p>
              <button onClick={() => router.push("/settings")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Settings</button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const isLowerPrimaryClass = selectedGrade && isLowerPrimary(selectedGrade.grade_name);

  if (!selectedStudent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Student Report Card</h1>
                    <p className="text-gray-600 mt-1">Academic performance report</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleRefresh} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700">
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                    <button disabled className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-500 cursor-not-allowed">
                      <Printer className="w-4 h-4" />
                      Print Single
                    </button>
                    <button disabled className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-500 cursor-not-allowed">
                      <Users className="w-4 h-4" />
                      Print All
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                      <select value={selectedGradeId} onChange={(e) => { setSelectedGradeId(e.target.value); setSelectedTermId(""); setSelectedStudentId(""); }} className="w-full px-4 py-2.5 rounded-lg border border-gray-300">
                        <option value="">Select grade</option>
                        {grades.map((g) => (<option key={g.id} value={g.id}>{g.grade_name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                      <select value={selectedTermId} onChange={(e) => { setSelectedTermId(e.target.value); setSelectedStudentId(""); }} disabled={!selectedGradeId} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 disabled:bg-gray-50">
                        <option value="">{selectedGradeId ? "Select term" : "Select grade first"}</option>
                        {terms.map((t) => (<option key={t.id} value={t.id}>{t.term_name.replace("_", " ")} {t.year}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                      <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} disabled={!canLoad || students.length === 0} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 disabled:bg-gray-50">
                        <option value="">{canLoad ? (students.length ? "Select student" : "No students") : "Select grade + term"}</option>
                        {students.map((s) => (<option key={s.registration_id} value={s.registration_id}>{fmtName(s)}</option>))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Student</h3>
                <p className="text-gray-600 max-w-md mx-auto">Choose a grade, term, and student to generate report.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (noSessions) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Student Report Card</h1>
                    <p className="text-gray-600 mt-1">Academic performance report</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                      <select value={selectedGradeId} onChange={(e) => { setSelectedGradeId(e.target.value); setSelectedTermId(""); setSelectedStudentId(""); }} className="w-full px-4 py-2.5 rounded-lg border border-gray-300">
                        <option value="">Select grade</option>
                        {grades.map((g) => (<option key={g.id} value={g.id}>{g.grade_name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                      <select value={selectedTermId} onChange={(e) => { setSelectedTermId(e.target.value); setSelectedStudentId(""); }} className="w-full px-4 py-2.5 rounded-lg border border-gray-300">
                        <option value="">Select term</option>
                        {terms.map((t) => (<option key={t.id} value={t.id}>{t.term_name.replace("_", " ")} {t.year}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                      <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300">
                        <option value={selectedStudentId}>{fmtName(selectedStudent)}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
                  <FileText className="h-10 w-10 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exams</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">Create exam sessions for this term.</p>
                <button onClick={() => router.push("/academics/exam-sessions")} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Create Exams</button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // MAIN RENDER WITH EDITABLE FIELDS
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Student Report Card</h1>
                  <p className="text-gray-600 mt-1">Academic performance report</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  {canEditComments && (
                    <button onClick={toggleEdit} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700">
                      {isEditing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                      {isEditing ? "Save" : "Edit"}
                    </button>
                  )}
                  {isEditing && (
                    <button onClick={resetMarksForCurrentStudent} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-sm text-red-700">
                      <RefreshCw className="w-4 h-4" />
                      Reset Student
                    </button>
                  )}
                  <button onClick={printReport} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
                    <Printer className="w-4 h-4" />
                    Print Single
                  </button>
                  <button onClick={printAllClassReports} disabled={batchPrinting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700">
                    {batchPrinting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                    Print All ({students.length})
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                    <select value={selectedGradeId} onChange={(e) => { setSelectedGradeId(e.target.value); setSelectedTermId(""); setSelectedStudentId(""); }} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500">
                      <option value="">Select grade</option>
                      {grades.map((g) => (<option key={g.id} value={g.id}>{g.grade_name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                    <select value={selectedTermId} onChange={(e) => { setSelectedTermId(e.target.value); setSelectedStudentId(""); }} disabled={!selectedGradeId} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                      <option value="">{selectedGradeId ? "Select term" : "Select grade first"}</option>
                      {terms.map((t) => (<option key={t.id} value={t.id}>{t.term_name.replace("_", " ")} {t.year}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                    <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500">
                      {students.map((s) => (<option key={s.registration_id} value={s.registration_id}>{fmtName(s)}</option>))}
                    </select>
                  </div>
                </div>
                {selectedStudent && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span>Student: <span className="font-semibold text-gray-900">{fmtName(selectedStudent)}</span></span>
                      <span className="mx-2">•</span>
                      <span>Class: <span className="font-semibold text-gray-900">{selectedGrade?.grade_name || "—"}</span></span>
                      <span className="mx-2">•</span>
                      <span>Term: <span className="font-semibold text-gray-900">{termLabel(selectedTerm)}</span></span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={autoFillAllComments} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                        <Wand2 className="w-4 h-4" /> Auto
                      </button>
                      <button onClick={clearAllComments} className="text-sm text-red-600 hover:text-red-800">Clear</button>
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{errorMsg}</div>}
            </div>

            {/* Performance Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-500">Overall %</p><p className="text-2xl font-bold text-gray-900 mt-1">{overall.pct.toFixed(1)}%</p></div>
                  <div className="p-2 bg-blue-50 rounded-lg"><BarChart3 className="h-6 w-6 text-blue-600" /></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{isLowerPrimaryClass ? "Average Mark" : "Division"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {isLowerPrimaryClass ? <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">{overall.pct.toFixed(1)}%</span> : <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white ${aggregateAndDivision.pill}`}>{aggregateAndDivision.division}</span>}
                    </div>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg"><Award className="h-6 w-6 text-emerald-600" /></div>
                </div>
              </div>
              {!isLowerPrimaryClass && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm text-gray-500">Aggregates</p><p className="text-2xl font-bold text-gray-900">{aggregateAndDivision.aggregate}</p><p className="text-xs text-gray-500 mt-1">Best 4: {aggregateAndDivision.best4Grades.join(", ")}</p></div>
                    <div className="p-2 bg-purple-50 rounded-lg"><Hash className="h-6 w-6 text-purple-600" /></div>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-500">Best Subject</p><p className="text-lg font-semibold text-gray-900 mt-1 truncate">{performanceAnalysis.bestSubject}</p><div className="flex items-center gap-2 mt-1"><span className={`text-xs font-medium px-2 py-0.5 rounded ${gradePillClass(performanceAnalysis.bestSubjectGrade)}`}>{performanceAnalysis.bestSubjectGrade}</span></div></div>
                  <div className="p-2 bg-green-50 rounded-lg"><Trophy className="h-6 w-6 text-green-600" /></div>
                </div>
              </div>
            </div>

            {/* Report Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="print-page">
                <div className="print-inner" style={!isLowerPrimaryClass ? { padding: "14mm 14mm 10mm 14mm", boxSizing: "border-box" } : { padding: "3mm 6mm 4mm 6mm", boxSizing: "border-box" }}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-0 pb-4 border-b">
                    <div className="flex items-center gap-4">
                      {school.school_badge ? (
                        <img src={school.school_badge} alt="School" width={100} height={100} className="object-contain" />
                      ) : (
                        <div className="h-20 w-20 rounded-lg bg-blue-100 flex items-center justify-center">
                          <School className="h-10 w-10 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{school.school_name}</h2>
                        <p className="text-xs text-gray-600">
                          {school.location && <span className="mr-3">{school.location}</span>}
                          {school.contact_number && <span>📞 {school.contact_number}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-center justify-center">
                      <div className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">STUDENT REPORT CARD</div>
                      <p className="text-sm font-bold text-gray-900 mt-1">{termLabel(selectedTerm)}</p>
                      {selectedStudent.payment_code && (
                        <div className="mt-1">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs font-semibold text-gray-600">Payment Code:</span>
                            <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{selectedStudent.payment_code}</span>
                            <button onClick={copyPaymentCode} className="text-gray-400 hover:text-blue-600 transition-colors" title="Copy payment code">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      {selectedStudent.profile_picture_url ? (
                        <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                          <img src={selectedStudent.profile_picture_url} alt="Student" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Student Info */}
                  <div className="mb-0 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-center justify-between p-3 gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-4 flex-wrap">
                          <p className="text-sm font-bold text-gray-900">{fmtName(selectedStudent)}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span>ID: <span className="font-semibold">{selectedStudent.registration_id}</span></span>
                            <span>LIN: <span className="font-semibold">{selectedStudent.lin_id || "—"}</span></span>
                            {selectedStudent.gender && <span>Gender: <span className="font-semibold">{selectedStudent.gender}</span></span>}
                            <span>Class: <span className="font-semibold">{selectedGrade?.grade_name || "—"}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subjects Table */}
                  <div className="mb-0 space-y-0">
                    {sessions.map((sess, sessionIndex) => {
                      const sMap = totalsByStudentSessionSubject.get(selectedStudent.registration_id) ?? new Map();
                      const totalsForSess = sMap.get(sess.id) ?? new Map();
                      
                      let sessionTotalMarks = 0;
                      let sessionSubjectCount = 0;
                      for (const sub of subjectsForGrade) {
                        const mark = Number(totalsForSess.get(sub.id) ?? 0);
                        if (mark > 0) {
                          sessionTotalMarks += mark;
                          sessionSubjectCount++;
                        }
                      }
                      const sessionAvg = sessionSubjectCount > 0 ? sessionTotalMarks / sessionSubjectCount : 0;
                      
                      const sessionDivision = getSessionDivisionData(sess.id, selectedStudent.registration_id);
                      const positionData = getCalculatedPosition(sess.id, selectedStudent.registration_id);

                      return (
                        <div key={sess.id} className={`border border-gray-200 ${sessionIndex === 0 ? 'rounded-t-lg' : ''} ${sessionIndex === sessions.length - 1 ? 'rounded-b-lg' : ''} ${sessionIndex !== 0 ? 'border-t-0' : ''} overflow-hidden`}>
                          <div className="bg-gray-100 px-0 py-0 border-b">
                            <p className="text-sm text-center font-bold text-gray-900 py-1">
                              {sess.exam_type === "BOT" ? "BEGINNING OF TERM" : sess.exam_type === "MOT" ? "MID OF TERM" : "END OF TERM"}
                            </p>
                          </div>
                          <table className="w-full text-xs border-collapse">
                            <thead className="bg-gray-50 p-0 mt-0">
                              <tr>
                                <th className="border p-1 text-left pl-2">Subject</th>
                                <th className="border p-0 text-center">Full Marks</th>
                                <th className="border p-0 text-center">Mark Obtained</th>
                                {!isLowerPrimaryClass ? (
                                  <>
                                    <th className="border p-0 text-center">Grade</th>
                                    <th className="border p-0 text-center">Agg</th>
                                  </>
                                ) : (
                                  <th className="border p-0 text-center">Rank</th>
                                )}
                                <th className="border pl-2 text-left">Subject Teacher Remark</th>
                                <th className="border p-0 text-center">Initials</th>
                              </table>
                            </thead>
                            <tbody>
                              {subjectRowsForStudent.map((r) => {
                                const ps = r.perSession.find(p => p.sessionId === sess.id);
                                const full = 100;
                                const originalMark = ps?.total ?? 0;
                                const markKey = `${selectedStudent.registration_id}_${sess.id}_${r.subject_id}`;
                                const editedMark = editableMarks[markKey];
                                const mark = isEditing && editedMark !== undefined ? editedMark : originalMark;
                                const gradeNum = mark > 0 ? unebSubjectGrade(mark) : null;
                                const gradeText = gradeNum ? unebGradeText(gradeNum) : "—";
                                const commentKey = `${selectedStudent.registration_id}_${sess.id}_${r.subject_id}`;
                                const savedComment = subjectComments[commentKey];
                                const autoComment = mark > 0 ? getSubjectComment(gradeText, mark) : "Not attempted";
                                const agg = gradeNum ?? "";
                                const subjectPosition = isLowerPrimaryClass && mark > 0 
                                  ? getSubjectPosition(r.subject_id, sess.id, selectedStudent.registration_id) 
                                  : null;
                                
                                return (
                                  <tr key={`${sess.id}-${r.subject_id}`}>
                                    <td className="border p-1 font-medium pl-2">{r.subject_name}</td>
                                    <td className="border p-0 text-center">{full}</td>
                                    <td className="border p-0 text-center">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="1"
                                          value={Math.round(mark)}
                                          onChange={(e) => handleMarkChange(sess.id, r.subject_id, e.target.value)}
                                          className="w-16 text-center border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500"
                                        />
                                      ) : (
                                        <span className="font-semibold">{mark > 0 ? Math.round(mark) : "-"}</span>
                                      )}
                                    </td>
                                    {!isLowerPrimaryClass ? (
                                      <>
                                        <td className="border p-0 text-center font-semibold">{mark > 0 ? gradeText : "-"}</td>
                                        <td className="border p-0 text-center font-semibold">{mark > 0 ? agg : "-"}</td>
                                      </>
                                    ) : (
                                      <td className="border p-0 text-center font-semibold">{mark > 0 ? subjectPosition : "-"}</td>
                                    )}
                                    <td className="border pl-2">
                                      <textarea 
                                        value={savedComment ?? autoComment} 
                                        onChange={(e) => setSubjectComments(prev => ({ ...prev, [commentKey]: e.target.value }))} 
                                        disabled={!isEditing} 
                                        className="w-full bg-transparent outline-none resize-none" 
                                        rows={1} 
                                      />
                                    </td>
                                    <td className="border p-1 text-center">{subjectTeacherById[r.subject_id] || "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="font-bold bg-gray-100">
                                <td className="text-left p-1 font-semi-bold pl-2">Total</td>
                                <td className="text-center">100%</td>
                                <td className="text-center">
                                  {isEditing ? (
                                    <span className="text-blue-600">{Math.round(sessionTotalMarks)}</span>
                                  ) : (
                                    <span>{Math.round(sessionTotalMarks)}</span>
                                  )}
                                </td>
                                <td className="text-center">
                                  {isEditing ? (
                                    <span className="text-blue-600">{Math.round(sessionAvg)}%</span>
                                  ) : (
                                    <span>{Math.round(sessionAvg)}%</span>
                                  )}
                                </td>
                                {!isLowerPrimaryClass ? (
                                  <td colSpan={2} className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      {isEditing ? (
                                        <>
                                          <input
                                            type="number"
                                            min="4"
                                            max="36"
                                            step="1"
                                            value={sessionDivision.aggregate}
                                            onChange={(e) => handleAggregateChange(sess.id, e.target.value)}
                                            className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500"
                                          />
                                          <select
                                            value={sessionDivision.division}
                                            onChange={(e) => handleDivisionChange(sess.id, e.target.value)}
                                            className="border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500"
                                          >
                                            <option value="Division 1">Division 1</option>
                                            <option value="Division 2">Division 2</option>
                                            <option value="Division 3">Division 3</option>
                                            <option value="Division 4">Division 4</option>
                                            <option value="U">U</option>
                                          </select>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-xs">Agg: {sessionDivision.aggregate}</span>
                                          <span className={`inline-flex items-center px-2 py-0 rounded-full text-xs font-semibold text-white ${sessionDivision.pill}`}>
                                            {sessionDivision.division}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                ) : (
                                  <td className="text-center">—</td>
                                )}
                                <td colSpan={2} className="text-right pr-4">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <input
                                        type="number"
                                        min="1"
                                        max={students.length}
                                        step="1"
                                        value={positionData.rank}
                                        onChange={(e) => handlePositionChange(sess.id, e.target.value)}
                                        className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500"
                                      />
                                      <span className="text-xs">/ {students.length}</span>
                                    </div>
                                  ) : (
                                    `Position: ${positionData.rank}/${positionData.outOf}`
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      );
                    })}
                  </div>

                  {/* Comments */}
                  <div className="space-y-0 mt-1">
                    <div className="border border-gray-200 rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-0">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Class Teacher</p>
                        <p className="text-xs text-gray-500">Class Performance Comment</p>
                      </div>
                      <textarea
                        value={classTeacherComment}
                        onChange={(e) => setClassTeacherComment(e.target.value)}
                        disabled={!isEditing}
                        className="w-full bg-transparent text-sm text-gray-700 outline-none disabled:text-gray-600 resize-none"
                        rows={2}
                      />
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Signature: ________________</p>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3 mt-1">
                      <div className="flex items-center justify-between mb-0">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Head Teacher</p>
                        <p className="text-xs text-gray-500">School Performance Comment</p>
                      </div>
                      <textarea
                        value={headTeacherComment}
                        onChange={(e) => setHeadTeacherComment(e.target.value)}
                        disabled={!isEditing}
                        className="w-full bg-transparent text-sm text-gray-700 outline-none disabled:text-gray-600 resize-none"
                        rows={2}
                      />
                      <div className="mt-0 pt-0 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Signature: ________________</p>
                      </div>
                      <p className="text-sm font-semibold text-green-700 text-center">Next Term Begins on {nextTermStartDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <PrintCSS isLowerPrimary={isLowerPrimaryClass ?? false} />
    </div>
  );
}

function PrintCSS({ isLowerPrimary }: { isLowerPrimary: boolean }) {
  const printInnerPadding = !isLowerPrimary 
    ? "padding: 14mm 14mm 10mm 14mm;" 
    : "padding: 3mm 6mm 4mm 6mm;";
    
  return (
    <style jsx global>{`
      .print-page {
        width: 210mm;
        min-height: 297mm;
        background: #fff;
        margin: 0 auto;
        overflow: hidden;
      }
      .print-inner { ${printInnerPadding} box-sizing: border-box; }
      @page { size: A4 portrait; margin: 0mm; }
      @media print {
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; width: 210mm !important; min-height: 297mm !important; }
        body * { visibility: hidden; }
        .print-page, .print-page * { visibility: visible; }
        .print-page { position: absolute; left: 0; top: 0; width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
        .no-print { display: none !important; }
        textarea, input, select { border: none !important; background: transparent !important; resize: none !important; overflow: hidden !important; color: #000 !important; }
        input, select { text-align: center !important; }
      }
      @media screen {
        .print-page { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-radius: 8px; background: white; margin: 0 auto; overflow: auto; }
      }
    `}</style>
  );
}
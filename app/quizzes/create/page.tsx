// app/quizzes/create/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Eye,
  HelpCircle,
  Layers3,
  Plus,
  Save,
  Settings,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";
import supabase from "@/lib/supabaseClient";

type QuestionType = "mcq" | "true_false" | "short_answer";
type QuizStatus = "draft" | "active";
type QuizType = "practice" | "revision" | "class_test";

type QuizQuestion = {
  localId: string;
  questionText: string;
  questionType: QuestionType;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  marks: number;
  isRequired: boolean;
};

type QuizFormData = {
  title: string;
  description: string;
  quizType: QuizType;
  classId: string;
  subjectId: string;
  noteId: string;
  topicId: string;
  timeLimitMinutes: string;
  passingScore: number;
  status: QuizStatus;
  shuffleQuestions: boolean;
  showResults: boolean;
  allowRetake: boolean;
  maxAttempts: number;
};

type ClassItem = {
  id: number;
  grade_name: string;
  school_id: string | null;
};

type SubjectItem = {
  id: number;
  name: string;
  code: string | null;
  grade_id: number | null;
};

type NoteItem = {
  id: number;
  description: string | null;
  notes_content: string | null;
  subject_id: number;
  grade_id: number | null;
};

type TopicItem = {
  id: number;
  name: string;
  subject_id: number;
  grade_id: number;
};

type TeacherItem = {
  registration_id: string;
  user_id: string;
  school_id: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const textareaClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const ghostBtnClass =
  "inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

function generateLocalId() {
  const timestamp = Date.now().toString(36);
  const randomA = Math.random().toString(36).slice(2, 10);
  const randomB = Math.random().toString(36).slice(2, 10);
  return `q_${timestamp}_${randomA}_${randomB}`;
}

function createEmptyQuestion(): QuizQuestion {
  return {
    localId: generateLocalId(),
    questionText: "",
    questionType: "mcq",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "",
    explanation: "",
    marks: 1,
    isRequired: true,
  };
}

export default function CreateQuizPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const [teacher, setTeacher] = useState<TeacherItem | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);

  const [form, setForm] = useState<QuizFormData>({
    title: "",
    description: "",
    quizType: "practice",
    classId: "",
    subjectId: "",
    noteId: "",
    topicId: "",
    timeLimitMinutes: "",
    passingScore: 50,
    status: "draft",
    shuffleQuestions: false,
    showResults: true,
    allowRetake: true,
    maxAttempts: 3,
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>([createEmptyQuestion()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setLoadingData(true);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error("You are not logged in.");

        const { data: teacherData, error: teacherError } = await supabase
          .from("teachers")
          .select("registration_id, user_id, school_id")
          .eq("user_id", user.id)
          .single();

        if (teacherError) throw teacherError;
        if (!teacherData) throw new Error("Teacher profile not found.");

        setTeacher(teacherData);

        const [classRes, subjectRes, noteRes, topicRes] = await Promise.all([
          supabase
            .from("class")
            .select("id, grade_name, school_id")
            .eq("school_id", teacherData.school_id)
            .order("grade_name", { ascending: true }),

          supabase
            .from("subject")
            .select("id, name, code, grade_id")
            .eq("school_id", teacherData.school_id)
            .order("name", { ascending: true }),

          supabase
            .from("notes")
            .select("id, description, notes_content, subject_id, grade_id")
            .eq("school_id", teacherData.school_id)
            .order("id", { ascending: false }),

          supabase
            .from("assessment_topics")
            .select("id, name, subject_id, grade_id")
            .eq("school_id", teacherData.school_id)
            .order("name", { ascending: true }),
        ]);

        if (classRes.error) throw classRes.error;
        if (subjectRes.error) throw subjectRes.error;
        if (noteRes.error) throw noteRes.error;
        if (topicRes.error) throw topicRes.error;

        setClasses(classRes.data ?? []);
        setSubjects(subjectRes.data ?? []);
        setNotes(noteRes.data ?? []);
        setTopics(topicRes.data ?? []);
      } catch (err: any) {
        console.error("Error loading create quiz page:", err);
        setErrors({
          load: err?.message || "Failed to load the page data.",
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadPageData();
  }, []);

  const filteredSubjects = useMemo(() => {
    if (!form.classId) return [];
    return subjects.filter((subject) => subject.grade_id === Number(form.classId));
  }, [subjects, form.classId]);

  const filteredNotes = useMemo(() => {
    if (!form.subjectId) return [];
    const subjectId = Number(form.subjectId);
    const gradeId = form.classId ? Number(form.classId) : null;

    return notes.filter((note) => {
      const sameSubject = note.subject_id === subjectId;
      const sameGrade = gradeId ? note.grade_id === gradeId || note.grade_id === null : true;
      return sameSubject && sameGrade;
    });
  }, [notes, form.subjectId, form.classId]);

  const filteredTopics = useMemo(() => {
    if (!form.subjectId) return [];
    const subjectId = Number(form.subjectId);
    const gradeId = form.classId ? Number(form.classId) : null;

    return topics.filter((topic) => {
      const sameSubject = topic.subject_id === subjectId;
      const sameGrade = gradeId ? topic.grade_id === gradeId : true;
      return sameSubject && sameGrade;
    });
  }, [topics, form.subjectId, form.classId]);

  const totalQuestions = questions.length;

  const totalMarks = useMemo(() => {
    return questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  }, [questions]);

  const completionStats = useMemo(() => {
    const validQuestions = questions.filter((q) => {
      if (!q.questionText.trim()) return false;
      if (!q.marks || q.marks < 1) return false;

      if (q.questionType === "mcq") {
        return (
          q.optionA.trim() &&
          q.optionB.trim() &&
          q.optionC.trim() &&
          q.optionD.trim() &&
          ["A", "B", "C", "D"].includes(q.correctAnswer)
        );
      }

      if (q.questionType === "true_false") {
        return ["true", "false"].includes(q.correctAnswer);
      }

      if (q.questionType === "short_answer") {
        return q.correctAnswer.trim().length > 0;
      }

      return false;
    }).length;

    return {
      validQuestions,
      completionPercentage:
        totalQuestions > 0 ? Math.round((validQuestions / totalQuestions) * 100) : 0,
    };
  }, [questions, totalQuestions]);

  const getDifficultyLabel = (avgMarks: number) => {
    if (avgMarks >= 3) return { label: "Advanced", className: "bg-red-50 text-red-700" };
    if (avgMarks >= 2) return { label: "Intermediate", className: "bg-amber-50 text-amber-700" };
    return { label: "Beginner", className: "bg-emerald-50 text-emerald-700" };
  };

  const difficulty = getDifficultyLabel(totalMarks / (totalQuestions || 1));

  const updateForm = <K extends keyof QuizFormData>(field: K, value: QuizFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "classId") {
        next.subjectId = "";
        next.noteId = "";
        next.topicId = "";
      }

      if (field === "subjectId") {
        next.noteId = "";
        next.topicId = "";
      }

      if (field === "allowRetake" && value === false) {
        next.maxAttempts = 1;
      }

      return next;
    });

    setErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  };

  const updateQuestion = <K extends keyof QuizQuestion>(
    localId: string,
    field: K,
    value: QuizQuestion[K]
  ) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.localId === localId ? { ...question, [field]: value } : question
      )
    );
  };

  const addQuestion = () => {
    const newQuestion = createEmptyQuestion();
    setQuestions((prev) => [...prev, newQuestion]);
    setActiveQuestionId(newQuestion.localId);

    setErrors((prev) => {
      const next = { ...prev };
      delete next.questions;
      return next;
    });
  };

  const duplicateQuestion = (localId: string) => {
    const existing = questions.find((q) => q.localId === localId);
    if (!existing) return;

    const copy: QuizQuestion = {
      ...existing,
      localId: generateLocalId(),
    };

    setQuestions((prev) => [...prev, copy]);
    setActiveQuestionId(copy.localId);
  };

  const removeQuestion = (localId: string) => {
    if (questions.length === 1) {
      setErrors((prev) => ({
        ...prev,
        questions: "You must keep at least one question.",
      }));
      return;
    }

    setQuestions((prev) => {
      const next = prev.filter((q) => q.localId !== localId);
      if (activeQuestionId === localId) {
        setActiveQuestionId(next[0]?.localId ?? null);
      }
      return next;
    });
  };

  const moveQuestion = (localId: string, direction: "up" | "down") => {
    const index = questions.findIndex((q) => q.localId === localId);
    if (index < 0) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === questions.length - 1) return;

    setQuestions((prev) => {
      const next = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) newErrors.title = "Quiz title is required.";
    if (!form.classId) newErrors.classId = "Please select a class.";
    if (!form.subjectId) newErrors.subjectId = "Please select a subject.";
    if (questions.length === 0) newErrors.questions = "Add at least one question.";

    questions.forEach((q, index) => {
      const questionNo = index + 1;

      if (!q.questionText.trim()) {
        newErrors.questions = `Question ${questionNo} is missing the question text.`;
        return;
      }

      if (!q.marks || q.marks < 1) {
        newErrors.questions = `Question ${questionNo} must have at least 1 mark.`;
        return;
      }

      if (q.questionType === "mcq") {
        if (!q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
          newErrors.questions = `Question ${questionNo} must have all four options.`;
          return;
        }
        if (!["A", "B", "C", "D"].includes(q.correctAnswer)) {
          newErrors.questions = `Question ${questionNo} must have a valid correct option.`;
          return;
        }
      }

      if (q.questionType === "true_false") {
        if (!["true", "false"].includes(q.correctAnswer)) {
          newErrors.questions = `Question ${questionNo} must have True or False selected.`;
          return;
        }
      }

      if (q.questionType === "short_answer") {
        if (!q.correctAnswer.trim()) {
          newErrors.questions = `Question ${questionNo} must have an expected answer.`;
          return;
        }
      }
    });

    if (form.passingScore < 0 || form.passingScore > 100) {
      newErrors.passingScore = "Passing score must be between 0 and 100.";
    }

    if (form.allowRetake && (!form.maxAttempts || form.maxAttempts < 1)) {
      newErrors.maxAttempts = "Max attempts must be at least 1.";
    }

    setErrors(newErrors);

    return {
      valid: Object.keys(newErrors).length === 0,
      formErrors: newErrors,
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.valid) {
      const firstError = Object.values(validation.formErrors)[0];
      if (firstError) alert(firstError);
      return;
    }

    if (!teacher) {
      alert("Teacher profile not found.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      const quizPayload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        notes_id: form.noteId ? Number(form.noteId) : null,
        subject_id: Number(form.subjectId),
        grade_id: Number(form.classId),
        topic_id: form.topicId ? Number(form.topicId) : null,
        school_id: teacher.school_id,
        created_by_id: teacher.registration_id,
        quiz_type: form.quizType,
        time_limit_minutes: form.timeLimitMinutes ? Number(form.timeLimitMinutes) : null,
        total_marks: totalMarks,
        is_active: form.status === "active",
      };

      const { data: quizData, error: quizError } = await supabase
        .from("quiz")
        .insert(quizPayload)
        .select("id")
        .single();

      if (quizError) throw quizError;
      if (!quizData) throw new Error("Quiz was not created.");

      const settingsPayload = {
        quiz_id: quizData.id,
        shuffle_questions: form.shuffleQuestions,
        shuffle_options: false,
        show_results_immediately: form.showResults,
        allow_retake: form.allowRetake,
        max_attempts: form.allowRetake ? form.maxAttempts : 1,
        passing_score: form.passingScore,
      };

      const { error: settingsError } = await supabase
        .from("quiz_settings")
        .insert(settingsPayload);

      if (settingsError) throw settingsError;

      const questionsPayload = questions.map((q, index) => ({
        quiz_id: quizData.id,
        topic_id: form.topicId ? Number(form.topicId) : null,
        question_text: q.questionText.trim(),
        question_type: q.questionType,
        option_a: q.questionType === "mcq" ? q.optionA.trim() || null : null,
        option_b: q.questionType === "mcq" ? q.optionB.trim() || null : null,
        option_c: q.questionType === "mcq" ? q.optionC.trim() || null : null,
        option_d: q.questionType === "mcq" ? q.optionD.trim() || null : null,
        correct_answer: q.questionType === "short_answer" ? q.correctAnswer.trim() : q.correctAnswer,
        explanation: q.explanation.trim() || null,
        marks: Number(q.marks) || 1,
        question_order: index + 1,
        is_required: q.isRequired,
      }));

      const { error: questionsError } = await supabase
        .from("quiz_question")
        .insert(questionsPayload);

      if (questionsError) throw questionsError;

      if (form.noteId) {
        const { error: quizNotesError } = await supabase.from("quiz_notes").insert({
          quiz_id: quizData.id,
          notes_id: Number(form.noteId),
        });

        if (quizNotesError) {
          console.warn("Failed to create quiz_notes link:", quizNotesError);
        }
      }

      alert("Quiz created successfully.");
      router.push("/quizzes");
    } catch (err: any) {
      console.error("Failed to save quiz:", err);
      const message = err?.message || "Failed to save quiz. Please try again.";
      setErrors({ submit: message });
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1">
            <div className="mx-auto max-w-7xl p-4 md:p-6">
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                <span className="ml-3 text-slate-600">Loading quiz builder...</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (errors.load) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1">
            <div className="mx-auto max-w-4xl p-4 md:p-6">
              <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
                <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
                <h2 className="mt-4 text-2xl font-semibold text-red-800">
                  Failed to Load Quiz Page
                </h2>
                <p className="mt-2 text-red-700">{errors.load}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1">
          <form onSubmit={handleSubmit} className="mx-auto max-w-7xl p-4 md:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link
                  href="/quizzes"
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  ← Back to Quizzes
                </Link>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  Create New Quiz
                </h1>
                <p className="mt-1 text-slate-500">
                  Build a professional quiz and save it directly to your school database.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview((prev) => !prev)}
                  className={ghostBtnClass}
                >
                  <Eye className="h-4 w-4" />
                  {showPreview ? "Edit Mode" : "Preview"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/quizzes")}
                  className={ghostBtnClass}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create Quiz
                    </>
                  )}
                </button>
              </div>
            </div>

            {errors.submit && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errors.submit}
              </div>
            )}

            {!showPreview ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-6 text-white">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                            <Sparkles className="h-3.5 w-3.5" />
                            Quiz Builder
                          </div>
                          <h2 className="text-xl font-semibold">Start building your quiz</h2>
                          <p className="mt-1 text-sm text-indigo-100">
                            Add details, configure settings, and create questions.
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <HeroStat
                            label="Questions"
                            value={String(totalQuestions)}
                            icon={<BookOpen className="h-4 w-4" />}
                          />
                          <HeroStat
                            label="Total Marks"
                            value={String(totalMarks)}
                            icon={<Award className="h-4 w-4" />}
                          />
                          <HeroStat
                            label="Difficulty"
                            value={difficulty.label}
                            icon={<Target className="h-4 w-4" />}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4 md:grid-cols-3">
                      <MiniStatus
                        title="Questions"
                        value={`${completionStats.validQuestions}/${totalQuestions}`}
                        done={completionStats.validQuestions === totalQuestions}
                      />
                      <MiniStatus
                        title="Progress"
                        value={`${completionStats.completionPercentage}%`}
                        done={completionStats.completionPercentage === 100}
                      />
                      <MiniStatus
                        title="State"
                        value={form.status === "active" ? "Active" : "Draft"}
                        done={Boolean(form.title && form.classId && form.subjectId)}
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <SectionHeader
                      icon={<Layers3 className="h-5 w-5" />}
                      title="Quiz Details"
                      description="Set up the basic quiz information"
                    />

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <Field label="Quiz Title" required error={errors.title}>
                        <input
                          value={form.title}
                          onChange={(e) => updateForm("title", e.target.value)}
                          placeholder="e.g. Biology Revision Quiz"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Quiz Type" required>
                        <select
                          value={form.quizType}
                          onChange={(e) => updateForm("quizType", e.target.value as QuizType)}
                          className={inputClass}
                        >
                          <option value="practice">Practice Quiz</option>
                          <option value="revision">Revision Quiz</option>
                          <option value="class_test">Class Test</option>
                        </select>
                      </Field>

                      <Field label="Class" required error={errors.classId}>
                        <select
                          value={form.classId}
                          onChange={(e) => updateForm("classId", e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select class</option>
                          {classes.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.grade_name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Subject" required error={errors.subjectId}>
                        <select
                          value={form.subjectId}
                          onChange={(e) => updateForm("subjectId", e.target.value)}
                          className={inputClass}
                          disabled={!form.classId}
                        >
                          <option value="">
                            {form.classId ? "Select subject" : "Select class first"}
                          </option>
                          {filteredSubjects.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} {item.code ? `(${item.code})` : ""}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Linked Note">
                        <select
                          value={form.noteId}
                          onChange={(e) => updateForm("noteId", e.target.value)}
                          className={inputClass}
                          disabled={!form.subjectId}
                        >
                          <option value="">
                            {form.subjectId ? "Select note (optional)" : "Select subject first"}
                          </option>
                          {filteredNotes.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.description?.trim() || `Note ${item.id}`}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Topic">
                        <select
                          value={form.topicId}
                          onChange={(e) => updateForm("topicId", e.target.value)}
                          className={inputClass}
                          disabled={!form.subjectId}
                        >
                          <option value="">
                            {form.subjectId ? "Select topic (optional)" : "Select subject first"}
                          </option>
                          {filteredTopics.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Time Limit (Minutes)">
                        <div className="relative">
                          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            min={1}
                            value={form.timeLimitMinutes}
                            onChange={(e) => updateForm("timeLimitMinutes", e.target.value)}
                            placeholder="e.g. 20"
                            className={`${inputClass} pl-10`}
                          />
                        </div>
                      </Field>

                      <Field label="Status" required>
                        <select
                          value={form.status}
                          onChange={(e) => updateForm("status", e.target.value as QuizStatus)}
                          className={inputClass}
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                        </select>
                      </Field>
                    </div>

                    <div className="mt-4">
                      <Field label="Description">
                        <textarea
                          rows={4}
                          value={form.description}
                          onChange={(e) => updateForm("description", e.target.value)}
                          placeholder="Write a short description for this quiz..."
                          className={textareaClass}
                        />
                      </Field>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAdvanced((prev) => !prev)}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      <Settings className="h-4 w-4" />
                      {showAdvanced ? "Hide" : "Show"} Advanced Settings
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                      />
                    </button>

                    {showAdvanced && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h4 className="mb-4 text-sm font-semibold text-slate-900">
                          Quiz Settings
                        </h4>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <input
                              type="checkbox"
                              checked={form.shuffleQuestions}
                              onChange={(e) => updateForm("shuffleQuestions", e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700">Shuffle questions</span>
                          </label>

                          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <input
                              type="checkbox"
                              checked={form.showResults}
                              onChange={(e) => updateForm("showResults", e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700">Show results immediately</span>
                          </label>

                          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <input
                              type="checkbox"
                              checked={form.allowRetake}
                              onChange={(e) => updateForm("allowRetake", e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700">Allow retake</span>
                          </label>

                          <Field label="Max Attempts" error={errors.maxAttempts}>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={form.maxAttempts}
                              onChange={(e) => updateForm("maxAttempts", Number(e.target.value))}
                              className={inputClass}
                              disabled={!form.allowRetake}
                            />
                          </Field>

                          <Field label="Passing Score (%)" error={errors.passingScore}>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={form.passingScore}
                              onChange={(e) => updateForm("passingScore", Number(e.target.value))}
                              className={inputClass}
                            />
                          </Field>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
                      <SectionHeader
                        icon={<BookOpen className="h-5 w-5" />}
                        title="Questions"
                        description="Add and configure each question"
                        noMargin
                      />

                      <button
                        type="button"
                        onClick={addQuestion}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add Question
                      </button>
                    </div>

                    {errors.questions && (
                      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.questions}
                      </div>
                    )}

                    <div className="mt-6 space-y-4">
                      {questions.map((question, index) => (
                        <QuestionCard
                          key={question.localId}
                          question={question}
                          index={index}
                          total={questions.length}
                          isActive={activeQuestionId === question.localId}
                          onToggle={() =>
                            setActiveQuestionId((prev) =>
                              prev === question.localId ? null : question.localId
                            )
                          }
                          onUpdate={updateQuestion}
                          onDuplicate={() => duplicateQuestion(question.localId)}
                          onRemove={() => removeQuestion(question.localId)}
                          onMoveUp={() => moveQuestion(question.localId, "up")}
                          onMoveDown={() => moveQuestion(question.localId, "down")}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="space-y-6">
                  <div className="sticky top-6 space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-base font-semibold text-slate-900">Quiz Overview</h3>

                      <div className="mt-4 space-y-3">
                        <SideSummaryRow label="Title" value={form.title || "Not set"} />
                        <SideSummaryRow
                          label="Class"
                          value={
                            classes.find((x) => x.id === Number(form.classId))?.grade_name ||
                            "Not selected"
                          }
                        />
                        <SideSummaryRow
                          label="Subject"
                          value={
                            subjects.find((x) => x.id === Number(form.subjectId))?.name ||
                            "Not selected"
                          }
                        />
                        <SideSummaryRow label="Questions" value={String(totalQuestions)} />
                        <SideSummaryRow label="Total Marks" value={String(totalMarks)} />
                        <SideSummaryRow
                          label="Status"
                          value={form.status === "active" ? "Active" : "Draft"}
                        />
                        <SideSummaryRow
                          label="Passing Score"
                          value={`${form.passingScore}%`}
                        />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-base font-semibold text-slate-900">Checklist</h3>

                      <div className="mt-4 space-y-3">
                        <ChecklistItem done={Boolean(form.title.trim())} text="Quiz title added" />
                        <ChecklistItem
                          done={Boolean(form.classId && form.subjectId)}
                          text="Class and subject selected"
                        />
                        <ChecklistItem
                          done={questions.length > 0}
                          text="At least one question added"
                        />
                        <ChecklistItem
                          done={completionStats.validQuestions === totalQuestions}
                          text="All questions completed"
                        />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <Zap className="mt-0.5 h-5 w-5 text-indigo-600" />
                        <div>
                          <h4 className="text-sm font-semibold text-indigo-900">Tips</h4>
                          <ul className="mt-2 space-y-1 text-xs text-indigo-700">
                            <li>• Keep questions clear and short</li>
                            <li>• Match marks to difficulty</li>
                            <li>• Add explanations for learning support</li>
                            <li>• Use draft before activating the quiz</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            ) : (
              <PreviewMode form={form} questions={questions} />
            )}
          </form>
        </main>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  noMargin = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  noMargin?: boolean;
}) {
  return (
    <div className={noMargin ? "" : "mb-1"}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">{icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2 text-indigo-100">{icon}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
      <div className="text-xs text-indigo-100">{label}</div>
    </div>
  );
}

function MiniStatus({
  title,
  value,
  done,
}: {
  title: string;
  value: string;
  done: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {done ? "Done" : "Pending"}
        </span>
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function SideSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="max-w-[160px] text-right text-sm font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}

function ChecklistItem({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
      </div>
      <span className={`text-sm ${done ? "text-slate-800" : "text-slate-500"}`}>{text}</span>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  isActive,
  onToggle,
  onUpdate,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  isActive: boolean;
  onToggle: () => void;
  onUpdate: <K extends keyof QuizQuestion>(
    localId: string,
    field: K,
    value: QuizQuestion[K]
  ) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const typeLabel =
    question.questionType === "mcq"
      ? "Multiple Choice"
      : question.questionType === "true_false"
      ? "True / False"
      : "Short Answer";

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Question {index + 1}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {typeLabel}
              </span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                {question.marks} mark{question.marks === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onMoveUp} className={ghostBtnClass} disabled={index === 0}>
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            className={ghostBtnClass}
            disabled={index === total - 1}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDuplicate} className={ghostBtnClass}>
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      </div>

      <div className={`px-5 py-5 ${isActive ? "block" : "block"}`}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Question Type" required>
            <select
              value={question.questionType}
              onChange={(e) => {
                const nextType = e.target.value as QuestionType;
                onUpdate(question.localId, "questionType", nextType);

                if (nextType === "true_false") {
                  onUpdate(question.localId, "optionA", "True");
                  onUpdate(question.localId, "optionB", "False");
                  onUpdate(question.localId, "optionC", "");
                  onUpdate(question.localId, "optionD", "");
                  onUpdate(question.localId, "correctAnswer", "true");
                } else if (nextType === "short_answer") {
                  onUpdate(question.localId, "optionA", "");
                  onUpdate(question.localId, "optionB", "");
                  onUpdate(question.localId, "optionC", "");
                  onUpdate(question.localId, "optionD", "");
                  onUpdate(question.localId, "correctAnswer", "");
                } else {
                  onUpdate(question.localId, "optionA", "");
                  onUpdate(question.localId, "optionB", "");
                  onUpdate(question.localId, "optionC", "");
                  onUpdate(question.localId, "optionD", "");
                  onUpdate(question.localId, "correctAnswer", "");
                }
              }}
              className={inputClass}
            >
              <option value="mcq">Multiple Choice</option>
              <option value="true_false">True / False</option>
              <option value="short_answer">Short Answer</option>
            </select>
          </Field>

          <Field label="Marks" required>
            <input
              type="number"
              min={1}
              value={question.marks}
              onChange={(e) =>
                onUpdate(question.localId, "marks", Number(e.target.value) || 1)
              }
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Question Text" required>
            <textarea
              rows={4}
              value={question.questionText}
              onChange={(e) => onUpdate(question.localId, "questionText", e.target.value)}
              placeholder="Type the question here..."
              className={textareaClass}
            />
          </Field>
        </div>

        {question.questionType === "mcq" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Option A" required>
              <input
                value={question.optionA}
                onChange={(e) => onUpdate(question.localId, "optionA", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Option B" required>
              <input
                value={question.optionB}
                onChange={(e) => onUpdate(question.localId, "optionB", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Option C" required>
              <input
                value={question.optionC}
                onChange={(e) => onUpdate(question.localId, "optionC", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Option D" required>
              <input
                value={question.optionD}
                onChange={(e) => onUpdate(question.localId, "optionD", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Correct Answer" required>
              <select
                value={question.correctAnswer}
                onChange={(e) => onUpdate(question.localId, "correctAnswer", e.target.value)}
                className={inputClass}
              >
                <option value="">Select correct option</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </Field>
          </div>
        )}

        {question.questionType === "true_false" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Correct Answer" required>
              <select
                value={question.correctAnswer}
                onChange={(e) => onUpdate(question.localId, "correctAnswer", e.target.value)}
                className={inputClass}
              >
                <option value="">Select answer</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </Field>
          </div>
        )}

        {question.questionType === "short_answer" && (
          <div className="mt-4">
            <Field label="Expected Answer" required>
              <textarea
                rows={3}
                value={question.correctAnswer}
                onChange={(e) => onUpdate(question.localId, "correctAnswer", e.target.value)}
                className={textareaClass}
              />
            </Field>
          </div>
        )}

        <div className="mt-4">
          <Field label="Explanation / Feedback">
            <textarea
              rows={3}
              value={question.explanation}
              onChange={(e) => onUpdate(question.localId, "explanation", e.target.value)}
              placeholder="Optional explanation..."
              className={textareaClass}
            />
          </Field>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={question.isRequired}
              onChange={(e) => onUpdate(question.localId, "isRequired", e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700">This question is required</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function PreviewMode({
  form,
  questions,
}: {
  form: QuizFormData;
  questions: QuizQuestion[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {form.title || "Untitled Quiz"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {form.description || "No description provided."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              {form.quizType.replace("_", " ")}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                form.status === "active"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {form.status === "active" ? "Active" : "Draft"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {questions.length} question{questions.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {questions.map((question, index) => (
          <div
            key={question.localId}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">
                {index + 1}. {question.questionText || "Untitled question"}
              </h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                {question.marks} mark{question.marks === 1 ? "" : "s"}
              </span>
            </div>

            {question.questionType === "mcq" && (
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  { key: "A", value: question.optionA },
                  { key: "B", value: question.optionB },
                  { key: "C", value: question.optionC },
                  { key: "D", value: question.optionD },
                ].map((option) => (
                  <div
                    key={option.key}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      question.correctAnswer === option.key
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <span className="font-semibold">{option.key}.</span>{" "}
                    {option.value || "Empty option"}
                  </div>
                ))}
              </div>
            )}

            {question.questionType === "true_false" && (
              <div className="grid gap-2 md:grid-cols-2">
                {["true", "false"].map((value) => (
                  <div
                    key={value}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      question.correctAnswer === value
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {value === "true" ? "True" : "False"}
                  </div>
                ))}
              </div>
            )}

            {question.questionType === "short_answer" && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Expected answer: {question.correctAnswer || "Not set"}
              </div>
            )}

            {question.explanation && (
              <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                <span className="font-semibold">Explanation:</span> {question.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
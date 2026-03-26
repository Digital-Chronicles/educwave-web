"use client";

import { useMemo, useState, useEffect } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  Layers3,
  Plus,
  Save,
  Sparkles,
  Timer,
  Trash2,
  HelpCircle,
  AlertCircle,
  Settings,
  Eye,
  EyeOff,
  Copy,
  ArrowUp,
  ArrowDown,
  X,
  ChevronDown,
  Clock,
  Award,
  Target,
  TrendingUp,
  Zap,
  AlertTriangle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";
import { useRouter } from "next/navigation";
import Link from "next/link";

type QuestionType = "mcq" | "true_false" | "short_answer";
type QuizStatus = "draft" | "active";
type QuizType = "practice" | "revision" | "class_test";

type QuizQuestion = {
  id: string;
  questionText: string;
  questionType: QuestionType;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  marks: number;
  isRequired?: boolean;
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

const demoClasses = [
  { id: "1", name: "Primary One", stream: "Morning" },
  { id: "2", name: "Primary Two", stream: "Morning" },
  { id: "3", name: "Senior One", stream: "Afternoon" },
  { id: "4", name: "Senior Two", stream: "Afternoon" },
];

const demoSubjects = [
  { id: "1", name: "Mathematics", code: "MATH101" },
  { id: "2", name: "Biology", code: "BIO101" },
  { id: "3", name: "English", code: "ENG101" },
  { id: "4", name: "Physics", code: "PHY101" },
];

const demoNotes = [
  { id: "1", name: "Introduction to Plants", topic: "Botany" },
  { id: "2", name: "Fractions Basics", topic: "Arithmetic" },
  { id: "3", name: "Photosynthesis", topic: "Plant Biology" },
];

const demoTopics = [
  { id: "1", name: "Parts of a Plant", subject: "Biology" },
  { id: "2", name: "Types of Fractions", subject: "Mathematics" },
  { id: "3", name: "Light Reactions", subject: "Biology" },
];

function createEmptyQuestion(): QuizQuestion {
  return {
    id: crypto.randomUUID(),
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

  const [questions, setQuestions] = useState<QuizQuestion[]>([
    createEmptyQuestion(),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalQuestions = questions.length;
  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
    [questions]
  );

  const completionStats = useMemo(() => {
    const hasBasicInfo =
      form.title.trim() &&
      form.quizType &&
      form.classId &&
      form.subjectId &&
      form.status;

    const validQuestions = questions.filter((q) => {
      if (!q.questionText.trim()) return false;
      if (q.questionType === "mcq") {
        return q.optionA.trim() && q.optionB.trim() && q.correctAnswer.trim();
      }
      if (q.questionType === "true_false") {
        return q.correctAnswer.trim();
      }
      return true;
    }).length;

    return {
      hasBasicInfo: Boolean(hasBasicInfo),
      validQuestions,
      completionPercentage: totalQuestions > 0 
        ? Math.round((validQuestions / totalQuestions) * 100) 
        : 0,
    };
  }, [form, questions, totalQuestions]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!form.title.trim()) newErrors.title = "Quiz title is required";
    if (!form.classId) newErrors.classId = "Please select a class";
    if (!form.subjectId) newErrors.subjectId = "Please select a subject";
    if (totalQuestions === 0) newErrors.questions = "Add at least one question";
    
    if (completionStats.validQuestions !== totalQuestions) {
      newErrors.questions = `${completionStats.validQuestions}/${totalQuestions} questions are incomplete`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateForm = <K extends keyof QuizFormData>(
    field: K,
    value: QuizFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  };

  const updateQuestion = <K extends keyof QuizQuestion>(
    id: string,
    field: K,
    value: QuizQuestion[K]
  ) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id ? { ...question, [field]: value } : question
      )
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
    setActiveQuestion(questions[questions.length - 1]?.id || null);
  };

  const duplicateQuestion = (id: string) => {
    const questionToDuplicate = questions.find((q) => q.id === id);
    if (questionToDuplicate) {
      setQuestions((prev) => [
        ...prev,
        { ...questionToDuplicate, id: crypto.randomUUID() },
      ]);
    }
  };

  const removeQuestion = (id: string) => {
    if (questions.length === 1) {
      setErrors({ ...errors, questions: "You need at least one question" });
      return;
    }
    setQuestions((prev) => prev.filter((question) => question.id !== id));
    if (activeQuestion === id) {
      setActiveQuestion(questions[0]?.id || null);
    }
  };

  const moveQuestion = (id: string, direction: "up" | "down") => {
    const index = questions.findIndex((q) => q.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === questions.length - 1)
    )
      return;

    const newQuestions = [...questions];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[newIndex]] = [
      newQuestions[newIndex],
      newQuestions[index],
    ];
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const errorMessage = Object.values(errors)[0];
      alert(errorMessage);
      return;
    }

    const payload = {
      ...form,
      timeLimitMinutes: form.timeLimitMinutes ? Number(form.timeLimitMinutes) : null,
      totalQuestions,
      totalMarks,
      questions,
      passingScore: form.passingScore,
      settings: {
        shuffleQuestions: form.shuffleQuestions,
        showResults: form.showResults,
        allowRetake: form.allowRetake,
        maxAttempts: form.maxAttempts,
      },
    };

    try {
      setIsSubmitting(true);
      console.log("Create quiz payload:", payload);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert("Quiz created successfully!");
      router.push("/quizzes");
    } catch (error) {
      console.error("Failed to save quiz:", error);
      alert("Failed to save quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyLabel = (avgMarks: number) => {
    if (avgMarks >= 3) return { label: "Advanced", color: "text-red-600 bg-red-50" };
    if (avgMarks >= 2) return { label: "Intermediate", color: "text-yellow-600 bg-yellow-50" };
    return { label: "Beginner", color: "text-green-600 bg-green-50" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1">
          <form onSubmit={handleSubmit} className="mx-auto max-w-7xl p-4 md:p-6">
            {/* Header Section */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link
                  href="/quizzes"
                  className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  ← Back to Quizzes
                </Link>
                <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
                  Create New Quiz
                </h1>
                <p className="mt-1 text-slate-500">
                  Build interactive quizzes with multiple question types and advanced settings
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Eye className="mr-2 inline h-4 w-4" />
                  {showPreview ? "Edit Mode" : "Preview"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/quizzes")}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
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

            {!showPreview ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
                {/* Main Content */}
                <div className="space-y-6">
                  {/* Progress Header */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-6 text-white">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                            <Sparkles className="h-3.5 w-3.5" />
                            Quiz Builder
                          </div>
                          <h2 className="text-xl font-semibold">Start building your quiz</h2>
                          <p className="mt-1 text-sm text-indigo-200">
                            Fill in the details and add questions
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
                            value={getDifficultyLabel(totalMarks / totalQuestions).label}
                            icon={<Target className="h-4 w-4" />}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4 md:grid-cols-3">
                      <MiniStatus
                        title="Basic Info"
                        value={completionStats.hasBasicInfo ? "Complete" : "Pending"}
                        done={completionStats.hasBasicInfo}
                      />
                      <MiniStatus
                        title="Questions"
                        value={`${completionStats.validQuestions}/${totalQuestions}`}
                        done={completionStats.validQuestions === totalQuestions}
                      />
                      <MiniStatus
                        title="Overall Progress"
                        value={`${completionStats.completionPercentage}%`}
                        done={completionStats.completionPercentage === 100}
                      />
                    </div>
                  </div>

                  {/* Quiz Details */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <SectionHeader
                      icon={<Layers3 className="h-5 w-5" />}
                      title="Quiz Details"
                      description="Set up the core information for your quiz"
                    />

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <Field label="Quiz Title" required error={errors.title}>
                        <input
                          value={form.title}
                          onChange={(e) => updateForm("title", e.target.value)}
                          placeholder="e.g., Introduction to Photosynthesis"
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
                          {demoClasses.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.stream})
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Subject" required error={errors.subjectId}>
                        <select
                          value={form.subjectId}
                          onChange={(e) => updateForm("subjectId", e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select subject</option>
                          {demoSubjects.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.code})
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Linked Note">
                        <select
                          value={form.noteId}
                          onChange={(e) => updateForm("noteId", e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select note (optional)</option>
                          {demoNotes.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} - {item.topic}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Topic">
                        <select
                          value={form.topicId}
                          onChange={(e) => updateForm("topicId", e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select topic (optional)</option>
                          {demoTopics.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.subject})
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Time Limit (Minutes)">
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            min={1}
                            value={form.timeLimitMinutes}
                            onChange={(e) => updateForm("timeLimitMinutes", e.target.value)}
                            placeholder="e.g., 20"
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
                          <option value="draft">Draft (Not visible to students)</option>
                          <option value="active">Active (Visible to students)</option>
                        </select>
                      </Field>
                    </div>

                    <div className="mt-4">
                      <Field label="Description">
                        <textarea
                          rows={3}
                          value={form.description}
                          onChange={(e) => updateForm("description", e.target.value)}
                          placeholder="Provide a brief description of what this quiz covers..."
                          className={textareaClass}
                        />
                      </Field>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="mt-4 flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      <Settings className="h-4 w-4" />
                      {showAdvanced ? "Hide" : "Show"} Advanced Settings
                      <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                    </button>

                    {showAdvanced && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h4 className="mb-3 text-sm font-medium text-slate-900">Quiz Settings</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={form.shuffleQuestions}
                              onChange={(e) => updateForm("shuffleQuestions", e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700">Shuffle questions order</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={form.showResults}
                              onChange={(e) => updateForm("showResults", e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700">Show results immediately</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={form.allowRetake}
                              onChange={(e) => updateForm("allowRetake", e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700">Allow retakes</span>
                          </label>
                          <Field label="Max Attempts">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={form.maxAttempts}
                              onChange={(e) => updateForm("maxAttempts", Number(e.target.value))}
                              className={inputClass}
                              disabled={!form.allowRetake}
                            />
                          </Field>
                          <Field label="Passing Score (%)">
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

                  {/* Questions Section */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
                      <SectionHeader
                        icon={<BookOpen className="h-5 w-5" />}
                        title="Questions"
                        description="Add and configure your quiz questions"
                        noMargin
                      />
                      <button
                        type="button"
                        onClick={addQuestion}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add Question
                      </button>
                    </div>

                    {errors.questions && (
                      <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.questions}
                      </div>
                    )}

                    <div className="mt-6 space-y-4">
                      {questions.map((question, index) => (
                        <QuestionCard
                          key={question.id}
                          question={question}
                          index={index}
                          total={questions.length}
                          onUpdate={updateQuestion}
                          onDuplicate={() => duplicateQuestion(question.id)}
                          onRemove={() => removeQuestion(question.id)}
                          onMoveUp={() => moveQuestion(question.id, "up")}
                          onMoveDown={() => moveQuestion(question.id, "down")}
                          isActive={activeQuestion === question.id}
                          onToggle={() =>
                            setActiveQuestion(activeQuestion === question.id ? null : question.id)
                          }
                        />
                      ))}
                    </div>

                    {questions.length === 0 && (
                      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <HelpCircle className="mx-auto h-10 w-10 text-slate-400" />
                        <p className="mt-2 text-sm text-slate-500">No questions added yet</p>
                        <button
                          type="button"
                          onClick={addQuestion}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                        >
                          <Plus className="h-4 w-4" />
                          Add your first question
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <aside className="space-y-6">
                  <div className="sticky top-6 space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-base font-semibold text-slate-900">Quiz Overview</h3>
                      <div className="mt-4 space-y-3">
                        <SideSummaryRow label="Title" value={form.title || "Not set"} />
                        <SideSummaryRow
                          label="Class"
                          value={
                            demoClasses.find((item) => item.id === form.classId)?.name || "Not selected"
                          }
                        />
                        <SideSummaryRow
                          label="Subject"
                          value={
                            demoSubjects.find((item) => item.id === form.subjectId)?.name || "Not selected"
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

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-base font-semibold text-slate-900">Checklist</h3>
                      <div className="mt-4 space-y-3">
                        <ChecklistItem done={Boolean(form.title.trim())} text="Quiz title added" />
                        <ChecklistItem
                          done={Boolean(form.classId && form.subjectId)}
                          text="Class and subject selected"
                        />
                        <ChecklistItem done={totalQuestions > 0} text="At least one question added" />
                        <ChecklistItem
                          done={completionStats.validQuestions === totalQuestions}
                          text="All questions configured"
                        />
                        <ChecklistItem
                          done={form.passingScore > 0 && form.passingScore <= 100}
                          text="Valid passing score"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 to-indigo-100 p-5">
                      <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-indigo-600" />
                        <div>
                          <h4 className="text-sm font-semibold text-indigo-900">Pro Tips</h4>
                          <ul className="mt-2 space-y-1 text-xs text-indigo-700">
                            <li>• Use clear, concise language in questions</li>
                            <li>• Provide feedback for incorrect answers</li>
                            <li>• Set appropriate time limits based on question difficulty</li>
                            <li>• Preview your quiz before publishing</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            ) : (
              <PreviewMode questions={questions} form={form} />
            )}

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-20 mt-6 border-t border-slate-200 bg-white/90 backdrop-blur">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-0">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {completionStats.validQuestions} of {totalQuestions} question
                  {totalQuestions === 1 ? "" : "s"} ready
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add Question
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
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
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

// ==================== Subcomponents ====================

function Field({ label, required, children, error }: any) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </label>
  );
}

function SectionHeader({ icon, title, description, noMargin = false }: any) {
  return (
    <div className={noMargin ? "" : "mb-1"}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur">
      <div className="mb-1 flex items-center gap-1.5 text-indigo-200">{icon}</div>
      <p className="text-[10px] uppercase tracking-wider text-indigo-200">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function MiniStatus({ title, value, done }: { title: string; value: string; done?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
        </div>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            done ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

function SideSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium text-slate-900 truncate">
        {value}
      </span>
    </div>
  );
}

function ChecklistItem({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full ${
          done ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm font-medium text-slate-700">{text}</span>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  onUpdate,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isActive,
  onToggle,
}: any) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white">
            {index + 1}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              {question.questionText
                ? question.questionText.slice(0, 50) + (question.questionText.length > 50 ? "..." : "")
                : "New Question"}
            </h4>
            <p className="text-xs text-slate-500">
              {question.questionType === "mcq"
                ? "Multiple Choice"
                : question.questionType === "true_false"
                ? "True/False"
                : "Short Answer"}{" "}
              • {question.marks} {question.marks === 1 ? "mark" : "marks"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={total === 1}
            className="rounded p-1 text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100"
          >
            {isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isActive && (
        <div className="p-5 space-y-4">
          <Field label="Question Text" required>
            <textarea
              rows={2}
              value={question.questionText}
              onChange={(e: any) => onUpdate(question.id, "questionText", e.target.value)}
              placeholder="Enter the question..."
              className={textareaClass}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Question Type" required>
              <select
                value={question.questionType}
                onChange={(e: any) => onUpdate(question.id, "questionType", e.target.value)}
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
                onChange={(e: any) => onUpdate(question.id, "marks", Number(e.target.value) || 1)}
                className={inputClass}
              />
            </Field>
          </div>

          {question.questionType === "mcq" && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Option A" required>
                  <input
                    value={question.optionA}
                    onChange={(e: any) => onUpdate(question.id, "optionA", e.target.value)}
                    placeholder="Option A"
                    className={inputClass}
                  />
                </Field>
                <Field label="Option B" required>
                  <input
                    value={question.optionB}
                    onChange={(e: any) => onUpdate(question.id, "optionB", e.target.value)}
                    placeholder="Option B"
                    className={inputClass}
                  />
                </Field>
                <Field label="Option C">
                  <input
                    value={question.optionC}
                    onChange={(e: any) => onUpdate(question.id, "optionC", e.target.value)}
                    placeholder="Option C (optional)"
                    className={inputClass}
                  />
                </Field>
                <Field label="Option D">
                  <input
                    value={question.optionD}
                    onChange={(e: any) => onUpdate(question.id, "optionD", e.target.value)}
                    placeholder="Option D (optional)"
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Correct Answer" required>
                <select
                  value={question.correctAnswer}
                  onChange={(e: any) => onUpdate(question.id, "correctAnswer", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select correct answer</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </Field>
            </>
          )}

          {question.questionType === "true_false" && (
            <Field label="Correct Answer" required>
              <select
                value={question.correctAnswer}
                onChange={(e: any) => onUpdate(question.id, "correctAnswer", e.target.value)}
                className={inputClass}
              >
                <option value="">Select answer</option>
                <option value="TRUE">True</option>
                <option value="FALSE">False</option>
              </select>
            </Field>
          )}

          {question.questionType === "short_answer" && (
            <Field label="Expected Answer / Marking Guide">
              <textarea
                rows={2}
                value={question.correctAnswer}
                onChange={(e: any) => onUpdate(question.id, "correctAnswer", e.target.value)}
                placeholder="Enter expected answer or marking guide..."
                className={textareaClass}
              />
            </Field>
          )}

          <Field label="Explanation (Feedback)">
            <textarea
              rows={2}
              value={question.explanation}
              onChange={(e: any) => onUpdate(question.id, "explanation", e.target.value)}
              placeholder="Explain why the answer is correct (shown after quiz completion)"
              className={textareaClass}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function PreviewMode({ questions, form }: { questions: QuizQuestion[]; form: QuizFormData }) {
  const [currentPreviewQuestion, setCurrentPreviewQuestion] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<Record<number, string>>({});

  const currentQ = questions[currentPreviewQuestion];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{form.title || "Untitled Quiz"}</h2>
          <p className="text-sm text-slate-500">{form.description || "No description provided"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-600">
            {form.timeLimitMinutes ? `${form.timeLimitMinutes} minutes` : "No time limit"}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <div className="mb-4">
          <span className="text-sm text-slate-500">
            Question {currentPreviewQuestion + 1} of {questions.length}
          </span>
        </div>

        <h3 className="text-lg font-medium text-slate-900">{currentQ?.questionText || "No question added"}</h3>

        <div className="mt-6 space-y-3">
          {currentQ?.questionType === "mcq" && (
            currentQ.optionA && (
              <>
                <PreviewOption label="A" text={currentQ.optionA} />
                <PreviewOption label="B" text={currentQ.optionB} />
                {currentQ.optionC && <PreviewOption label="C" text={currentQ.optionC} />}
                {currentQ.optionD && <PreviewOption label="D" text={currentQ.optionD} />}
              </>
            )
          )}

          {currentQ?.questionType === "true_false" && (
            <>
              <PreviewOption label="T" text="True" />
              <PreviewOption label="F" text="False" />
            </>
          )}

          {currentQ?.questionType === "short_answer" && (
            <textarea
              rows={3}
              placeholder="Type your answer here..."
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-indigo-300 focus:outline-none"
            />
          )}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setCurrentPreviewQuestion(Math.max(0, currentPreviewQuestion - 1))}
            disabled={currentPreviewQuestion === 0}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          {currentPreviewQuestion < questions.length - 1 ? (
            <button
              onClick={() => setCurrentPreviewQuestion(currentPreviewQuestion + 1)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
            >
              Next
            </button>
          ) : (
            <button className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white">
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewOption({ label, text }: { label: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
        {label}
      </span>
      <span className="text-sm text-slate-700">{text}</span>
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300";

const textareaClass =
  "w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300";
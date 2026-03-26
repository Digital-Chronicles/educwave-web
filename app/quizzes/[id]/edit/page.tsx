"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";

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
  status: QuizStatus;
};

const demoClasses = [
  { id: "1", name: "Primary One" },
  { id: "2", name: "Primary Two" },
  { id: "3", name: "Senior One" },
];

const demoSubjects = [
  { id: "1", name: "Mathematics" },
  { id: "2", name: "Biology" },
  { id: "3", name: "English" },
];

const demoNotes = [
  { id: "1", name: "Introduction to Plants" },
  { id: "2", name: "Fractions Basics" },
];

const demoTopics = [
  { id: "1", name: "Parts of a Plant" },
  { id: "2", name: "Types of Fractions" },
];

export default function EditQuizPage() {
  const [form, setForm] = useState<QuizFormData>({
    title: "Introduction to Plants Quiz",
    description:
      "Practice quiz based on the parts of a plant and their functions.",
    quizType: "practice",
    classId: "3",
    subjectId: "2",
    noteId: "1",
    topicId: "1",
    timeLimitMinutes: "15",
    status: "active",
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: crypto.randomUUID(),
      questionText: "Which part of the plant absorbs water from the soil?",
      questionType: "mcq",
      optionA: "Stem",
      optionB: "Roots",
      optionC: "Leaves",
      optionD: "Flower",
      correctAnswer: "B",
      explanation: "Roots absorb water and minerals from the soil.",
      marks: 2,
    },
    {
      id: crypto.randomUUID(),
      questionText: "Leaves make food for the plant.",
      questionType: "true_false",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "TRUE",
      explanation: "Leaves carry out photosynthesis.",
      marks: 1,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

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
    };
  }, [form, questions]);

  const updateForm = <K extends keyof QuizFormData>(
    field: K,
    value: QuizFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
    setQuestions((prev) => [
      ...prev,
      {
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
      },
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((question) => question.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = {
      ...form,
      timeLimitMinutes: form.timeLimitMinutes ? Number(form.timeLimitMinutes) : null,
      totalQuestions,
      totalMarks,
      questions,
    };

    try {
      setIsSubmitting(true);
      console.log("Update quiz payload:", payload);
      alert("Quiz updated successfully.");
    } catch (error) {
      console.error("Failed to update quiz:", error);
      alert("Failed to update quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <form onSubmit={handleSubmit} className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-7 text-white md:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                      <Sparkles className="h-3.5 w-3.5" />
                      Edit Quiz
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                      Update quiz
                    </h1>
                    <p className="mt-2 max-w-xl text-sm text-slate-300 md:text-base">
                      Modify quiz details, questions, answers, and timing.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <HeroStat
                      label="Questions"
                      value={String(totalQuestions)}
                      icon={<BookOpen className="h-4 w-4" />}
                    />
                    <HeroStat
                      label="Marks"
                      value={String(totalMarks)}
                      icon={<FileText className="h-4 w-4" />}
                    />
                    <HeroStat
                      label="Time"
                      value={form.timeLimitMinutes ? `${form.timeLimitMinutes}m` : "None"}
                      icon={<Timer className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 border-t border-slate-200 bg-slate-50/70 px-6 py-4 md:grid-cols-3 md:px-8">
                <MiniStatus
                  title="Basic setup"
                  value={completionStats.hasBasicInfo ? "Complete" : "Pending"}
                  done={completionStats.hasBasicInfo}
                />
                <MiniStatus
                  title="Questions ready"
                  value={`${completionStats.validQuestions}/${totalQuestions}`}
                  done={completionStats.validQuestions === totalQuestions}
                />
                <MiniStatus
                  title="Publishing status"
                  value={form.status === "active" ? "Active" : "Draft"}
                  done={form.status === "active"}
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <SectionHeader
                icon={<Layers3 className="h-5 w-5" />}
                title="Quiz details"
                description="Edit the main quiz setup and linked academic content."
              />

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Quiz Title" required>
                  <input
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Quiz Type" required>
                  <select
                    value={form.quizType}
                    onChange={(e) => updateForm("quizType", e.target.value as QuizType)}
                    className={inputClass}
                  >
                    <option value="practice">Practice</option>
                    <option value="revision">Revision</option>
                    <option value="class_test">Class Test</option>
                  </select>
                </Field>

                <Field label="Class" required>
                  <select
                    value={form.classId}
                    onChange={(e) => updateForm("classId", e.target.value)}
                    className={inputClass}
                  >
                    {demoClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Subject" required>
                  <select
                    value={form.subjectId}
                    onChange={(e) => updateForm("subjectId", e.target.value)}
                    className={inputClass}
                  >
                    {demoSubjects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
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
                    {demoNotes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
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
                    {demoTopics.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Time Limit (Minutes)">
                  <input
                    type="number"
                    min={1}
                    value={form.timeLimitMinutes}
                    onChange={(e) => updateForm("timeLimitMinutes", e.target.value)}
                    className={inputClass}
                  />
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
                    className={textareaClass}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <SectionHeader
                  icon={<BookOpen className="h-5 w-5" />}
                  title="Quiz questions"
                  description="Update questions, correct answers, and explanations."
                  noMargin
                />
                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Add Question
                </button>
              </div>

              <div className="mt-6 space-y-5">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50/60"
                  >
                    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
                          {index + 1}
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            Question {index + 1}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Edit question content and marking details.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        disabled={questions.length === 1}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>

                    <div className="space-y-4 px-5 py-5 md:px-6">
                      <Field label="Question Text" required>
                        <textarea
                          rows={3}
                          value={question.questionText}
                          onChange={(e) =>
                            updateQuestion(question.id, "questionText", e.target.value)
                          }
                          className={textareaClass}
                        />
                      </Field>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label="Question Type" required>
                          <select
                            value={question.questionType}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "questionType",
                                e.target.value as QuestionType
                              )
                            }
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
                              updateQuestion(
                                question.id,
                                "marks",
                                Number(e.target.value) || 1
                              )
                            }
                            className={inputClass}
                          />
                        </Field>
                      </div>

                      {question.questionType === "mcq" && (
                        <>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Option A" required>
                              <input
                                value={question.optionA}
                                onChange={(e) =>
                                  updateQuestion(question.id, "optionA", e.target.value)
                                }
                                className={inputClass}
                              />
                            </Field>
                            <Field label="Option B" required>
                              <input
                                value={question.optionB}
                                onChange={(e) =>
                                  updateQuestion(question.id, "optionB", e.target.value)
                                }
                                className={inputClass}
                              />
                            </Field>
                            <Field label="Option C">
                              <input
                                value={question.optionC}
                                onChange={(e) =>
                                  updateQuestion(question.id, "optionC", e.target.value)
                                }
                                className={inputClass}
                              />
                            </Field>
                            <Field label="Option D">
                              <input
                                value={question.optionD}
                                onChange={(e) =>
                                  updateQuestion(question.id, "optionD", e.target.value)
                                }
                                className={inputClass}
                              />
                            </Field>
                          </div>

                          <Field label="Correct Answer" required>
                            <select
                              value={question.correctAnswer}
                              onChange={(e) =>
                                updateQuestion(question.id, "correctAnswer", e.target.value)
                              }
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
                            onChange={(e) =>
                              updateQuestion(question.id, "correctAnswer", e.target.value)
                            }
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
                            onChange={(e) =>
                              updateQuestion(question.id, "correctAnswer", e.target.value)
                            }
                            className={textareaClass}
                          />
                        </Field>
                      )}

                      <Field label="Explanation">
                        <textarea
                          rows={2}
                          value={question.explanation}
                          onChange={(e) =>
                            updateQuestion(question.id, "explanation", e.target.value)
                          }
                          className={textareaClass}
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">
                  Quiz overview
                </h3>

                <div className="mt-5 space-y-3">
                  <SideSummaryRow label="Title" value={form.title || "Not set"} />
                  <SideSummaryRow
                    label="Class"
                    value={
                      demoClasses.find((item) => item.id === form.classId)?.name ||
                      "Not selected"
                    }
                  />
                  <SideSummaryRow
                    label="Subject"
                    value={
                      demoSubjects.find((item) => item.id === form.subjectId)?.name ||
                      "Not selected"
                    }
                  />
                  <SideSummaryRow
                    label="Note"
                    value={
                      demoNotes.find((item) => item.id === form.noteId)?.name ||
                      "Optional"
                    }
                  />
                  <SideSummaryRow
                    label="Topic"
                    value={
                      demoTopics.find((item) => item.id === form.topicId)?.name ||
                      "Optional"
                    }
                  />
                  <SideSummaryRow
                    label="Status"
                    value={form.status === "active" ? "Active" : "Draft"}
                  />
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">
                  Checklist
                </h3>

                <div className="mt-4 space-y-3">
                  <ChecklistItem
                    done={Boolean(form.title.trim())}
                    text="Quiz title added"
                  />
                  <ChecklistItem
                    done={Boolean(form.classId && form.subjectId)}
                    text="Class and subject selected"
                  />
                  <ChecklistItem
                    done={totalQuestions > 0}
                    text="At least one question added"
                  />
                  <ChecklistItem
                    done={completionStats.validQuestions === totalQuestions}
                    text="All questions configured"
                  />
                </div>
              </section>
            </div>
          </aside>
        </div>

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
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Updating..." : "Update Quiz"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
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
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
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
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <div className="mb-2 flex items-center gap-2 text-slate-200">{icon}</div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
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
  done?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
        </div>
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
            done ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function SideSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}

function ChecklistItem({
  done,
  text,
}: {
  done: boolean;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
          done ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
        }`}
      >
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium text-slate-700">{text}</span>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-200";

const textareaClass =
  "w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-200";
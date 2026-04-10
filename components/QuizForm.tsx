"use client";

import { useMemo, useState } from "react";
import QuestionBuilder, { QuizQuestionInput } from "./QuestionBuilder";

type Option = {
  id: number | string;
  label: string;
};

type QuizFormProps = {
  mode?: "create" | "edit";
  initialData?: {
    title?: string;
    description?: string;
    classId?: string | number;
    subjectId?: string | number;
    noteId?: string | number;
    topicId?: string | number;
    quizType?: string;
    status?: string;
    timeLimitMinutes?: number | null;
    questions?: QuizQuestionInput[];
  };
  classes?: Option[];
  subjects?: Option[];
  notes?: Option[];
  topics?: Option[];
  onSubmit?: (payload: {
    title: string;
    description: string;
    classId: string;
    subjectId: string;
    noteId: string;
    topicId: string;
    quizType: string;
    status: string;
    timeLimitMinutes: number | null;
    questions: QuizQuestionInput[];
  }) => void;
};

export default function QuizForm({
  mode = "create",
  initialData,
  classes = [],
  subjects = [],
  notes = [],
  topics = [],
  onSubmit,
}: QuizFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [classId, setClassId] = useState(String(initialData?.classId ?? ""));
  const [subjectId, setSubjectId] = useState(String(initialData?.subjectId ?? ""));
  const [noteId, setNoteId] = useState(String(initialData?.noteId ?? ""));
  const [topicId, setTopicId] = useState(String(initialData?.topicId ?? ""));
  const [quizType, setQuizType] = useState(initialData?.quizType ?? "practice");
  const [status, setStatus] = useState(initialData?.status ?? "draft");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | "">(
    initialData?.timeLimitMinutes ?? ""
  );

  const [questions, setQuestions] = useState<QuizQuestionInput[]>(
    initialData?.questions?.length
      ? initialData.questions
      : [
          {
            localId: crypto.randomUUID(),
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
        ]
  );

  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + Number(q.marks || 0), 0),
    [questions]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit?.({
      title,
      description,
      classId,
      subjectId,
      noteId,
      topicId,
      quizType,
      status,
      timeLimitMinutes: timeLimitMinutes === "" ? null : Number(timeLimitMinutes),
      questions,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {mode === "edit" ? "Edit Quiz" : "Create Quiz"}
            </h2>
            <p className="text-sm text-slate-500">
              Build a separate note-based quiz module professionally.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Total Marks: <span className="font-semibold">{totalMarks}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Quiz Title" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quiz title"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            />
          </Field>

          <Field label="Quiz Type" required>
            <select
              value={quizType}
              onChange={(e) => setQuizType(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            >
              <option value="practice">Practice</option>
              <option value="revision">Revision</option>
              <option value="class_test">Class Test</option>
            </select>
          </Field>

          <Field label="Class" required>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            >
              <option value="">Select class</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Subject" required>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            >
              <option value="">Select subject</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Linked Note">
            <select
              value={noteId}
              onChange={(e) => setNoteId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            >
              <option value="">Select note</option>
              {notes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Topic">
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            >
              <option value="">Select topic</option>
              {topics.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Time Limit (Minutes)">
            <input
              type="number"
              min={1}
              value={timeLimitMinutes}
              onChange={(e) =>
                setTimeLimitMinutes(e.target.value ? Number(e.target.value) : "")
              }
              placeholder="e.g. 20"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            />
          </Field>

          <Field label="Status" required>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Description">
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a short quiz description"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            />
          </Field>
        </div>
      </div>

      <QuestionBuilder questions={questions} setQuestions={setQuestions} />

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          {mode === "edit" ? "Update Quiz" : "Save Quiz"}
        </button>

        <button
          type="button"
          className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
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
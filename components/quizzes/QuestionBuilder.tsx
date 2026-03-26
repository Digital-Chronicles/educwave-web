"use client";

import { Dispatch, SetStateAction } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";

export type QuizQuestionInput = {
  localId: string;
  questionText: string;
  questionType: "mcq" | "true_false" | "short_answer";
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  explanation?: string;
  marks: number;
};

type QuestionBuilderProps = {
  questions: QuizQuestionInput[];
  setQuestions: Dispatch<SetStateAction<QuizQuestionInput[]>>;
};

export default function QuestionBuilder({
  questions,
  setQuestions,
}: QuestionBuilderProps) {
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
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
    ]);
  };

  const removeQuestion = (localId: string) => {
    setQuestions((prev) => prev.filter((q) => q.localId !== localId));
  };

  const updateQuestion = (
    localId: string,
    field: keyof QuizQuestionInput,
    value: string | number
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q.localId === localId ? { ...q, [field]: value } : q))
    );
  };

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div
          key={question.localId}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-2 text-slate-500">
                <GripVertical className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Question {index + 1}
                </h3>
                <p className="text-sm text-slate-500">
                  Add question text, answer type, and marking details
                </p>
              </div>
            </div>

            {questions.length > 1 ? (
              <button
                type="button"
                onClick={() => removeQuestion(question.localId)}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <Field label="Question Text" required>
              <textarea
                rows={3}
                value={question.questionText}
                onChange={(e) =>
                  updateQuestion(question.localId, "questionText", e.target.value)
                }
                placeholder="Enter the question"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Question Type" required>
                <select
                  value={question.questionType}
                  onChange={(e) =>
                    updateQuestion(
                      question.localId,
                      "questionType",
                      e.target.value as QuizQuestionInput["questionType"]
                    )
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
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
                    updateQuestion(question.localId, "marks", Number(e.target.value))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </Field>
            </div>

            {question.questionType === "mcq" ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Option A" required>
                    <input
                      value={question.optionA ?? ""}
                      onChange={(e) =>
                        updateQuestion(question.localId, "optionA", e.target.value)
                      }
                      placeholder="Option A"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                    />
                  </Field>

                  <Field label="Option B" required>
                    <input
                      value={question.optionB ?? ""}
                      onChange={(e) =>
                        updateQuestion(question.localId, "optionB", e.target.value)
                      }
                      placeholder="Option B"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                    />
                  </Field>

                  <Field label="Option C">
                    <input
                      value={question.optionC ?? ""}
                      onChange={(e) =>
                        updateQuestion(question.localId, "optionC", e.target.value)
                      }
                      placeholder="Option C"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                    />
                  </Field>

                  <Field label="Option D">
                    <input
                      value={question.optionD ?? ""}
                      onChange={(e) =>
                        updateQuestion(question.localId, "optionD", e.target.value)
                      }
                      placeholder="Option D"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                    />
                  </Field>
                </div>

                <Field label="Correct Answer" required>
                  <select
                    value={question.correctAnswer ?? ""}
                    onChange={(e) =>
                      updateQuestion(question.localId, "correctAnswer", e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                  >
                    <option value="">Select correct answer</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </Field>
              </>
            ) : null}

            {question.questionType === "true_false" ? (
              <Field label="Correct Answer" required>
                <select
                  value={question.correctAnswer ?? ""}
                  onChange={(e) =>
                    updateQuestion(question.localId, "correctAnswer", e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                >
                  <option value="">Select answer</option>
                  <option value="TRUE">True</option>
                  <option value="FALSE">False</option>
                </select>
              </Field>
            ) : null}

            {question.questionType === "short_answer" ? (
              <Field label="Expected Answer / Marking Guide">
                <textarea
                  rows={2}
                  value={question.correctAnswer ?? ""}
                  onChange={(e) =>
                    updateQuestion(question.localId, "correctAnswer", e.target.value)
                  }
                  placeholder="Enter expected answer or marking guide"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </Field>
            ) : null}

            <Field label="Explanation">
              <textarea
                rows={2}
                value={question.explanation ?? ""}
                onChange={(e) =>
                  updateQuestion(question.localId, "explanation", e.target.value)
                }
                placeholder="Optional explanation shown after submission"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
              />
            </Field>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <Plus className="h-4 w-4" />
        Add Question
      </button>
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
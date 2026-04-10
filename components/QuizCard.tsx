import Link from "next/link";
import { BookOpen, Clock3, FileQuestion } from "lucide-react";

type QuizCardProps = {
  id: number | string;
  title: string;
  subject: string;
  className: string;
  topic: string;
  questions: number;
  timeLimit: number;
  status: string;
};

export default function QuizCard({
  id,
  title,
  subject,
  className,
  topic,
  questions,
  timeLimit,
  status,
}: QuizCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {subject} • {className}
          </p>
        </div>

        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
          {status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-slate-600">
        <div className="rounded-xl bg-slate-50 p-3">
          <BookOpen className="mb-2 h-4 w-4" />
          <p className="text-xs text-slate-500">Topic</p>
          <p className="font-medium">{topic}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <FileQuestion className="mb-2 h-4 w-4" />
          <p className="text-xs text-slate-500">Questions</p>
          <p className="font-medium">{questions}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <Clock3 className="mb-2 h-4 w-4" />
          <p className="text-xs text-slate-500">Time</p>
          <p className="font-medium">{timeLimit} min</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/dashboard/quizzes/${id}`} className="rounded-xl border px-4 py-2 text-sm font-medium">
          View
        </Link>
        <Link href={`/dashboard/quizzes/${id}/edit`} className="rounded-xl border px-4 py-2 text-sm font-medium">
          Edit
        </Link>
      </div>
    </div>
  );
}
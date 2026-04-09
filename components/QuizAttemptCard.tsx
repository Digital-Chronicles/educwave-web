type QuizAttemptCardProps = {
  studentName: string;
  studentId: string;
  startedAt: string;
  submittedAt?: string | null;
  score?: number | null;
  totalMarks?: number | null;
  percentage?: number | null;
  status: "in_progress" | "submitted" | "timed_out";
};

const statusClasses = {
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-emerald-100 text-emerald-700",
  timed_out: "bg-rose-100 text-rose-700",
};

export default function QuizAttemptCard({
  studentName,
  studentId,
  startedAt,
  submittedAt,
  score,
  totalMarks,
  percentage,
  status,
}: QuizAttemptCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{studentName}</h3>
          <p className="text-sm text-slate-500">Student ID: {studentId}</p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[status]}`}
        >
          {status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoBox label="Started At" value={startedAt} />
        <InfoBox label="Submitted At" value={submittedAt || "—"} />
        <InfoBox
          label="Score"
          value={
            score != null && totalMarks != null ? `${score}/${totalMarks}` : "Pending"
          }
        />
        <InfoBox
          label="Percentage"
          value={percentage != null ? `${percentage}%` : "Pending"}
        />
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
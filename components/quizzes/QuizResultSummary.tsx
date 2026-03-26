type QuizResultSummaryProps = {
  title: string;
  score: number;
  total: number;
  percentage: number;
  correct: number;
  wrong: number;
  remark: string;
};

export default function QuizResultSummary({
  title,
  score,
  total,
  percentage,
  correct,
  wrong,
  remark,
}: QuizResultSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Quiz Result</h2>
        <p className="mt-2 text-sm text-slate-500">{title}</p>

        <div className="mt-6 flex justify-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-50 text-3xl font-bold text-emerald-600">
            {percentage}%
          </div>
        </div>

        <p className="mt-4 text-lg font-semibold text-slate-900">{remark}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatBox label="Score" value={`${score}/${total}`} />
        <StatBox label="Correct" value={String(correct)} accent="text-emerald-600" />
        <StatBox label="Wrong" value={String(wrong)} accent="text-rose-600" />
        <StatBox label="Performance" value={remark} />
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold text-slate-900 ${accent || ""}`}>
        {value}
      </p>
    </div>
  );
}
import { Calendar, Plus, MoreVertical, Search, Filter } from 'lucide-react';
import { ActionButton } from './ui/ActionButton';
import { ExamRow } from './types';

interface ExamsTabProps {
  exams: ExamRow[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onShowExamModal: () => void;
  chipClass: (color: string) => string;
  formatDate: (date?: string | null) => string;
}

export function ExamsTab({
  exams,
  loading,
  search,
  onSearchChange,
  onShowExamModal,
  chipClass,
  formatDate,
}: ExamsTabProps) {
  const filteredExams = exams.filter(e => {
    const q = search.toLowerCase();
    return (
      (e.subject?.name || '').toLowerCase().includes(q) ||
      (e.grade?.grade_name || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Exams</h3>
          <p className="text-sm text-gray-500">Schedule and manage all exams</p>
        </div>
        <ActionButton onClick={onShowExamModal} label="Schedule Exam" icon={Plus} color="purple" compact />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search exams..."
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
          <span className="text-sm text-gray-500">{filteredExams.length} exams</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No exams found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredExams.map(exam => (
              <div key={exam.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">{exam.subject?.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('blue')}`}>
                          {exam.grade?.grade_name || '—'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('purple')}`}>
                          {exam.duration_minutes} min
                        </span>
                        <span className="text-sm text-gray-500">{exam.subject?.code || 'No code'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 text-lg">{formatDate(exam.date)}</div>
                    <div className="text-sm text-gray-500">Scheduled on {formatDate(exam.created)}</div>
                  </div>
                </div>
                {exam.description && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{exam.description}</p>
                  </div>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500">Created by: {exam.created_by_id || 'System'}</div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                      View Details
                    </button>
                    <button type="button" className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      Edit Exam
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
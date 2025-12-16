import { Users, Plus, Eye, Edit, Search, Filter } from 'lucide-react';
import { ActionButton } from './ui/ActionButton';
import { GradeRow, SubjectRow, ExamRow } from './types';

interface GradesTabProps {
  grades: GradeRow[];
  subjects: SubjectRow[];
  exams: ExamRow[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onShowGradeModal: () => void;
  chipClass: (color: string) => string;
}

export function GradesTab({
  grades,
  subjects,
  exams,
  loading,
  search,
  onSearchChange,
  onShowGradeModal,
  chipClass,
}: GradesTabProps) {
  const filteredGrades = grades.filter(g => 
    g.grade_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Grades / Classes</h3>
          <p className="text-sm text-gray-500">Manage all classes</p>
        </div>
        <ActionButton onClick={onShowGradeModal} label="Add Grade" icon={Plus} color="gray" compact />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search grades..."
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
          <span className="text-sm text-gray-500">{filteredGrades.length} grades</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredGrades.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No grades found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredGrades.map(grade => {
              const gradeSubjects = subjects.filter(s => s.grade_id === grade.id);
              const gradeExams = exams.filter(e => e.grade_id === grade.id);

              return (
                <div key={grade.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-7 h-7 text-blue-600" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('blue')}`}>
                      {gradeSubjects.length} subjects
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-lg mb-2">{grade.grade_name}</h4>
                  <div className="text-sm text-gray-500 mb-4">Grade ID: {grade.id}</div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{gradeExams.length}</div>
                      <div className="text-gray-500">Exams</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button type="button" className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
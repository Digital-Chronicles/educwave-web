import { Layers, Plus, Eye, Edit, Search, Filter } from 'lucide-react';
import { ActionButton } from './ui/ActionButton';
import { CurriculumRow, SubjectRow } from './types';

interface CurriculumTabProps {
  curricula: CurriculumRow[];
  subjects: SubjectRow[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onShowCurriculumModal: () => void;
  chipClass: (color: string) => string;
}

export function CurriculumTab({
  curricula,
  subjects,
  loading,
  search,
  onSearchChange,
  onShowCurriculumModal,
  chipClass,
}: CurriculumTabProps) {
  const filteredCurricula = curricula.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.objectives.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Curriculum</h3>
          <p className="text-sm text-gray-500">Manage frameworks and learning outcomes</p>
        </div>
        <ActionButton onClick={onShowCurriculumModal} label="Add Curriculum" icon={Plus} color="orange" compact />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search curriculum..."
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
          <span className="text-sm text-gray-500">{filteredCurricula.length} curricula</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredCurricula.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No curriculum frameworks added yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredCurricula.map(c => {
              const subjectCount = subjects.filter(s => s.curriculum_id === c.id).length;
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Layers className="w-6 h-6 text-orange-600" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('orange')}`}>
                        {subjectCount} subjects
                      </span>
                    </div>

                    <h4 className="font-semibold text-gray-900 text-lg mb-2">{c.name}</h4>

                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Objectives</h5>
                      <p className="text-sm text-gray-600 line-clamp-3">{c.objectives}</p>
                    </div>

                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Learning Outcomes</h5>
                      <p className="text-sm text-gray-600 line-clamp-3">{c.learning_outcomes}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">Curriculum Framework</div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="p-2 hover:bg-gray-100 rounded-lg">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button type="button" className="p-2 hover:bg-gray-100 rounded-lg">
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
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
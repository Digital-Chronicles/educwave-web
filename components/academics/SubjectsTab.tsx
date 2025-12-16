import { BookOpen, Plus, Eye, Edit, Trash2, Search, Filter } from 'lucide-react';
import { ActionButton } from './ui/ActionButton';
import { SubjectRow } from './types';

interface SubjectsTabProps {
  subjects: SubjectRow[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onShowSubjectModal: () => void;
  chipClass: (color: string) => string;
}

export function SubjectsTab({
  subjects,
  loading,
  search,
  onSearchChange,
  onShowSubjectModal,
  chipClass,
}: SubjectsTabProps) {
  const filteredSubjects = subjects.filter(s => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q) ||
      (s.grade?.grade_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Subjects</h3>
          <p className="text-sm text-gray-500">Manage all subjects and assignments</p>
        </div>
        <ActionButton onClick={onShowSubjectModal} label="Add Subject" icon={Plus} color="green" compact />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search subjects..."
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
          <span className="text-sm text-gray-500">{filteredSubjects.length} subjects</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No subjects found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Subject</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Code</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Grade</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Teacher</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Curriculum</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSubjects.map(subject => (
                  <tr key={subject.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{subject.name}</div>
                          {subject.description && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">{subject.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('gray')}`}>
                        {subject.code || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {subject.grade ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('blue')}`}>
                          {subject.grade.grade_name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {subject.teacher ? (
                        <div className="text-sm text-gray-900">
                          {subject.teacher.first_name} {subject.teacher.last_name}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">{subject.curriculum?.name || '—'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button type="button" className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button type="button" className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button type="button" className="p-2 hover:bg-gray-100 rounded-lg text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
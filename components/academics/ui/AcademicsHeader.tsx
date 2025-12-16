import { BookOpen, Users, Calendar, Layers, ShieldCheck } from 'lucide-react';

interface AcademicsHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  schoolName: string;
  academicYear: string;
}

export function AcademicsHeader({ activeTab, setActiveTab, schoolName, academicYear }: AcademicsHeaderProps) {
  const tabs = [
    { key: 'overview', label: 'Overview', icon: BookOpen },
    { key: 'grades', label: 'Grades', icon: Users },
    { key: 'subjects', label: 'Subjects', icon: BookOpen },
    { key: 'exams', label: 'Exams', icon: Calendar },
    { key: 'curriculum', label: 'Curriculum', icon: Layers },
    { key: 'terms', label: 'Terms & Sessions', icon: ShieldCheck },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academics Management</h1>
          <p className="text-gray-600 mt-2">Manage grades, subjects, curriculum, exams, and terms for {schoolName}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Academic Year</p>
            <p className="text-lg font-semibold text-blue-600">{academicYear}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 overflow-x-auto pb-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'bg-white border-t border-x border-gray-200 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
import { Users, BookOpen, Calendar, Layers, ShieldCheck, FileText, Plus } from 'lucide-react';
import { StatCard } from './ui/StatCard';
import { ActionButton } from './ui/ActionButton';
import { GradeRow, SubjectRow, ExamRow, CurriculumRow, TermRow, ExamSessionRow } from './types';

interface OverviewTabProps {
  grades: GradeRow[];
  subjects: SubjectRow[];
  exams: ExamRow[];
  curricula: CurriculumRow[];
  terms: TermRow[];
  sessions: ExamSessionRow[];
  onShowGradeModal: () => void;
  onShowSubjectModal: () => void;
  onShowExamModal: () => void;
  onShowTermModal: () => void;
  onShowSessionModal: () => void;
  formatDate: (date?: string | null) => string;
}

export function OverviewTab({
  grades,
  subjects,
  exams,
  curricula,
  terms,
  sessions,
  onShowGradeModal,
  onShowSubjectModal,
  onShowExamModal,
  onShowTermModal,
  onShowSessionModal,
  formatDate,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Grades" value={grades.length} icon={Users} color="blue" description="Classes registered" />
        <StatCard title="Subjects" value={subjects.length} icon={BookOpen} color="green" description="Active subjects" />
        <StatCard title="Exams" value={exams.length} icon={Calendar} color="purple" description="Scheduled exams" />
        <StatCard title="Curriculum" value={curricula.length} icon={Layers} color="orange" description="Frameworks" />
        <StatCard title="Terms" value={terms.length} icon={ShieldCheck} color="yellow" description="Academic terms" />
        <StatCard title="Sessions" value={sessions.length} icon={FileText} color="red" description="Exam sessions" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <ActionButton onClick={onShowGradeModal} label="Add Grade" icon={Plus} color="gray" />
          <ActionButton onClick={onShowSubjectModal} label="Add Subject" icon={Plus} color="green" />
          <ActionButton onClick={onShowExamModal} label="Schedule Exam" icon={Plus} color="purple" />
          <ActionButton onClick={onShowTermModal} label="Create Term" icon={Plus} color="blue" />
          <ActionButton onClick={onShowSessionModal} label="Add Session" icon={Plus} color="orange" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Exams</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {exams.slice(0, 5).map(exam => (
            <div key={exam.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{exam.subject?.name}</h4>
                    <p className="text-sm text-gray-500">
                      {exam.grade?.grade_name} • {exam.duration_minutes} minutes
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatDate(exam.date)}</p>
                  <p className="text-sm text-gray-500">{exam.description || 'No description'}</p>
                </div>
              </div>
            </div>
          ))}
          {exams.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No exams scheduled yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
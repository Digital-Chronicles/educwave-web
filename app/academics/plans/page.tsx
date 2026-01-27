"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Check, 
  ChevronDown, 
  ChevronRight,
  Eye,
  FileText,
  Download,
  Upload,
  Share2,
  Printer,
  Filter,
  Search,
  Clock,
  Users,
  Award,
  BarChart,
  TrendingUp,
  CalendarDays,
  BookMarked,
  GraduationCap,
  School,
  User
} from 'lucide-react';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';

// Types based on your database schema
type PlanStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

interface Teacher {
  user_id: string;
  registration_id: string;
  first_name: string;
  last_name: string;
  school_id: string;
}

interface TeacherYearPlan {
  id: string;
  school_id: string;
  academic_year: number;
  teacher_user_id: string;
  class_id: number;
  subject_id: number;
  overview: string | null;
  resources: string | null;
  assessment_strategy: string | null;
  status: PlanStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TeacherTermPlan {
  id: string;
  school_id: string;
  term_id: number;
  teacher_user_id: string;
  class_id: number;
  subject_id: number;
  general_objectives: string | null;
  reference_materials: string | null;
  status: PlanStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  weeks: TeacherTermPlanWeek[];
}

interface TeacherTermPlanWeek {
  id: string;
  term_plan_id: string;
  week_no: number;
  week_start: string | null;
  week_end: string | null;
  topic: string | null;
  subtopics: string | null;
  learning_outcomes: string | null;
  teaching_methods: string | null;
  learning_activities: string | null;
  resources: string | null;
  assessment: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

interface Subject {
  id: number;
  name: string;
  code: string | null;
  description: string;
  grade_id: number | null;
  curriculum_id: number;
  school_id: string | null;
  teacher_id: string | null;
  class?: Class;
}

interface Class {
  id: number;
  grade_name: string;
  class_teacher_id: string | null;
  school_id: string | null;
}

interface Term {
  id: number;
  term_name: string;
  year: number;
  start_date: string;
  end_date: string;
  created_by_id: string;
  school_id: string | null;
}

interface School {
  id: string;
  school_name: string;
  location: string;
  contact_number: string;
  email: string;
}

// Helper function
const getStatusColor = (status: PlanStatus) => {
  switch (status) {
    case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
    case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
    case 'APPROVED': return 'bg-green-100 text-green-800';
    case 'REJECTED': return 'bg-red-100 text-red-800';
  }
};

// Helper function to format subject display
const formatSubjectDisplay = (subject: Subject) => {
  if (subject.class?.grade_name) {
    return `${subject.name} (${subject.class.grade_name})`;
  }
  return subject.name;
};

// Sub-components
const StatCard: React.FC<{
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number;
  color: string;
}> = ({ icon: Icon, label, value, color }) => {
  // Map color to text color class
  const textColorMap: Record<string, string> = {
    'bg-blue-500': 'text-blue-500',
    'bg-green-500': 'text-green-500',
    'bg-yellow-500': 'text-yellow-500',
    'bg-purple-500': 'text-purple-500',
    'bg-red-500': 'text-red-500',
    'bg-indigo-500': 'text-indigo-500',
    'bg-pink-500': 'text-pink-500',
  };

  const iconColorClass = textColorMap[color] || 'text-gray-500';

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <div className={iconColorClass}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  count: number;
}> = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
      active
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    <Icon size={20} />
    {label}
    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
      {count}
    </span>
  </button>
);

interface YearPlansTabProps {
  plans: TeacherYearPlan[];
  subjects: Subject[];
  classes: Class[];
  onView: (plan: TeacherYearPlan) => void;
}

const YearPlansTab: React.FC<YearPlansTabProps> = ({ plans, subjects, classes, onView }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Academic Year
          </th>
          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Class & Subject
          </th>
          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Overview
          </th>
          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Created
          </th>
          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {plans.map((plan) => {
          const subject = subjects.find(s => s.id === plan.subject_id);
          const classInfo = classes.find(c => c.id === plan.class_id);
          
          return (
            <tr key={plan.id} className="hover:bg-gray-50">
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="font-medium">{plan.academic_year}</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div>
                  <div className="font-medium">{classInfo?.grade_name}</div>
                  <div className="text-sm text-gray-500">
                    {subject ? formatSubjectDisplay(subject) : 'Unknown Subject'}
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="max-w-xs truncate">{plan.overview || 'No overview provided'}</div>
              </td>
              <td className="py-4 px-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                  {plan.status}
                </span>
              </td>
              <td className="py-4 px-4 text-sm text-gray-500">
                {new Date(plan.created_at).toLocaleDateString()}
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onView(plan)}
                    className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    title="View"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

interface TermPlansTabProps {
  plans: TeacherTermPlan[];
  subjects: Subject[];
  classes: Class[];
  terms: Term[];
}

const TermPlansTab: React.FC<TermPlansTabProps> = ({ plans, subjects, classes, terms }) => (
  <div className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {plans.map((plan) => {
        const subject = subjects.find(s => s.id === plan.subject_id);
        const classInfo = classes.find(c => c.id === plan.class_id);
        const term = terms.find(t => t.id === plan.term_id);

        return (
          <div key={plan.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BookMarked size={18} className="text-indigo-500" />
                  <span className="font-semibold text-gray-900">
                    {subject ? formatSubjectDisplay(subject) : 'Unknown Subject'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {classInfo?.grade_name} • {term?.term_name} {term?.year}
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(plan.status)}`}>
                {plan.status}
              </span>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 line-clamp-2">{plan.general_objectives || 'No objectives provided'}</p>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <CalendarDays size={14} />
                  <span>{plan.weeks?.length || 0} weeks</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText size={14} />
                  <span>Materials: {plan.reference_materials?.split(',').length || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">
                <Eye size={16} />
                View
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Edit size={16} />
                Edit
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

interface WeeklyPlansTabProps {
  plans: TeacherTermPlan[];
}

const WeeklyPlansTab: React.FC<WeeklyPlansTabProps> = ({ plans }) => (
  <div className="p-6">
    <div className="space-y-6">
      {plans.map((plan) => (
        <div key={plan.id} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Term Plan: {plan.id.substring(0, 8)}</h3>
                <p className="text-sm text-gray-600">{plan.weeks?.length || 0} weekly plans</p>
              </div>
              <ChevronDown className="text-gray-400" />
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plan.weeks?.map((week) => (
                <div key={week.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Week {week.week_no}</span>
                    <span className="text-sm text-gray-500">
                      {week.week_start ? new Date(week.week_start).toLocaleDateString() : 'No start date'} - 
                      {week.week_end ? new Date(week.week_end).toLocaleDateString() : 'No end date'}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">{week.topic || 'No topic'}</h4>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{week.subtopics || 'No subtopics'}</p>
                  <div className="flex items-center gap-2">
                    <button className="text-sm text-indigo-600 hover:text-indigo-700">
                      View Details
                    </button>
                    <span className="text-gray-300">•</span>
                    <button className="text-sm text-gray-600 hover:text-gray-700">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface CreatePlanModalProps {
  subjects: Subject[];
  classes: Class[];
  terms: Term[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ subjects, classes, terms, onClose, onSubmit }) => {
  const [planType, setPlanType] = useState<'year' | 'term'>('year');
  const [formData, setFormData] = useState({
    academic_year: new Date().getFullYear(),
    term_id: '',
    class_id: '',
    subject_id: '',
    overview: '',
    general_objectives: '',
    resources: '',
    assessment_strategy: ''
  });

  // Filter subjects based on selected class
  const filteredSubjects = formData.class_id 
    ? subjects.filter(subject => subject.grade_id === parseInt(formData.class_id))
    : subjects;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      planType
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create New Plan</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Plan Type Selection */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setPlanType('year')}
              className={`flex-1 py-4 px-4 rounded-xl border-2 ${
                planType === 'year'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <Calendar className={planType === 'year' ? 'text-indigo-600' : 'text-gray-400'} />
                <div className="text-left">
                  <div className="font-medium">Year Plan</div>
                  <div className="text-sm text-gray-500">Academic year overview</div>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPlanType('term')}
              className={`flex-1 py-4 px-4 rounded-xl border-2 ${
                planType === 'term'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <BookMarked className={planType === 'term' ? 'text-indigo-600' : 'text-gray-400'} />
                <div className="text-left">
                  <div className="font-medium">Term Plan</div>
                  <div className="text-sm text-gray-500">Term-specific plans</div>
                </div>
              </div>
            </button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <input
                type="number"
                value={formData.academic_year}
                onChange={(e) => setFormData({...formData, academic_year: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                min="2000"
                max="2100"
              />
            </div>

            {planType === 'term' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Term
                </label>
                <select
                  value={formData.term_id}
                  onChange={(e) => setFormData({...formData, term_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Term</option>
                  {terms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.term_name} {term.year}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class
              </label>
              <select
                value={formData.class_id}
                onChange={(e) => setFormData({...formData, class_id: e.target.value, subject_id: ''})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.grade_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <select
                value={formData.subject_id}
                onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
                disabled={!formData.class_id}
              >
                <option value="">Select Subject</option>
                {filteredSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {formatSubjectDisplay(subject)}
                  </option>
                ))}
              </select>
              {!formData.class_id && (
                <p className="text-sm text-gray-500 mt-1">Please select a class first</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {planType === 'year' ? 'Year Overview' : 'General Objectives'}
            </label>
            <textarea
              rows={4}
              value={planType === 'year' ? formData.overview : formData.general_objectives}
              onChange={(e) => setFormData({
                ...formData,
                [planType === 'year' ? 'overview' : 'general_objectives']: e.target.value
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder={`Enter ${planType === 'year' ? 'year overview' : 'general objectives'}...`}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resources & Materials
            </label>
            <textarea
              rows={3}
              value={formData.resources}
              onChange={(e) => setFormData({...formData, resources: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="List textbooks, online resources, teaching aids, etc..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface PlanDetailModalProps {
  plan: TeacherYearPlan;
  subjects: Subject[];
  classes: Class[];
  onClose: () => void;
}

const PlanDetailModal: React.FC<PlanDetailModalProps> = ({ plan, subjects, classes, onClose }) => {
  const subject = subjects.find(s => s.id === plan.subject_id);
  const classInfo = classes.find(c => c.id === plan.class_id);

  const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Plan Details</h2>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Print">
                <Printer size={20} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Share">
                <Share2 size={20} />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Overview</h3>
                <p className="text-gray-700">{plan.overview || 'No overview provided'}</p>
              </div>
              
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Assessment Strategy</h3>
                <p className="text-gray-700">{plan.assessment_strategy || 'No assessment strategy provided'}</p>
              </div>
              
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Resources</h3>
                <p className="text-gray-700">{plan.resources || 'No resources listed'}</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-xl p-6">
                <h4 className="font-semibold mb-4">Plan Information</h4>
                <div className="space-y-3">
                  <InfoRow label="Status" value={plan.status} />
                  <InfoRow label="Created" value={new Date(plan.created_at).toLocaleDateString()} />
                  {plan.approved_at && (
                    <InfoRow label="Approved" value={new Date(plan.approved_at).toLocaleDateString()} />
                  )}
                  <InfoRow label="Academic Year" value={plan.academic_year.toString()} />
                  {subject && <InfoRow label="Subject" value={formatSubjectDisplay(subject)} />}
                  {classInfo && <InfoRow label="Class" value={classInfo.grade_name} />}
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-xl p-6">
                <h4 className="font-semibold mb-4">Actions</h4>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <Edit size={16} />
                    Edit Plan
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Download size={16} />
                    Export as PDF
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Share2 size={16} />
                    Share with Colleagues
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function TeacherAcademicPlans() {
  const [activeTab, setActiveTab] = useState<'year' | 'term' | 'week'>('year');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TeacherYearPlan | null>(null);
  const [yearPlans, setYearPlans] = useState<TeacherYearPlan[]>([]);
  const [termPlans, setTermPlans] = useState<TeacherTermPlan[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [filterStatus, setFilterStatus] = useState<PlanStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data
      const [
        { data: yearPlansData, error: yearPlansError },
        { data: termPlansData, error: termPlansError },
        { data: subjectsData, error: subjectsError },
        { data: classesData, error: classesError },
        { data: termsData, error: termsError },
        { data: schoolsData, error: schoolsError }
      ] = await Promise.all([
        supabase.from('teacher_year_plans').select('*'),
        supabase.from('teacher_term_plans').select('*'),
        supabase.from('subject').select('*'),
        supabase.from('class').select('*'),
        supabase.from('term_exam_session').select('*'),
        supabase.from('general_information').select('*')
      ]);

      if (yearPlansError) throw yearPlansError;
      if (termPlansError) throw termPlansError;
      if (subjectsError) throw subjectsError;
      if (classesError) throw classesError;
      if (termsError) throw termsError;
      if (schoolsError) throw schoolsError;

      setYearPlans(yearPlansData || []);
      setClasses(classesData || []);
      setTerms(termsData || []);
      setSchools(schoolsData || []);

      // Map classes to subjects
      const subjectsWithClasses = (subjectsData || []).map(subject => ({
        ...subject,
        class: (classesData || []).find(c => c.id === subject.grade_id)
      }));
      setSubjects(subjectsWithClasses);

      // Fetch weeks for term plans
      if (termPlansData) {
        const termPlansWithWeeks = await Promise.all(
          termPlansData.map(async (plan) => {
            const { data: weeksData, error: weeksError } = await supabase
              .from('teacher_term_plan_weeks')
              .select('*')
              .eq('term_plan_id', plan.id);

            if (weeksError) throw weeksError;
            return { ...plan, weeks: weeksData || [] };
          })
        );
        setTermPlans(termPlansWithWeeks);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (data: any) => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (data.planType === 'year') {
        const { error } = await supabase.from('teacher_year_plans').insert({
          school_id: user.user_metadata.school_id || schools[0]?.id,
          academic_year: data.academic_year,
          teacher_user_id: user.id,
          class_id: parseInt(data.class_id),
          subject_id: parseInt(data.subject_id),
          overview: data.overview,
          resources: data.resources,
          assessment_strategy: data.assessment_strategy,
          status: 'DRAFT'
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.from('teacher_term_plans').insert({
          school_id: user.user_metadata.school_id || schools[0]?.id,
          term_id: parseInt(data.term_id),
          teacher_user_id: user.id,
          class_id: parseInt(data.class_id),
          subject_id: parseInt(data.subject_id),
          general_objectives: data.general_objectives,
          reference_materials: data.resources,
          status: 'DRAFT'
        });

        if (error) throw error;
      }

      // Refresh data
      await fetchData();
      setShowCreateModal(false);
      
    } catch (err) {
      console.error('Error creating plan:', err);
      setError('Failed to create plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredYearPlans = yearPlans.filter(plan => {
    const matchesStatus = filterStatus === 'ALL' || plan.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      plan.academic_year.toString().includes(searchQuery) ||
      subjects.find(s => s.id === plan.subject_id)?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading academic plans...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="flex">
        <AppShell />
        
        <main className="flex-1 p-6">
          {/* Error state */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchData}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Academic Plans</h1>
                <p className="text-gray-600 mt-2">Create and manage your teaching plans</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={20} />
                Create New Plan
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <StatCard
                icon={BookOpen}
                label="Total Plans"
                value={yearPlans.length + termPlans.length}
                color="bg-blue-500"
              />
              <StatCard
                icon={Check}
                label="Approved"
                value={yearPlans.filter(p => p.status === 'APPROVED').length}
                color="bg-green-500"
              />
              <StatCard
                icon={Clock}
                label="Drafts"
                value={yearPlans.filter(p => p.status === 'DRAFT').length}
                color="bg-yellow-500"
              />
              <StatCard
                icon={Users}
                label="Classes"
                value={new Set([...yearPlans, ...termPlans].map(p => p.class_id)).size}
                color="bg-purple-500"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              <TabButton
                active={activeTab === 'year'}
                onClick={() => setActiveTab('year')}
                icon={Calendar}
                label="Year Plans"
                count={yearPlans.length}
              />
              <TabButton
                active={activeTab === 'term'}
                onClick={() => setActiveTab('term')}
                icon={BookMarked}
                label="Term Plans"
                count={termPlans.length}
              />
              <TabButton
                active={activeTab === 'week'}
                onClick={() => setActiveTab('week')}
                icon={CalendarDays}
                label="Weekly Plans"
                count={termPlans.reduce((acc, plan) => acc + (plan.weeks?.length || 0), 0)}
              />
            </nav>
          </div>

          {/* Filters and Search */}
          <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-4 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as PlanStatus | 'ALL')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter size={20} />
                More Filters
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download size={20} />
                Export
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {activeTab === 'year' && (
              <YearPlansTab
                plans={filteredYearPlans}
                subjects={subjects}
                classes={classes}
                onView={(plan) => setSelectedPlan(plan)}
              />
            )}
            {activeTab === 'term' && (
              <TermPlansTab
                plans={termPlans}
                subjects={subjects}
                classes={classes}
                terms={terms}
              />
            )}
            {activeTab === 'week' && (
              <WeeklyPlansTab plans={termPlans} />
            )}
          </div>

          {/* Create Plan Modal */}
          {showCreateModal && (
            <CreatePlanModal
              subjects={subjects}
              classes={classes}
              terms={terms}
              onClose={() => setShowCreateModal(false)}
              onSubmit={handleCreatePlan}
            />
          )}

          {/* Plan Detail Modal */}
          {selectedPlan && (
            <PlanDetailModal
              plan={selectedPlan}
              subjects={subjects}
              classes={classes}
              onClose={() => setSelectedPlan(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  BookOpen,
  Calendar,
  Layers,
  Users,
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  ChevronRight,
  Home,
  Book,
  ClipboardList,
  CalendarDays,
} from 'lucide-react';

type UUID = string;

// ===== Types =====
interface Profile {
  user_id: UUID;
  email: string | null;
  full_name: string | null;
  role: 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
  school_id: UUID | null;
}

interface School {
  id: UUID;
  school_name: string;
}

interface Grade {
  id: number;
  grade_name: string;
  school_id: UUID | null;
  created: string;
  updated: string;
  class_teacher_id: string | null;
}

interface Curriculum {
  id: number;
  name: string;
  objectives: string;
  learning_outcomes: string;
  school_id: UUID | null;
}

interface Teacher {
  registration_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  user_id?: UUID | null;
  school_id: UUID;
}

interface Subject {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  grade_id: number | null;
  curriculum_id: number | null;
  teacher_id: string | null;
  school_id: UUID | null;
  grade?: { grade_name: string } | null;
  teacher?: { first_name: string; last_name: string } | null;
  curriculum?: { name: string } | null;
}

interface Exam {
  id: number;
  date: string;
  duration_minutes: number;
  description: string | null;
  grade_id: number | null;
  subject_id: number;
  created: string;
  school_id: UUID | null;
  created_by_id?: UUID | null;
  subject?: { name: string; code: string | null } | null;
  grade?: { grade_name: string } | null;
}

type TermName = 'TERM_1' | 'TERM_2' | 'TERM_3';
type ExamType = 'BOT' | 'MOT' | 'EOT';

interface Term {
  id: number;
  term_name: TermName;
  year: number;
  start_date: string;
  end_date: string;
  created_by_id: UUID;
  school_id: UUID | null;
  created: string;
  updated: string;
}

interface ExamSession {
  id: number;
  term_id: number;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  created_by_id: UUID | null;
  school_id: UUID | null;
  created: string;
  updated: string;
  term?: Term | null;
}

type ModalMode = 'create' | 'edit';
type EntityType = 'grade' | 'subject' | 'exam' | 'curriculum' | 'term' | 'session';

interface ModalState {
  type: EntityType;
  mode: ModalMode;
  isOpen: boolean;
  data: Record<string, any>;
}

// ===== Utility Functions =====
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// ===== Modal Component =====
function AcademicModal({ state, onClose, onSubmit, saving, updateModalData, options }: {
  state: ModalState;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  saving: boolean;
  updateModalData: (field: string, value: any) => void;
  options: {
    grades: Grade[];
    teachers: Teacher[];
    subjects: Subject[];
    curricula: Curriculum[];
    terms: Term[];
  };
}) {
  if (!state.isOpen) return null;

  const { type, mode, data } = state;
  const title = `${mode === 'create' ? 'Create' : 'Edit'} ${type.charAt(0).toUpperCase() + type.slice(1)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
  };

  // Debug: Check teachers data
  console.log('Modal Teachers:', {
    count: options.teachers?.length,
    teachers: options.teachers?.map(t => ({
      registration_id: t.registration_id,
      name: `${t.first_name} ${t.last_name}`
    }))
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              {type === 'grade' && <Users className="h-5 w-5" />}
              {type === 'subject' && <BookOpen className="h-5 w-5" />}
              {type === 'exam' && <Calendar className="h-5 w-5" />}
              {type === 'curriculum' && <Layers className="h-5 w-5" />}
              {type === 'term' && <ShieldCheck className="h-5 w-5" />}
              {type === 'session' && <FileText className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">
                {mode === 'create' ? 'Add new entry' : 'Update existing entry'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            disabled={saving}
            type="button"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Grade Form */}
            {type === 'grade' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade Name *
                  </label>
                  <input
                    type="text"
                    value={data.name || ''}
                    onChange={(e) => updateModalData('name', e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="P1, S2, Grade 10..."
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Teacher
                  </label>
                  <select
                    value={data.class_teacher_id || ''}
                    onChange={(e) => updateModalData('class_teacher_id', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    disabled={saving}
                  >
                    <option value="">Not assigned</option>
                    {options.teachers && options.teachers.length > 0 ? (
                      options.teachers.map((teacher) => (
                        <option key={teacher.registration_id} value={teacher.registration_id}>
                          {teacher.first_name} {teacher.last_name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No teachers found</option>
                    )}
                  </select>
                </div>
              </>
            )}

            {/* Subject Form */}
            {type === 'subject' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    value={data.name || ''}
                    onChange={(e) => updateModalData('name', e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                    placeholder="Mathematics, English, Science..."
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    value={data.code || ''}
                    onChange={(e) => updateModalData('code', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                    placeholder="MATH-P5, ENG-S1..."
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade / Class
                  </label>
                  <select
                    value={data.grade_id || ''}
                    onChange={(e) => updateModalData('grade_id', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                    disabled={saving}
                  >
                    <option value="">Not assigned</option>
                    {options.grades?.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.grade_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Curriculum *
                  </label>
                  <select
                    value={data.curriculum_id || ''}
                    onChange={(e) => updateModalData('curriculum_id', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                    disabled={saving}
                    required
                  >
                    <option value="">Select curriculum</option>
                    {options.curricula?.map((curriculum) => (
                      <option key={curriculum.id} value={curriculum.id}>
                        {curriculum.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teacher
                  </label>
                  <select
                    value={data.teacher_id || ''}
                    onChange={(e) => updateModalData('teacher_id', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                    disabled={saving}
                  >
                    <option value="">Not assigned</option>
                    {options.teachers && options.teachers.length > 0 ? (
                      options.teachers.map((teacher) => (
                        <option key={teacher.registration_id} value={teacher.registration_id}>
                          {teacher.first_name} {teacher.last_name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No teachers found</option>
                    )}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={data.description || ''}
                    onChange={(e) => updateModalData('description', e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
                    placeholder="Subject description..."
                    disabled={saving}
                    required
                  />
                </div>
              </div>
            )}

            {/* Exam Form */}
            {type === 'exam' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    value={data.subject_id || ''}
                    onChange={(e) => updateModalData('subject_id', e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
                    disabled={saving}
                  >
                    <option value="">Select subject</option>
                    {options.subjects?.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} {subject.grade?.grade_name ? `(${subject.grade.grade_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade
                  </label>
                  <select
                    value={data.grade_id || ''}
                    onChange={(e) => updateModalData('grade_id', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
                    disabled={saving}
                  >
                    <option value="">Not assigned</option>
                    {options.grades?.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.grade_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Date *
                  </label>
                  <input
                    type="date"
                    value={data.date || ''}
                    onChange={(e) => updateModalData('date', e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={data.duration || ''}
                    onChange={(e) => updateModalData('duration', e.target.value)}
                    required
                    min={10}
                    step={5}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
                    placeholder="60"
                    disabled={saving}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={data.description || ''}
                    onChange={(e) => updateModalData('description', e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
                    placeholder="Exam instructions, topics covered..."
                    disabled={saving}
                  />
                </div>
              </div>
            )}

            {/* Curriculum Form */}
            {type === 'curriculum' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Curriculum Name *
                  </label>
                  <input
                    type="text"
                    value={data.name || ''}
                    onChange={(e) => updateModalData('name', e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                    placeholder="Lower Primary, UNEB, Cambridge..."
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objectives *
                  </label>
                  <textarea
                    value={data.objectives || ''}
                    onChange={(e) => updateModalData('objectives', e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                    placeholder="Curriculum objectives and goals..."
                    disabled={saving}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Learning Outcomes *
                  </label>
                  <textarea
                    value={data.learning_outcomes || ''}
                    onChange={(e) => updateModalData('learning_outcomes', e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                    placeholder="Expected learning outcomes..."
                    disabled={saving}
                    required
                  />
                </div>
              </div>
            )}

            {/* Term Form */}
            {type === 'term' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Term *
                  </label>
                  <select
                    value={data.term_name || 'TERM_1'}
                    onChange={(e) => updateModalData('term_name', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    disabled={saving}
                  >
                    <option value="TERM_1">TERM 1</option>
                    <option value="TERM_2">TERM 2</option>
                    <option value="TERM_3">TERM 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={data.year || new Date().getFullYear()}
                    onChange={(e) => updateModalData('year', Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    disabled={saving}
                    min={2000}
                    max={2100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={data.start_date || ''}
                    onChange={(e) => updateModalData('start_date', e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={data.end_date || ''}
                    onChange={(e) => updateModalData('end_date', e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    disabled={saving}
                  />
                </div>
              </div>
            )}

            {/* Session Form */}
            {type === 'session' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Term *
                  </label>
                  <select
                    value={data.term_id || ''}
                    onChange={(e) => updateModalData('term_id', e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                    disabled={saving}
                  >
                    <option value="">Select term</option>
                    {options.terms?.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.term_name.replace('_', ' ')} - {term.year} ({formatDate(term.start_date)} → {formatDate(term.end_date)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Type *
                    </label>
                    <select
                      value={data.exam_type || 'BOT'}
                      onChange={(e) => updateModalData('exam_type', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      disabled={saving}
                    >
                      <option value="BOT">BOT (Beginning of Term)</option>
                      <option value="MOT">MOT (Middle of Term)</option>
                      <option value="EOT">EOT (End of Term)</option>
                    </select>
                  </div>
                  <div></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={data.start_date || ''}
                      onChange={(e) => updateModalData('start_date', e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={data.end_date || ''}
                      onChange={(e) => updateModalData('end_date', e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Main Component =====
export default function AcademicsPage() {
  const router = useRouter();

  // Authentication & School State
  const [authChecking, setAuthChecking] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [school, setSchool] = useState<School | null>(null);

  // Loading & UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'subjects' | 'exams' | 'curriculum' | 'terms'>('overview');
  const [search, setSearch] = useState('');

  // Data State
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);

  // Modal State - SINGLE SOURCE OF TRUTH
  const [modalState, setModalState] = useState<ModalState>({
    type: 'grade',
    mode: 'create',
    isOpen: false,
    data: {},
  });

  // Message Handler
  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  // Filter Data
  const filteredGrades = useMemo(() => {
    const query = search.toLowerCase();
    return grades.filter(grade => 
      grade.grade_name.toLowerCase().includes(query) ||
      grade.id.toString().includes(query)
    );
  }, [grades, search]);

  const filteredSubjects = useMemo(() => {
    const query = search.toLowerCase();
    return subjects.filter(subject =>
      subject.name.toLowerCase().includes(query) ||
      (subject.code || '').toLowerCase().includes(query) ||
      (subject.grade?.grade_name || '').toLowerCase().includes(query)
    );
  }, [subjects, search]);

  const filteredExams = useMemo(() => {
    const query = search.toLowerCase();
    return exams.filter(exam =>
      (exam.subject?.name || '').toLowerCase().includes(query) ||
      (exam.grade?.grade_name || '').toLowerCase().includes(query) ||
      (exam.description || '').toLowerCase().includes(query)
    );
  }, [exams, search]);

  const filteredTerms = useMemo(() => {
    const query = search.toLowerCase();
    return terms.filter(term =>
      term.term_name.toLowerCase().includes(query) ||
      term.year.toString().includes(query)
    );
  }, [terms, search]);

  // Authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setAuthChecking(true);
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          router.replace('/');
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', sessionData.session.user.id)
          .single();

        if (!profileData) {
          showMessage('error', 'User profile not found');
          return;
        }

        setProfile(profileData);

        if (profileData.school_id) {
          const { data: schoolData } = await supabase
            .from('general_information')
            .select('id, school_name')
            .eq('id', profileData.school_id)
            .single();
          
          setSchool(schoolData);
        }
      } catch (error: any) {
        showMessage('error', `Failed to load profile: ${error.message}`);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // Data Loading - SIMPLIFIED VERSION
  useEffect(() => {
    const loadData = async () => {
      if (!profile?.school_id) {
        console.log('No school_id available');
        return;
      }

      console.log('Loading data for school_id:', profile.school_id);
      
      setLoading(true);
      try {
        // Load all data in parallel
        const [
          gradesRes,
          subjectsRes,
          examsRes,
          curriculaRes,
          teachersRes,
          termsRes,
          sessionsRes
        ] = await Promise.all([
          supabase
            .from('class')
            .select('*')
            .eq('school_id', profile.school_id)
            .order('grade_name'),
          
          supabase
            .from('subject')
            .select(`*, grade:class (grade_name), teacher:teachers (first_name, last_name), curriculum:curriculum (name)`)
            .eq('school_id', profile.school_id)
            .order('name'),
          
          supabase
            .from('exam')
            .select(`*, subject:subject (name, code), grade:class (grade_name)`)
            .eq('school_id', profile.school_id)
            .order('date', { ascending: false })
            .limit(50),
          
          supabase
            .from('curriculum')
            .select('*')
            .eq('school_id', profile.school_id)
            .order('name'),
          
          // CRITICAL FIX: Fetch teachers correctly
          supabase
            .from('teachers')
            .select('registration_id, first_name, last_name, email, user_id, school_id')
            .eq('school_id', profile.school_id)
            .order('first_name'),
          
          supabase
            .from('term_exam_session')
            .select('*')
            .eq('school_id', profile.school_id)
            .order('year', { ascending: false })
            .order('term_name'),
          
          supabase
            .from('exam_session')
            .select(`*, term:term_exam_session (*)`)
            .eq('school_id', profile.school_id)
            .order('start_date', { ascending: false }),
        ]);

        console.log('Teachers response:', {
          data: teachersRes.data,
          error: teachersRes.error,
          count: teachersRes.data?.length
        });

        if (teachersRes.data) {
          setTeachers(teachersRes.data);
        }

        if (gradesRes.data) setGrades(gradesRes.data);
        if (subjectsRes.data) setSubjects(subjectsRes.data as Subject[]);
        if (examsRes.data) setExams(examsRes.data as Exam[]);
        if (curriculaRes.data) setCurricula(curriculaRes.data);
        if (termsRes.data) setTerms(termsRes.data as Term[]);
        if (sessionsRes.data) setSessions(sessionsRes.data as ExamSession[]);

      } catch (error: any) {
        console.error('Error loading data:', error);
        showMessage('error', `Failed to load data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profile?.school_id]);

  // Modal Handlers
  const openCreateModal = useCallback((type: EntityType) => {
    console.log('Opening modal with teachers count:', teachers.length);
    
    const defaultData = {
      grade: { name: '', class_teacher_id: '' },
      subject: { name: '', code: '', description: '', grade_id: '', curriculum_id: '', teacher_id: '' },
      exam: { subject_id: '', grade_id: '', date: new Date().toISOString().split('T')[0], duration: 60, description: '' },
      curriculum: { name: '', objectives: '', learning_outcomes: '' },
      term: { term_name: 'TERM_1' as TermName, year: new Date().getFullYear(), start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] },
      session: { term_id: '', exam_type: 'BOT' as ExamType, start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] },
    };
    
    setModalState({
      type,
      mode: 'create',
      isOpen: true,
      data: defaultData[type],
    });
  }, [teachers]);

  const openEditModal = useCallback((type: EntityType, entity: any) => {
    setModalState({
      type,
      mode: 'edit',
      isOpen: true,
      data: { ...entity },
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const updateModalData = useCallback((field: string, value: any) => {
    setModalState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value,
      },
    }));
  }, []);

  // CRUD Operations
  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !profile?.school_id) {
      showMessage('error', 'School information is missing');
      return;
    }

    setSaving(true);
    try {
      const { type, mode, data } = modalState;

      switch (type) {
        case 'grade': {
          const payload = {
            grade_name: data.name.trim(),
            class_teacher_id: data.class_teacher_id || null,
            school_id: profile.school_id,
          };

          if (mode === 'create') {
            const { data: newGrade, error } = await supabase
              .from('class')
              .insert(payload)
              .select()
              .single();

            if (error) throw error;
            setGrades(prev => [...prev, newGrade].sort((a, b) => a.grade_name.localeCompare(b.grade_name)));
            showMessage('success', 'Grade created successfully');
          } else {
            const { error } = await supabase
              .from('class')
              .update(payload)
              .eq('id', data.id);

            if (error) throw error;
            setGrades(prev => prev.map(g => g.id === data.id ? { ...g, ...payload } : g));
            showMessage('success', 'Grade updated successfully');
          }
          break;
        }

        case 'subject': {
          const payload = {
            name: data.name.trim(),
            code: data.code ? data.code.trim() : null,
            description: data.description.trim(),
            grade_id: data.grade_id ? Number(data.grade_id) : null,
            curriculum_id: Number(data.curriculum_id),
            teacher_id: data.teacher_id || null,
            school_id: profile.school_id,
          };

          if (mode === 'create') {
            const { data: newSubject, error } = await supabase
              .from('subject')
              .insert(payload)
              .select(`*, grade:class (grade_name), teacher:teachers (first_name, last_name), curriculum:curriculum (name)`)
              .single();

            if (error) throw error;
            setSubjects(prev => [...prev, newSubject as Subject]);
            showMessage('success', 'Subject created successfully');
          } else {
            const { error } = await supabase
              .from('subject')
              .update(payload)
              .eq('id', data.id);

            if (error) throw error;
            
            // Refetch to get updated relationships
            const { data: updatedSubject } = await supabase
              .from('subject')
              .select(`*, grade:class (grade_name), teacher:teachers (first_name, last_name), curriculum:curriculum (name)`)
              .eq('id', data.id)
              .single();

            if (updatedSubject) {
              setSubjects(prev => prev.map(s => s.id === data.id ? updatedSubject as Subject : s));
            }
            showMessage('success', 'Subject updated successfully');
          }
          break;
        }

        default:
          showMessage('error', 'Operation not implemented');
      }

      closeModal();
    } catch (error: any) {
      console.error('Save error:', error);
      showMessage('error', error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [modalState, profile, school, closeModal, showMessage]);

  const handleDelete = useCallback(async (type: EntityType, id: number) => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      let tableName = '';
      switch (type) {
        case 'grade': tableName = 'class'; break;
        case 'subject': tableName = 'subject'; break;
        case 'exam': tableName = 'exam'; break;
        case 'curriculum': tableName = 'curriculum'; break;
        case 'term': tableName = 'term_exam_session'; break;
        case 'session': tableName = 'exam_session'; break;
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      switch (type) {
        case 'grade': setGrades(prev => prev.filter(g => g.id !== id)); break;
        case 'subject': setSubjects(prev => prev.filter(s => s.id !== id)); break;
        case 'exam': setExams(prev => prev.filter(e => e.id !== id)); break;
        case 'curriculum': setCurricula(prev => prev.filter(c => c.id !== id)); break;
        case 'term': setTerms(prev => prev.filter(t => t.id !== id)); break;
        case 'session': setSessions(prev => prev.filter(s => s.id !== id)); break;
      }

      showMessage('success', 'Item deleted successfully');
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to delete');
    }
  }, [showMessage]);

  // Loading States
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <AppShell />
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="mt-3 text-sm text-gray-600">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!profile || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <AppShell />
          <main className="flex-1 overflow-y-auto flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">School Configuration Required</div>
                    <div className="text-sm text-gray-600 mt-1">Your account is not linked to a school.</div>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/settings')}
                  className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                >
                  Configure School Settings
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Tab Content Components (simplified versions)
  const OverviewTab = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Grades', value: grades.length, icon: Users, color: 'bg-blue-100 text-blue-600' },
          { label: 'Subjects', value: subjects.length, icon: BookOpen, color: 'bg-green-100 text-green-600' },
          { label: 'Exams', value: exams.length, icon: Calendar, color: 'bg-purple-100 text-purple-600' },
          { label: 'Curriculum', value: curricula.length, icon: Layers, color: 'bg-orange-100 text-orange-600' },
          { label: 'Terms', value: terms.length, icon: ShieldCheck, color: 'bg-yellow-100 text-yellow-600' },
          { label: 'Sessions', value: sessions.length, icon: FileText, color: 'bg-red-100 text-red-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
            <div className="mt-2 text-sm font-medium text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const GradesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Grades / Classes</h3>
          <p className="text-sm text-gray-600">Manage all grades and classes in your school</p>
        </div>
        <button
          onClick={() => openCreateModal('grade')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Grade
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGrades.map((grade) => {
          const teacher = teachers.find(t => t.registration_id === grade.class_teacher_id);
          return (
            <div key={grade.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal('grade', grade)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('grade', grade.id)}
                    className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <h4 className="font-semibold text-gray-900 text-lg mb-2">{grade.grade_name}</h4>
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-gray-600">Class Teacher:</span>
                  <span className="font-medium text-gray-900 ml-2">
                    {teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Not assigned'}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium text-gray-900 ml-2">{formatDate(grade.created)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const SubjectsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Subjects</h3>
          <p className="text-sm text-gray-600">Manage all subjects and their assignments</p>
        </div>
        <button
          onClick={() => openCreateModal('subject')}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Subject
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Teacher</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{subject.name}</div>
                        {subject.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{subject.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border">
                      {subject.code || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {subject.grade ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border">
                        {subject.grade.grade_name}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {subject.teacher ? (
                      <div className="text-sm text-gray-900">
                        {subject.teacher.first_name} {subject.teacher.last_name}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal('subject', subject)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete('subject', subject.id)}
                        className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <AppShell />
        
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
            <div className="px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Academics Management</h1>
                    <p className="text-sm text-gray-600 mt-1">
                      Manage grades, subjects, curriculum, exams, and terms for {school.school_name}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <div className="text-xs text-gray-600">
                    Academic Year: <span className="font-semibold text-gray-900">{getCurrentAcademicYear()}</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-6 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm w-fit">
                {[
                  { key: 'overview', label: 'Overview', icon: Home },
                  { key: 'grades', label: 'Grades', icon: Users },
                  { key: 'subjects', label: 'Subjects', icon: Book },
                  { key: 'exams', label: 'Exams', icon: Calendar },
                  { key: 'curriculum', label: 'Curriculum', icon: Layers },
                  { key: 'terms', label: 'Terms & Sessions', icon: ClipboardList },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={clsx(
                      'inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors',
                      activeTab === tab.key
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-6 lg:px-8 py-8">
            {/* Message Display */}
            {message && (
              <div className={clsx(
                'mb-6 flex items-start gap-3 rounded-lg border p-4',
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              )}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5" />
                )}
                <div className="flex-1 text-sm font-medium">{message.text}</div>
                <button
                  onClick={() => setMessage(null)}
                  className="rounded p-1 hover:bg-white/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Content Area */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'grades' && <GradesTab />}
                {activeTab === 'subjects' && <SubjectsTab />}
                {/* Add other tabs as needed */}
              </>
            )}
          </div>
        </main>
      </div>

      {/* SINGLE MODAL - No stacking */}
      <AcademicModal
        state={modalState}
        onClose={closeModal}
        onSubmit={handleSave}
        saving={saving}
        updateModalData={updateModalData}
        options={{
          grades,
          teachers,
          subjects,
          curricula,
          terms,
        }}
      />
    </div>
  );
}
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
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Home,
  Book,
  ClipboardList,
  Clock,
  User,
  Mail,
  Phone,
  Briefcase,
  Eye,
  ChevronDown,
  ChevronUp,
  Filter,
  SortAsc,
  SortDesc,
  MoreVertical,
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
  class_teacher?: Teacher | null;
}

interface Curriculum {
  id: number;
  name: string;
  objectives: string;
  learning_outcomes: string;
  school_id: UUID | null;
  created: string;
  updated: string;
}

interface Teacher {
  registration_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  user_id?: UUID | null;
  school_id: UUID;
  initials?: string;
  gender?: 'male' | 'female' | 'other';
  year_of_entry?: string;
  profile_picture_url?: string | null;
  registered_by?: UUID | null;
  created_at?: string;
  classes?: Grade[];
  subjects?: Subject[];
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
  teacher?: Teacher | null;
  curriculum?: { name: string } | null;
}

interface Exam {
  id: number;
  date: string;
  duration_minutes: number;
  description: string | null;
  file_url?: string | null;
  grade_id: number | null;
  subject_id: number;
  created: string;
  updated: string;
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
type EntityType = 'grade' | 'subject' | 'exam' | 'curriculum' | 'term' | 'session' | 'teacher';

interface ModalState {
  type: EntityType;
  mode: ModalMode;
  isOpen: boolean;
  data: Record<string, any>;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
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

function getExamTypeLabel(type: ExamType): string {
  switch (type) {
    case 'BOT': return 'Beginning of Term';
    case 'MOT': return 'Middle of Term';
    case 'EOT': return 'End of Term';
    default: return type;
  }
}

function getTermNameLabel(name: TermName): string {
  return name.replace('_', ' ');
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-5 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
              type === 'grade' ? 'bg-blue-100 text-blue-600' :
              type === 'subject' ? 'bg-emerald-100 text-emerald-600' :
              type === 'exam' ? 'bg-violet-100 text-violet-600' :
              type === 'curriculum' ? 'bg-amber-100 text-amber-600' :
              type === 'term' ? 'bg-cyan-100 text-cyan-600' :
              type === 'session' ? 'bg-rose-100 text-rose-600' :
              'bg-indigo-100 text-indigo-600'
            }`}>
              {type === 'grade' && <Users className="h-6 w-6" />}
              {type === 'subject' && <BookOpen className="h-6 w-6" />}
              {type === 'exam' && <Calendar className="h-6 w-6" />}
              {type === 'curriculum' && <Layers className="h-6 w-6" />}
              {type === 'term' && <ShieldCheck className="h-6 w-6" />}
              {type === 'session' && <FileText className="h-6 w-6" />}
              {type === 'teacher' && <User className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">
                {mode === 'create' ? 'Add new entry to the system' : 'Update existing entry details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-gray-100 transition-colors"
            disabled={saving}
            type="button"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Grade Form */}
            {type === 'grade' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Grade Name *
                  </label>
                  <input
                    type="text"
                    value={data.name || ''}
                    onChange={(e) => updateModalData('name', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g., Grade 1, Form 2, Senior 3..."
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Class Teacher
                  </label>
                  <select
                    value={data.class_teacher_id || ''}
                    onChange={(e) => updateModalData('class_teacher_id', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 transition-all"
                    disabled={saving}
                  >
                    <option value="">Select class teacher (optional)</option>
                    {options.teachers && options.teachers.length > 0 ? (
                      options.teachers.map((teacher) => (
                        <option key={teacher.registration_id} value={teacher.registration_id}>
                          {teacher.first_name} {teacher.last_name} • {teacher.registration_id}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No teachers available</option>
                    )}
                  </select>
                </div>
              </>
            )}

            {/* Subject Form */}
            {type === 'subject' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    value={data.name || ''}
                    onChange={(e) => updateModalData('name', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                    placeholder="Mathematics, English Language, Biology..."
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    value={data.code || ''}
                    onChange={(e) => updateModalData('code', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                    placeholder="e.g., MATH-101, ENG-P5..."
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Grade / Class
                  </label>
                  <select
                    value={data.grade_id || ''}
                    onChange={(e) => updateModalData('grade_id', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                    disabled={saving}
                  >
                    <option value="">Select grade (optional)</option>
                    {options.grades?.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.grade_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Curriculum *
                  </label>
                  <select
                    value={data.curriculum_id || ''}
                    onChange={(e) => updateModalData('curriculum_id', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Teacher
                  </label>
                  <select
                    value={data.teacher_id || ''}
                    onChange={(e) => updateModalData('teacher_id', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                    disabled={saving}
                  >
                    <option value="">Select teacher (optional)</option>
                    {options.teachers && options.teachers.length > 0 ? (
                      options.teachers.map((teacher) => (
                        <option key={teacher.registration_id} value={teacher.registration_id}>
                          {teacher.first_name} {teacher.last_name} • {teacher.registration_id}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No teachers available</option>
                    )}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={data.description || ''}
                    onChange={(e) => updateModalData('description', e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 transition-all"
                    placeholder="Describe the subject content, learning objectives..."
                    disabled={saving}
                    required
                  />
                </div>
              </div>
            )}

            {/* Exam Form */}
            {type === 'exam' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Subject *
                  </label>
                  <select
                    value={data.subject_id || ''}
                    onChange={(e) => updateModalData('subject_id', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-violet-500 focus:ring-3 focus:ring-violet-500/20 transition-all"
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
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Grade
                  </label>
                  <select
                    value={data.grade_id || ''}
                    onChange={(e) => updateModalData('grade_id', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-violet-500 focus:ring-3 focus:ring-violet-500/20 transition-all"
                    disabled={saving}
                  >
                    <option value="">Select grade (optional)</option>
                    {options.grades?.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.grade_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Exam Date *
                  </label>
                  <input
                    type="date"
                    value={data.date || ''}
                    onChange={(e) => updateModalData('date', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-violet-500 focus:ring-3 focus:ring-violet-500/20 transition-all"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={data.duration_minutes || ''}
                    onChange={(e) => updateModalData('duration_minutes', parseInt(e.target.value) || 60)}
                    required
                    min={10}
                    step={5}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-violet-500 focus:ring-3 focus:ring-violet-500/20 transition-all"
                    placeholder="e.g., 90"
                    disabled={saving}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Description
                  </label>
                  <textarea
                    value={data.description || ''}
                    onChange={(e) => updateModalData('description', e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-violet-500 focus:ring-3 focus:ring-violet-500/20 transition-all"
                    placeholder="Exam instructions, topics covered, special requirements..."
                    disabled={saving}
                  />
                </div>
              </div>
            )}

            {/* Curriculum Form */}
            {type === 'curriculum' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Curriculum Name *
                  </label>
                  <input
                    type="text"
                    value={data.name || ''}
                    onChange={(e) => updateModalData('name', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-3 focus:ring-amber-500/20 transition-all"
                    placeholder="e.g., Cambridge Primary, National Curriculum..."
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Objectives *
                  </label>
                  <textarea
                    value={data.objectives || ''}
                    onChange={(e) => updateModalData('objectives', e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-3 focus:ring-amber-500/20 transition-all"
                    placeholder="Detailed curriculum objectives and goals..."
                    disabled={saving}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Learning Outcomes *
                  </label>
                  <textarea
                    value={data.learning_outcomes || ''}
                    onChange={(e) => updateModalData('learning_outcomes', e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-3 focus:ring-amber-500/20 transition-all"
                    placeholder="Expected student learning outcomes..."
                    disabled={saving}
                    required
                  />
                </div>
              </div>
            )}

            {/* Term Form */}
            {type === 'term' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Term *
                  </label>
                  <select
                    value={data.term_name || 'TERM_1'}
                    onChange={(e) => updateModalData('term_name', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/20 transition-all"
                    disabled={saving}
                  >
                    <option value="TERM_1">Term 1</option>
                    <option value="TERM_2">Term 2</option>
                    <option value="TERM_3">Term 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Academic Year *
                  </label>
                  <input
                    type="number"
                    value={data.year || new Date().getFullYear()}
                    onChange={(e) => updateModalData('year', Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/20 transition-all"
                    disabled={saving}
                    min={2000}
                    max={2100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={data.start_date || ''}
                    onChange={(e) => updateModalData('start_date', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/20 transition-all"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={data.end_date || ''}
                    onChange={(e) => updateModalData('end_date', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-cyan-500 focus:ring-3 focus:ring-cyan-500/20 transition-all"
                    disabled={saving}
                  />
                </div>
              </div>
            )}

            {/* Session Form */}
            {type === 'session' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Term *
                  </label>
                  <select
                    value={data.term_id || ''}
                    onChange={(e) => updateModalData('term_id', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-rose-500 focus:ring-3 focus:ring-rose-500/20 transition-all"
                    disabled={saving}
                  >
                    <option value="">Select term</option>
                    {options.terms?.map((term) => (
                      <option key={term.id} value={term.id}>
                        {getTermNameLabel(term.term_name)} {term.year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Exam Type *
                    </label>
                    <select
                      value={data.exam_type || 'BOT'}
                      onChange={(e) => updateModalData('exam_type', e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-rose-500 focus:ring-3 focus:ring-rose-500/20 transition-all"
                      disabled={saving}
                    >
                      <option value="BOT">BOT (Beginning of Term)</option>
                      <option value="MOT">MOT (Middle of Term)</option>
                      <option value="EOT">EOT (End of Term)</option>
                    </select>
                  </div>
                  <div></div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={data.start_date || ''}
                      onChange={(e) => updateModalData('start_date', e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-rose-500 focus:ring-3 focus:ring-rose-500/20 transition-all"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={data.end_date || ''}
                      onChange={(e) => updateModalData('end_date', e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-rose-500 focus:ring-3 focus:ring-rose-500/20 transition-all"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Teacher Form */}
            {type === 'teacher' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={data.first_name || ''}
                    onChange={(e) => updateModalData('first_name', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g., John"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={data.last_name || ''}
                    onChange={(e) => updateModalData('last_name', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g., Smith"
                    disabled={saving}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={data.email || ''}
                    onChange={(e) => updateModalData('email', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g., john.smith@school.edu"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Registration ID *
                  </label>
                  <input
                    type="text"
                    value={data.registration_id || ''}
                    onChange={(e) => updateModalData('registration_id', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g., TCH-2024-001"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Gender *
                  </label>
                  <select
                    value={data.gender || 'male'}
                    onChange={(e) => updateModalData('gender', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 transition-all"
                    disabled={saving}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Year of Entry *
                  </label>
                  <input
                    type="number"
                    value={data.year_of_entry || new Date().getFullYear().toString()}
                    onChange={(e) => updateModalData('year_of_entry', e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g., 2024"
                    disabled={saving}
                    min={2000}
                    max={2100}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Profile Picture URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={data.profile_picture_url || ''}
                    onChange={(e) => updateModalData('profile_picture_url', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 transition-all"
                    placeholder="https://example.com/profile.jpg"
                    disabled={saving}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all hover:border-gray-400"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all ${
                saving ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg'
              } ${
                type === 'grade' ? 'bg-blue-600 hover:bg-blue-700' :
                type === 'subject' ? 'bg-emerald-600 hover:bg-emerald-700' :
                type === 'exam' ? 'bg-violet-600 hover:bg-violet-700' :
                type === 'curriculum' ? 'bg-amber-600 hover:bg-amber-700' :
                type === 'term' ? 'bg-cyan-600 hover:bg-cyan-700' :
                type === 'session' ? 'bg-rose-600 hover:bg-rose-700' :
                'bg-indigo-600 hover:bg-indigo-700'
              }`}
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
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'subjects' | 'exams' | 'curriculum' | 'terms' | 'teachers'>('overview');
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  // Data State
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);

  // Modal State
  const [modalState, setModalState] = useState<ModalState>({
    type: 'grade',
    mode: 'create',
    isOpen: false,
    data: {},
  });

  // Message Handler
  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // Sort Function
  const handleSort = useCallback((key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  // Apply sorting and filtering
  const processData = useCallback((data: any[], searchQuery: string, sortKey?: string, sortDirection?: 'asc' | 'desc') => {
    let filtered = data;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = data.filter(item => {
        // Check common fields
        if (item.name && item.name.toLowerCase().includes(query)) return true;
        if (item.first_name && item.first_name.toLowerCase().includes(query)) return true;
        if (item.last_name && item.last_name.toLowerCase().includes(query)) return true;
        if (item.registration_id && item.registration_id.toLowerCase().includes(query)) return true;
        if (item.email && item.email.toLowerCase().includes(query)) return true;
        if (item.code && item.code.toLowerCase().includes(query)) return true;
        if (item.grade_name && item.grade_name.toLowerCase().includes(query)) return true;
        if (item.term_name && getTermNameLabel(item.term_name).toLowerCase().includes(query)) return true;
        if (item.year && item.year.toString().includes(query)) return true;
        if (item.exam_type && getExamTypeLabel(item.exam_type).toLowerCase().includes(query)) return true;
        if (item.description && item.description.toLowerCase().includes(query)) return true;
        
        // Check nested properties
        if (item.grade?.grade_name && item.grade.grade_name.toLowerCase().includes(query)) return true;
        if (item.teacher?.first_name && item.teacher.first_name.toLowerCase().includes(query)) return true;
        if (item.teacher?.last_name && item.teacher.last_name.toLowerCase().includes(query)) return true;
        if (item.subject?.name && item.subject.name.toLowerCase().includes(query)) return true;
        if (item.term?.term_name && getTermNameLabel(item.term.term_name).toLowerCase().includes(query)) return true;
        
        return false;
      });
    }
    
    // Apply sorting
    if (sortKey && sortDirection) {
      filtered.sort((a, b) => {
        let aValue = a[sortKey];
        let bValue = b[sortKey];
        
        // Handle nested properties
        if (sortKey === 'grade_name' && a.grade) aValue = a.grade.grade_name;
        if (sortKey === 'grade_name' && b.grade) bValue = b.grade.grade_name;
        if (sortKey === 'teacher_name' && a.teacher) aValue = `${a.teacher.first_name} ${a.teacher.last_name}`;
        if (sortKey === 'teacher_name' && b.teacher) bValue = `${b.teacher.first_name} ${b.teacher.last_name}`;
        if (sortKey === 'subject_name' && a.subject) aValue = a.subject.name;
        if (sortKey === 'subject_name' && b.subject) bValue = b.subject.name;
        if (sortKey === 'term_name' && a.term) aValue = getTermNameLabel(a.term.term_name);
        if (sortKey === 'term_name' && b.term) bValue = getTermNameLabel(b.term.term_name);
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, []);

  // Filtered and sorted data
  const filteredGrades = useMemo(() => 
    processData(grades, search, sortConfig?.key, sortConfig?.direction),
    [grades, search, sortConfig, processData]
  );

  const filteredSubjects = useMemo(() => 
    processData(subjects, search, sortConfig?.key, sortConfig?.direction),
    [subjects, search, sortConfig, processData]
  );

  const filteredTeachers = useMemo(() => 
    processData(teachers, search, sortConfig?.key, sortConfig?.direction),
    [teachers, search, sortConfig, processData]
  );

  const filteredExams = useMemo(() => 
    processData(exams, search, sortConfig?.key, sortConfig?.direction),
    [exams, search, sortConfig, processData]
  );

  const filteredCurricula = useMemo(() => 
    processData(curricula, search, sortConfig?.key, sortConfig?.direction),
    [curricula, search, sortConfig, processData]
  );

  const filteredTerms = useMemo(() => 
    processData(terms, search, sortConfig?.key, sortConfig?.direction),
    [terms, search, sortConfig, processData]
  );

  const filteredSessions = useMemo(() => 
    processData(sessions, search, sortConfig?.key, sortConfig?.direction),
    [sessions, search, sortConfig, processData]
  );

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

  // Data Loading
  useEffect(() => {
    const loadData = async () => {
      if (!profile?.school_id) {
        console.log('No school_id available');
        return;
      }

      setLoading(true);
      try {
        const [
          teachersRes,
          gradesRes,
          subjectsRes,
          examsRes,
          curriculaRes,
          termsRes,
          sessionsRes
        ] = await Promise.all([
          supabase
            .from('teachers')
            .select('*, classes:class!class_teacher_id(*)')
            .eq('school_id', profile.school_id)
            .order('first_name'),
          
          supabase
            .from('class')
            .select('*, class_teacher:teachers!class_teacher_id(*)')
            .eq('school_id', profile.school_id)
            .order('grade_name'),
          
          supabase
            .from('subject')
            .select(`*, 
              grade:class (grade_name), 
              teacher:teachers (first_name, last_name, registration_id), 
              curriculum:curriculum (name)`)
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

        if (teachersRes.data) {
          const teachersWithRelationships = teachersRes.data.map(teacher => ({
            ...teacher,
            classes: teacher.classes || [],
            subjects: []
          }));
          setTeachers(teachersWithRelationships);
        }

        if (gradesRes.data) setGrades(gradesRes.data as Grade[]);
        if (subjectsRes.data) {
          const subjectsData = subjectsRes.data as Subject[];
          setSubjects(subjectsData);
          
          if (teachersRes.data) {
            const updatedTeachers = teachersRes.data.map(teacher => ({
              ...teacher,
              classes: teacher.classes || [],
              subjects: subjectsData.filter(subject => subject.teacher_id === teacher.registration_id)
            }));
            setTeachers(updatedTeachers);
          }
        }
        
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
    const defaultData = {
      grade: { name: '', class_teacher_id: '' },
      subject: { name: '', code: '', description: '', grade_id: '', curriculum_id: '', teacher_id: '' },
      exam: { subject_id: '', grade_id: '', date: new Date().toISOString().split('T')[0], duration_minutes: 60, description: '' },
      curriculum: { name: '', objectives: '', learning_outcomes: '' },
      term: { term_name: 'TERM_1' as TermName, year: new Date().getFullYear(), start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] },
      session: { term_id: '', exam_type: 'BOT' as ExamType, start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] },
      teacher: { 
        first_name: '', 
        last_name: '', 
        email: '', 
        registration_id: '', 
        gender: 'male', 
        year_of_entry: new Date().getFullYear().toString(),
        profile_picture_url: '' 
      },
    };
    
    setModalState({
      type,
      mode: 'create',
      isOpen: true,
      data: defaultData[type],
    });
  }, []);

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

  // CRUD Operations (Only Create/Update - Deletion Disabled)
  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !profile?.school_id) {
      showMessage('error', 'School information is missing');
      return;
    }

    setSaving(true);
    try {
      const { type, mode, data } = modalState;
      const userId = (await supabase.auth.getSession()).data.session?.user.id;

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
              .select('*, class_teacher:teachers!class_teacher_id(*)')
              .single();

            if (error) throw error;
            setGrades(prev => [...prev, newGrade as Grade]);
            showMessage('success', 'Grade created successfully');
          } else {
            const { error } = await supabase
              .from('class')
              .update(payload)
              .eq('id', data.id);

            if (error) throw error;
            
            const { data: updatedGrade } = await supabase
              .from('class')
              .select('*, class_teacher:teachers!class_teacher_id(*)')
              .eq('id', data.id)
              .single();

            if (updatedGrade) {
              setGrades(prev => prev.map(g => g.id === data.id ? updatedGrade as Grade : g));
            }
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
            
            if (data.teacher_id) {
              setTeachers(prev => prev.map(teacher => {
                if (teacher.registration_id === data.teacher_id) {
                  return {
                    ...teacher,
                    subjects: [...(teacher.subjects || []), newSubject as Subject]
                  };
                }
                return teacher;
              }));
            }
            showMessage('success', 'Subject created successfully');
          } else {
            const { error } = await supabase
              .from('subject')
              .update(payload)
              .eq('id', data.id);

            if (error) throw error;
            
            const { data: updatedSubject } = await supabase
              .from('subject')
              .select(`*, grade:class (grade_name), teacher:teachers (first_name, last_name), curriculum:curriculum (name)`)
              .eq('id', data.id)
              .single();

            if (updatedSubject) {
              setSubjects(prev => prev.map(s => s.id === data.id ? updatedSubject as Subject : s));
              
              const oldTeacherId = data.oldTeacherId || subjects.find(s => s.id === data.id)?.teacher_id;
              const newTeacherId = data.teacher_id;
              
              if (oldTeacherId !== newTeacherId) {
                setTeachers(prev => prev.map(teacher => {
                  if (teacher.registration_id === oldTeacherId) {
                    return {
                      ...teacher,
                      subjects: teacher.subjects?.filter(s => s.id !== data.id) || []
                    };
                  }
                  if (teacher.registration_id === newTeacherId) {
                    return {
                      ...teacher,
                      subjects: [...(teacher.subjects || []), updatedSubject as Subject]
                    };
                  }
                  return teacher;
                }));
              }
            }
            showMessage('success', 'Subject updated successfully');
          }
          break;
        }

        case 'exam': {
          const payload = {
            subject_id: Number(data.subject_id),
            grade_id: data.grade_id ? Number(data.grade_id) : null,
            date: data.date,
            duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : 60,
            description: data.description || null,
            school_id: profile.school_id,
            created_by_id: userId,
          };

          if (mode === 'create') {
            const { data: newExam, error } = await supabase
              .from('exam')
              .insert(payload)
              .select(`*, subject:subject (name, code), grade:class (grade_name)`)
              .single();

            if (error) throw error;
            setExams(prev => [newExam as Exam, ...prev]);
            showMessage('success', 'Exam created successfully');
          } else {
            const { error } = await supabase
              .from('exam')
              .update(payload)
              .eq('id', data.id);

            if (error) throw error;
            
            const { data: updatedExam } = await supabase
              .from('exam')
              .select(`*, subject:subject (name, code), grade:class (grade_name)`)
              .eq('id', data.id)
              .single();

            if (updatedExam) {
              setExams(prev => prev.map(e => e.id === data.id ? updatedExam as Exam : e));
            }
            showMessage('success', 'Exam updated successfully');
          }
          break;
        }

        case 'curriculum': {
          const payload = {
            name: data.name.trim(),
            objectives: data.objectives.trim(),
            learning_outcomes: data.learning_outcomes.trim(),
            school_id: profile.school_id,
          };

          if (mode === 'create') {
            const { data: newCurriculum, error } = await supabase
              .from('curriculum')
              .insert(payload)
              .select()
              .single();

            if (error) throw error;
            setCurricula(prev => [...prev, newCurriculum]);
            showMessage('success', 'Curriculum created successfully');
          } else {
            const { error } = await supabase
              .from('curriculum')
              .update(payload)
              .eq('id', data.id);

            if (error) throw error;
            setCurricula(prev => prev.map(c => c.id === data.id ? { ...c, ...payload } : c));
            showMessage('success', 'Curriculum updated successfully');
          }
          break;
        }

        case 'term': {
          const payload = {
            term_name: data.term_name,
            year: parseInt(data.year),
            start_date: data.start_date,
            end_date: data.end_date,
            school_id: profile.school_id,
            created_by_id: userId || '',
          };

          if (mode === 'create') {
            const { data: newTerm, error } = await supabase
              .from('term_exam_session')
              .insert(payload)
              .select()
              .single();

            if (error) throw error;
            setTerms(prev => [...prev, newTerm as Term]);
            showMessage('success', 'Term created successfully');
          } else {
            const { error } = await supabase
              .from('term_exam_session')
              .update(payload)
              .eq('id', data.id);

            if (error) throw error;
            
            const { data: updatedTerm } = await supabase
              .from('term_exam_session')
              .select('*')
              .eq('id', data.id)
              .single();

            if (updatedTerm) {
              setTerms(prev => prev.map(t => t.id === data.id ? updatedTerm as Term : t));
            }
            showMessage('success', 'Term updated successfully');
          }
          break;
        }

        case 'session': {
          const payload = {
            term_id: parseInt(data.term_id),
            exam_type: data.exam_type,
            start_date: data.start_date,
            end_date: data.end_date,
            school_id: profile.school_id,
            created_by_id: userId,
          };

          if (mode === 'create') {
            const { data: newSession, error } = await supabase
              .from('exam_session')
              .insert(payload)
              .select(`*, term:term_exam_session (*)`)
              .single();

            if (error) throw error;
            setSessions(prev => [...prev, newSession as ExamSession]);
            showMessage('success', 'Exam session created successfully');
          } else {
            const { error } = await supabase
              .from('exam_session')
              .update(payload)
              .eq('id', data.id);

            if (error) throw error;
            
            const { data: updatedSession } = await supabase
              .from('exam_session')
              .select(`*, term:term_exam_session (*)`)
              .eq('id', data.id)
              .single();

            if (updatedSession) {
              setSessions(prev => prev.map(s => s.id === data.id ? updatedSession as ExamSession : s));
            }
            showMessage('success', 'Exam session updated successfully');
          }
          break;
        }

        case 'teacher': {
          let user_id = data.user_id;
          
          if (mode === 'create' && data.email) {
            try {
              const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: 'TempPassword123!',
                options: {
                  data: {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    role: 'TEACHER'
                  }
                }
              });

              if (authError) {
                const { data: existingUser } = await supabase
                  .from('auth.users')
                  .select('id')
                  .eq('email', data.email)
                  .single();
                
                if (existingUser) {
                  user_id = existingUser.id;
                } else {
                  throw authError;
                }
              } else if (authData.user) {
                user_id = authData.user.id;
                
                await supabase
                  .from('profiles')
                  .insert({
                    user_id: authData.user.id,
                    email: data.email,
                    full_name: `${data.first_name} ${data.last_name}`,
                    role: 'TEACHER',
                    school_id: profile.school_id,
                  });
              }
            } catch (authError: any) {
              console.warn('Auth error (user might already exist):', authError.message);
            }
          }

          const payload = {
            registration_id: data.registration_id.trim(),
            first_name: data.first_name.trim(),
            last_name: data.last_name.trim(),
            email: data.email?.trim() || null,
            user_id: user_id || null,
            gender: data.gender,
            year_of_entry: data.year_of_entry,
            profile_picture_url: data.profile_picture_url?.trim() || null,
            school_id: profile.school_id,
            registered_by: userId,
          };

          if (mode === 'create') {
            const { data: newTeacher, error } = await supabase
              .from('teachers')
              .insert(payload)
              .select('*, classes:class!class_teacher_id(*)')
              .single();

            if (error) throw error;
            setTeachers(prev => [...prev, { ...newTeacher, subjects: [] }]);
            showMessage('success', 'Teacher created successfully');
          } else {
            const { error } = await supabase
              .from('teachers')
              .update(payload)
              .eq('registration_id', data.registration_id);

            if (error) throw error;
            
            const { data: updatedTeacher } = await supabase
              .from('teachers')
              .select('*, classes:class!class_teacher_id(*)')
              .eq('registration_id', data.registration_id)
              .single();

            if (updatedTeacher) {
              const existingTeacher = teachers.find(t => t.registration_id === data.registration_id);
              setTeachers(prev => prev.map(t => 
                t.registration_id === data.registration_id 
                  ? { ...updatedTeacher, subjects: existingTeacher?.subjects || [] }
                  : t
              ));
            }
            showMessage('success', 'Teacher updated successfully');
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
  }, [modalState, profile, school, closeModal, showMessage, subjects, teachers]);

  // Tab Content Components
  const OverviewTab = () => (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        {[
          { label: 'Grades', value: grades.length, icon: Users, color: 'bg-gradient-to-br from-blue-500 to-blue-600', textColor: 'text-blue-600' },
          { label: 'Subjects', value: subjects.length, icon: BookOpen, color: 'bg-gradient-to-br from-emerald-500 to-emerald-600', textColor: 'text-emerald-600' },
          { label: 'Exams', value: exams.length, icon: Calendar, color: 'bg-gradient-to-br from-violet-500 to-violet-600', textColor: 'text-violet-600' },
          { label: 'Curriculum', value: curricula.length, icon: Layers, color: 'bg-gradient-to-br from-amber-500 to-amber-600', textColor: 'text-amber-600' },
          { label: 'Terms', value: terms.length, icon: ShieldCheck, color: 'bg-gradient-to-br from-cyan-500 to-cyan-600', textColor: 'text-cyan-600' },
          { label: 'Sessions', value: sessions.length, icon: FileText, color: 'bg-gradient-to-br from-rose-500 to-rose-600', textColor: 'text-rose-600' },
          { label: 'Teachers', value: teachers.length, icon: User, color: 'bg-gradient-to-br from-indigo-500 to-indigo-600', textColor: 'text-indigo-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className={`h-12 w-12 rounded-xl ${stat.color} text-white flex items-center justify-center shadow-md`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Exams */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-lg font-bold text-gray-900">Upcoming Exams</h3>
            <p className="text-sm text-gray-600">Next 5 scheduled exams</p>
          </div>
          <div className="divide-y divide-gray-100">
            {exams
              .filter(exam => new Date(exam.date) >= new Date())
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 5)
              .map((exam) => (
                <div key={exam.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {exam.subject?.name || 'Unknown Subject'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {exam.grade?.grade_name ? `${exam.grade.grade_name} • ` : ''}
                          {formatDate(exam.date)} • {exam.duration_minutes} mins
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => openEditModal('exam', exam)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                      title="Edit exam"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            {exams.filter(exam => new Date(exam.date) >= new Date()).length === 0 && (
              <div className="px-6 py-8 text-center">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming exams scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Teachers */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-lg font-bold text-gray-900">Recent Teachers</h3>
            <p className="text-sm text-gray-600">Latest teaching staff additions</p>
          </div>
          <div className="divide-y divide-gray-100">
            {teachers.slice(0, 5).map((teacher) => (
              <div key={teacher.registration_id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      {teacher.profile_picture_url ? (
                        <img 
                          src={teacher.profile_picture_url} 
                          alt={`${teacher.first_name} ${teacher.last_name}`}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="font-semibold text-sm">
                          {getInitials(teacher.first_name, teacher.last_name)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {teacher.first_name} {teacher.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {teacher.classes?.length || 0} classes • {teacher.subjects?.length || 0} subjects
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openEditModal('teacher', teacher)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Edit teacher"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Term */}
      {terms.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">Current Academic Term</h3>
              <p className="text-blue-100 mt-1">
                {getTermNameLabel(terms[0].term_name)} {terms[0].year}
              </p>
              <p className="text-blue-100 text-sm mt-2">
                {formatDate(terms[0].start_date)} → {formatDate(terms[0].end_date)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {sessions
                .filter(session => session.term_id === terms[0].id)
                .map(session => (
                  <div key={session.id} className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                    <div className="text-sm font-semibold">{getExamTypeLabel(session.exam_type)}</div>
                    <div className="text-xs opacity-90">{formatDate(session.start_date)}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const GradesTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Grades / Classes</h3>
          <p className="text-sm text-gray-600">Manage academic grades and class assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openCreateModal('grade')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Grade
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredGrades.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-700">No grades found</h4>
          <p className="text-gray-500 mt-2">Create your first grade to get started</p>
          <button
            onClick={() => openCreateModal('grade')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add First Grade
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGrades.map((grade) => {
            const teacher = teachers.find(t => t.registration_id === grade.class_teacher_id);
            const subjectsInGrade = subjects.filter(s => s.grade_id === grade.id);
            
            return (
              <div key={grade.id} className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-5">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-md">
                    <Users className="h-7 w-7" />
                  </div>
                  <button
                    onClick={() => openEditModal('grade', grade)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit grade"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-3">{grade.grade_name}</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Teacher:</span>
                    <span className="font-semibold text-gray-900 ml-auto">
                      {teacher ? `${teacher.first_name} ${teacher.last_name}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Subjects:</span>
                    <span className="font-semibold text-gray-900 ml-auto">
                      {subjectsInGrade.length}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Updated: {formatDate(grade.updated)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const SubjectsTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Subjects</h3>
          <p className="text-sm text-gray-600">Manage all academic subjects and teaching assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openCreateModal('subject')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Subject
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-700">No subjects found</h4>
          <p className="text-gray-500 mt-2">Create your first subject to get started</p>
          <button
            onClick={() => openCreateModal('subject')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add First Subject
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{subject.name}</div>
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
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <span className="text-xs font-semibold">
                              {getInitials(subject.teacher.first_name, subject.teacher.last_name)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-900">
                            {subject.teacher.first_name} {subject.teacher.last_name}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEditModal('subject', { ...subject, oldTeacherId: subject.teacher_id })}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                        title="Edit subject"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const TeachersTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Teaching Staff</h3>
          <p className="text-sm text-gray-600">Manage all teachers and their assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openCreateModal('teacher')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Teacher
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-700">No teachers found</h4>
          <p className="text-gray-500 mt-2">Add your teaching staff to get started</p>
          <button
            onClick={() => openCreateModal('teacher')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add First Teacher
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => {
            const assignedGrades = grades.filter(grade => grade.class_teacher_id === teacher.registration_id);
            const assignedSubjects = subjects.filter(subject => subject.teacher_id === teacher.registration_id);
            const isExpanded = expandedTeacher === teacher.registration_id;
            
            return (
              <div key={teacher.registration_id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Teacher Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                        {teacher.profile_picture_url ? (
                          <img 
                            src={teacher.profile_picture_url} 
                            alt={`${teacher.first_name} ${teacher.last_name}`}
                            className="h-14 w-14 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold">
                            {getInitials(teacher.first_name, teacher.last_name)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">
                          {teacher.first_name} {teacher.last_name}
                        </h4>
                        <p className="text-sm text-gray-600">{teacher.registration_id}</p>
                        {teacher.email && (
                          <p className="text-sm text-gray-500 truncate">{teacher.email}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openEditModal('teacher', teacher)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                      title="Edit teacher"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{assignedGrades.length}</div>
                      <div className="text-xs text-blue-700">Classes</div>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-600">{assignedSubjects.length}</div>
                      <div className="text-xs text-emerald-700">Subjects</div>
                    </div>
                  </div>
                  
                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => setExpandedTeacher(isExpanded ? null : teacher.registration_id)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show Details
                      </>
                    )}
                  </button>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    {/* Assigned Classes */}
                    {assignedGrades.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Assigned Classes</h5>
                        <div className="flex flex-wrap gap-2">
                          {assignedGrades.map(grade => (
                            <span key={grade.id} className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg">
                              {grade.grade_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Teaching Subjects */}
                    {assignedSubjects.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Teaching Subjects</h5>
                        <div className="flex flex-wrap gap-2">
                          {assignedSubjects.map(subject => (
                            <span key={subject.id} className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg">
                              {subject.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {assignedGrades.length === 0 && assignedSubjects.length === 0 && (
                      <p className="text-sm text-gray-500 text-center">No assignments yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const ExamsTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Exams</h3>
          <p className="text-sm text-gray-600">Manage all exams and assessments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openCreateModal('exam')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 px-5 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Exam
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredExams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-700">No exams found</h4>
          <p className="text-gray-500 mt-2">Schedule your first exam to get started</p>
          <button
            onClick={() => openCreateModal('exam')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add First Exam
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Exam Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{formatDate(exam.date)}</div>
                          {exam.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{exam.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{exam.subject?.name || '—'}</div>
                      <div className="text-sm text-gray-500">{exam.subject?.code || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      {exam.grade ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border">
                          {exam.grade.grade_name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{exam.duration_minutes} mins</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEditModal('exam', exam)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                        title="Edit exam"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const CurriculumTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Curriculum</h3>
          <p className="text-sm text-gray-600">Manage learning curricula and frameworks</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openCreateModal('curriculum')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Curriculum
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredCurricula.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Layers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-700">No curriculum found</h4>
          <p className="text-gray-500 mt-2">Create your first curriculum to get started</p>
          <button
            onClick={() => openCreateModal('curriculum')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add First Curriculum
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCurricula.map((curriculum) => (
            <div key={curriculum.id} className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-5">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md">
                  <Layers className="h-7 w-7" />
                </div>
                <button
                  onClick={() => openEditModal('curriculum', curriculum)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Edit curriculum"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
              <h4 className="font-bold text-gray-900 text-lg mb-3">{curriculum.name}</h4>
              <div className="space-y-4">
                <div className="text-sm">
                  <div className="text-gray-600 font-medium mb-1">Objectives</div>
                  <div className="text-gray-900 line-clamp-2">{curriculum.objectives}</div>
                </div>
                <div className="text-sm">
                  <div className="text-gray-600 font-medium mb-1">Learning Outcomes</div>
                  <div className="text-gray-900 line-clamp-2">{curriculum.learning_outcomes}</div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Updated: {formatDate(curriculum.updated)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const TermsSessionsTab = () => (
    <div className="space-y-8">
      {/* Terms Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Academic Terms</h3>
            <p className="text-sm text-gray-600">Manage academic terms and their dates</p>
          </div>
          <button
            onClick={() => openCreateModal('term')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Term
          </button>
        </div>

        {filteredTerms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <ShieldCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700">No terms found</h4>
            <p className="text-gray-500 mt-2">Create your first academic term to get started</p>
            <button
              onClick={() => openCreateModal('term')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add First Term
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTerms.map((term) => {
              const start = new Date(term.start_date);
              const end = new Date(term.end_date);
              const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              const termSessions = sessions.filter(session => session.term_id === term.id);
              
              return (
                <div key={term.id} className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-5">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white flex items-center justify-center shadow-md">
                      <ShieldCheck className="h-7 w-7" />
                    </div>
                    <button
                      onClick={() => openEditModal('term', term)}
                      className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit term"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                  <h4 className="font-bold text-gray-900 text-lg mb-2">
                    {getTermNameLabel(term.term_name)} {term.year}
                  </h4>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="text-gray-600">Period:</span>
                      <span className="font-semibold text-gray-900 ml-2">
                        {formatDate(term.start_date)} → {formatDate(term.end_date)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-semibold text-gray-900 ml-2">{duration} days</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Exam Sessions:</span>
                      <span className="font-semibold text-gray-900 ml-2">{termSessions.length}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        Updated: {formatDate(term.updated)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Exam Sessions Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Exam Sessions</h3>
            <p className="text-sm text-gray-600">Manage BOT, MOT, and EOT exam sessions</p>
          </div>
          <button
            onClick={() => openCreateModal('session')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Session
          </button>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700">No exam sessions found</h4>
            <p className="text-gray-500 mt-2">Create your first exam session to get started</p>
            <button
              onClick={() => openCreateModal('session')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add First Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session) => {
              const start = new Date(session.start_date);
              const end = new Date(session.end_date);
              const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={session.id} className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-5">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md">
                      <FileText className="h-7 w-7" />
                    </div>
                    <button
                      onClick={() => openEditModal('session', session)}
                      className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit session"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                  <h4 className="font-bold text-gray-900 text-lg mb-2">
                    {getExamTypeLabel(session.exam_type)}
                  </h4>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="text-gray-600">Term:</span>
                      <span className="font-semibold text-gray-900 ml-2">
                        {session.term ? (
                          `${getTermNameLabel(session.term.term_name)} ${session.term.year}`
                        ) : '—'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Period:</span>
                      <span className="font-semibold text-gray-900 ml-2">
                        {formatDate(session.start_date)} → {formatDate(session.end_date)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-semibold text-gray-900 ml-2">{duration} days</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        Updated: {formatDate(session.updated)}
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

  // Loading States
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <AppShell />
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <div className="text-center">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
                <Loader2 className="absolute -top-2 -right-2 h-6 w-6 animate-spin text-blue-600" />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-600">Loading academics dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!profile || !school) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <AppShell />
          <main className="flex-1 overflow-y-auto flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">School Configuration Required</div>
                    <div className="text-sm text-gray-600 mt-1">Your account is not linked to a school.</div>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/settings')}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-3.5 text-sm font-semibold text-white hover:shadow-lg transition-all"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <AppShell />
        
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                    <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Academics Management</h1>
                    <p className="text-sm text-gray-600 mt-1">
                      Manage academic resources for {school.school_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <div className="text-xs text-gray-600">
                    Academic Year: <span className="font-semibold text-gray-900">{getCurrentAcademicYear()}</span>
                  </div>
                </div>
              </div>

              {/* Tabs - Responsive */}
              <div className="mt-6">
                <div className="flex overflow-x-auto pb-2 scrollbar-hide">
                  <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                    {[
                      { key: 'overview', label: 'Overview', icon: Home },
                      { key: 'grades', label: 'Grades', icon: Users },
                      { key: 'subjects', label: 'Subjects', icon: Book },
                      { key: 'teachers', label: 'Teachers', icon: User },
                      { key: 'exams', label: 'Exams', icon: Calendar },
                      { key: 'curriculum', label: 'Curriculum', icon: Layers },
                      { key: 'terms', label: 'Terms', icon: ClipboardList },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={clsx(
                          'inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all whitespace-nowrap',
                          activeTab === tab.key
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                            : 'text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        <tab.icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Message Display */}
            {message && (
              <div className={clsx(
                'mb-6 flex items-start gap-3 rounded-2xl border p-4 animate-in slide-in-from-top-4',
                message.type === 'success'
                  ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-25 text-emerald-900'
                  : 'border-red-200 bg-gradient-to-r from-red-50 to-red-25 text-red-900'
              )}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                )}
                <div className="flex-1 text-sm font-medium">{message.text}</div>
                <button
                  onClick={() => setMessage(null)}
                  className="rounded p-1 hover:bg-white/40 transition-colors"
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
                  placeholder="Search anything..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Content Area */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
                  <p className="mt-4 text-sm font-medium text-gray-600">Loading academic data...</p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'grades' && <GradesTab />}
                {activeTab === 'subjects' && <SubjectsTab />}
                {activeTab === 'teachers' && <TeachersTab />}
                {activeTab === 'exams' && <ExamsTab />}
                {activeTab === 'curriculum' && <CurriculumTab />}
                {activeTab === 'terms' && <TermsSessionsTab />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
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
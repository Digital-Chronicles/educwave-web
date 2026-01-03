'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  Search,
  Plus,
  Upload,
  Loader2,
  XCircle,
  CheckCircle,
  Users,
  Grid,
  List,
  GraduationCap,
  Phone,
  IdCard,
  Building2,
  Calendar,
  UserPlus,
  Filter,
  ChevronRight,
  BookOpen,
  MoreVertical,
  Shield,
  TrendingUp,
  UserCheck,
  FileText,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  X,
  Download,
  FileUp,
  Bell,
  TrendingDown,
  BarChart3,
  Sparkles,
  School,
  Target,
  Award,
  Activity,
  Mail,
  MapPin,
  UserCog,
  ExternalLink,
  DownloadCloud,
  Check,
  AlertCircle,
  RefreshCw,
  Zap,
  Star,
  Hash,
} from 'lucide-react';

/* ----------------------------- Types ----------------------------- */

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  school_id: string | null;
};

type SchoolRow = {
  id: string;
  school_name: string;
};

type ClassRow = { id: number; grade_name: string };

type StudentRow = {
  registration_id: string;
  first_name: string;
  last_name: string;
  current_status: string;
  date_of_birth: string;
  guardian_phone: string | null;
  created: string;
  class?: { grade_name: string } | null;
};

/* ----------------------------- Constants ----------------------------- */

const STATUS_CHOICES = [
  { value: 'active', label: 'Active', icon: '🟢', color: 'emerald' },
  { value: 'graduated', label: 'Graduated', icon: '🎓', color: 'blue' },
  { value: 'dropped out', label: 'Dropped Out', icon: '🔴', color: 'rose' },
];

const GENDER_CHOICES = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

const SCHOOL_TYPE_CHOICES = [
  { value: 'day', label: 'Day' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'bursary', label: 'Bursary' },
  { value: 'scholarship', label: 'Scholarship' },
];

const ITEMS_PER_PAGE_GRID = 12;
const ITEMS_PER_PAGE_TABLE = 20;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/* ----------------------------- Helpers ----------------------------- */

function getSchoolAbbr(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function computeYearOfEntry(grade: string) {
  const y = new Date().getFullYear();
  const map: Record<string, number> = {
    grade_7: y - 6,
    grade_6: y - 5,
    grade_5: y - 4,
    grade_4: y - 3,
    grade_3: y - 2,
    grade_2: y - 1,
    grade_1: y,
  };
  return String(map[grade] ?? y);
}

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(',');
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));
    return obj;
  });
  return rows;
}

function initials(first: string, last: string) {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`;
}

function statusPill(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20';
    case 'graduated':
      return 'bg-blue-500/10 text-blue-700 border border-blue-500/20';
    case 'dropped out':
      return 'bg-rose-500/10 text-rose-700 border border-rose-500/20';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active': return '🟢';
    case 'graduated': return '🎓';
    case 'dropped out': return '🔴';
    default: return '⚪';
  }
}

/* ----------------------------- UI Primitives ----------------------------- */

function StatCard({
  icon,
  label,
  value,
  trend,
  trendValue,
  color = 'blue',
  loading = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
  loading?: boolean;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    violet: 'from-violet-500 to-purple-600',
    rose: 'from-rose-500 to-pink-600',
  };

  const trendColors = {
    up: 'text-emerald-600 bg-emerald-500/10',
    down: 'text-rose-600 bg-rose-500/10',
    neutral: 'text-slate-600 bg-slate-100',
  };

  return (
    <div className="group relative rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
          {loading ? (
            <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg"></div>
          ) : (
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {value}
              {trend && (
                <span className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1",
                  trendColors[trend]
                )}>
                  {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                   trend === 'down' ? <TrendingDown className="h-3 w-3" /> : 
                   <Activity className="h-3 w-3" />}
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={cn(
          "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300",
          colorClasses[color]
        )}>
          {icon}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
    </div>
  );
}

function Alert({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
}) {
  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      iconColor: 'text-emerald-600',
    },
    error: {
      icon: XCircle,
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-800',
      iconColor: 'text-rose-600',
    },
    info: {
      icon: Bell,
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      iconColor: 'text-blue-600',
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      iconColor: 'text-amber-600',
    },
  };

  const { icon: Icon, bg, text, iconColor } = config[type];

  return (
    <div className={cn('rounded-xl border p-4 flex items-start justify-between gap-3 animate-in slide-in-from-top-2', bg)}>
      <div className="flex items-start gap-3 flex-1">
        <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', iconColor)} />
        <div className={cn('text-sm font-semibold', text)}>{message}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 hover:bg-black/5 transition"
          aria-label="Close alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  description,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {required && <span className="text-xs text-rose-500">*</span>}
      </div>
      {description && <div className="mb-2 text-xs text-slate-500">{description}</div>}
      {children}
      {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
    </label>
  );
}

/* ----------------------------- Modal ----------------------------- */

function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  maxWidthClass = 'max-w-4xl',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidthClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-all duration-200" 
        onClick={onClose} 
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div 
          className={cn(
            'w-full rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200',
            maxWidthClass
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                  {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 h-10 w-10 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex items-center justify-center hover:scale-105 active:scale-95"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Student Form ----------------------------- */

type StudentFormState = {
  registration_id?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  current_status: string;
  gender: string;
  school_type: string;
  grade_of_entry: string;
  lin_id: string;
  guardian_name: string;
  guardian_phone: string;
  current_grade_id: number | '';
};

function StudentForm({
  mode,
  classes,
  value,
  onChange,
  errors = {},
}: {
  mode: 'add' | 'edit';
  classes: ClassRow[];
  value: StudentFormState;
  onChange: (next: StudentFormState) => void;
  errors?: Record<string, string>;
}) {
  const inputBase =
    'w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-slate-400 shadow-sm';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {mode === 'edit' && value.registration_id && (
        <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <IdCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <span className="font-semibold">Registration ID:</span>
                <span className="font-mono bg-white px-3 py-1 rounded-lg border border-blue-200">
                  {value.registration_id}
                </span>
              </div>
              <p className="mt-1 text-xs text-blue-600">Registration ID cannot be changed.</p>
            </div>
          </div>
        </div>
      )}

      <Field label="First Name" required error={errors.first_name}>
        <input
          className={cn(inputBase, errors.first_name && 'border-rose-300 focus:ring-rose-500')}
          value={value.first_name}
          onChange={(e) => onChange({ ...value, first_name: e.target.value })}
          placeholder="John"
        />
      </Field>

      <Field label="Last Name" required error={errors.last_name}>
        <input
          className={cn(inputBase, errors.last_name && 'border-rose-300 focus:ring-rose-500')}
          value={value.last_name}
          onChange={(e) => onChange({ ...value, last_name: e.target.value })}
          placeholder="Doe"
        />
      </Field>

      <Field label="Date of Birth" required error={errors.date_of_birth}>
        <input
          type="date"
          className={cn(inputBase, errors.date_of_birth && 'border-rose-300 focus:ring-rose-500')}
          value={value.date_of_birth}
          onChange={(e) => onChange({ ...value, date_of_birth: e.target.value })}
        />
      </Field>

      <Field label="Status" required>
        <select
          className={inputBase}
          value={value.current_status}
          onChange={(e) => onChange({ ...value, current_status: e.target.value })}
        >
          {STATUS_CHOICES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.icon} {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Gender">
        <div className="relative">
          <select
            className={inputBase}
            value={value.gender}
            onChange={(e) => onChange({ ...value, gender: e.target.value })}
          >
            <option value="">Select Gender</option>
            {GENDER_CHOICES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </Field>

      <Field label="School Type">
        <div className="relative">
          <select
            className={inputBase}
            value={value.school_type}
            onChange={(e) => onChange({ ...value, school_type: e.target.value })}
          >
            {SCHOOL_TYPE_CHOICES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </Field>

      <Field label="Grade of Entry" description="Format: grade_1, grade_2, ...">
        <input
          className={inputBase}
          value={value.grade_of_entry}
          onChange={(e) => onChange({ ...value, grade_of_entry: e.target.value })}
          placeholder="grade_1"
        />
      </Field>

      <Field label="LIN ID (Optional)">
        <input
          className={inputBase}
          value={value.lin_id}
          onChange={(e) => onChange({ ...value, lin_id: e.target.value })}
          placeholder="Optional national ID"
        />
      </Field>

      <Field label="Assign Class (Optional)">
        <div className="relative">
          <select
            className={inputBase}
            value={value.current_grade_id}
            onChange={(e) =>
              onChange({ ...value, current_grade_id: e.target.value ? Number(e.target.value) : '' })
            }
          >
            <option value="">Not Assigned</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade_name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </Field>

      <Field label="Guardian Name">
        <input
          className={inputBase}
          value={value.guardian_name}
          onChange={(e) => onChange({ ...value, guardian_name: e.target.value })}
          placeholder="Parent/Guardian name"
        />
      </Field>

      <Field label="Guardian Phone">
        <input
          className={inputBase}
          value={value.guardian_phone}
          onChange={(e) => onChange({ ...value, guardian_phone: e.target.value })}
          placeholder="0700000000"
        />
      </Field>
    </div>
  );
}

/* ----------------------------- Cards & Rows ----------------------------- */

function StudentCard({
  student,
  router,
  onEdit,
}: {
  student: StudentRow;
  router: any;
  onEdit: (s: StudentRow) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="group relative animate-in fade-in">
      <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        {/* Status indicator */}
        <div className="absolute top-4 left-4 z-10">
          <span className={cn(
            'px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5',
            statusPill(student.current_status)
          )}>
            <span className="text-xs">{getStatusIcon(student.current_status)}</span>
            {student.current_status}
          </span>
        </div>

        {/* Actions dropdown */}
        <div className="absolute top-4 right-4 z-10">
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="h-9 w-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
              aria-label="Actions"
            >
              <MoreVertical className="h-4 w-4 text-slate-700" />
            </button>

            {showActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white border border-slate-200 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => router.push(`/students/${encodeURIComponent(student.registration_id)}`)}
                    className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors group/action"
                  >
                    <Eye className="h-4 w-4 group-hover/action:text-blue-600 transition-colors" />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      onEdit(student);
                    }}
                    className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors group/action"
                  >
                    <Edit className="h-4 w-4 group-hover/action:text-emerald-600 transition-colors" />
                    Edit Student
                  </button>
                  <div className="border-t border-slate-200 my-1"></div>
                  <button
                    className="w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors group/action"
                    onClick={() => setShowActions(false)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Student
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-6 pt-12">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-lg group-hover:scale-105 transition-transform duration-300">
                <span className="text-lg">{initials(student.first_name, student.last_name)}</span>
              </div>
              <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
                <GraduationCap className="h-3 w-3 text-blue-600" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-900 text-lg truncate">
                {student.first_name} {student.last_name}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <Hash className="h-4 w-4" />
                <span className="font-mono truncate">{student.registration_id}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 group/stat">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                Class
              </div>
              <div className="mt-1 font-semibold text-slate-900">
                {student.class?.grade_name ?? 'Not assigned'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 group/stat">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Guardian
              </div>
              <div className="mt-1 font-semibold text-slate-900 truncate">
                {student.guardian_phone ?? '—'}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-4 w-4" />
            Born {new Date(student.date_of_birth).toLocaleDateString()}
          </div>
        </div>

        <button
          onClick={() => router.push(`/students/${encodeURIComponent(student.registration_id)}`)}
          className="w-full px-6 py-3.5 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 hover:from-slate-50 hover:to-slate-100 text-sm font-semibold text-blue-700 flex items-center justify-center gap-2 transition-all duration-200 group/link"
        >
          View Full Profile
          <ChevronRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

function StudentTableRow({
  student,
  router,
  onEdit,
}: {
  student: StudentRow;
  router: any;
  onEdit: (s: StudentRow) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <tr className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-white transition-all duration-200 group">
      <td className="py-4 px-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
              <span className="text-sm">{initials(student.first_name, student.last_name)}</span>
            </div>
          </div>
          <div>
            <div className="font-semibold text-slate-900">
              {student.first_name} {student.last_name}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {student.date_of_birth}
            </div>
          </div>
        </div>
      </td>

      <td className="py-4 px-6">
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-1.5 group/reg">
          <IdCard className="h-4 w-4 text-slate-500 group-hover/reg:text-blue-600 transition-colors" />
          <span className="font-mono text-sm text-slate-800">{student.registration_id}</span>
        </div>
      </td>

      <td className="py-4 px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <GraduationCap className="h-4 w-4 text-slate-500" />
          {student.class?.grade_name ?? '—'}
        </div>
      </td>

      <td className="py-4 px-6">
        <span className={cn(
          'px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5',
          statusPill(student.current_status)
        )}>
          <span className="text-xs">{getStatusIcon(student.current_status)}</span>
          {student.current_status}
        </span>
      </td>

      <td className="py-4 px-6">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Phone className="h-4 w-4 text-slate-500" />
          {student.guardian_phone ?? '—'}
        </div>
      </td>

      <td className="py-4 px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/students/${encodeURIComponent(student.registration_id)}`)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 font-semibold hover:from-blue-100 hover:to-blue-200 border border-blue-200 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            View
          </button>

          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
              aria-label="Row actions"
            >
              <MoreVertical className="h-4 w-4 text-slate-700" />
            </button>

            {showActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white border border-slate-200 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => router.push(`/students/${encodeURIComponent(student.registration_id)}`)}
                    className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors group/action"
                  >
                    <Eye className="h-4 w-4 group-hover/action:text-blue-600 transition-colors" />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      onEdit(student);
                    }}
                    className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors group/action"
                  >
                    <Edit className="h-4 w-4 group-hover/action:text-emerald-600 transition-colors" />
                    Edit Student
                  </button>
                  <div className="border-t border-slate-200 my-1"></div>
                  <button
                    className="w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors group/action"
                    onClick={() => setShowActions(false)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Student
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ----------------------------- Pagination ----------------------------- */

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i);
      if (totalPages > maxVisible) pages.push('...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...');
      for (let i = totalPages - maxVisible + 2; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, '...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push('...', totalPages);
    }
    
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5 px-6 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white">
      <div className="text-sm text-slate-600">
        Showing <span className="font-semibold text-slate-900">{startItem}-{endItem}</span> of{' '}
        <span className="font-semibold text-slate-900">{totalItems}</span> students
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-sm"
          title="First"
        >
          <ChevronsLeft className="h-4 w-4 text-slate-700" />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-sm"
          title="Previous"
        >
          <ChevronLeft className="h-4 w-4 text-slate-700" />
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum, idx) => (
            pageNum === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">…</span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum as number)}
                className={cn(
                  'min-w-[2.5rem] h-10 rounded-xl font-semibold transition-all border shadow-sm hover:scale-105 active:scale-95',
                  currentPage === pageNum
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                )}
              >
                {pageNum}
              </button>
            )
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-sm"
          title="Next"
        >
          <ChevronRight className="h-4 w-4 text-slate-700" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-sm"
          title="Last"
        >
          <ChevronsRight className="h-4 w-4 text-slate-700" />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function StudentsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = viewMode === 'grid' ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_TABLE;

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const emptyForm: StudentFormState = {
    first_name: '',
    last_name: '',
    date_of_birth: '',
    current_status: 'active',
    gender: '',
    school_type: 'day',
    grade_of_entry: 'grade_1',
    lin_id: '',
    guardian_name: '',
    guardian_phone: '',
    current_grade_id: '',
  };

  const [addForm, setAddForm] = useState<StudentFormState>(emptyForm);
  const [editForm, setEditForm] = useState<StudentFormState>(emptyForm);

  const resetAlerts = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoMsg(null);
  };

  const fetchStudents = async (schoolId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select(
        'registration_id,first_name,last_name,current_status,date_of_birth,guardian_phone,created,class:current_grade_id(grade_name)'
      )
      .eq('school_id', schoolId)
      .order('created', { ascending: false })
      .limit(2000);

    if (error) throw error;
    setStudents((data ?? []) as any);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) return router.replace('/');

        const uid = sess.session.user.id;

        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id,email,full_name,role,school_id')
          .eq('user_id', uid)
          .single();

        if (pErr) throw pErr;
        setProfile(p as any);

        if (!p?.school_id) {
          setSchool(null);
          setStudents([]);
          setClasses([]);
          setLoading(false);
          setErrorMsg('Your profile is not linked to any school. Please configure your school in Settings.');
          return;
        }

        const { data: sch, error: schErr } = await supabase
          .from('general_information')
          .select('id,school_name')
          .eq('id', p.school_id)
          .single();

        if (schErr) throw schErr;
        setSchool(sch as any);

        const { data: cls, error: clsErr } = await supabase
          .from('class')
          .select('id,grade_name')
          .eq('school_id', p.school_id)
          .order('grade_name', { ascending: true });

        if (clsErr) throw clsErr;
        setClasses((cls ?? []) as any);

        await fetchStudents(p.school_id);
        setInfoMsg(`Loaded ${students.length} student records`);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to load module');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (q) {
        const hit =
          s.registration_id.toLowerCase().includes(q) ||
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          s.guardian_phone?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (statusFilter !== 'all' && s.current_status !== statusFilter) return false;
      if (classFilter !== 'all' && (s.class?.grade_name ?? '') !== classFilter) return false;
      return true;
    });
  }, [students, search, statusFilter, classFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, classFilter, viewMode]);

  const activeCount = useMemo(() => students.filter((s) => s.current_status === 'active').length, [students]);
  const graduatedCount = useMemo(() => students.filter((s) => s.current_status === 'graduated').length, [students]);
  const dropOutCount = useMemo(() => students.filter((s) => s.current_status === 'dropped out').length, [students]);

  async function getNextRegistrationId(schoolId: string, schoolName: string, yearOfEntry: string) {
    const abbr = getSchoolAbbr(schoolName);
    const { data, error } = await supabase.rpc('generate_student_registration_id', {
      p_school_id: schoolId,
      p_school_abbr: abbr,
      p_year_of_entry: yearOfEntry,
    });
    if (error) throw error;
    if (!data) throw new Error('Registration ID generator returned null.');
    return String(data);
  }

  const validateForm = (form: StudentFormState) => {
    const errors: Record<string, string> = {};
    if (!form.first_name.trim()) errors.first_name = 'First name is required';
    if (!form.last_name.trim()) errors.last_name = 'Last name is required';
    if (!form.date_of_birth) errors.date_of_birth = 'Date of birth is required';
    return errors;
  };

  const openAdd = () => {
    resetAlerts();
    setFormErrors({});
    setAddForm(emptyForm);
    setAddOpen(true);
  };

  const openEdit = (s: StudentRow) => {
    resetAlerts();
    setFormErrors({});
    setEditForm({
      registration_id: s.registration_id,
      first_name: s.first_name ?? '',
      last_name: s.last_name ?? '',
      date_of_birth: s.date_of_birth ?? '',
      current_status: s.current_status ?? 'active',
      gender: '',
      school_type: 'day',
      grade_of_entry: 'grade_1',
      lin_id: '',
      guardian_name: '',
      guardian_phone: s.guardian_phone ?? '',
      current_grade_id: '',
    });
    setEditOpen(true);
  };

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetAlerts();
    setFormErrors({});

    const errors = validateForm(addForm);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      if (!profile?.school_id || !school) throw new Error('School not linked.');

      const yearOfEntry = computeYearOfEntry(addForm.grade_of_entry);
      const registration_id = await getNextRegistrationId(profile.school_id, school.school_name, yearOfEntry);

      const { error } = await supabase.from('students').insert({
        registration_id,
        lin_id: addForm.lin_id.trim() || null,
        first_name: addForm.first_name.trim(),
        last_name: addForm.last_name.trim(),
        date_of_birth: addForm.date_of_birth,
        current_status: addForm.current_status,
        gender: addForm.gender || null,
        school_type: addForm.school_type || null,
        grade_of_entry: addForm.grade_of_entry || null,
        year_of_entry: yearOfEntry,
        guardian_name: addForm.guardian_name.trim() || null,
        guardian_phone: addForm.guardian_phone.trim() || null,
        current_grade_id: addForm.current_grade_id === '' ? null : Number(addForm.current_grade_id),
        father_name: null,
        father_phone: null,
        father_nin: null,
        mother_name: null,
        mother_phone: null,
        mother_nin: null,
        profile_picture_url: null,
        school_id: profile.school_id,
        registered_by: profile.user_id,
      });

      if (error) throw error;

      setSuccessMsg(`🎉 Student "${addForm.first_name} ${addForm.last_name}" added successfully! Registration ID: ${registration_id}`);
      await fetchStudents(profile.school_id);
      setAddOpen(false);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetAlerts();
    setFormErrors({});

    const errors = validateForm(editForm);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      if (!profile?.school_id) throw new Error('School not linked.');
      if (!editForm.registration_id) throw new Error('Missing student id.');

      const payload: any = {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        date_of_birth: editForm.date_of_birth,
        current_status: editForm.current_status,
        guardian_phone: editForm.guardian_phone.trim() || null,
      };

      const { error } = await supabase
        .from('students')
        .update(payload)
        .eq('registration_id', editForm.registration_id)
        .eq('school_id', profile.school_id);

      if (error) throw error;

      setSuccessMsg(`✅ Student "${editForm.first_name} ${editForm.last_name}" updated successfully!`);
      await fetchStudents(profile.school_id);
      setEditOpen(false);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to update student');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadCSVTemplate = () => {
    const headers = [
      'first_name',
      'last_name',
      'date_of_birth',
      'grade_of_entry',
      'current_status',
      'gender',
      'school_type',
      'lin_id',
      'guardian_name',
      'guardian_phone',
      'current_grade_id',
    ];
    const example = ['John', 'Doe', '2016-05-21', 'grade_1', 'active', 'Male', 'day', '', 'Jane Doe', '0700000000', '1'];
    const csv = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    
    setInfoMsg('📄 CSV template downloaded successfully!');
  };

  const uploadCSV = async (file: File) => {
    resetAlerts();
    try {
      setCsvUploading(true);
      if (!profile?.school_id || !school) throw new Error('School not linked.');

      const rows = parseCSV(await file.text());
      if (!rows.length) throw new Error('CSV is empty.');

      const classNameToId = new Map<string, number>();
      classes.forEach((c) => classNameToId.set(c.grade_name.toLowerCase(), c.id));

      const inserts: any[] = [];

      for (const r of rows) {
        const fn = (r.first_name || '').trim();
        const ln = (r.last_name || '').trim();
        const date_of_birth = (r.date_of_birth || '').trim();
        const grade_of_entry = (r.grade_of_entry || 'grade_1').trim();
        const current_status = (r.current_status || 'active').trim();

        if (!fn || !ln || !date_of_birth) continue;

        const yearOfEntry = computeYearOfEntry(grade_of_entry);
        const registration_id = await getNextRegistrationId(profile.school_id, school.school_name, yearOfEntry);

        let current_grade_id: number | null = null;
        const rawClass = (r.current_grade_id || '').trim();
        if (rawClass) {
          const maybe = Number(rawClass);
          if (!Number.isNaN(maybe)) current_grade_id = maybe;
          else current_grade_id = classNameToId.get(rawClass.toLowerCase()) ?? null;
        }

        inserts.push({
          registration_id,
          lin_id: (r.lin_id || '').trim() || null,
          first_name: fn,
          last_name: ln,
          date_of_birth,
          current_status,
          gender: (r.gender || '').trim() || null,
          school_type: (r.school_type || '').trim() || null,
          grade_of_entry,
          year_of_entry: yearOfEntry,
          guardian_name: (r.guardian_name || '').trim() || null,
          guardian_phone: (r.guardian_phone || '').trim() || null,
          current_grade_id,
          father_name: null,
          father_phone: null,
          father_nin: null,
          mother_name: null,
          mother_phone: null,
          mother_nin: null,
          profile_picture_url: null,
          school_id: profile.school_id,
          registered_by: profile.user_id,
        });
      }

      if (!inserts.length) throw new Error('No valid rows found.');

      const chunkSize = 200;
      for (let i = 0; i < inserts.length; i += chunkSize) {
        const chunk = inserts.slice(i, i + chunkSize);
        const { error } = await supabase.from('students').insert(chunk);
        if (error) throw error;
      }

      setSuccessMsg(`✅ Successfully imported ${inserts.length} students from CSV!`);
      await fetchStudents(profile.school_id);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      setErrorMsg(e?.message || 'CSV upload failed');
    } finally {
      setCsvUploading(false);
    }
  };

  const handleRefresh = async () => {
    resetAlerts();
    if (!profile?.school_id) return;
    try {
      setLoading(true);
      await fetchStudents(profile.school_id);
      setInfoMsg('🔄 Student records refreshed successfully!');
    } catch (e: any) {
      setErrorMsg('Failed to refresh records');
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------- Guards ----------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 animate-pulse mx-auto flex items-center justify-center shadow-lg">
            <Users className="h-7 w-7 text-white" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-600 animate-pulse">Loading student registry…</p>
          <p className="mt-2 text-xs text-slate-500">Fetching your school's student records</p>
        </div>
      </div>
    );
  }

  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        <Navbar/>
        <div className="flex flex-1">
          <AppShell />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-8 text-center animate-in fade-in">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">Account Configuration Required</h3>
              <p className="mt-2 text-sm text-slate-600">
                Your profile is not linked to a school. Configure your school in Settings.
              </p>
              <button
                onClick={() => router.push('/settings')}
                className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                Go to Settings
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* ----------------------------- Render ----------------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <Navbar/>

      <div className="flex flex-1 overflow-hidden">
        <AppShell />

        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
            <div className="px-6 lg:px-8 py-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg">
                      <Users className="h-7 w-7" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 h-9 min-w-[2.5rem] px-2.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold border-2 border-white shadow-lg">
                      {students.length}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                      <Building2 className="h-4 w-4" />
                      <span className="font-semibold">{school.school_name}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                        Student Registry
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Registry</h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Manage student records, track enrollment, and monitor academic progress
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-4 w-4 text-slate-600", loading && "animate-spin")} />
                    <span className="text-sm font-semibold text-slate-700">Refresh</span>
                  </button>

                  <button
                    onClick={downloadCSVTemplate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all hover:-translate-y-0.5 group"
                  >
                    <DownloadCloud className="h-4 w-4 text-slate-600 group-hover:text-blue-600 transition-colors" />
                    <span className="text-sm font-semibold text-slate-700">Template</span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={csvUploading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 shadow-sm hover:from-blue-100 hover:to-blue-200 transition-all hover:-translate-y-0.5 disabled:opacity-60 group"
                    >
                      {csvUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                      ) : (
                        <FileUp className="h-4 w-4 text-blue-700" />
                      )}
                      <span className="text-sm font-semibold text-blue-800">
                        {csvUploading ? 'Importing…' : 'Import CSV'}
                      </span>
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadCSV(f);
                      }}
                    />
                  </div>

                  <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0 group"
                  >
                    <UserPlus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    Add Student
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-7 grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard 
                  icon={<Users className="h-5 w-5" />} 
                  label="Total Students" 
                  value={students.length} 
                  trend="up" 
                  trendValue="+5%"
                  color="blue"
                  loading={loading}
                />
                <StatCard 
                  icon={<BookOpen className="h-5 w-5" />} 
                  label="Active" 
                  value={activeCount} 
                  trend="neutral"
                  trendValue="Current"
                  color="emerald"
                  loading={loading}
                />
                <StatCard 
                  icon={<GraduationCap className="h-5 w-5" />} 
                  label="Graduated" 
                  value={graduatedCount} 
                  trend="up"
                  trendValue="+2%"
                  color="violet"
                  loading={loading}
                />
                <StatCard 
                  icon={<Shield className="h-5 w-5" />} 
                  label="Drop Outs" 
                  value={dropOutCount} 
                  trend="down"
                  trendValue="-1%"
                  color="rose"
                  loading={loading}
                />
              </div>

              {/* Alerts */}
              <div className="mt-5 space-y-3 max-w-3xl">
                {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}
                {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}
                {infoMsg && <Alert type="info" message={infoMsg} onClose={() => setInfoMsg(null)} />}
              </div>

              {/* Controls */}
              <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm p-5 animate-in fade-in">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="relative max-w-xl">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search students by name, ID, or phone…"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-slate-300 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Filter className="h-4 w-4" />
                      <span className="font-semibold">Filters</span>
                    </div>

                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 pr-10 hover:border-slate-300 transition-colors shadow-sm"
                      >
                        <option value="all">All Status</option>
                        {STATUS_CHOICES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.icon} {s.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative">
                      <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="appearance-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 pr-10 hover:border-slate-300 transition-colors shadow-sm"
                      >
                        <option value="all">All Classes</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.grade_name}>
                            {c.grade_name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={cn(
                          'p-2 rounded-lg transition-all duration-200',
                          viewMode === 'grid' 
                            ? 'bg-white shadow-md text-blue-700 scale-105' 
                            : 'text-slate-500 hover:text-slate-700 hover:scale-105'
                        )}
                        title="Grid View"
                      >
                        <Grid className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={cn(
                          'p-2 rounded-lg transition-all duration-200',
                          viewMode === 'list' 
                            ? 'bg-white shadow-md text-blue-700 scale-105' 
                            : 'text-slate-500 hover:text-slate-700 hover:scale-105'
                        )}
                        title="List View"
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 text-sm font-bold border border-blue-200 shadow-sm">
                      {filtered.length} student{filtered.length === 1 ? '' : 's'} found
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 lg:px-8 py-8">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
              {paginatedItems.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg">
                    <Users className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-slate-900">No students found</h3>
                  <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                    {search || statusFilter !== 'all' || classFilter !== 'all'
                      ? 'Try adjusting your search criteria or filters'
                      : 'Start by adding your first student to the registry'}
                  </p>
                  <button
                    onClick={openAdd}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                  >
                    <Plus className="h-5 w-5" />
                    Add First Student
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                    {paginatedItems.map((s) => (
                      <StudentCard key={s.registration_id} student={s} router={router} onEdit={openEdit} />
                    ))}
                  </div>
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                        <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-4 px-6 text-left">Student</th>
                          <th className="py-4 px-6 text-left">Registration</th>
                          <th className="py-4 px-6 text-left">Class</th>
                          <th className="py-4 px-6 text-left">Status</th>
                          <th className="py-4 px-6 text-left">Guardian</th>
                          <th className="py-4 px-6 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedItems.map((s) => (
                          <StudentTableRow key={s.registration_id} student={s} router={router} onEdit={openEdit} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          </div>

          {/* Add Modal */}
          <Modal
            open={addOpen}
            title="Add New Student"
            subtitle="Registration ID will be generated automatically"
            onClose={() => setAddOpen(false)}
            maxWidthClass="max-w-5xl"
          >
            <form onSubmit={handleAddSubmit} className="space-y-6">
              <StudentForm mode="add" classes={classes} value={addForm} onChange={setAddForm} errors={formErrors} />

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="px-6 py-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 group"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  )}
                  {submitting ? 'Saving…' : 'Save Student'}
                </button>
              </div>
            </form>
          </Modal>

          {/* Edit Modal */}
          <Modal
            open={editOpen}
            title="Edit Student"
            subtitle="Update student information"
            onClose={() => setEditOpen(false)}
            maxWidthClass="max-w-5xl"
          >
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <StudentForm mode="edit" classes={classes} value={editForm} onChange={setEditForm} errors={formErrors} />

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-6 py-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 group"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Edit className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  )}
                  {submitting ? 'Updating…' : 'Update Student'}
                </button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
}
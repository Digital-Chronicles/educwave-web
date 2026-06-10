'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
type AttendanceMap = Record<string, { status: AttendanceStatus; notes: string }>;

interface ProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  school_id: string | null;
}

interface SchoolRow {
  id: string;
  school_name: string;
}

interface TeacherRow {
  registration_id: string;
}

interface ClassRow {
  id: number;
  grade_name: string;
  class_teacher_id: string | null;
}

interface SubjectRow {
  grade_id: number | null;
  teacher_id: string | null;
}

interface StudentRow {
  registration_id: string;
  first_name: string;
  last_name: string;
}

interface ExistingAttendanceRow {
  student_id: string;
  status: AttendanceStatus;
  notes: string | null;
}

type SaveAttendanceRow = {
  school_id: string;
  student_id: string;
  class_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  notes: string | null;
  marked_by: string;
};

const statusOptions: Array<{
  value: AttendanceStatus;
  label: string;
  shortLabel: string;
  icon: typeof Check;
  activeClass: string;
  inactiveClass: string;
}> = [
  {
    value: 'PRESENT',
    label: 'Present',
    shortLabel: 'P',
    icon: Check,
    activeClass: 'border-emerald-300 bg-emerald-400 text-slate-950',
    inactiveClass: 'border-white/10 bg-slate-900 text-slate-300',
  },
  {
    value: 'ABSENT',
    label: 'Absent',
    shortLabel: 'A',
    icon: UserX,
    activeClass: 'border-red-300 bg-red-400 text-slate-950',
    inactiveClass: 'border-white/10 bg-slate-900 text-slate-300',
  },
  {
    value: 'LATE',
    label: 'Late',
    shortLabel: 'L',
    icon: Clock3,
    activeClass: 'border-amber-300 bg-amber-300 text-slate-950',
    inactiveClass: 'border-white/10 bg-slate-900 text-slate-300',
  },
  {
    value: 'EXCUSED',
    label: 'Excused',
    shortLabel: 'E',
    icon: ShieldCheck,
    activeClass: 'border-sky-300 bg-sky-300 text-slate-950',
    inactiveClass: 'border-white/10 bg-slate-900 text-slate-300',
  },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function studentName(student: StudentRow) {
  return `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function MobileAttendancePage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [authUserId, setAuthUserId] = useState('');
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [profileRole, setProfileRole] = useState<AppRole | null>(null);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});

  const [classId, setClassId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(todayDate());
  const [studentSearch, setStudentSearch] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/');
        return;
      }

      setAuthChecking(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (authChecking) return;

    const loadBaseData = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) throw userErr;
        if (!user) throw new Error('Could not find authenticated user.');
        setAuthUserId(user.id);

        const { data: profileRow, error: profileErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id')
          .eq('user_id', user.id)
          .single();

        if (profileErr || !profileRow) {
          throw new Error(profileErr?.message || 'Profile not found.');
        }

        const profileData = profileRow as ProfileRow;
        setProfileRole(profileData.role);

        if (!profileData.school_id) {
          throw new Error('Your account is not linked to a school.');
        }

        const { data: schoolRow, error: schoolErr } = await supabase
          .from('general_information')
          .select('id, school_name')
          .eq('id', profileData.school_id)
          .single();

        if (schoolErr || !schoolRow) {
          throw new Error(schoolErr?.message || 'School not found.');
        }

        const schoolData = schoolRow as SchoolRow;
        setSchool(schoolData);

        let teacherData: TeacherRow | null = null;
        if (profileData.role === 'TEACHER') {
          const { data: teacherRow, error: teacherErr } = await supabase
            .from('teachers')
            .select('registration_id')
            .eq('user_id', user.id)
            .eq('school_id', schoolData.id)
            .single();

          if (teacherErr || !teacherRow) {
            throw new Error(teacherErr?.message || 'Teacher record not found.');
          }

          teacherData = teacherRow as TeacherRow;
          setTeacher(teacherData);
        }

        const [classRes, subjectRes] = await Promise.all([
          supabase
            .from('class')
            .select('id, grade_name, class_teacher_id')
            .eq('school_id', schoolData.id)
            .order('grade_name'),
          supabase
            .from('subject')
            .select('grade_id, teacher_id')
            .eq('school_id', schoolData.id),
        ]);

        if (classRes.error) throw classRes.error;
        if (subjectRes.error) throw subjectRes.error;

        const allClasses = (classRes.data ?? []) as ClassRow[];
        const allSubjects = (subjectRes.data ?? []) as SubjectRow[];

        if (profileData.role === 'TEACHER' && teacherData) {
          const assignedGradeIds = new Set(
            allSubjects
              .filter((subject) => subject.teacher_id === teacherData?.registration_id && subject.grade_id)
              .map((subject) => Number(subject.grade_id))
          );

          setClasses(
            allClasses.filter(
              (classRow) =>
                classRow.class_teacher_id === teacherData?.registration_id ||
                assignedGradeIds.has(Number(classRow.id))
            )
          );
        } else {
          setClasses(allClasses);
        }
      } catch (err: unknown) {
        setErrorMsg(getErrorMessage(err, 'Failed to load attendance setup.'));
      } finally {
        setLoading(false);
      }
    };

    loadBaseData();
  }, [authChecking]);

  useEffect(() => {
    if (!school?.id || !classId || !attendanceDate) {
      setStudents([]);
      setAttendance({});
      return;
    }

    const loadStudentsAndAttendance = async () => {
      setStudentsLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const [studentRes, attendanceRes] = await Promise.all([
          supabase
            .from('students')
            .select('registration_id, first_name, last_name')
            .eq('school_id', school.id)
            .eq('current_grade_id', Number(classId))
            .order('first_name'),
          supabase
            .from('student_attendance')
            .select('student_id, status, notes')
            .eq('school_id', school.id)
            .eq('class_id', Number(classId))
            .eq('attendance_date', attendanceDate),
        ]);

        if (studentRes.error) throw studentRes.error;
        if (attendanceRes.error) throw attendanceRes.error;

        const studentRows = (studentRes.data ?? []) as StudentRow[];
        const initialAttendance: AttendanceMap = {};

        for (const student of studentRows) {
          initialAttendance[student.registration_id] = { status: 'PRESENT', notes: '' };
        }

        for (const row of (attendanceRes.data ?? []) as ExistingAttendanceRow[]) {
          if (initialAttendance[row.student_id]) {
            initialAttendance[row.student_id] = {
              status: row.status,
              notes: row.notes ?? '',
            };
          }
        }

        setStudents(studentRows);
        setAttendance(initialAttendance);
      } catch (err: unknown) {
        setErrorMsg(getErrorMessage(err, 'Failed to load daily attendance.'));
      } finally {
        setStudentsLoading(false);
      }
    };

    loadStudentsAndAttendance();
  }, [school?.id, classId, attendanceDate]);

  const selectedClass = useMemo(
    () => classes.find((classRow) => Number(classRow.id) === Number(classId)) ?? null,
    [classes, classId]
  );

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;

    return students.filter((student) => {
      const haystack = `${studentName(student)} ${student.registration_id}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [students, studentSearch]);

  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };

    for (const student of students) {
      const status = attendance[student.registration_id]?.status ?? 'PRESENT';
      counts[status]++;
    }

    return counts;
  }, [students, attendance]);

  const presentRate = students.length > 0 ? Math.round((summary.PRESENT / students.length) * 100) : 0;

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance((current) => ({
      ...current,
      [studentId]: {
        status,
        notes: current[studentId]?.notes ?? '',
      },
    }));
  };

  const setStudentNotes = (studentId: string, notes: string) => {
    setAttendance((current) => ({
      ...current,
      [studentId]: {
        status: current[studentId]?.status ?? 'PRESENT',
        notes,
      },
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    const next: AttendanceMap = {};
    for (const student of students) {
      next[student.registration_id] = {
        status,
        notes: attendance[student.registration_id]?.notes ?? '',
      };
    }
    setAttendance(next);
  };

  const handleSave = async () => {
    if (!school?.id || !classId || !attendanceDate || !authUserId) {
      setErrorMsg('Select class and date first.');
      return;
    }

    if (students.length === 0) {
      setErrorMsg('No students found for this class.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const rows: SaveAttendanceRow[] = students.map((student) => {
        const entry = attendance[student.registration_id] ?? { status: 'PRESENT', notes: '' };
        return {
          school_id: school.id,
          student_id: student.registration_id,
          class_id: Number(classId),
          attendance_date: attendanceDate,
          status: entry.status,
          notes: entry.notes.trim() ? entry.notes.trim() : null,
          marked_by: authUserId,
        };
      });

      const { error } = await supabase.from('student_attendance').upsert(rows, {
        onConflict: 'school_id,student_id,class_id,attendance_date',
      });

      if (error) throw error;

      setSuccessMsg(`Saved attendance for ${rows.length} students.`);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, 'Failed to save attendance.'));
    } finally {
      setSaving(false);
    }
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" />
          <p className="mt-4 text-sm text-slate-300">Opening mobile attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link
            href="/assessments"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200"
            aria-label="Back to assessments"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-white">Daily Attendance</h1>
            <p className="truncate text-xs text-slate-400">
              {school?.school_name ?? 'School'}{profileRole === 'TEACHER' || teacher ? ' - teacher mode' : ''}
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !classId || students.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-cyan-400 px-4 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 pb-28 pt-4">
        {errorMsg && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-red-200">
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-200">
              Dismiss
            </button>
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Choose class and date</h2>
              <p className="text-xs text-slate-400">Attendance is saved once per student per day.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Class</span>
              <div className="relative">
                <select
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-slate-900 px-4 pr-10 text-sm text-white outline-none focus:border-cyan-300"
                >
                  <option value="">Pick class</option>
                  {classes.map((classRow) => (
                    <option key={classRow.id} value={classRow.id}>
                      {classRow.grade_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Date</span>
              <input
                value={attendanceDate}
                onChange={(event) => setAttendanceDate(event.target.value)}
                type="date"
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none focus:border-cyan-300"
              />
            </label>
          </div>
        </section>

        <section className="grid grid-cols-4 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[11px] text-slate-400">Present</div>
            <div className="mt-1 text-xl font-bold text-emerald-200">{summary.PRESENT}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[11px] text-slate-400">Absent</div>
            <div className="mt-1 text-xl font-bold text-red-200">{summary.ABSENT}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[11px] text-slate-400">Late</div>
            <div className="mt-1 text-xl font-bold text-amber-200">{summary.LATE}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[11px] text-slate-400">Rate</div>
            <div className="mt-1 text-xl font-bold text-cyan-200">{presentRate}%</div>
          </div>
        </section>

        {classId && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">
                  {selectedClass?.grade_name ?? 'Class'} roster
                </h2>
                <p className="truncate text-xs text-slate-400">
                  {students.length} students on {attendanceDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => markAll('PRESENT')}
                disabled={students.length === 0}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-400 px-3 text-xs font-bold text-slate-950 disabled:opacity-40"
              >
                <UserCheck className="h-4 w-4" />
                All Present
              </button>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search student..."
                className="h-11 w-full rounded-2xl border border-white/10 bg-slate-900 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
              />
            </div>
          </section>
        )}

        {!classId ? (
          <section className="rounded-3xl border border-dashed border-white/15 p-8 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-500" />
            <h2 className="mt-4 text-base font-semibold text-white">Pick a class to start</h2>
            <p className="mt-2 text-sm text-slate-400">Today&apos;s date is selected automatically.</p>
          </section>
        ) : studentsLoading ? (
          <section className="rounded-3xl border border-white/10 p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" />
            <p className="mt-3 text-sm text-slate-400">Loading roster...</p>
          </section>
        ) : filteredStudents.length === 0 ? (
          <section className="rounded-3xl border border-white/10 p-8 text-center">
            <Search className="mx-auto h-9 w-9 text-slate-500" />
            <p className="mt-3 text-sm text-slate-400">No student matches that search.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {filteredStudents.map((student, index) => {
              const entry = attendance[student.registration_id] ?? { status: 'PRESENT', notes: '' };

              return (
                <article
                  key={student.registration_id}
                  className="rounded-3xl border border-white/10 bg-white/[0.05] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-200">
                          {index + 1}
                        </span>
                        <h3 className="truncate text-base font-semibold text-white">{studentName(student)}</h3>
                      </div>
                      <p className="mt-1 truncate pl-9 text-xs text-slate-400">{student.registration_id}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {statusOptions.map((option) => {
                      const Icon = option.icon;
                      const active = entry.status === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setStudentStatus(student.registration_id, option.value)}
                          className={cn(
                            'flex h-12 items-center justify-center rounded-2xl border text-xs font-bold transition-colors',
                            active ? option.activeClass : option.inactiveClass
                          )}
                          title={option.label}
                          aria-label={`${option.label} ${studentName(student)}`}
                        >
                          <Icon className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">{option.label}</span>
                          <span className="sm:hidden">{option.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>

                  {entry.status !== 'PRESENT' && (
                    <input
                      value={entry.notes}
                      onChange={(event) => setStudentNotes(student.registration_id, event.target.value)}
                      placeholder="Optional note..."
                      className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
                    />
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate-400">
              {students.length} students, {summary.PRESENT} present
            </p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${presentRate}%` }} />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !classId || students.length === 0}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

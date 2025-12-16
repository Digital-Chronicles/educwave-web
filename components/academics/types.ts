export type UUID = string;

export type TermName = 'TERM_1' | 'TERM_2' | 'TERM_3';
export type ExamType = 'BOT' | 'MOT' | 'EOT';

export interface ProfileRow {
  user_id: UUID;
  email: string | null;
  full_name: string | null;
  role: 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';
  school_id: UUID | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolRow {
  id: UUID;
  school_name: string;
}

export interface GradeRow {
  id: number;
  grade_name: string;
  school_id: UUID | null;
}

export interface CurriculumRow {
  id: number;
  name: string;
  objectives: string;
  learning_outcomes: string;
  school_id: UUID | null;
}

export interface TeacherRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  user_id?: UUID | null;
  school_id: UUID;
}

export interface SubjectRow {
  id: number;
  name: string;
  code: string | null;
  grade_id: number | null;
  curriculum_id: number | null;
  description?: string | null;
  teacher_id?: string | null;
  school_id: UUID | null;
  grade?: { grade_name: string } | null;
  teacher?: { first_name: string; last_name: string } | null;
  curriculum?: { name: string } | null;
}

export interface ExamRow {
  id: number;
  date: string;
  duration_minutes: number;
  description: string | null;
  grade_id: number | null;
  subject_id: number;
  created: string;
  school_id: UUID | null;
  created_by_id?: string | null;
  subject?: { name: string; code: string | null } | null;
  grade?: { grade_name: string } | null;
}

export interface TermRow {
  id: number;
  term_name: TermName;
  year: number;
  start_date: string;
  end_date: string;
  created_by_id: string;
  school_id: UUID | null;
  created: string;
  updated: string;
}

export interface ExamSessionRow {
  id: number;
  term_id: number;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  created_by_id: string | null;
  school_id: UUID | null;
  created: string;
  updated: string;
  term?: TermRow | null;
}
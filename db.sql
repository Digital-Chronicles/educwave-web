-- =========================================================
-- SUPABASE SCHOOL PORTAL SCHEMA (based on your Django models)
-- - Uses auth.users (NO custom_user)
-- - Multi-school support
-- - Student + Teacher IDs match your Django PKs
-- - Includes finance & academics & assessment tables shown
-- =========================================================

create extension if not exists pgcrypto;

-- -----------------------------
-- ENUMS
-- -----------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('ADMIN','ACADEMIC','TEACHER','FINANCE','STUDENT','PARENT');
  end if;

  if not exists (select 1 from pg_type where typname = 'term_name') then
    create type public.term_name as enum ('TERM_1','TERM_2','TERM_3');
  end if;

  if not exists (select 1 from pg_type where typname = 'exam_type') then
    create type public.exam_type as enum ('BOT','MOT','EOT');
  end if;

  if not exists (select 1 from pg_type where typname = 'student_status') then
    create type public.student_status as enum ('active','graduated','dropped out');
  end if;

  if not exists (select 1 from pg_type where typname = 'gender_type') then
    create type public.gender_type as enum ('Male','Female','male','female');
  end if;

  if not exists (select 1 from pg_type where typname = 'school_type') then
    create type public.school_type as enum ('day','boarding','bursary','scholarhip');
  end if;

  if not exists (select 1 from pg_type where typname = 'fee_payment_method') then
    create type public.fee_payment_method as enum ('cash','card','online_transfer','mobile_money','bank');
  end if;

  if not exists (select 1 from pg_type where typname = 'fee_status') then
    create type public.fee_status as enum ('pending','partial','paid','overdue');
  end if;

  if not exists (select 1 from pg_type where typname = 'fee_term') then
    create type public.fee_term as enum ('T1','T2','T3');
  end if;

  if not exists (select 1 from pg_type where typname = 'other_fee_type') then
    create type public.other_fee_type as enum (
      'development','sports','library','laboratory','uniform','examination','medical',
      'maintenance','technology','admission','field_trip','extra_classes'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'pay_frequency') then
    create type public.pay_frequency as enum ('monthly','bi-weekly','weekly');
  end if;
end $$;

-- -----------------------------
-- SCHOOLS (management.GeneralInformation)
-- -----------------------------
create table if not exists public.general_information (
  id uuid primary key default gen_random_uuid(),
  school_name text not null unique,
  school_badge text,
  box_no text,
  location text not null,
  contact_number text not null,
  email text not null,
  website text,
  established_year int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists gi_set_updated_at on public.general_information;
create trigger gi_set_updated_at
before update on public.general_information
for each row execute procedure public.set_updated_at();

-- -----------------------------
-- PROFILES (links auth.users -> school + role)
-- -----------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.app_role not null default 'STUDENT',
  school_id uuid references public.general_information(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- Auto-create profile after signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'STUDENT')
  )
  on conflict (user_id) do update set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Helper: current school id
create or replace function public.current_school_id()
returns uuid language sql stable as $$
  select school_id from public.profiles where user_id = auth.uid();
$$;

-- =========================================================
-- ACADEMIC MODELS
-- =========================================================

-- class (Grade)
create table if not exists public.class (
  id bigserial primary key,
  grade_name varchar(50) not null,
  class_teacher_id varchar(100) null, -- references teachers.registration_id (added after teachers table)
  school_id uuid null references public.general_information(id) on delete cascade,
  created date not null default current_date,
  updated date not null default current_date
);

-- curriculum
create table if not exists public.curriculum (
  id bigserial primary key,
  name varchar(150) not null,
  objectives text not null,
  learning_outcomes text not null,
  school_id uuid null references public.general_information(id) on delete cascade,
  created date not null default current_date,
  updated date not null default current_date
);

-- =========================================================
-- TEACHERS
-- =========================================================
create table if not exists public.teachers (
  registration_id varchar(100) primary key, -- Django PK
  user_id uuid not null unique references auth.users(id) on delete restrict,
  initials varchar(5) default 'NJ',
  first_name varchar(150) not null,
  last_name varchar(150) not null,
  gender public.gender_type not null default 'male',
  year_of_entry varchar(4) not null,
  profile_picture_url text,
  school_id uuid not null references public.general_information(id) on delete cascade,
  registered_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Link class.class_teacher_id -> teachers.registration_id
alter table public.class
  add constraint class_class_teacher_fk
  foreign key (class_teacher_id) references public.teachers(registration_id)
  on delete set null;

-- PayrollInformation
create table if not exists public.payroll_information (
  id bigserial primary key,
  teacher_id varchar(100) not null unique references public.teachers(registration_id) on delete cascade,
  school_id uuid null references public.general_information(id) on delete cascade,
  salary numeric(10,2) not null,
  bank_name varchar(100) not null,
  account_number varchar(50) not null unique,
  tax_identification_number varchar(50) not null unique,
  nssf_number varchar(50) not null unique,
  payment_frequency public.pay_frequency not null
);

-- EducationBackground
create table if not exists public.education_background (
  id bigserial primary key,
  teacher_id varchar(100) not null references public.teachers(registration_id) on delete cascade,
  school_id uuid null references public.general_information(id) on delete cascade,
  education_award varchar(100) not null,
  institution varchar(100) not null,
  graduation_year int not null,
  result_obtained varchar(10) not null,
  additional_certifications text
);

-- EmploymentHistory
create table if not exists public.employment_history (
  id bigserial primary key,
  teacher_id varchar(100) not null references public.teachers(registration_id) on delete cascade,
  school_id uuid null references public.general_information(id) on delete cascade,
  organization varchar(100) not null,
  department varchar(100) not null,
  role varchar(100) not null,
  start_date date not null,
  end_date date,
  responsibilities text not null
);

-- NextOfKin
create table if not exists public.next_of_kin (
  id bigserial primary key,
  teacher_id varchar(100) not null unique references public.teachers(registration_id) on delete cascade,
  school_id uuid null references public.general_information(id) on delete cascade,
  name varchar(100) not null,
  relationship varchar(50) not null,
  contact_number varchar(15) not null,
  address text not null
);

-- CurrentEmployment
create table if not exists public.current_employment (
  id bigserial primary key,
  teacher_id varchar(100) not null unique references public.teachers(registration_id) on delete cascade,
  school_id uuid null references public.general_information(id) on delete cascade,
  position varchar(100) not null,
  department varchar(100) not null
);

-- =========================================================
-- STUDENTS
-- =========================================================
create table if not exists public.students (
  registration_id varchar(150) primary key, -- Django PK
  lin_id varchar(150) unique,
  first_name varchar(150) not null,
  last_name varchar(150) not null,
  date_of_birth date not null,
  current_status public.student_status not null,
  gender public.gender_type,
  school_type public.school_type default 'day',
  grade_of_entry varchar(150),
  year_of_entry varchar(4),
  guardian_name varchar(150),
  guardian_phone varchar(150),
  current_grade_id bigint references public.class(id) on delete set null,
  father_name varchar(150),
  father_phone varchar(150),
  father_nin varchar(200),
  mother_name varchar(150),
  mother_phone varchar(150),
  mother_nin varchar(200),
  profile_picture_url text,
  school_id uuid not null references public.general_information(id) on delete cascade,
  registered_by uuid null references auth.users(id) on delete set null,
  created date not null default current_date,
  updated date not null default current_date
);

-- StudentAddress
create table if not exists public.students_address (
  id bigserial primary key,
  student_id varchar(150) not null unique references public.students(registration_id) on delete cascade,
  address text not null,
  city varchar(100) not null,
  state varchar(100) not null,
  zip_code varchar(20) not null,
  created date not null default current_date,
  updated date not null default current_date
);

-- CareTaker
create table if not exists public.caretaker (
  id bigserial primary key,
  student_id varchar(150) not null references public.students(registration_id) on delete cascade,
  name varchar(100) not null,
  relationship varchar(50) not null,
  contact_number varchar(15) not null,
  email varchar(255),
  created date not null default current_date,
  updated date not null default current_date
);

create index if not exists caretaker_student_idx on public.caretaker(student_id);

-- StudentGrade (students_class)
create table if not exists public.students_class (
  id bigserial primary key,
  student_id varchar(150) not null references public.students(registration_id) on delete cascade,
  class_assigned_id bigint not null references public.class(id) on delete cascade,
  assigned_date date not null,
  created date not null default current_date,
  updated date not null default current_date
);

create index if not exists students_class_student_idx on public.students_class(student_id);

-- =========================================================
-- SUBJECTS / EXAMS / NOTES
-- =========================================================

-- subject
create table if not exists public.subject (
  id bigserial primary key,
  name varchar(100) not null,
  code varchar(50),
  description text not null,
  grade_id bigint references public.class(id) on delete set null,
  curriculum_id bigint not null references public.curriculum(id) on delete cascade,
  school_id uuid references public.general_information(id) on delete cascade,
  created date not null default current_date,
  updated date not null default current_date,
  teacher_id varchar(100) references public.teachers(registration_id) on delete set null
);

create index if not exists subject_school_idx on public.subject(school_id);

-- exam
create table if not exists public.exam (
  id bigserial primary key,
  subject_id bigint not null references public.subject(id) on delete cascade,
  date date not null,
  duration_minutes int not null,
  file_url text,
  description text,
  grade_id bigint references public.class(id) on delete set null,
  created_by_id varchar(100) references public.teachers(registration_id) on delete set null,
  school_id uuid references public.general_information(id) on delete cascade,
  created date not null default current_date,
  updated date not null default current_date
);

-- notes
create table if not exists public.notes (
  id bigserial primary key,
  subject_id bigint not null references public.subject(id) on delete cascade,
  notes_file_url text,
  notes_content text not null,
  description text,
  grade_id bigint references public.class(id) on delete set null,
  created_by_id varchar(100) references public.teachers(registration_id) on delete set null,
  school_id uuid references public.general_information(id) on delete cascade,
  created date not null default current_date,
  updated date not null default current_date
);

-- =========================================================
-- TERM / EXAM SESSIONS
-- =========================================================

-- term_exam_session
create table if not exists public.term_exam_session (
  id bigserial primary key,
  term_name public.term_name not null,
  year int not null,
  start_date date not null,
  end_date date not null,
  created_by_id varchar(100) not null references public.teachers(registration_id) on delete restrict,
  school_id uuid references public.general_information(id) on delete cascade,
  created timestamptz not null default now(),
  updated timestamptz not null default now(),
  unique (term_name, year)
);

-- exam_session
create table if not exists public.exam_session (
  id bigserial primary key,
  term_id bigint not null references public.term_exam_session(id) on delete cascade,
  exam_type public.exam_type not null,
  start_date date not null,
  end_date date not null,
  created_by_id varchar(100) references public.teachers(registration_id) on delete set null,
  school_id uuid references public.general_information(id) on delete cascade,
  created timestamptz not null default now(),
  updated timestamptz not null default now(),
  unique (term_id, exam_type)
);

-- =========================================================
-- MARK SUMMARIES
-- =========================================================
create table if not exists public.academic_studentmarksummary (
  id bigserial primary key,
  student_id varchar(150) not null references public.students(registration_id) on delete cascade,
  term_exam_id bigint not null references public.term_exam_session(id) on delete cascade,
  exam_type_id bigint not null references public.exam_session(id) on delete cascade,
  grade_id bigint not null references public.class(id) on delete cascade,
  subject_id bigint not null references public.subject(id) on delete cascade,
  total_score int not null,
  max_possible int not null,
  percentage numeric not null,
  subject_position int,
  class_average numeric,
  school_id uuid references public.general_information(id) on delete cascade,
  created timestamptz not null default now(),
  updated timestamptz not null default now(),
  unique (student_id, term_exam_id, subject_id, exam_type_id)
);

create table if not exists public.academic_subjecttotalmark (
  id bigserial primary key,
  student_id varchar(150) not null references public.students(registration_id) on delete cascade,
  term_exam_id bigint not null references public.term_exam_session(id) on delete cascade,
  exam_type_id bigint not null references public.exam_session(id) on delete cascade,
  subject_id bigint not null references public.subject(id) on delete cascade,
  grade_id bigint not null references public.class(id) on delete cascade,
  total_score int not null,
  max_possible int not null default 100,
  percentage numeric not null,
  school_id uuid references public.general_information(id) on delete cascade,
  created timestamptz not null default now(),
  updated timestamptz not null default now(),
  unique (student_id, term_exam_id, subject_id)
);

-- =========================================================
-- ASSESSMENT
-- =========================================================

-- assessment_topics
create table if not exists public.assessment_topics (
  id bigserial primary key,
  name varchar(100) not null,
  subject_id bigint not null references public.subject(id) on delete cascade,
  grade_id bigint not null references public.class(id) on delete cascade,
  school_id uuid references public.general_information(id) on delete cascade
);

-- assessment_question
create table if not exists public.assessment_question (
  id bigserial primary key,
  term_exam_id bigint not null references public.term_exam_session(id) on delete cascade,
  exam_type_id bigint not null references public.exam_session(id) on delete cascade,
  question_number varchar(100) not null default '41a',
  topic_id bigint not null references public.assessment_topics(id) on delete cascade,
  grade_id bigint not null references public.class(id) on delete cascade,
  subject_id bigint references public.subject(id) on delete set null,
  max_score int not null default 5,
  school_id uuid references public.general_information(id) on delete cascade,
  unique (term_exam_id, question_number, grade_id, subject_id)
);

-- assessment_examresult
create table if not exists public.assessment_examresult (
  id bigserial primary key,
  student_id varchar(150) not null references public.students(registration_id) on delete cascade,
  question_id bigint references public.assessment_question(id) on delete cascade,
  grade_id bigint not null references public.class(id) on delete cascade,
  subject_id bigint references public.subject(id) on delete set null,
  topic_id bigint references public.assessment_topics(id) on delete set null,
  exam_session_id bigint references public.exam_session(id) on delete set null,
  score int not null,
  total_score int,
  max_possible int not null default 100,
  percentage numeric,
  school_id uuid references public.general_information(id) on delete cascade
);

-- notes <-> topics M2M
create table if not exists public.academic_notes_topics (
  id bigserial primary key,
  notes_id bigint not null references public.notes(id) on delete cascade,
  topics_id bigint not null references public.assessment_topics(id) on delete cascade,
  unique (notes_id, topics_id)
);

-- =========================================================
-- FINANCE TABLES (fees)
-- =========================================================

-- assessment_schoolfees (SchoolFees)
create table if not exists public.assessment_schoolfees (
  id bigserial primary key,
  grade_id bigint not null unique references public.class(id) on delete cascade,
  school_id uuid references public.general_information(id) on delete cascade,
  tuitionfee numeric(10,2) not null default 0.00,
  hostelfee numeric(10,2) not null default 0.00,
  breakfastfee numeric(10,2) not null default 0.00,
  lunchfee numeric(10,2) not null default 0.00,
  description text not null default 'No Description ...',
  created_by uuid not null references auth.users(id) on delete restrict,
  created date not null default current_date,
  updated date not null default current_date
);

-- other_school_payments
create table if not exists public.other_school_payments (
  id bigserial primary key,
  grade_id bigint not null references public.class(id) on delete cascade,
  school_id uuid references public.general_information(id) on delete cascade,
  fees_type public.other_fee_type not null,
  amount int not null,
  description text not null default 'No Description ...',
  created_by uuid not null references auth.users(id) on delete restrict,
  unique_code varchar(150) unique,
  created date not null default current_date,
  updated date not null default current_date,
  unique (grade_id, fees_type)
);

-- transport_fee
create table if not exists public.transport_fee (
  id bigserial primary key,
  location varchar(150) not null,
  amount int not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  school_id uuid references public.general_information(id) on delete cascade,
  created date not null default current_date,
  updated date not null default current_date
);

-- student_tuition_description
create table if not exists public.student_tuition_description (
  id bigserial primary key,
  student_id varchar(150) not null references public.students(registration_id) on delete cascade,
  tuition_id bigint not null references public.assessment_schoolfees(id) on delete cascade,
  school_id uuid references public.general_information(id) on delete cascade,
  hostel boolean not null default false,
  lunch boolean not null default false,
  breakfast boolean not null default false,
  total_fee numeric(10,2) not null default 0.00
);

create index if not exists std_student_idx on public.student_tuition_description(student_id);

-- fee_transaction
create table if not exists public.fee_transaction (
  id bigserial primary key,
  grade_id bigint references public.class(id) on delete set null,
  student_tuition_id bigint not null references public.student_tuition_description(id) on delete cascade,
  school_id uuid references public.general_information(id) on delete cascade,
  term public.fee_term,
  academic_year varchar(9),
  amount_due numeric(10,2) not null default 0.00,
  amount_paid numeric(10,2) not null default 0.00,
  payment_method public.fee_payment_method not null,
  due_date date,
  status public.fee_status not null default 'pending',
  last_payment_date date,
  payment_reference varchar(50) unique,
  receipt_url text,
  remarks text,
  created date not null default current_date,
  updated date not null default current_date
);

create index if not exists fee_tx_student_idx on public.fee_transaction(student_tuition_id);

-- -----------------------------
-- TRIGGER: calculate total_fee on student_tuition_description
-- -----------------------------
create or replace function public.calculate_student_total_fee()
returns trigger language plpgsql as $$
declare
  t record;
  base numeric(10,2);
begin
  select tuitionfee, hostelfee, lunchfee, breakfastfee into t
  from public.assessment_schoolfees
  where id = new.tuition_id;

  base := coalesce(t.tuitionfee,0);

  if coalesce(new.hostel,false) then base := base + coalesce(t.hostelfee,0); end if;
  if coalesce(new.lunch,false) then base := base + coalesce(t.lunchfee,0); end if;
  if coalesce(new.breakfast,false) then base := base + coalesce(t.breakfastfee,0); end if;

  new.total_fee := base;
  return new;
end $$;

drop trigger if exists trg_calc_total_fee on public.student_tuition_description;
create trigger trg_calc_total_fee
before insert or update on public.student_tuition_description
for each row execute procedure public.calculate_student_total_fee();

-- -----------------------------
-- TRIGGER: calculate fee_transaction amount_due + status
-- -----------------------------
create or replace function public.calculate_fee_transaction_balance()
returns trigger language plpgsql as $$
declare
  total_paid_before numeric(10,2);
  total_fee numeric(10,2);
  remaining numeric(10,2);
  today date := current_date;
begin
  -- auto grade_id if missing
  if new.grade_id is null then
    select sf.grade_id into new.grade_id
    from public.student_tuition_description std
    join public.assessment_schoolfees sf on sf.id = std.tuition_id
    where std.id = new.student_tuition_id;
  end if;

  -- total fee
  select std.total_fee into total_fee
  from public.student_tuition_description std
  where std.id = new.student_tuition_id;

  -- total paid excluding this row
  select coalesce(sum(amount_paid),0) into total_paid_before
  from public.fee_transaction
  where student_tuition_id = new.student_tuition_id
    and id <> coalesce(new.id, -1);

  remaining := greatest(0, total_fee - (total_paid_before + coalesce(new.amount_paid,0)));
  new.amount_due := remaining;

  if new.due_date is null then
    new.due_date := today + interval '30 days';
  end if;

  if new.amount_due <= 0 then
    new.status := 'paid';
    new.last_payment_date := today;
  else
    if coalesce(new.amount_paid,0) > 0 or total_paid_before > 0 then
      new.status := 'partial';
    elsif new.due_date < today then
      new.status := 'overdue';
    else
      new.status := 'pending';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_calc_fee_balance on public.fee_transaction;
create trigger trg_calc_fee_balance
before insert or update on public.fee_transaction
for each row execute procedure public.calculate_fee_transaction_balance();

-- =========================================================
-- (OPTIONAL) BASIC RLS (School-scoped)
-- Enable if you’re ready. If not, leave commented and enable later.
-- =========================================================
-- alter table public.general_information enable row level security;
-- alter table public.profiles enable row level security;
-- alter table public.students enable row level security;
-- alter table public.teachers enable row level security;
-- alter table public.class enable row level security;
-- alter table public.subject enable row level security;
-- alter table public.assessment_schoolfees enable row level security;
-- alter table public.student_tuition_description enable row level security;
-- alter table public.fee_transaction enable row level security;

-- Example: students read within school
-- drop policy if exists "students school read" on public.students;
-- create policy "students school read"
-- on public.students for select
-- using (school_id = public.current_school_id());

-- =========================================================
-- END
-- =========================================================

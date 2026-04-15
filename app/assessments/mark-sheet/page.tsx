'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import {
  ArrowLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Loader2,
  Printer,
  Search,
  Users,
  Trophy,
  TrendingUp,
  TrendingDown,
  Award,
  BarChart3,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';

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
  location?: string | null;
  school_badge?: string | null;
}

interface ClassRow {
  id: number;
  grade_name: string;
}

interface SubjectRow {
  id: number;
  name: string;
  grade_id: number | null;
}

interface TermExamSessionRow {
  id: number;
  term_name: 'TERM_1' | 'TERM_2' | 'TERM_3';
  year: number;
  start_date?: string;
  end_date?: string;
}

interface ExamSessionRow {
  id: number;
  term_id: number;
  exam_type: 'BOT' | 'MOT' | 'EOT';
  term?: { term_name: string; year: number }[] | null;
}

interface ParsedExamSession {
  id: number;
  term_id: number;
  exam_type: 'BOT' | 'MOT' | 'EOT';
  term_name: string;
  term_year: number;
}

interface StudentRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  lin_id: string | null;
  gender?: string | null;
}

interface MarksheetStudent {
  id: string;
  registration_id: string;
  lin_id: string | null;
  first_name: string;
  last_name: string;
  marks: Record<string, number>; // subject_id -> mark
  total_marks: number;
  average: number;
  position: number;
  grade: string;
  remark: string;
}

interface SubjectMarks {
  subject_id: number;
  subject_name: string;
  total_possible: number;
  class_average: number;
  highest_score: number;
  lowest_score: number;
}

export default function MarksheetPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [termSessions, setTermSessions] = useState<TermExamSessionRow[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionRow[]>([]);
  const [parsedExamSessions, setParsedExamSessions] = useState<ParsedExamSession[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedExamSessionId, setSelectedExamSessionId] = useState('');
  
  const [marksheetData, setMarksheetData] = useState<MarksheetStudent[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectMarks[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'position' | 'average' | 'name'>('position');
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      setAuthChecking(false);
    })();
  }, [router]);

  useEffect(() => {
    if (authChecking) return;

    const loadBase = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) throw new Error(userErr?.message || 'User not found');

        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id')
          .eq('user_id', user.id)
          .single();

        if (pErr || !p) throw new Error(pErr?.message || 'Profile not found');
        setProfile(p as ProfileRow);

        if (!p.school_id) {
          setLoading(false);
          return;
        }

        const { data: sch, error: sErr } = await supabase
          .from('general_information')
          .select('id, school_name, location, school_badge')
          .eq('id', p.school_id)
          .single();

        if (sErr || !sch) throw new Error(sErr?.message || 'School not found');
        setSchool(sch as SchoolRow);

        const [classRes, subjRes, termRes, sessionRes] = await Promise.all([
          supabase.from('class').select('id, grade_name').eq('school_id', sch.id).order('grade_name'),
          supabase.from('subject').select('id, name, grade_id').eq('school_id', sch.id).order('name'),
          supabase.from('term_exam_session').select('id, term_name, year, start_date, end_date').eq('school_id', sch.id).order('year', { ascending: false }),
          supabase.from('exam_session').select('id, term_id, exam_type, term:term_exam_session(term_name, year)').eq('school_id', sch.id),
        ]);

        if (classRes.error) throw classRes.error;
        if (subjRes.error) throw subjRes.error;
        if (termRes.error) throw termRes.error;
        if (sessionRes.error) throw sessionRes.error;

        setClasses((classRes.data ?? []) as ClassRow[]);
        setSubjects((subjRes.data ?? []) as SubjectRow[]);
        setTermSessions((termRes.data ?? []) as TermExamSessionRow[]);

        const sessionData = (sessionRes.data ?? []) as ExamSessionRow[];
        setExamSessions(sessionData);
        
        const parsedSessions: ParsedExamSession[] = sessionData.map(session => ({
          id: session.id,
          term_id: session.term_id,
          exam_type: session.exam_type,
          term_name: session.term?.[0]?.term_name || '',
          term_year: session.term?.[0]?.year || 0
        }));
        setParsedExamSessions(parsedSessions);
        
      } catch (e: any) {
        setErrorMsg(e.message);
      } finally {
        setLoading(false);
      }
    };

    loadBase();
  }, [authChecking]);

  const selectedTerm = useMemo(() => {
    return termSessions.find(t => t.id === Number(selectedTermId));
  }, [termSessions, selectedTermId]);

  const selectedClass = useMemo(() => {
    return classes.find(c => c.id === Number(selectedClassId));
  }, [classes, selectedClassId]);

  const selectedExamSession = useMemo(() => {
    return parsedExamSessions.find(es => es.id === Number(selectedExamSessionId));
  }, [parsedExamSessions, selectedExamSessionId]);

  const subjectsForClass = useMemo(() => {
    if (!selectedClassId) return [];
    return subjects.filter(s => s.grade_id === Number(selectedClassId));
  }, [subjects, selectedClassId]);

  const canGenerate = useMemo(() => {
    return selectedClassId && selectedTermId && selectedExamSessionId;
  }, [selectedClassId, selectedTermId, selectedExamSessionId]);

  const generateMarksheet = async () => {
    if (!canGenerate || !school?.id) {
      setErrorMsg('Please select Class, Term, and Exam Session');
      return;
    }

    setGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const gradeId = Number(selectedClassId);
      const examSessionIdNum = Number(selectedExamSessionId);
      const termId = Number(selectedTermId);

      // Fetch students in the class
      const { data: studentsData, error: studentsErr } = await supabase
        .from('students')
        .select('registration_id, first_name, last_name, lin_id, gender')
        .eq('school_id', school.id)
        .eq('current_grade_id', gradeId)
        .order('first_name');

      if (studentsErr) throw studentsErr;
      if (!studentsData || studentsData.length === 0) {
        setErrorMsg('No students found in this class');
        setGenerating(false);
        return;
      }

      const students = studentsData as StudentRow[];

      // Fetch all subjects for this class
      const classSubjects = subjects.filter(s => s.grade_id === gradeId);
      
      // Fetch placeholder questions for each subject
      const subjectQuestions: Record<number, number> = {};
      for (const subject of classSubjects) {
        const { data: questionData } = await supabase
          .from('assessment_question')
          .select('id')
          .eq('school_id', school.id)
          .eq('term_exam_id', termId)
          .eq('grade_id', gradeId)
          .eq('subject_id', subject.id)
          .in('question_number', ['PERCENTAGE', 'PERCENT', 'PCT'])
          .limit(1);
        
        if (questionData && questionData[0]) {
          subjectQuestions[subject.id] = questionData[0].id;
        }
      }

      // Fetch all exam results for these students and subjects
      const studentIds = students.map(s => s.registration_id);
      const questionIds = Object.values(subjectQuestions);
      
      let results: any[] = [];
      if (questionIds.length > 0 && studentIds.length > 0) {
        const { data: resultsData, error: resultsErr } = await supabase
          .from('assessment_examresult')
          .select('student_id, subject_id, percentage, score')
          .eq('school_id', school.id)
          .eq('exam_session_id', examSessionIdNum)
          .eq('grade_id', gradeId)
          .in('student_id', studentIds)
          .in('question_id', questionIds);

        if (resultsErr) throw resultsErr;
        results = resultsData || [];
      }

      // Build marksheet data
      const marksheet: MarksheetStudent[] = students.map(student => {
        const marks: Record<string, number> = {};
        let totalMarks = 0;
        let subjectCount = 0;

        for (const subject of classSubjects) {
          const result = results.find(
            r => r.student_id === student.registration_id && r.subject_id === subject.id
          );
          const mark = result ? (result.percentage ?? result.score ?? 0) : 0;
          marks[subject.id.toString()] = mark;
          if (mark > 0) {
            totalMarks += mark;
            subjectCount++;
          }
        }

        const average = subjectCount > 0 ? totalMarks / subjectCount : 0;
        
        // Determine grade based on average
        let grade = 'F9';
        if (average >= 80) grade = 'D1';
        else if (average >= 75) grade = 'D2';
        else if (average >= 70) grade = 'C3';
        else if (average >= 65) grade = 'C4';
        else if (average >= 60) grade = 'C5';
        else if (average >= 55) grade = 'C6';
        else if (average >= 50) grade = 'P7';
        else if (average >= 45) grade = 'P8';
        else if (average >= 40) grade = 'F9';
        
        let remark = 'Fair';
        if (average >= 80) remark = 'Excellent';
        else if (average >= 70) remark = 'Very Good';
        else if (average >= 60) remark = 'Good';
        else if (average >= 50) remark = 'Satisfactory';
        else if (average >= 40) remark = 'Needs Improvement';
        else remark = 'Poor';

        return {
          id: student.registration_id,
          registration_id: student.registration_id,
          lin_id: student.lin_id,
          first_name: student.first_name,
          last_name: student.last_name,
          marks,
          total_marks: totalMarks,
          average,
          position: 0,
          grade,
          remark,
        };
      });

      // Sort by average to determine positions
      marksheet.sort((a, b) => b.average - a.average);
      marksheet.forEach((student, index) => {
        student.position = index + 1;
      });

      // Calculate subject statistics
      const stats: SubjectMarks[] = classSubjects.map(subject => {
        const subjectMarks = marksheet
          .map(s => s.marks[subject.id.toString()] || 0)
          .filter(m => m > 0);
        
        const classAverage = subjectMarks.length > 0 
          ? subjectMarks.reduce((a, b) => a + b, 0) / subjectMarks.length 
          : 0;
        const highestScore = subjectMarks.length > 0 ? Math.max(...subjectMarks) : 0;
        const lowestScore = subjectMarks.length > 0 ? Math.min(...subjectMarks) : 0;
        
        return {
          subject_id: subject.id,
          subject_name: subject.name,
          total_possible: 100,
          class_average: classAverage,
          highest_score: highestScore,
          lowest_score: lowestScore,
        };
      });

      setMarksheetData(marksheet);
      setSubjectStats(stats);
      setSuccessMsg(`Marksheet generated for ${marksheet.length} students`);

    } catch (e: any) {
      console.error('Error generating marksheet:', e);
      setErrorMsg(e.message || 'Failed to generate marksheet');
    } finally {
      setGenerating(false);
    }
  };

  const filteredMarksheet = useMemo(() => {
    if (!searchQuery) return marksheetData;
    const query = searchQuery.toLowerCase();
    return marksheetData.filter(student => 
      student.first_name.toLowerCase().includes(query) ||
      student.last_name.toLowerCase().includes(query) ||
      student.registration_id.toLowerCase().includes(query) ||
      (student.lin_id && student.lin_id.toLowerCase().includes(query))
    );
  }, [marksheetData, searchQuery]);

  const sortedMarksheet = useMemo(() => {
    if (sortBy === 'position') {
      return [...filteredMarksheet].sort((a, b) => a.position - b.position);
    } else if (sortBy === 'average') {
      return [...filteredMarksheet].sort((a, b) => b.average - a.average);
    } else {
      return [...filteredMarksheet].sort((a, b) => 
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      );
    }
  }, [filteredMarksheet, sortBy]);

  const downloadCSV = () => {
    if (!marksheetData.length || !subjectsForClass.length) return;

    const headers = ['Position', 'Registration ID', 'LIN ID', 'Student Name', ...subjectsForClass.map(s => s.name), 'Total Marks', 'Average (%)', 'Grade', 'Remark'];
    
    const rows = marksheetData.map(student => [
      student.position,
      student.registration_id,
      student.lin_id || '-',
      `${student.first_name} ${student.last_name}`,
      ...subjectsForClass.map(subject => student.marks[subject.id.toString()] || '-'),
      student.total_marks.toFixed(1),
      student.average.toFixed(1),
      student.grade,
      student.remark,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marksheet_${selectedClass?.grade_name}_${selectedExamSession?.exam_type}_${selectedTerm?.term_name}_${selectedTerm?.year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printMarksheet = () => {
    window.print();
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('D')) return 'bg-emerald-100 text-emerald-800';
    if (grade.startsWith('C')) return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('P')) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const getPerformanceIcon = (average: number) => {
    if (average >= 70) return <Trophy className="w-4 h-4 text-emerald-600" />;
    if (average >= 50) return <TrendingUp className="w-4 h-4 text-blue-600" />;
    if (average >= 40) return <TrendingDown className="w-4 h-4 text-amber-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile?.school_id || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1 p-6">
            <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">School Configuration Required</h3>
              <p className="text-gray-600 mb-6">Link your account to a school first.</p>
              <button onClick={() => router.push('/settings')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                Go to Settings
              </button>
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
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-full mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Link href="/assessments" className="hover:text-gray-700 inline-flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" />
                    Assessments
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-gray-700 font-medium">Marksheet</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Class Marksheet</h1>
                <p className="text-gray-600">View and download student performance for the entire class</p>
              </div>

              {marksheetData.length > 0 && (
                <div className="flex gap-2 no-print">
                  <button onClick={downloadCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <Download className="w-4 h-4" /> CSV
                  </button>
                  <button onClick={printMarksheet} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}
            
            {successMsg && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <p className="text-sm text-green-700">{successMsg}</p>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Select Parameters</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.grade_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Term *</label>
                  <select
                    value={selectedTermId}
                    onChange={(e) => setSelectedTermId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select term</option>
                    {termSessions.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.term_name.replace('_', ' ')} {t.year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Session *</label>
                  <select
                    value={selectedExamSessionId}
                    onChange={(e) => setSelectedExamSessionId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select exam session</option>
                    {parsedExamSessions
                      .filter(es => !selectedTermId || es.term_id === Number(selectedTermId))
                      .map(es => (
                        <option key={es.id} value={es.id}>
                          {es.exam_type} {es.term_name ? `- ${es.term_name.replace('_', ' ')} ${es.term_year}` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <button
                onClick={generateMarksheet}
                disabled={!canGenerate || generating}
                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate Marksheet'}
              </button>
            </div>

            {/* Statistics Section */}
            {marksheetData.length > 0 && showStats && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Class Statistics</h3>
                  </div>
                  <button onClick={() => setShowStats(false)} className="text-xs text-gray-400 hover:text-gray-600">
                    Hide
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{marksheetData.length}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Class Average</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(marksheetData.reduce((sum, s) => sum + s.average, 0) / marksheetData.length).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Highest Average</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.max(...marksheetData.map(s => s.average)).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Pass Rate (≥50%)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {((marksheetData.filter(s => s.average >= 50).length / marksheetData.length) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {subjectStats.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Subject Performance</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-2 px-3">Subject</th>
                            <th className="text-center py-2 px-3">Class Average</th>
                            <th className="text-center py-2 px-3">Highest Score</th>
                            <th className="text-center py-2 px-3">Lowest Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectStats.map(stat => (
                            <tr key={stat.subject_id} className="border-t border-gray-100">
                              <td className="py-2 px-3 font-medium">{stat.subject_name}</td>
                              <td className="text-center py-2 px-3">{stat.class_average.toFixed(1)}%</td>
                              <td className="text-center py-2 px-3 text-emerald-600">{stat.highest_score}%</td>
                              <td className="text-center py-2 px-3 text-red-600">{stat.lowest_score}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Marksheet Table */}
            {marksheetData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {filteredMarksheet.length} student(s) shown
                    </span>
                    <div className="h-4 w-px bg-gray-300" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                    >
                      <option value="position">Sort by Position</option>
                      <option value="average">Sort by Average</option>
                      <option value="name">Sort by Name</option>
                    </select>
                  </div>
                  
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="sticky left-0 bg-gray-50 text-center py-3 px-2 font-semibold text-gray-700 w-16">Pos</th>
                        <th className="sticky left-16 bg-gray-50 text-left py-3 px-3 font-semibold text-gray-700 min-w-[180px]">Student</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700 w-24">Reg No</th>
                        {subjectsForClass.map(subject => (
                          <th key={subject.id} className="text-center py-3 px-2 font-semibold text-gray-700 min-w-[70px]">
                            {subject.name.substring(0, 8)}
                          </th>
                        ))}
                        <th className="text-center py-3 px-2 font-semibold text-gray-700 w-24">Total</th>
                        <th className="text-center py-3 px-2 font-semibold text-gray-700 w-24">Avg %</th>
                        <th className="text-center py-3 px-2 font-semibold text-gray-700 w-20">Grade</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700 min-w-[120px]">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortedMarksheet.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="sticky left-0 bg-white text-center py-3 px-2 font-medium">
                            {student.position === 1 && <Trophy className="w-4 h-4 text-yellow-500 inline mr-1" />}
                            {student.position}
                          </td>
                          <td className="sticky left-16 bg-white py-3 px-3">
                            <div className="font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </div>
                            {student.lin_id && <div className="text-xs text-gray-500">LIN: {student.lin_id}</div>}
                          </td>
                          <td className="py-3 px-2 text-gray-600">{student.registration_id}</td>
                          {subjectsForClass.map(subject => {
                            const mark = student.marks[subject.id.toString()] || '-';
                            const markNum = typeof mark === 'number' ? mark : 0;
                            const isHigh = markNum >= 70;
                            const isLow = markNum > 0 && markNum < 40;
                            return (
                              <td key={subject.id} className={`text-center py-3 px-2 font-medium ${isHigh ? 'text-emerald-600' : isLow ? 'text-red-600' : 'text-gray-700'}`}>
                                {mark === '-' ? '-' : `${mark}%`}
                              </td>
                            );
                          })}
                          <td className="text-center py-3 px-2 font-semibold">{student.total_marks.toFixed(1)}</td>
                          <td className="text-center py-3 px-2">
                            <div className="flex items-center justify-center gap-1">
                              {getPerformanceIcon(student.average)}
                              <span className="font-semibold">{student.average.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getGradeColor(student.grade)}`}>
                              {student.grade}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-600">{student.remark}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      📊 Total Students: {marksheetData.length} | 
                      Passed: {marksheetData.filter(s => s.average >= 50).length} | 
                      Failed: {marksheetData.filter(s => s.average < 50).length}
                    </div>
                    <div className="text-xs">
                      Generated on {new Date().toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!generating && marksheetData.length === 0 && canGenerate && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">
                  Click "Generate Marksheet" to view student performance data.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          .bg-gray-50, .bg-gray-100 {
            background: white !important;
          }
          table {
            font-size: 10pt;
          }
          th, td {
            padding: 4px;
          }
        }
      `}</style>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";
import QuizForm from "@/components/QuizForm";
import supabase from "@/lib/supabaseClient";
import { getQuizDropdownData } from "@/lib/quizzes";

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    async function loadPage() {
      try {
        const dropdownData = await getQuizDropdownData();

        const { data: quiz, error } = await supabase
          .from("quiz")
          .select(`
            *,
            quiz_question(*)
          `)
          .eq("id", quizId)
          .single();

        if (error) throw error;

        setClasses(dropdownData.classes);
        setSubjects(dropdownData.subjects);
        setNotes(dropdownData.notes);
        setTopics(dropdownData.topics);

        setInitialData({
          title: quiz.title,
          description: quiz.description ?? "",
          classId: quiz.grade_id,
          subjectId: quiz.subject_id,
          noteId: quiz.notes_id,
          topicId: quiz.topic_id,
          quizType: quiz.quiz_type ?? "practice",
          status: quiz.is_active ? "active" : "draft",
          timeLimitMinutes: quiz.time_limit_minutes ?? 0,
          questions: (quiz.quiz_question ?? [])
            .sort((a: any, b: any) => a.question_order - b.question_order)
            .map((q: any) => ({
              localId: String(q.id),
              questionText: q.question_text,
              questionType: q.question_type,
              optionA: q.option_a ?? "",
              optionB: q.option_b ?? "",
              optionC: q.option_c ?? "",
              optionD: q.option_d ?? "",
              correctAnswer: q.correct_answer ?? "",
              explanation: q.explanation ?? "",
              marks: q.marks ?? 1,
            })),
        });
      } catch (error) {
        console.error("Failed to load quiz:", error);
      } finally {
        setLoading(false);
      }
    }

    if (quizId) loadPage();
  }, [quizId]);

  async function handleUpdate(payload: any) {
    try {
      const totalMarks = payload.questions.reduce(
        (sum: number, q: any) => sum + Number(q.marks || 1),
        0
      );

      const { error: updateError } = await supabase
        .from("quiz")
        .update({
          title: payload.title,
          description: payload.description,
          notes_id: payload.noteId ? Number(payload.noteId) : null,
          subject_id: Number(payload.subjectId),
          grade_id: Number(payload.classId),
          topic_id: payload.topicId ? Number(payload.topicId) : null,
          quiz_type: payload.quizType,
          time_limit_minutes: Number(payload.timeLimitMinutes || 0),
          total_marks: totalMarks,
          is_active: payload.status === "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", quizId);

      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from("quiz_question")
        .delete()
        .eq("quiz_id", quizId);

      if (deleteError) throw deleteError;

      const questionRows = payload.questions.map((q: any, index: number) => ({
        quiz_id: quizId,
        topic_id: payload.topicId ? Number(payload.topicId) : null,
        question_text: q.questionText,
        question_type: q.questionType,
        option_a: q.optionA || null,
        option_b: q.optionB || null,
        option_c: q.optionC || null,
        option_d: q.optionD || null,
        correct_answer: q.correctAnswer || null,
        explanation: q.explanation || null,
        marks: Number(q.marks || 1),
        question_order: index + 1,
        is_required: true,
      }));

      if (questionRows.length > 0) {
        const { error: insertError } = await supabase
          .from("quiz_question")
          .insert(questionRows);

        if (insertError) throw insertError;
      }

      router.push(`/quizzes/${quizId}`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to update quiz");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl p-4 md:p-6">
            {loading || !initialData ? (
              <div className="rounded-2xl border bg-white p-6">Loading quiz...</div>
            ) : (
              <QuizForm
                mode="edit"
                initialData={initialData}
                classes={classes.map((c) => ({ id: c.id, label: c.grade_name }))}
                subjects={subjects.map((s) => ({ id: s.id, label: s.name }))}
                notes={notes.map((n) => ({
                  id: n.id,
                  label: n.description || `Note ${n.id}`,
                }))}
                topics={topics.map((t) => ({ id: t.id, label: t.name }))}
                onSubmit={handleUpdate}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
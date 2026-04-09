import supabase from "@/lib/supabaseClient";

export async function getQuizDropdownData() {
  const [classesRes, subjectsRes, notesRes, topicsRes] = await Promise.all([
    supabase.from("class").select("id, grade_name").order("grade_name"),
    supabase.from("subject").select("id, name").order("name"),
    supabase.from("notes").select("id, description").order("id", { ascending: false }),
    supabase.from("assessment_topics").select("id, name").order("name"),
  ]);

  if (classesRes.error) throw classesRes.error;
  if (subjectsRes.error) throw subjectsRes.error;
  if (notesRes.error) throw notesRes.error;
  if (topicsRes.error) throw topicsRes.error;

  return {
    classes: classesRes.data ?? [],
    subjects: subjectsRes.data ?? [],
    notes: notesRes.data ?? [],
    topics: topicsRes.data ?? [],
  };
}
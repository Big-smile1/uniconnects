import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BookOpen, Plus, Check } from "lucide-react";

export const Route = createFileRoute("/app/student/courses")({
  component: () => <RequireRole role="student"><Courses /></RequireRole>,
});

function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [session, setSession] = useState("2024/2025");
  const [q, setQ] = useState("");

  const reload = async () => {
    if (!user) return;
    const [{ data: cs }, { data: en }] = await Promise.all([
      supabase.from("courses").select("*,departments(name,code)").order("code"),
      supabase.from("enrollments").select("course_id").eq("student_id", user.id).eq("session", session),
    ]);
    setCourses(cs ?? []);
    setEnrolled(new Set((en ?? []).map((e) => e.course_id)));
  };
  useEffect(() => { void reload(); }, [user, session]);

  const enrol = async (course_id: string) => {
    if (!user) return;
    const { error } = await supabase.from("enrollments").insert({ student_id: user.id, course_id, session });
    if (error) { toast.error(error.message); return; }
    toast.success("Enrolled");
    void reload();
  };

  const filtered = courses.filter((c) =>
    !q || c.code.toLowerCase().includes(q.toLowerCase()) || c.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <PageHeader title="Courses" subtitle={`Browse and enrol in courses for ${session}.`} />
      <PageBody>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input placeholder="Search by code or title…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
          <Input value={session} onChange={(e) => setSession(e.target.value)} placeholder="Session e.g. 2024/2025" className="max-w-[200px]" />
        </div>
        {filtered.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <div className="font-serif text-lg">No courses available</div>
            <p className="text-sm text-muted-foreground">Ask your admin to add courses for your department.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((c) => {
              const isEnrolled = enrolled.has(c.id);
              return (
                <Card key={c.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="font-medium">{c.code} <span className="text-muted-foreground">· {c.title}</span></div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.departments?.name ?? "—"} · Level {c.level} · {c.semester === "first" ? "First" : "Second"} sem · {c.credit_units} units
                    </div>
                  </div>
                  {isEnrolled ? (
                    <Button size="sm" variant="outline" disabled><Check className="h-4 w-4" /> Enrolled</Button>
                  ) : (
                    <Button size="sm" onClick={() => enrol(c.id)}><Plus className="h-4 w-4" /> Enrol</Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
}

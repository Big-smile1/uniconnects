import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/lecturer/")({
  head: () => ({ meta: [{ title: "Lecturer dashboard — Mountain Top University" }] }),
  component: () => (
    <RequireRole role="lecturer">
      <LecturerDashboard />
    </RequireRole>
  ),
});

function LecturerDashboard() {
  const { user } = useAuth();
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: cs } = await supabase
        .from("courses")
        .select("id, code, title, level, semester")
        .eq("lecturer_id", user.id)
        .order("code");
      const courses = cs ?? [];
      setMyCourses(courses);

      if (courses.length) {
        const { count } = await supabase
          .from("enrollments")
          .select("student_id", { count: "exact", head: true })
          .in("course_id", courses.map((c) => c.id));
        setStudentsCount(count ?? 0);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <>
      <PageHeader
        title="Welcome back"
        subtitle="Manage the courses you teach and upload student results."
        actions={
          <Button asChild>
            <Link to="/lecturer/courses">
              Manage my courses <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Courses I teach</div>
                <div className="text-2xl font-semibold">{loading ? "…" : myCourses.length}</div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Enrolled students</div>
                <div className="text-2xl font-semibold">{loading ? "…" : studentsCount}</div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mt-6 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold">My courses</h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/lecturer/courses">Pick / release courses</Link>
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : myCourses.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              You haven't picked any courses yet.{" "}
              <Link to="/lecturer/courses" className="font-medium text-primary underline-offset-2 hover:underline">
                Pick the classes you teach →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {myCourses.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{c.code} — {c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.level} level · {c.semester}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </PageBody>
    </>
  );
}

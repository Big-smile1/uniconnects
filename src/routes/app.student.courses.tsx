import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Lock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/student/courses")({
  component: () => <RequireRole role="student"><Courses /></RequireRole>,
});

type Enrollment = {
  id: string;
  session: string;
  created_at: string;
  course_id: string;
  courses: {
    id: string;
    code: string;
    title: string;
    credit_units: number;
    level: number;
    semester: string;
    departments: { name: string; code: string } | null;
  } | null;
};

function Courses() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionFilter, setSessionFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("enrollments")
        .select("id, session, created_at, course_id, courses(id, code, title, credit_units, level, semester, departments(name, code))")
        .eq("student_id", user.id)
        .order("session", { ascending: false })
        .order("created_at", { ascending: true });
      setEnrollments((data ?? []) as unknown as Enrollment[]);
      setLoading(false);
    })();
  }, [user]);

  const sessions = useMemo(() => {
    const set = new Set<string>();
    enrollments.forEach((e) => set.add(e.session));
    return Array.from(set).sort().reverse();
  }, [enrollments]);

  const grouped = useMemo(() => {
    const map = new Map<string, Enrollment[]>();
    enrollments
      .filter((e) => sessionFilter === "all" || e.session === sessionFilter)
      .forEach((e) => {
        const arr = map.get(e.session) ?? [];
        arr.push(e);
        map.set(e.session, arr);
      });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [enrollments, sessionFilter]);

  const totalUnits = (list: Enrollment[]) =>
    list.reduce((sum, e) => sum + (e.courses?.credit_units ?? 0), 0);

  return (
    <>
      <PageHeader
        title="My Courses"
        subtitle="Courses you've registered through the school portal. Read-only here."
      />
      <PageBody>
        <Card className="mb-4 flex items-start gap-3 border-amber-500/30 bg-amber-500/5 p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm">
            <div className="font-medium">Course registration happens on the school portal</div>
            <p className="text-muted-foreground">
              You can't add or drop courses from here. This page mirrors what your faculty has registered for you each session, so you can review credit units and follow your record.
            </p>
          </div>
        </Card>

        {sessions.length > 1 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Session:</span>
            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sessions</SelectItem>
                {sessions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <Card className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your courses…
          </Card>
        ) : grouped.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <div className="font-serif text-lg">No courses registered yet</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Once your faculty registers your courses for the session, they'll appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([sessionLabel, list]) => (
              <section key={sessionLabel}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="font-serif text-lg">{sessionLabel}</h2>
                  <span className="text-xs text-muted-foreground">
                    {list.length} course{list.length === 1 ? "" : "s"} · {totalUnits(list)} units
                  </span>
                </div>
                <div className="grid gap-3">
                  {list.map((e) => {
                    const c = e.courses;
                    if (!c) return null;
                    return (
                      <Card key={e.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{c.code}</span>
                            <span className="truncate text-muted-foreground">· {c.title}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {c.departments?.name ?? "—"} · Level {c.level} · {String(c.semester).toLowerCase() === "first" ? "First" : "Second"} sem
                          </div>
                        </div>
                        <Badge variant="secondary">{c.credit_units} units</Badge>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}

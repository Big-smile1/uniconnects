import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { computeGPA, gradeColor, classOfDegree } from "@/lib/grades";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/student/results")({
  component: () => <RequireRole role="student"><MyResults /></RequireRole>,
});

function MyResults() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("results")
        .select("id,session,semester,total,grade,grade_point,status,courses(code,title,credit_units)")
        .eq("student_id", user.id)
        .order("session", { ascending: false });
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const approved = rows.filter((r) => r.status === "admin_approved");
  const pending = rows.filter((r) => r.status !== "admin_approved");
  const cgpaRows = approved.map((r) => ({ grade_point: r.grade_point, total: r.total, credit_units: r.courses?.credit_units ?? 3 }));
  const cgpa = computeGPA(cgpaRows);

  // Group by session+semester
  const groups: Record<string, any[]> = {};
  approved.forEach((r) => {
    const k = `${r.session} · ${r.semester === "first" ? "First" : "Second"} Semester`;
    (groups[k] ??= []).push(r);
  });

  return (
    <>
      <PageHeader title="My Results" subtitle="Approved semester results with GPA and CGPA." />
      <PageBody>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : approved.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="font-serif text-lg">No approved results yet</div>
            <p className="mt-2 text-sm text-muted-foreground">Results will appear here once your lecturers and admins approve them.</p>
            {pending.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{pending.length} result(s) currently pending approval.</p>}
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Cumulative GPA</div>
                <div className="font-serif text-3xl font-semibold text-primary">{cgpa.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Class of degree</div>
                <div className="font-serif text-lg font-semibold">{classOfDegree(cgpa)}</div>
              </div>
            </Card>

            {Object.entries(groups).map(([title, items]) => {
              const semesterGPA = computeGPA(items.map((r) => ({ grade_point: r.grade_point, total: r.total, credit_units: r.courses?.credit_units ?? 3 })));
              return (
                <Card key={title} className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
                    <h3 className="font-serif text-lg font-semibold">{title}</h3>
                    <div className="text-sm"><span className="text-muted-foreground">GPA</span> <strong className="ml-2 font-serif text-lg text-primary">{semesterGPA.toFixed(2)}</strong></div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="px-5 py-3 text-left">Code</th><th className="px-2 py-3 text-left">Title</th><th className="px-2 py-3 text-right">Units</th><th className="px-2 py-3 text-right">Score</th><th className="px-5 py-3 text-right">Grade</th></tr>
                    </thead>
                    <tbody>
                      {items.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="px-5 py-3 font-medium">{r.courses?.code}</td>
                          <td className="px-2 py-3">{r.courses?.title}</td>
                          <td className="px-2 py-3 text-right tabular-nums">{r.courses?.credit_units ?? 3}</td>
                          <td className="px-2 py-3 text-right tabular-nums">{Number(r.total).toFixed(0)}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold", gradeColor(r.grade))}>{r.grade}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              );
            })}

            {pending.length > 0 && (
              <Card className="p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Pending approval</div>
                <div className="mt-2 text-sm">{pending.length} result(s) are still being processed.</div>
              </Card>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}

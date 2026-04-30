import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { computeGPA, gradeColor, classOfDegree } from "@/lib/grades";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/parent/results/$studentId")({
  component: () => <RequireRole role="parent"><ChildResults /></RequireRole>,
});

function ChildResults() {
  const { studentId } = Route.useParams();
  const [studentName, setStudentName] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [{ data: profile }, { data: results }] = await Promise.all([
        supabase.from("profiles").select("full_name, matric_number").eq("id", studentId).maybeSingle(),
        supabase
          .from("results")
          .select("id,session,semester,total,grade,grade_point,status,courses(code,title,credit_units)")
          .eq("student_id", studentId)
          .eq("status", "admin_approved")
          .order("session", { ascending: false }),
      ]);
      setStudentName(profile?.full_name ?? "Student");
      setRows(results ?? []);
      setLoading(false);
    })();
  }, [studentId]);

  const cgpaRows = rows.map((r) => ({ grade_point: r.grade_point, total: r.total, credit_units: r.courses?.credit_units ?? 3 }));
  const cgpa = computeGPA(cgpaRows);

  const groups: Record<string, any[]> = {};
  rows.forEach((r) => {
    const k = `${r.session} · ${r.semester === "first" ? "First" : "Second"} Semester`;
    (groups[k] ??= []).push(r);
  });

  return (
    <>
      <PageHeader
        title={studentName}
        subtitle="Approved semester results — read-only view for guardians."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/app/parent"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
        }
      />
      <PageBody>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="font-serif text-lg">No approved results yet</div>
            <p className="mt-2 text-sm text-muted-foreground">
              You'll receive an email automatically the moment a result is approved.
            </p>
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
          </div>
        )}
      </PageBody>
    </>
  );
}

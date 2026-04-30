import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { computeGPA, classOfDegree } from "@/lib/grades";
import { GraduationCap, ArrowRight, Mail } from "lucide-react";

export const Route = createFileRoute("/app/parent/")({
  component: () => <RequireRole role="parent"><ParentDashboard /></RequireRole>,
});

interface Child {
  id: string;
  full_name: string;
  matric_number: string | null;
  level: number | null;
  department?: { name: string; code: string } | null;
  cgpa: number;
  approvedCount: number;
}

function ParentDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      // 1. Find all students linked to this parent
      const { data: links } = await supabase
        .from("parent_links")
        .select("student_id")
        .eq("parent_user_id", user.id);

      const studentIds = (links ?? []).map((l) => l.student_id);
      if (studentIds.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      // 2. Pull their profiles + departments
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, matric_number, level, departments(name, code)")
        .in("id", studentIds);

      // 3. Pull approved results for GPA
      const { data: results } = await supabase
        .from("results")
        .select("student_id, grade_point, total, courses(credit_units)")
        .in("student_id", studentIds)
        .eq("status", "admin_approved");

      const byStudent: Record<string, any[]> = {};
      (results ?? []).forEach((r: any) => {
        (byStudent[r.student_id] ??= []).push({
          grade_point: r.grade_point,
          total: r.total,
          credit_units: r.courses?.credit_units ?? 3,
        });
      });

      const list: Child[] = (profiles ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        matric_number: p.matric_number,
        level: p.level,
        department: p.departments,
        approvedCount: (byStudent[p.id] ?? []).length,
        cgpa: computeGPA(byStudent[p.id] ?? []),
      }));
      setChildren(list);
      setLoading(false);
    })();
  }, [user]);

  return (
    <>
      <PageHeader
        title="My Children"
        subtitle="Every student who registered you as their guardian appears here. You'll be emailed the moment any of their results are approved."
      />
      <PageBody>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : children.length === 0 ? (
          <Card className="p-10 text-center">
            <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
            <div className="mt-4 font-serif text-lg">We haven't matched you to a student yet</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              When your child signs up they enter a guardian email. Make sure they used <strong>{user?.email}</strong> exactly. Once they do, this page will populate automatically — no action needed.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {children.map((c) => (
              <Card key={c.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-serif text-lg font-semibold">{c.full_name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {c.matric_number ?? "Matric pending"} · {c.department?.code ?? "—"} · {c.level ?? 100} level
                    </div>
                  </div>
                  <GraduationCap className="h-6 w-6 shrink-0 text-primary" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-border bg-secondary/40 p-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">CGPA</div>
                    <div className="font-serif text-2xl font-semibold text-primary">{c.cgpa.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Class</div>
                    <div className="font-serif text-sm font-semibold">{c.approvedCount > 0 ? classOfDegree(c.cgpa) : "—"}</div>
                  </div>
                </div>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link to="/app/parent/results/$studentId" params={{ studentId: c.id }}>
                    View results <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}

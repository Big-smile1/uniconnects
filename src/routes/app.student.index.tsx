import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { computeGPA, classOfDegree } from "@/lib/grades";
import { GraduationCap, BookOpen, Heart, Bell } from "lucide-react";

export const Route = createFileRoute("/app/student/")({
  component: () => <RequireRole role="student"><StudentDashboard /></RequireRole>,
});

function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ courses: 0, results: 0, parents: 0, gpa: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [enrolls, results, parents] = await Promise.all([
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("student_id", user.id),
        supabase.from("results").select("grade_point,total,status,courses(credit_units)").eq("student_id", user.id).eq("status", "admin_approved"),
        supabase.from("parent_links").select("id", { count: "exact", head: true }).eq("student_id", user.id),
      ]);
      const rows = (results.data ?? []).map((r: any) => ({
        grade_point: r.grade_point, total: r.total, credit_units: r.courses?.credit_units ?? 3,
      }));
      setStats({
        courses: enrolls.count ?? 0,
        results: rows.length,
        parents: parents.count ?? 0,
        gpa: computeGPA(rows),
      });
      setLoading(false);
    })();
  }, [user]);

  return (
    <>
      <PageHeader title={`Welcome back, ${user?.user_metadata?.full_name?.split(" ")[0] ?? "Student"}`} subtitle="Your academic snapshot at a glance." />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={BookOpen} label="Enrolled courses" value={loading ? "—" : String(stats.courses)} />
          <StatCard icon={GraduationCap} label="Approved results" value={loading ? "—" : String(stats.results)} />
          <StatCard icon={Heart} label="Linked parents" value={loading ? "—" : String(stats.parents)} />
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Cumulative GPA</div>
            <div className="mt-2 font-serif text-3xl font-semibold text-primary">{loading ? "—" : stats.gpa.toFixed(2)}</div>
            {!loading && stats.gpa > 0 && <div className="mt-1 text-xs text-muted-foreground">{classOfDegree(stats.gpa)}</div>}
          </Card>
        </div>
        <Card className="mt-6 p-6">
          <h2 className="font-serif text-lg font-semibold">Get started</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Add your <strong className="text-foreground">parents/guardians</strong> so they receive results automatically.</li>
            <li>• Browse and <strong className="text-foreground">enrol in courses</strong> for the current session.</li>
            <li>• Check the <strong className="text-foreground">announcements</strong> board for university updates.</li>
          </ul>
        </Card>
      </PageBody>
    </>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 font-serif text-3xl font-semibold">{value}</div>
    </Card>
  );
}

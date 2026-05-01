import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Building2, ClipboardCheck, Bell, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin dashboard — MTU" }] }),
  component: () => <RequireRole role="admin"><AdminDashboard /></RequireRole>,
});

function AdminDashboard() {
  const [counts, setCounts] = useState({ users: 0, courses: 0, depts: 0, pending: 0, queued: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [{ count: u }, { count: c }, { count: d }, { count: p }, { count: q }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("departments").select("id", { count: "exact", head: true }),
        supabase.from("results").select("id", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("email_outbox").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setCounts({ users: u ?? 0, courses: c ?? 0, depts: d ?? 0, pending: p ?? 0, queued: q ?? 0 });
      setLoading(false);
    })();
  }, []);

  const tiles = [
    { label: "Users", value: counts.users, to: "/admin/users", icon: Users },
    { label: "Departments", value: counts.depts, to: "/admin/departments", icon: Building2 },
    { label: "Courses", value: counts.courses, to: "/admin/courses", icon: BookOpen },
    { label: "Pending approvals", value: counts.pending, to: "/admin/approvals", icon: ClipboardCheck, highlight: counts.pending > 0 },
    { label: "Queued emails", value: counts.queued, to: "/admin/notifications", icon: Bell, highlight: counts.queued > 0 },
  ];

  return (
    <>
      <PageHeader title="ICT Dashboard" subtitle="Run the registry — users, courses, approvals, notifications." />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Card key={t.to} className={`p-5 ${t.highlight ? "border-warning/40 bg-warning/5" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={t.to}>Open <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">{t.label}</div>
                <div className="font-serif text-3xl font-semibold">{loading ? "…" : t.value}</div>
              </Card>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}

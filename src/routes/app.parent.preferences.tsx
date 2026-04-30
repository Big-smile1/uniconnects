import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/parent/preferences")({
  head: () => ({ meta: [{ title: "Notification preferences — Parent" }] }),
  component: () => <RequireRole role="parent"><ParentPrefs /></RequireRole>,
});

type Link = {
  id: string;
  student_id: string;
  email_notifications_enabled: boolean;
  parent_email: string;
  student_name?: string;
};

function ParentPrefs() {
  const { user } = useAuth();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: ls } = await supabase
        .from("parent_links")
        .select("id, student_id, email_notifications_enabled, parent_email")
        .eq("parent_user_id", user.id);
      const ids = (ls ?? []).map((l) => l.student_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] };
      const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      setLinks((ls ?? []).map((l: any) => ({ ...l, student_name: nameMap.get(l.student_id) ?? "—" })));
      setLoading(false);
    })();
  }, [user]);

  const toggle = async (id: string, value: boolean) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, email_notifications_enabled: value } : l)));
    const { error } = await supabase
      .from("parent_links")
      .update({ email_notifications_enabled: value })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, email_notifications_enabled: !value } : l)));
    } else {
      toast.success(value ? "Notifications on" : "Notifications muted");
    }
  };

  return (
    <>
      <PageHeader
        title="Notification preferences"
        subtitle="Choose which children's results you want to be emailed about."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/app/parent"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
        }
      />
      <PageBody>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : links.length === 0 ? (
          <Card className="p-10 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No children linked to this account yet.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {links.map((l) => (
              <div key={l.id} className="flex items-center justify-between p-5">
                <div>
                  <div className="font-medium">{l.student_name}</div>
                  <div className="text-xs text-muted-foreground">Emails sent to {l.parent_email}</div>
                </div>
                <Switch
                  checked={l.email_notifications_enabled}
                  onCheckedChange={(v) => void toggle(l.id, v)}
                />
              </div>
            ))}
          </Card>
        )}
      </PageBody>
    </>
  );
}

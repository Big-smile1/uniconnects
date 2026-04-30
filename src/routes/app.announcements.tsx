import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/app/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Mountain Top University" }] }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { role } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      const filtered = (data ?? []).filter((a) =>
        a.audience === "all" ||
        (role === "student" && a.audience === "students") ||
        (role === "lecturer" && a.audience === "lecturers") ||
        (role === "parent" && (a.audience === "parents" || a.audience === "all")) ||
        role === "admin",
      );
      setItems(filtered);
      setLoading(false);
    })();
  }, [role]);

  return (
    <>
      <PageHeader title="Announcements" subtitle="Updates from the university and your lecturers." />
      <PageBody>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center">
            <Megaphone className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No announcements yet.</p>
          </Card>
        ) : (
          <ul className="space-y-4">
            {items.map((a) => (
              <Card key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-lg font-semibold">{a.title}</h3>
                  <Badge variant="outline" className="capitalize shrink-0">{a.audience}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{a.body}</p>
                <div className="mt-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
              </Card>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}

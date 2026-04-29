import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Lock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/student/parents")({
  component: () => <RequireRole role="student"><ParentsPage /></RequireRole>,
});

type ParentLink = {
  id: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  relationship: string;
  is_primary: boolean;
};

function ParentsPage() {
  const { user } = useAuth();
  const [list, setList] = useState<ParentLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("parent_links")
        .select("id, parent_name, parent_phone, parent_email, relationship, is_primary")
        .eq("student_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at");
      setList((data ?? []) as ParentLink[]);
      setLoading(false);
    })();
  }, [user]);

  return (
    <>
      <PageHeader
        title="Parents & Guardians"
        subtitle="People who'll be notified when your results are released."
      />
      <PageBody>
        <Card className="mb-4 flex items-start gap-3 border-amber-500/30 bg-amber-500/5 p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm">
            <div className="font-medium">This information is locked</div>
            <p className="text-muted-foreground">
              Guardian details are captured at signup. To correct or update them, please contact the ICT unit / admin.
            </p>
          </div>
        </Card>

        {loading ? (
          <Card className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </Card>
        ) : list.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <div className="font-serif text-lg">No guardians on file</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Please contact the admin to add a parent or guardian to your record.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {list.map((p) => (
              <Card key={p.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.parent_name}</span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">· {p.relationship}</span>
                    {p.is_primary && <Badge variant="secondary">Primary</Badge>}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {p.parent_phone}{p.parent_email ? ` · ${p.parent_email}` : ""}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}

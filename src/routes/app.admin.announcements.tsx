import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Send, Trash2, Megaphone } from "lucide-react";

export const Route = createFileRoute("/app/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Admin · MTU" }] }),
  component: () => <RequireRole role="admin"><AdminAnnouncements /></RequireRole>,
});

const AUDIENCES = ["all", "students", "lecturers", "parents"] as const;

function AdminAnnouncements() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<typeof AUDIENCES[number]>("all");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(100);
    setItems(data ?? []);
  };
  useEffect(() => { void load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !body.trim()) { toast.error("Title and message required."); return; }
    if (title.length > 120 || body.length > 2000) { toast.error("Title max 120, body max 2000."); return; }
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(), body: body.trim(), audience, posted_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Posted");
    setTitle(""); setBody("");
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    void load();
  };

  return (
    <>
      <PageHeader title="Announcements" subtitle="Broadcast updates from the registry to staff, students, or guardians." />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="p-5">
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-1.5"><Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
              <div className="grid gap-1.5"><Label>Message</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={6} />
                <span className="text-xs text-muted-foreground">{body.length}/2000</span>
              </div>
              <div className="grid gap-1.5"><Label>Audience</Label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCES.map((a) => (
                    <button key={a} type="button" onClick={() => setAudience(a)}
                      className={`rounded-md border px-3 py-1.5 text-xs capitalize ${audience === a ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post announcement
              </Button>
            </form>
          </Card>
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-secondary/40 px-5 py-3 text-sm font-semibold">All announcements</div>
            {items.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <Megaphone className="mx-auto mb-2 h-8 w-8" /> Nothing yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((a) => (
                  <li key={a.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-serif text-base font-semibold">{a.title}</div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground line-clamp-3">{a.body}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="capitalize">{a.audience}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => void remove(a.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </PageBody>
    </>
  );
}

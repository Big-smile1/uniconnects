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
import { Loader2, Send, Megaphone } from "lucide-react";

export const Route = createFileRoute("/lecturer/announcements")({
  head: () => ({ meta: [{ title: "My announcements — Lecturer" }] }),
  component: () => (
    <RequireRole role="lecturer">
      <LecturerAnnouncements />
    </RequireRole>
  ),
});

function LecturerAnnouncements() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "students" | "lecturers">("students");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("posted_by", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems(data ?? []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    if (title.length > 120 || body.length > 2000) {
      toast.error("Title max 120, body max 2000.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      body: body.trim(),
      audience,
      posted_by: user.id,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Announcement posted.");
    setTitle("");
    setBody("");
    void load();
  };

  return (
    <>
      <PageHeader
        title="My announcements"
        subtitle="Post messages to your students. They appear on the Announcements page they see."
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="p-5">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. CSC 304 — class moved to Friday" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={6} placeholder="Write your message…" />
                <span className="text-xs text-muted-foreground">{body.length}/2000</span>
              </div>
              <div className="grid gap-1.5">
                <Label>Audience</Label>
                <div className="flex gap-2">
                  {(["students", "lecturers", "all"] as const).map((a) => (
                    <button key={a} type="button"
                      onClick={() => setAudience(a)}
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
            <div className="border-b border-border bg-secondary/40 px-5 py-3 text-sm font-semibold">Recently posted by me</div>
            {items.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <Megaphone className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                Nothing posted yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((a) => (
                  <li key={a.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-serif text-base font-semibold">{a.title}</div>
                        <div className="mt-1 text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{a.body}</div>
                      </div>
                      <Badge variant="outline" className="shrink-0 capitalize">{a.audience}</Badge>
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

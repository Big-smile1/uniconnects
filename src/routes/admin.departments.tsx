import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Building2 } from "lucide-react";

export const Route = createFileRoute("/admin/departments")({
  head: () => ({ meta: [{ title: "Departments — Admin · MTU" }] }),
  component: () => <RequireRole role="admin"><AdminDepartments /></RequireRole>,
});

type Dept = { id: string; code: string; name: string; faculty: string | null };

function AdminDepartments() {
  const [items, setItems] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: "", name: "", faculty: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("departments").select("*").order("name");
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name required.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("departments").insert({
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      faculty: form.faculty.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Department added");
    setForm({ code: "", name: "", faculty: "" });
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this department? Courses/profiles referencing it will lose the link.")) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    void load();
  };

  return (
    <>
      <PageHeader title="Departments" subtitle="Maintain the academic departments students and courses belong to." />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-semibold">Add department</h2>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-1.5"><Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CSC" maxLength={10} /></div>
              <div className="grid gap-1.5"><Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Computer Science" maxLength={120} /></div>
              <div className="grid gap-1.5"><Label>Faculty (optional)</Label>
                <Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} placeholder="Faculty of Science" maxLength={120} /></div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
              </Button>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border bg-secondary/40 px-5 py-3 text-sm font-semibold">All departments</div>
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <Building2 className="mx-auto mb-2 h-8 w-8" /> No departments yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="font-medium">{d.code} — {d.name}</div>
                      {d.faculty && <div className="text-xs text-muted-foreground">{d.faculty}</div>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => void remove(d.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

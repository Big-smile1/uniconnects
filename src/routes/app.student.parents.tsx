import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Heart } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/app/student/parents")({
  component: () => <RequireRole role="student"><ParentsPage /></RequireRole>,
});

const parentSchema = z.object({
  parent_name: z.string().trim().min(2).max(120),
  parent_phone: z.string().trim().min(7).max(20).regex(/^\+?[0-9\s\-()]+$/, "Invalid phone"),
  parent_email: z.string().trim().email().max(255).optional().or(z.literal("")),
  relationship: z.string().min(1),
});

function ParentsPage() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ parent_name: "", parent_phone: "", parent_email: "", relationship: "father" });

  const reload = async () => {
    if (!user) return;
    const { data } = await supabase.from("parent_links").select("*").eq("student_id", user.id).order("created_at");
    setList(data ?? []);
  };
  useEffect(() => { void reload(); }, [user]);

  const add = async () => {
    if (!user) return;
    const parsed = parentSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    const { error } = await supabase.from("parent_links").insert({
      student_id: user.id,
      parent_name: parsed.data.parent_name,
      parent_phone: parsed.data.parent_phone,
      parent_email: parsed.data.parent_email || null,
      relationship: parsed.data.relationship,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Parent added — they'll receive your results once approved.");
    setOpen(false);
    setForm({ parent_name: "", parent_phone: "", parent_email: "", relationship: "father" });
    void reload();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("parent_links").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed");
    void reload();
  };

  return (
    <>
      <PageHeader
        title="Parents & Guardians"
        subtitle="People who should receive your semester results automatically."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add parent or guardian</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2"><Label>Full name</Label><Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} placeholder="Mr. Chinedu Okonkwo" /></div>
                <div className="space-y-2"><Label>Phone (Nigerian format)</Label><Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} placeholder="+2348012345678" /></div>
                <div className="space-y-2"><Label>Email <span className="text-muted-foreground">(recommended)</span></Label><Input type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} placeholder="parent@example.com" /></div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={add}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <PageBody>
        {list.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <div className="font-serif text-lg">No parents added yet</div>
            <p className="max-w-sm text-sm text-muted-foreground">Add a parent or guardian so they can be notified when your results are released.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {list.map((p) => (
              <Card key={p.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{p.parent_name} <span className="text-xs uppercase tracking-wider text-muted-foreground">· {p.relationship}</span></div>
                  <div className="mt-1 text-sm text-muted-foreground">{p.parent_phone}{p.parent_email ? ` · ${p.parent_email}` : ""}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}

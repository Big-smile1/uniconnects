import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createUser, changeUserRole, resetUserPassword } from "@/server/admin.functions";
import { Loader2, UserPlus, Search, KeyRound, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/app/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin · MTU" }] }),
  component: () => <RequireRole role="admin"><AdminUsers /></RequireRole>,
});

type Row = {
  id: string;
  full_name: string;
  matric_number: string | null;
  level: number | null;
  department_id: string | null;
  role: string | null;
};

const ROLES = ["student", "lecturer", "admin", "parent"] as const;

function AdminUsers() {
  const createUserFn = useServerFn(createUser);
  const changeRoleFn = useServerFn(changeUserRole);
  const resetPwdFn = useServerFn(resetUserPassword);

  const [rows, setRows] = useState<Row[]>([]);
  const [depts, setDepts] = useState<{ id: string; code: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }, { data: ds }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, matric_number, level, department_id"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("departments").select("id, code, name").order("name"),
    ]);
    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
    setRows((profs ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.id) ?? null })));
    setDepts(ds ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterRole !== "all" && r.role !== filterRole) return false;
      if (!n) return true;
      return r.full_name.toLowerCase().includes(n) || (r.matric_number ?? "").toLowerCase().includes(n);
    });
  }, [rows, q, filterRole]);

  const onChangeRole = async (userId: string, role: typeof ROLES[number]) => {
    try {
      await changeRoleFn({ data: { userId, role } });
      toast.success("Role updated");
      void load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to change role");
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Create accounts, change roles, reset passwords."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> New user
          </Button>
        }
      />
      <PageBody>
        <Card className="mb-4 flex flex-wrap items-end gap-3 p-4">
          <div className="grid gap-1.5 flex-1 min-w-[200px]">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or matric…" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Role</Label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border bg-secondary/40 px-5 py-3 text-sm">
            <strong>{filtered.length}</strong> user{filtered.length === 1 ? "" : "s"}
          </div>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-2 py-3 text-left">Matric / ID</th>
                  <th className="px-2 py-3 text-left">Department</th>
                  <th className="px-2 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-5 py-2">{r.full_name}</td>
                    <td className="px-2 py-2 font-mono text-xs">{r.matric_number ?? "—"}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{depts.find((d) => d.id === r.department_id)?.code ?? "—"}</td>
                    <td className="px-2 py-2">
                      <Select value={r.role ?? ""} onValueChange={(v) => void onChangeRole(r.id, v as any)}>
                        <SelectTrigger className="h-8 w-[120px]"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((rr) => <SelectItem key={rr} value={rr} className="capitalize">{rr}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setResetOpen(r)}>
                        <KeyRound className="h-4 w-4" /> Reset password
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No users found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      </PageBody>

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        depts={depts}
        onCreate={async (payload) => {
          try {
            await createUserFn({ data: payload });
            toast.success("User created");
            setCreateOpen(false);
            void load();
          } catch (e: any) {
            toast.error(e?.message ?? "Failed to create user");
          }
        }}
      />

      <ResetPwdDialog
        row={resetOpen}
        onClose={() => setResetOpen(null)}
        onReset={async (password) => {
          if (!resetOpen) return;
          try {
            await resetPwdFn({ data: { userId: resetOpen.id, newPassword: password } });
            toast.success("Password reset");
            setResetOpen(null);
          } catch (e: any) {
            toast.error(e?.message ?? "Failed to reset password");
          }
        }}
      />
    </>
  );
}

function CreateUserDialog({
  open, onClose, depts, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  depts: { id: string; code: string; name: string }[];
  onCreate: (p: any) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", fullName: "", role: "student",
    departmentId: "", matricNumber: "", phone: "",
  });
  useEffect(() => { if (open) setForm({ email: "", password: "", fullName: "", role: "student", departmentId: "", matricNumber: "", phone: "" }); }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new user</DialogTitle>
          <DialogDescription>The user can sign in immediately with this password.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Full name</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Temporary password</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                <SelectTrigger><SelectValue placeholder="(optional)" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.code} · {d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Matric number</Label>
              <Input value={form.matricNumber} onChange={(e) => setForm({ ...form, matricNumber: e.target.value })} placeholder="(students)" /></div>
            <div className="grid gap-1.5"><Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={async () => {
            if (!form.email || form.password.length < 8 || !form.fullName) {
              toast.error("Name, email and 8+ char password required.");
              return;
            }
            setBusy(true);
            await onCreate({
              email: form.email,
              password: form.password,
              fullName: form.fullName,
              role: form.role,
              departmentId: form.departmentId || null,
              matricNumber: form.matricNumber || null,
              phone: form.phone || null,
            });
            setBusy(false);
          }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPwdDialog({ row, onClose, onReset }: { row: Row | null; onClose: () => void; onReset: (p: string) => Promise<void> }) {
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPwd(""); }, [row]);
  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Set a new password for {row?.full_name}. They can change it after signing in.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label>New password (min 8 chars)</Label>
          <Input type="text" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || pwd.length < 8} onClick={async () => { setBusy(true); await onReset(pwd); setBusy(false); }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

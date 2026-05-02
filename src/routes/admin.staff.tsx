import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createUser, inviteStaff } from "@/server/admin.functions";
import { Loader2, MailPlus, ShieldCheck, KeyRound, Info } from "lucide-react";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({ meta: [{ title: "Provision staff — Admin · MTU" }] }),
  component: () => <RequireRole role="admin"><AdminStaff /></RequireRole>,
});

type Dept = { id: string; code: string; name: string };
type StaffRow = { id: string; full_name: string; department_id: string | null; role: string };

const STAFF_ROLES = ["lecturer", "admin"] as const;

function AdminStaff() {
  const createUserFn = useServerFn(createUser);
  const inviteStaffFn = useServerFn(inviteStaff);

  const [depts, setDepts] = useState<Dept[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  // Invite form
  const [invite, setInvite] = useState({
    email: "", fullName: "", role: "lecturer" as typeof STAFF_ROLES[number],
    departmentId: "", phone: "",
  });
  const [inviteBusy, setInviteBusy] = useState(false);

  // Direct create form
  const [direct, setDirect] = useState({
    email: "", password: "", fullName: "", role: "lecturer" as typeof STAFF_ROLES[number],
    departmentId: "", phone: "",
  });
  const [directBusy, setDirectBusy] = useState(false);

  const loadStaff = async () => {
    setLoadingStaff(true);
    const [{ data: ds }, { data: roles }, { data: profs }] = await Promise.all([
      supabase.from("departments").select("id, code, name").order("name"),
      supabase.from("user_roles").select("user_id, role").in("role", ["lecturer", "admin"]),
      supabase.from("profiles").select("id, full_name, department_id"),
    ]);
    setDepts(ds ?? []);
    const byId = new Map<string, any>();
    (profs ?? []).forEach((p: any) => byId.set(p.id, p));
    const list: StaffRow[] = (roles ?? []).map((r: any) => {
      const p = byId.get(r.user_id) ?? {};
      return {
        id: r.user_id,
        full_name: p.full_name ?? "(no name)",
        department_id: p.department_id ?? null,
        role: r.role,
      };
    });
    list.sort((a, b) => a.full_name.localeCompare(b.full_name));
    setStaff(list);
    setLoadingStaff(false);
  };

  useEffect(() => { void loadStaff(); }, []);

  const onInvite = async () => {
    if (!invite.email || !invite.fullName) {
      toast.error("Full name and email are required.");
      return;
    }
    setInviteBusy(true);
    try {
      const redirectTo = `${window.location.origin}/staff-login`;
      await inviteStaffFn({ data: {
        email: invite.email,
        fullName: invite.fullName,
        role: invite.role,
        departmentId: invite.departmentId || null,
        phone: invite.phone || null,
        redirectTo,
      }});
      toast.success(`Invitation email sent to ${invite.email}`);
      setInvite({ email: "", fullName: "", role: "lecturer", departmentId: "", phone: "" });
      void loadStaff();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send invitation");
    } finally {
      setInviteBusy(false);
    }
  };

  const onCreateDirect = async () => {
    if (!direct.email || !direct.fullName || direct.password.length < 8) {
      toast.error("Name, email and 8+ char password are required.");
      return;
    }
    setDirectBusy(true);
    try {
      await createUserFn({ data: {
        email: direct.email,
        password: direct.password,
        fullName: direct.fullName,
        role: direct.role,
        departmentId: direct.departmentId || null,
        phone: direct.phone || null,
        matricNumber: null,
      }});
      toast.success(`${direct.role === "admin" ? "Admin" : "Lecturer"} account created`);
      setDirect({ email: "", password: "", fullName: "", role: "lecturer", departmentId: "", phone: "" });
      void loadStaff();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create staff account");
    } finally {
      setDirectBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Provision staff"
        subtitle="Create or invite lecturer and admin accounts. Students never see this page."
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="p-5">
            <Tabs defaultValue="invite" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="invite"><MailPlus className="h-4 w-4" /> Email invite</TabsTrigger>
                <TabsTrigger value="direct"><KeyRound className="h-4 w-4" /> Create with password</TabsTrigger>
              </TabsList>

              <TabsContent value="invite" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sends a one-time invitation link to the staff member's email. They set their own password
                  and are then redirected to the staff sign-in page.
                </p>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>Full name</Label>
                    <Input value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} placeholder="Dr. Jane Doe" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Email</Label>
                      <Input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="jane.doe@mtu.edu.ng" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Role</Label>
                      <Select value={invite.role} onValueChange={(v) => setInvite({ ...invite, role: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lecturer">Lecturer</SelectItem>
                          <SelectItem value="admin">Admin (ICT unit)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Department <span className="text-muted-foreground">(optional)</span></Label>
                      <Select value={invite.departmentId} onValueChange={(v) => setInvite({ ...invite, departmentId: v })}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.code} · {d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Phone <span className="text-muted-foreground">(optional)</span></Label>
                      <Input value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button disabled={inviteBusy} onClick={onInvite}>
                    {inviteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                    Send invitation
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="direct" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Creates the account immediately with a temporary password you provide. Useful when email
                  delivery is unavailable — share the password with the staff member through a secure channel.
                </p>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>Full name</Label>
                    <Input value={direct.fullName} onChange={(e) => setDirect({ ...direct, fullName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Email</Label>
                      <Input type="email" value={direct.email} onChange={(e) => setDirect({ ...direct, email: e.target.value })} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Temporary password</Label>
                      <Input type="text" value={direct.password} onChange={(e) => setDirect({ ...direct, password: e.target.value })} placeholder="min 8 characters" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Role</Label>
                      <Select value={direct.role} onValueChange={(v) => setDirect({ ...direct, role: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lecturer">Lecturer</SelectItem>
                          <SelectItem value="admin">Admin (ICT unit)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Department <span className="text-muted-foreground">(optional)</span></Label>
                      <Select value={direct.departmentId} onValueChange={(v) => setDirect({ ...direct, departmentId: v })}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.code} · {d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Phone <span className="text-muted-foreground">(optional)</span></Label>
                    <Input value={direct.phone} onChange={(e) => setDirect({ ...direct, phone: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button disabled={directBusy} onClick={onCreateDirect}>
                    {directBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Create staff account
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">
                  Staff accounts sign in via the dedicated <strong>Staff login</strong> page — they don't appear
                  on the student/parent signup. To change a staff member's role later, use the
                  <strong> Users</strong> page.
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-border bg-secondary/40 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Existing staff ({staff.length})
              </div>
              {loadingStaff ? (
                <div className="p-4 text-sm text-muted-foreground">Loading…</div>
              ) : staff.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No staff yet.</div>
              ) : (
                <ul className="divide-y divide-border max-h-[420px] overflow-y-auto">
                  {staff.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {depts.find((d) => d.id === s.department_id)?.code ?? "—"}
                        </div>
                      </div>
                      <Badge variant={s.role === "admin" ? "default" : "secondary"} className="capitalize">{s.role}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "My Profile · Mountain Top University" },
      { name: "description", content: "View and update your Mountain Top University profile." },
    ],
  }),
  component: ProfilePage,
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name is too short").max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^\+?[0-9\s\-()]*$/, "Invalid phone")
    .optional()
    .or(z.literal("")),
  matric_number: z.string().trim().max(40).optional().or(z.literal("")),
  level: z.coerce.number().int().min(100).max(900).optional().or(z.nan()),
  department_id: z.string().uuid().optional().or(z.literal("")),
});

type Department = { id: string; code: string; name: string };

function ProfilePage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    matric_number: "",
    level: "" as string,
    department_id: "" as string,
  });

  useEffect(() => {
    void (async () => {
      if (!user) return;
      const [{ data: profile }, { data: depts }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("departments").select("id, code, name").order("name"),
      ]);
      setDepartments(depts ?? []);
      if (profile) {
        setForm({
          full_name: profile.full_name ?? "",
          phone: profile.phone ?? "",
          matric_number: profile.matric_number ?? "",
          level: profile.level ? String(profile.level) : "",
          department_id: profile.department_id ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const initials = (form.full_name || user?.email || "U")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = profileSchema.safeParse({
      full_name: form.full_name,
      phone: form.phone,
      matric_number: form.matric_number,
      level: form.level ? Number(form.level) : undefined,
      department_id: form.department_id || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please review the form");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        matric_number: form.matric_number.trim() || null,
        level: form.level ? Number(form.level) : null,
        department_id: form.department_id || null,
      })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
  };

  if (loading) {
    return (
      <>
        <PageHeader title="My Profile" subtitle="Manage your personal information" />
        <PageBody>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </PageBody>
      </>
    );
  }

  const isStudent = role === "student";

  return (
    <>
      <PageHeader title="My Profile" subtitle="Manage your personal information" />
      <PageBody>
        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[280px_1fr]">
          {/* Identity card */}
          <Card className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar className="h-24 w-24 text-xl">
              <AvatarFallback className="bg-primary/10 font-serif text-2xl text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-serif text-lg font-semibold">
                {form.full_name || "Unnamed"}
              </div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member"}
            </div>
          </Card>

          {/* Form */}
          <Card className="p-6">
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email ?? ""} disabled />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+234…"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
              </div>

              {isStudent && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="matric_number">Matric number</Label>
                    <Input
                      id="matric_number"
                      placeholder="e.g. MTU/CSC/21/0001"
                      value={form.matric_number}
                      onChange={(e) => set("matric_number", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="level">Level</Label>
                    <Select
                      value={form.level}
                      onValueChange={(v) => set("level", v)}
                    >
                      <SelectTrigger id="level">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {[100, 200, 300, 400, 500].map((l) => (
                          <SelectItem key={l} value={String(l)}>
                            {l} Level
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={form.department_id}
                  onValueChange={(v) => set("department_id", v)}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No departments yet
                      </div>
                    ) : (
                      departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

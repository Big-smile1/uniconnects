import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, ShieldCheck, Camera, Lock } from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "My Profile · Mountain Top University" },
      { name: "description", content: "View and update your Mountain Top University profile." },
    ],
  }),
  component: ProfilePage,
});

const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .regex(/^\+?[0-9\s\-()]*$/, "Invalid phone number")
  .optional()
  .or(z.literal(""));

type ProfileRow = {
  full_name: string;
  matric_number: string | null;
  level: number | null;
  phone: string | null;
  department_id: string | null;
  avatar_url: string | null;
};
type Department = { id: string; code: string; name: string };

const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4MB

function ProfilePage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [phone, setPhone] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      const [{ data: p }, { data: depts }] = await Promise.all([
        supabase.from("profiles").select("full_name, matric_number, level, phone, department_id, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("departments").select("id, code, name").order("name"),
      ]);
      setDepartments(depts ?? []);
      if (p) {
        setProfile(p as ProfileRow);
        setPhone(p.phone ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const departmentName =
    departments.find((d) => d.id === profile?.department_id)?.name ?? "—";
  const departmentCode =
    departments.find((d) => d.id === profile?.department_id)?.code ?? "";

  const initials = (profile?.full_name || user?.email || "U")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid phone");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ phone: phone.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProfile((prev) => (prev ? { ...prev, phone: phone.trim() || null } : prev));
    toast.success("Phone updated");
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image is too large (max 4MB)");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    setUploading(false);
    if (dbErr) {
      toast.error(dbErr.message);
      return;
    }
    setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
    toast.success("Profile photo updated");
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
          {/* Identity card with avatar upload */}
          <Card className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="relative">
              <Avatar className="h-28 w-28 text-xl ring-2 ring-border">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                ) : null}
                <AvatarFallback className="bg-primary/10 font-serif text-2xl text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={onPickFile}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-105 disabled:opacity-60"
                aria-label="Upload profile photo"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            <div>
              <div className="font-serif text-lg font-semibold">
                {profile?.full_name || "Unnamed"}
              </div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member"}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG or PNG · up to 4MB
            </p>
          </Card>

          {/* Read-only academic identity + editable contact */}
          <Card className="p-6">
            <div className="space-y-5">
              <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  Academic identity — managed by the registry
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ReadOnlyField label="Full name" value={profile?.full_name ?? "—"} />
                  <ReadOnlyField label="Email" value={user?.email ?? "—"} />
                  {isStudent && (
                    <>
                      <ReadOnlyField
                        label="Matric number"
                        value={profile?.matric_number ?? "Not yet assigned"}
                      />
                      <ReadOnlyField
                        label="Level"
                        value={profile?.level ? `${profile.level} Level` : "100 Level"}
                      />
                    </>
                  )}
                  <div className="sm:col-span-2">
                    <ReadOnlyField
                      label="Department"
                      value={departmentCode ? `${departmentName} (${departmentCode})` : departmentName}
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Need to change any of these? Contact the MTU ICT unit or your faculty office.
                </p>
              </div>

              <form className="space-y-4" onSubmit={onSavePhone}>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    placeholder="+234…"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for result alerts and security notifications.
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save changes
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

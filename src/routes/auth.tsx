import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, dashboardPathFor, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/brand/Logo";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

type Department = { id: string; code: string; name: string };

const searchSchema = z.object({
  tab: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({ meta: [{ title: "Sign in — Mountain Top University" }] }),
  component: AuthPage,
});

const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name").max(120),
    email: z.string().trim().email("Invalid email").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    matricNumber: z.string().trim().max(40).optional().or(z.literal("")),
    departmentId: z.string().uuid().optional().or(z.literal("")),
    role: z.enum(["student", "parent"]),
    // Primary guardian (required for students)
    parent1Name: z.string().trim().max(120).optional().or(z.literal("")),
    parent1Phone: z.string().trim().max(20).optional().or(z.literal("")),
    parent1Email: z.string().trim().max(255).optional().or(z.literal("")),
    parent1Relationship: z.string().optional().or(z.literal("")),
    // Optional secondary guardian
    parent2Name: z.string().trim().max(120).optional().or(z.literal("")),
    parent2Phone: z.string().trim().max(20).optional().or(z.literal("")),
    parent2Email: z.string().trim().max(255).optional().or(z.literal("")),
    parent2Relationship: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.role === "student") {
        return !!data.departmentId && data.departmentId.length > 0;
      }
      return true;
    },
    { message: "Please choose your department", path: ["departmentId"] },
  )
  .refine(
    (data) => data.role !== "student" || (data.parent1Name && data.parent1Name.trim().length >= 2),
    { message: "Primary guardian name is required", path: ["parent1Name"] },
  )
  .refine(
    (data) => data.role !== "student" || (data.parent1Phone && phoneRegex.test(data.parent1Phone)),
    { message: "Primary guardian phone is required (e.g. +2348012345678)", path: ["parent1Phone"] },
  )
  .refine(
    (data) => data.role !== "student" || (!!data.parent1Email && z.string().email().safeParse(data.parent1Email).success),
    { message: "Primary guardian email is required (they'll use it to sign in and receive results)", path: ["parent1Email"] },
  )
  .refine(
    (data) => {
      // If any parent2 field is filled, name + phone + email become required
      const any = [data.parent2Name, data.parent2Phone, data.parent2Email].some((v) => v && v.trim().length > 0);
      if (!any) return true;
      return !!(data.parent2Name && data.parent2Name.trim().length >= 2 && data.parent2Phone && phoneRegex.test(data.parent2Phone));
    },
    { message: "Secondary guardian needs both name and a valid phone", path: ["parent2Phone"] },
  )
  .refine(
    (data) => {
      const any = [data.parent2Name, data.parent2Phone, data.parent2Email].some((v) => v && v.trim().length > 0);
      if (!any) return true;
      return !!data.parent2Email && z.string().email().safeParse(data.parent2Email).success;
    },
    { message: "Secondary guardian email is required and must be valid", path: ["parent2Email"] },
  );

const signinSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">(search.tab ?? "signin");

  useEffect(() => {
    if (!loading && session) {
      // Honour deep link if provided, otherwise go to the role-specific dashboard.
      const target = search.redirect || dashboardPathFor(role);
      void navigate({ to: target });
    }
  }, [session, role, loading, navigate, search.redirect]);

  return (
    <div className="min-h-screen gradient-hero">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="border-border/60 p-6 shadow-elegant sm:p-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignUpForm onDone={() => setTab("signin")} />
            </TabsContent>
          </Tabs>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Lecturer and admin accounts are normally provisioned by the Mountain Top University ICT unit.
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link to="/staff-login" className="font-medium text-foreground/80 underline-offset-2 hover:text-foreground hover:underline">
            Staff login →
          </Link>
        </p>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signinSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input id="signin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    matricNumber: "",
    departmentId: "",
    role: "student" as AppRole,
    parent1Name: "",
    parent1Phone: "",
    parent1Email: "",
    parent1Relationship: "father",
    parent2Name: "",
    parent2Phone: "",
    parent2Email: "",
    parent2Relationship: "mother",
  });
  const [showSecondGuardian, setShowSecondGuardian] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [deptError, setDeptError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDepartments = async () => {
    setDeptLoading(true);
    setDeptError(null);
    const { data, error } = await supabase
      .from("departments")
      .select("id, code, name")
      .order("name");
    setDeptLoading(false);
    if (error) {
      setDeptError(error.message);
      return;
    }
    if (!data || data.length === 0) {
      setDeptError("No departments are available right now.");
      setDepartments([]);
      return;
    }
    setDepartments(data);
  };

  useEffect(() => {
    void loadDepartments();
  }, []);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    const includeP2 = showSecondGuardian && parsed.data.parent2Name && parsed.data.parent2Phone;
    const { data: { user }, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone || null,
          matric_number: parsed.data.matricNumber || null,
          department_id: parsed.data.departmentId || null,
          role: parsed.data.role,
          ...(parsed.data.role === "student"
            ? {
                parent1_name: parsed.data.parent1Name,
                parent1_phone: parsed.data.parent1Phone,
                parent1_email: parsed.data.parent1Email || null,
                parent1_relationship: parsed.data.parent1Relationship || "guardian",
                ...(includeP2
                  ? {
                      parent2_name: parsed.data.parent2Name,
                      parent2_phone: parsed.data.parent2Phone,
                      parent2_email: parsed.data.parent2Email || null,
                      parent2_relationship: parsed.data.parent2Relationship || "guardian",
                    }
                  : {}),
              }
            : {}),
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(user?.email_confirmed_at || user?.confirmed_at ? "Account created — signing you in…" : "Account created!");
    if (!user) onDone();
  };

  const departmentRequired = form.role === "student";
  const submitDisabled = busy || (departmentRequired && (deptLoading || !!deptError || departments.length === 0));

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>I am a…</Label>
        <Select value={form.role} onValueChange={(v) => set("role", v as AppRole)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="parent">Parent / Guardian</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="su-name">Full name</Label>
        <Input id="su-name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Adaeze Okonkwo" required />
      </div>

      {form.role === "student" && (
        <div className="space-y-2">
          <Label htmlFor="su-matric">Matric number <span className="text-muted-foreground">(optional now)</span></Label>
          <Input id="su-matric" value={form.matricNumber} onChange={(e) => set("matricNumber", e.target.value.toUpperCase())} placeholder="MTU/CSC/21/0001" />
        </div>
      )}

      {departmentRequired && (
        <div className="space-y-2">
          <Label htmlFor="su-department">Department</Label>
          <Select
            value={form.departmentId}
            onValueChange={(v) => set("departmentId", v)}
            disabled={deptLoading || !!deptError || departments.length === 0}
          >
            <SelectTrigger id="su-department">
              <SelectValue
                placeholder={
                  deptLoading
                    ? "Loading departments…"
                    : deptError
                      ? "Departments unavailable"
                      : "Select your department"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {deptError && (
            <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <span>Couldn't load departments. {deptError}</span>
              <button
                type="button"
                onClick={() => void loadDepartments()}
                className="font-medium underline-offset-2 hover:underline"
              >
                Retry
              </button>
            </div>
          )}
          {!deptError && form.role === "student" && (
            <p className="text-xs text-muted-foreground">You'll start at 100 level by default — your faculty will update this each session.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required autoComplete="email" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="su-phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="su-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234…" />
      </div>

      {form.role === "student" && (
        <div className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-4">
          <div>
            <div className="text-sm font-medium">Parent / Guardian</div>
            <p className="text-xs text-muted-foreground">Required — they'll be notified when your results are released. Only an admin can change this later.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-p1-name">Guardian full name</Label>
            <Input id="su-p1-name" value={form.parent1Name} onChange={(e) => set("parent1Name", e.target.value)} placeholder="Mr. Chinedu Okonkwo" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="su-p1-phone">Phone</Label>
              <Input id="su-p1-phone" type="tel" value={form.parent1Phone} onChange={(e) => set("parent1Phone", e.target.value)} placeholder="+2348012345678" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-p1-rel">Relationship</Label>
              <Select value={form.parent1Relationship} onValueChange={(v) => set("parent1Relationship", v)}>
                <SelectTrigger id="su-p1-rel"><SelectValue /></SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="su-p1-email">Guardian email</Label>
            <Input id="su-p1-email" type="email" value={form.parent1Email} onChange={(e) => set("parent1Email", e.target.value)} placeholder="parent@example.com" required />
            <p className="text-xs text-muted-foreground">Your guardian will use this email to sign in and will be notified the moment your results are released.</p>
          </div>

          {!showSecondGuardian ? (
            <button
              type="button"
              onClick={() => setShowSecondGuardian(true)}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              + Add a second guardian (optional)
            </button>
          ) : (
            <div className="space-y-3 border-t border-border/60 pt-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Second guardian</div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSecondGuardian(false);
                    setForm((s) => ({ ...s, parent2Name: "", parent2Phone: "", parent2Email: "" }));
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-p2-name">Full name</Label>
                <Input id="su-p2-name" value={form.parent2Name} onChange={(e) => set("parent2Name", e.target.value)} placeholder="Mrs. Ngozi Okonkwo" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="su-p2-phone">Phone</Label>
                  <Input id="su-p2-phone" type="tel" value={form.parent2Phone} onChange={(e) => set("parent2Phone", e.target.value)} placeholder="+2348012345678" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-p2-rel">Relationship</Label>
                  <Select value={form.parent2Relationship} onValueChange={(v) => set("parent2Relationship", v)}>
                    <SelectTrigger id="su-p2-rel"><SelectValue /></SelectTrigger>
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
              <div className="space-y-2">
                <Label htmlFor="su-p2-email">Email</Label>
                <Input id="su-p2-email" type="email" value={form.parent2Email} onChange={(e) => set("parent2Email", e.target.value)} placeholder="parent2@example.com" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="su-password">Password</Label>
        <Input id="su-password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} autoComplete="new-password" />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={submitDisabled}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/brand/Logo";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

const searchSchema = z.object({
  tab: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({ meta: [{ title: "Sign in — Mountain Top University" }] }),
  component: AuthPage,
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  matricNumber: z.string().trim().max(40).optional().or(z.literal("")),
  role: z.enum(["student", "lecturer", "parent", "admin"]),
});

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
    if (!loading && session && role) {
      // If a specific deep link was requested, honour it; otherwise show the welcome page.
      const target = search.redirect || "/welcome";
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
    role: "student" as AppRole,
  });
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    const { data: { user }, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone || null,
          matric_number: parsed.data.matricNumber || null,
          role: parsed.data.role,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(user?.email_confirmed_at || user?.confirmed_at ? "Account created — signing you in…" : "Account created!");
    // With auto-confirm enabled the user is logged in automatically; the AuthProvider will redirect.
    if (!user) onDone();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>I am a…</Label>
        <Select value={form.role} onValueChange={(v) => set("role", v as AppRole)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="parent">Parent / Guardian</SelectItem>
            <SelectItem value="lecturer">Lecturer</SelectItem>
            <SelectItem value="admin">Admin (ICT unit)</SelectItem>
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
          <Input id="su-matric" value={form.matricNumber} onChange={(e) => set("matricNumber", e.target.value.toUpperCase())} placeholder="CSC/2021/123" />
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

      <div className="space-y-2">
        <Label htmlFor="su-password">Password</Label>
        <Input id="su-password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} autoComplete="new-password" />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}

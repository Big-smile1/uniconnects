import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/staff-login")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({ meta: [{ title: "Staff sign in — Mountain Top University" }] }),
  component: StaffLoginPage,
});

const signinSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

function StaffLoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      const target = search.redirect || dashboardPathFor(role);
      void navigate({ to: target });
    }
  }, [session, role, loading, navigate, search.redirect]);

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
    <div className="min-h-screen gradient-hero">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="border-border/60 p-6 shadow-elegant sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Staff sign in</h1>
              <p className="text-xs text-muted-foreground">For lecturers and ICT unit admins only.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-email">Staff email</Label>
              <Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">Password</Label>
              <Input id="staff-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            Don't have an account? Staff accounts are created by the ICT unit. Please contact{" "}
            <a href="mailto:ict@mtu.edu.ng" className="font-medium text-foreground underline-offset-2 hover:underline">
              ict@mtu.edu.ng
            </a>{" "}
            to request access.
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Are you a student or parent?{" "}
          <Link to="/auth" className="font-medium text-foreground underline-offset-2 hover:underline">
            Use the main sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

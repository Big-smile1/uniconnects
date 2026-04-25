import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void navigate({ to: "/auth", search: { redirect: window.location.pathname } });
    }
  }, [session, loading, navigate]);

  // Redirect /app -> /app/{role}
  useEffect(() => {
    if (loading || !session || !role) return;
    if (window.location.pathname === "/app" || window.location.pathname === "/app/") {
      void navigate({ to: dashboardPathFor(role) });
    }
  }, [session, role, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Setting up your account…</p>
          <Loader2 className="mx-auto mt-3 h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

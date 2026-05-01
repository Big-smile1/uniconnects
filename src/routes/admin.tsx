import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    if (role && role !== "admin") {
      void navigate({ to: dashboardPathFor(role) });
    }
  }, [session, role, loading, navigate]);

  if (loading || !session || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role !== "admin") return null;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

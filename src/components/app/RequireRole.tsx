import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth, dashboardPathFor, type AppRole } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export function RequireRole({ role, children }: { role: AppRole | AppRole[]; children: ReactNode }) {
  const { role: current, loading } = useAuth();
  const navigate = useNavigate();
  const allowed = Array.isArray(role) ? role : [role];

  useEffect(() => {
    if (loading) return;
    if (!current) return;
    if (!allowed.includes(current)) {
      void navigate({ to: dashboardPathFor(current) });
    }
  }, [current, loading, navigate, allowed]);

  if (loading || !current) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!allowed.includes(current)) return null;
  return <>{children}</>;
}

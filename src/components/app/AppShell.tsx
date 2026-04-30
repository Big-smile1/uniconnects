import { Link, useLocation } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  ClipboardCheck,
  Bell,
  UserCircle2,
  Megaphone,
  LogOut,
  Menu,
  X,
  Send,
  Heart,
  ClipboardList,
} from "lucide-react";
import { useState, type ReactNode } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navByRole: Record<AppRole, NavItem[]> = {
  student: [
    { to: "/app/student", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/student/courses", label: "Courses", icon: BookOpen },
    { to: "/app/student/results", label: "My Results", icon: GraduationCap },
    { to: "/app/student/parents", label: "Parents/Guardians", icon: Heart },
    { to: "/app/announcements", label: "Announcements", icon: Megaphone },
    { to: "/app/profile", label: "Profile", icon: UserCircle2 },
  ],
  lecturer: [
    { to: "/app/lecturer", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/lecturer/courses", label: "My Courses", icon: BookOpen },
    { to: "/app/announcements", label: "Announcements", icon: Megaphone },
    { to: "/app/profile", label: "Profile", icon: UserCircle2 },
  ],
  admin: [
    { to: "/app/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/admin/users", label: "Users", icon: Users },
    { to: "/app/admin/departments", label: "Departments", icon: Building2 },
    { to: "/app/admin/courses", label: "Courses", icon: BookOpen },
    { to: "/app/admin/enrollments", label: "Enrollments", icon: ClipboardList },
    { to: "/app/admin/approvals", label: "Approvals", icon: ClipboardCheck },
    { to: "/app/admin/notifications", label: "Notifications", icon: Bell },
    { to: "/app/admin/announcements", label: "Announcements", icon: Megaphone },
    { to: "/app/profile", label: "Profile", icon: UserCircle2 },
  ],
  parent: [
    { to: "/app/parent", label: "My Children", icon: Heart },
    { to: "/app/announcements", label: "Announcements", icon: Megaphone },
    { to: "/app/profile", label: "Profile", icon: UserCircle2 },
  ],
};

const roleLabels: Record<AppRole, string> = {
  student: "Student",
  lecturer: "Lecturer",
  admin: "Administrator",
  parent: "Parent",
};

export function AppShell({ children }: { children: ReactNode }) {
  const { role, user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!role) return <>{children}</>;
  const nav = navByRole[role];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border p-5">
          <Link to="/app">
            <Logo variant="light" />
          </Link>
        </div>
        <SidebarNav items={nav} />
        <SidebarFooter
          email={user?.email ?? ""}
          roleLabel={roleLabels[role]}
          onSignOut={signOut}
        />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex items-center justify-between border-b border-sidebar-border p-5">
              <Logo variant="light" />
              <button onClick={() => setMobileOpen(false)} className="text-sidebar-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav items={nav} onItemClick={() => setMobileOpen(false)} />
            <SidebarFooter email={user?.email ?? ""} roleLabel={roleLabels[role]} onSignOut={signOut} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
          <div className="w-5" />
        </header>
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({ items, onItemClick }: { items: NavItem[]; onItemClick?: () => void }) {
  const location = useLocation();
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {items.map((item) => {
        const active = location.pathname === item.to || (item.to !== "/app" && location.pathname.startsWith(item.to));
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ email, roleLabel, onSignOut }: { email: string; roleLabel: string; onSignOut: () => void }) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="mb-2 px-2 py-1">
        <div className="truncate text-sm font-medium">{email}</div>
        <div className="text-xs text-sidebar-foreground/60">{roleLabel}</div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        onClick={onSignOut}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-background/50 px-4 py-6 sm:px-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="px-4 py-6 sm:px-8">{children}</div>;
}

// Re-export Send icon used in some pages
export { Send };

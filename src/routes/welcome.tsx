import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useAuth, dashboardPathFor, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";
import {
  ArrowRight,
  Quote,
  GraduationCap,
  BookOpen,
  Heart,
  ClipboardCheck,
  Megaphone,
  Users,
  Bell,
  UserCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome — Mountain Top University" },
      { name: "description", content: "Your academic journey continues. Aim higher today." },
    ],
  }),
  component: WelcomePage,
});

const QUOTES = [
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "Chinua Achebe" },
  { text: "One child, one teacher, one book and one pen can change the world.", author: "Malala Yousafzai" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "A man who does not know where the rain began to beat him cannot know where his body became dry.", author: "Chinua Achebe" },
  { text: "There is no end to education. The whole of life is a process of learning.", author: "Wole Soyinka" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
];

interface QuickAction {
  to: string;
  title: string;
  body: string;
  icon: typeof BookOpen;
}

const actionsByRole: Record<AppRole, QuickAction[]> = {
  student: [
    { to: "/app/student/results", title: "Check your results", body: "Track your GPA, CGPA and class of degree.", icon: GraduationCap },
    { to: "/app/student/courses", title: "Enrol in courses", body: "Pick this semester's courses for your level.", icon: BookOpen },
    { to: "/app/student/parents", title: "Add a parent", body: "So they're notified the moment results drop.", icon: Heart },
  ],
  lecturer: [
    { to: "/app/lecturer", title: "Open my courses", body: "Upload scores and manage your students' results.", icon: BookOpen },
    { to: "/app/announcements", title: "Post an announcement", body: "Share updates with your class instantly.", icon: Megaphone },
    { to: "/app/profile", title: "Update profile", body: "Keep your contact details up to date.", icon: UserCircle2 },
  ],
  admin: [
    { to: "/app/admin/approvals", title: "Approve pending results", body: "Release verified results to students and parents.", icon: ClipboardCheck },
    { to: "/app/admin/users", title: "Manage users", body: "Add lecturers, assign roles, oversee the system.", icon: Users },
    { to: "/app/admin/notifications", title: "Notification centre", body: "See every SMS and email sent to parents.", icon: Bell },
  ],
  parent: [
    { to: "/app/parent", title: "View your child's results", body: "Stay across every approved semester result.", icon: GraduationCap },
    { to: "/app/announcements", title: "Read announcements", body: "University-wide notices from the ICT unit.", icon: Megaphone },
    { to: "/app/profile", title: "Update your profile", body: "Keep your contact details current.", icon: UserCircle2 },
  ],
};

function greetingForHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function WelcomePage() {
  const navigate = useNavigate();
  const { session, role, user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void navigate({ to: "/auth", search: { redirect: "/welcome" } });
    }
  }, [session, loading, navigate]);

  // Stable per-session quote so it doesn't change on re-render.
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  if (loading || !session || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? "";
  const firstName = fullName.trim().split(/\s+/)[0] || (user?.email?.split("@")[0] ?? "there");
  const greeting = greetingForHour();
  const actions = actionsByRole[role];
  const dashPath = dashboardPathFor(role);

  return (
    <div className="relative min-h-screen overflow-hidden gradient-hero">
      {/* Decorative ambient blobs */}
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <Link
            to={dashPath}
            className="text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </Link>
        </div>

        {/* Hero */}
        <div className="mt-12 sm:mt-20">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-gold-foreground animate-in fade-in slide-in-from-bottom-2 duration-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {greeting}
          </div>

          <h1
            className="mt-5 text-balance font-serif text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: "80ms", animationFillMode: "both" }}
          >
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-primary to-primary-muted bg-clip-text text-transparent">
              {firstName}
            </span>
            .
          </h1>

          <p
            className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: "180ms", animationFillMode: "both" }}
          >
            Every great result starts with a single decision — to show up today.
            Small efforts, repeated daily, become the grades your family will be
            proud of.
          </p>
        </div>

        {/* Quote card */}
        <Card
          className="mt-10 overflow-hidden border-border/60 bg-card/70 p-6 shadow-elegant backdrop-blur sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{ animationDelay: "300ms", animationFillMode: "both" }}
        >
          <div className="flex gap-4 sm:gap-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary sm:h-12 sm:w-12">
              <Quote className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div>
              <p className="font-serif text-xl leading-relaxed text-foreground sm:text-2xl">
                "{quote.text}"
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                — {quote.author}
              </p>
            </div>
          </div>
        </Card>

        {/* Quick actions */}
        <div className="mt-10">
          <div
            className="text-xs font-medium uppercase tracking-[0.18em] text-gold-foreground animate-in fade-in duration-700"
            style={{ animationDelay: "420ms", animationFillMode: "both" }}
          >
            Today, you can…
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {actions.map((a, i) => (
              <Link
                key={a.to}
                to={a.to}
                className="group block animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{ animationDelay: `${500 + i * 100}ms`, animationFillMode: "both" }}
              >
                <Card className="h-full border-border/60 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
                  <a.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 font-serif text-base font-semibold leading-tight">
                    {a.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {a.body}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-70 transition-opacity group-hover:opacity-100">
                    Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className="mt-12 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-bottom-2 duration-700"
          style={{ animationDelay: "900ms", animationFillMode: "both" }}
        >
          <p className="text-sm text-muted-foreground">
            Tip: bookmark your dashboard for one-tap access.
          </p>
          <Button
            size="lg"
            className="gap-2"
            onClick={() => void navigate({ to: dashPath })}
          >
            Continue to my dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-auto pt-12 text-center text-xs text-muted-foreground">
          You've got this. One day, one course, one win at a time.
        </div>
      </div>
    </div>
  );
}

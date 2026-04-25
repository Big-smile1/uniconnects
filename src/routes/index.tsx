import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";
import {
  GraduationCap,
  Users,
  ClipboardCheck,
  Bell,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduLink Nigeria — Results Delivered to Every Parent" },
      {
        name: "description",
        content:
          "A smart university portal for Nigerian schools. Lecturers upload results, admins approve, and parents are notified automatically by SMS and email.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#contact" className="transition-colors hover:text-foreground">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/auth" search={{ tab: "signup" }}>
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="gradient-hero relative overflow-hidden border-b border-border/60">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-gold-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Built for Nigerian universities
          </span>
          <h1 className="mt-6 text-balance font-serif text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Every result, in every parent's hand.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            EduLink Nigeria connects students, lecturers, admins and{" "}
            <strong className="text-foreground">parents</strong> in one portal. When results are
            approved, parents receive them automatically — by SMS and email — even if they've never
            opened a portal in their life.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ tab: "signup" }}>
              <Button size="lg" className="gap-2">
                Open student account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="outline">See how it works</Button>
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Mobile-first</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Low-bandwidth</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Privacy-first</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-primary/10 via-gold/10 to-transparent blur-2xl" />
          <Card className="overflow-hidden border-border/60 p-0 shadow-elegant">
            <div className="gradient-primary px-6 py-4 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider opacity-70">Result released</div>
                  <div className="font-serif text-lg">First Semester · 2024/2025</div>
                </div>
                <GraduationCap className="h-6 w-6 opacity-80" />
              </div>
            </div>
            <div className="space-y-3 p-6">
              {[
                { code: "CSC 301", title: "Operating Systems", grade: "A", score: 78 },
                { code: "CSC 305", title: "Software Engineering", grade: "B", score: 65 },
                { code: "MTH 301", title: "Numerical Analysis", grade: "A", score: 82 },
                { code: "GST 301", title: "Entrepreneurship", grade: "C", score: 56 },
              ].map((c) => (
                <div key={c.code} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="text-sm font-medium">{c.code}</div>
                    <div className="text-xs text-muted-foreground">{c.title}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-muted-foreground">{c.score}</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-success/15 text-xs font-bold text-success">
                      {c.grade}
                    </span>
                  </div>
                </div>
              ))}
              <div className="mt-4 flex items-center justify-between rounded-md bg-secondary p-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Semester GPA</div>
                  <div className="font-serif text-2xl font-semibold">4.25</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">CGPA</div>
                  <div className="font-serif text-2xl font-semibold text-primary">4.18</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-gold/30 bg-gold/10 p-3 text-xs">
                <MessageSquare className="h-4 w-4 text-gold-foreground" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">SMS sent</strong> to parent · {" "}
                  <strong className="text-foreground">Email sent</strong> to guardian
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="border-b border-border/60 bg-background py-12">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {[
          { v: "4 roles", l: "Student · Lecturer · Admin · Parent" },
          { v: "2-stage", l: "Lecturer → HOD → Admin approval" },
          { v: "SMS + Email", l: "Multi-channel parent alerts" },
          { v: "100% RLS", l: "Privacy-first by design" },
        ].map((s) => (
          <div key={s.v}>
            <div className="font-serif text-2xl font-semibold text-primary">{s.v}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Lecturer uploads results",
      body: "Enter scores manually or upload a CSV. Grades and points are auto-calculated.",
      icon: ClipboardCheck,
    },
    {
      num: "02",
      title: "HOD & Admin approve",
      body: "Two-stage approval workflow ensures every result is verified before release.",
      icon: ShieldCheck,
    },
    {
      num: "03",
      title: "Students see results",
      body: "Approved results appear instantly in the student portal with GPA and CGPA.",
      icon: GraduationCap,
    },
    {
      num: "04",
      title: "Parents are notified",
      body: "Every linked parent receives an SMS and email with the result summary — automatically.",
      icon: Bell,
    },
  ];
  return (
    <section id="how" className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-gold-foreground">How it works</span>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight">From upload to parent's phone in minutes</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Card key={s.num} className="border-border/60 p-6 transition-shadow hover:shadow-elegant">
              <div className="flex items-center justify-between">
                <span className="font-serif text-3xl text-gold">{s.num}</span>
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Users, title: "Four role dashboards", body: "Tailored views for students, lecturers, admins, and parents." },
    { icon: ClipboardCheck, title: "CSV result upload", body: "Bulk upload semester results with automatic grade computation." },
    { icon: Bell, title: "Auto parent alerts", body: "Approved results trigger SMS + email instantly to every linked parent." },
    { icon: ShieldCheck, title: "Two-stage approval", body: "Lecturer drafts → HOD approves → Admin releases. Mistakes caught early." },
    { icon: Smartphone, title: "Mobile-first", body: "Works on the cheapest Android phone over 2G/3G." },
    { icon: Mail, title: "Channel choice", body: "Parents without phones still get email. Both can be resent on demand." },
  ];
  return (
    <section id="features" className="bg-secondary/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-gold-foreground">Features</span>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight">Everything a Nigerian university needs</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border border-border/60 bg-card p-6 shadow-card">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-serif text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-y border-border/60 bg-background py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          Ready to see your results follow you home?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Open a free student account in 30 seconds. Lecturers and admins join by invitation.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth" search={{ tab: "signup" }}>
            <Button size="lg" className="gap-2">
              Create student account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline">I already have one</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer id="contact" className="bg-background py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <Logo />
        <div>© {new Date().getFullYear()} EduLink Nigeria. Built for Nigerian universities.</div>
      </div>
    </footer>
  );
}

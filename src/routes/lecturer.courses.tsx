import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Check, X, Lock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/lecturer/courses")({
  head: () => ({ meta: [{ title: "My courses — Mountain Top University" }] }),
  component: () => (
    <RequireRole role="lecturer">
      <LecturerCourses />
    </RequireRole>
  ),
});

type Course = {
  id: string;
  code: string;
  title: string;
  level: number;
  semester: string;
  credit_units: number;
  department_id: string | null;
  lecturer_id: string | null;
};

function LecturerCourses() {
  const { user } = useAuth();
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Get the lecturer's department
    const { data: prof } = await supabase
      .from("profiles")
      .select("department_id, departments:department_id(name)")
      .eq("id", user.id)
      .maybeSingle();

    const dept = prof?.department_id ?? null;
    setDepartmentId(dept);
    setDepartmentName(((prof as any)?.departments?.name as string) ?? "");

    if (!dept) {
      setCourses([]);
      setLoading(false);
      return;
    }

    const { data: cs, error } = await supabase
      .from("courses")
      .select("id, code, title, level, semester, credit_units, department_id, lecturer_id")
      .eq("department_id", dept)
      .order("level")
      .order("code");

    if (error) toast.error(error.message);
    setCourses((cs as Course[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user]);

  const claim = async (course: Course) => {
    if (!user) return;
    if (course.lecturer_id && course.lecturer_id !== user.id) {
      toast.error("Already assigned to another lecturer. Please contact the admin.");
      return;
    }
    setBusyId(course.id);
    const { error, data } = await supabase
      .from("courses")
      .update({ lecturer_id: user.id })
      .eq("id", course.id)
      .is("lecturer_id", null) // race-safe: only claim if still unassigned
      .select("id")
      .maybeSingle();
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("Someone just claimed this course. Refreshing…");
      void load();
      return;
    }
    toast.success(`Picked ${course.code}`);
    void load();
  };

  const release = async (course: Course) => {
    if (!user) return;
    setBusyId(course.id);
    const { error } = await supabase
      .from("courses")
      .update({ lecturer_id: null })
      .eq("id", course.id)
      .eq("lecturer_id", user.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Released ${course.code}`);
    void load();
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(needle) ||
        c.title.toLowerCase().includes(needle),
    );
  }, [courses, q]);

  const mine = filtered.filter((c) => c.lecturer_id === user?.id);
  const available = filtered.filter((c) => c.lecturer_id === null);
  const taken = filtered.filter((c) => c.lecturer_id && c.lecturer_id !== user?.id);

  return (
    <>
      <PageHeader
        title="My courses"
        subtitle={
          departmentName
            ? `Pick the classes you teach in ${departmentName}.`
            : "Pick the classes you teach."
        }
      />
      <PageBody>
        {!departmentId && !loading ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">
              You don't have a department on your profile yet. Please update your profile so we can show
              the right courses for you.
            </p>
          </Card>
        ) : (
          <>
            <div className="mb-4 max-w-sm">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search course code or title…"
              />
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading courses…
              </div>
            ) : (
              <div className="space-y-6">
                <Section
                  title="Courses I teach"
                  empty="You haven't picked any courses yet."
                  items={mine}
                  renderAction={(c) => (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === c.id}
                      onClick={() => void release(c)}
                    >
                      {busyId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Release
                    </Button>
                  )}
                  badge={<Badge variant="secondary">Mine</Badge>}
                />

                <Section
                  title="Available to pick"
                  empty="No unassigned courses in your department."
                  items={available}
                  renderAction={(c) => (
                    <Button
                      size="sm"
                      disabled={busyId === c.id}
                      onClick={() => void claim(c)}
                    >
                      {busyId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Pick
                    </Button>
                  )}
                />

                <Section
                  title="Taken by another lecturer"
                  empty="No courses are currently assigned to other lecturers."
                  items={taken}
                  renderAction={() => (
                    <Button size="sm" variant="ghost" disabled>
                      <Lock className="h-4 w-4" /> Taken
                    </Button>
                  )}
                  muted
                />

                {courses.length === 0 && (
                  <Card className="p-6 text-sm text-muted-foreground">
                    No courses exist in your department yet. Ask the ICT/admin unit to add the
                    department's courses, then come back here to pick yours.
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}

function Section({
  title,
  empty,
  items,
  renderAction,
  badge,
  muted,
}: {
  title: string;
  empty: string;
  items: Course[];
  renderAction: (c: Course) => React.ReactNode;
  badge?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((c) => (
            <li
              key={c.id}
              className={`flex items-center justify-between py-3 ${muted ? "opacity-70" : ""}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.code}</span>
                  <span className="text-muted-foreground">— {c.title}</span>
                  {badge}
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.level} level · {c.semester} · {c.credit_units} units
                </div>
              </div>
              {renderAction(c)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

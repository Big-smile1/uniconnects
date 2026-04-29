import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Upload, Trash2, Loader2, ClipboardList, Download } from "lucide-react";

export const Route = createFileRoute("/app/admin/enrollments")({
  head: () => ({ meta: [{ title: "Enrollments — Admin · Mountain Top University" }] }),
  component: () => (
    <RequireRole role="admin">
      <AdminEnrollments />
    </RequireRole>
  ),
});

type Student = { id: string; full_name: string; matric_number: string | null; level: number | null; department_id: string | null };
type Course = { id: string; code: string; title: string; credit_units: number; level: number; semester: string; department_id: string | null };
type EnrollmentRow = {
  id: string;
  session: string;
  created_at: string;
  student_id: string;
  course_id: string;
  student_name?: string;
  matric?: string | null;
  course_code?: string;
  course_title?: string;
  credit_units?: number;
};

const currentSession = (() => {
  const now = new Date();
  const y = now.getFullYear();
  // Nigerian academic session typically starts mid-year
  const start = now.getMonth() >= 7 ? y : y - 1;
  return `${start}/${start + 1}`;
})();

function AdminEnrollments() {
  const [session, setSession] = useState<string>(currentSession);
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [studentEnrollments, setStudentEnrollments] = useState<EnrollmentRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const searchStudents = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setStudentResults([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, matric_number, level, department_id")
      .or(`full_name.ilike.%${trimmed}%,matric_number.ilike.%${trimmed}%`)
      .limit(20);
    // Filter to students only on the client (RLS already restricts admin read)
    if (!data) { setStudentResults([]); return; }
    const ids = data.map((p) => p.id);
    if (ids.length === 0) { setStudentResults([]); return; }
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
    const studentIds = new Set((roles ?? []).filter((r) => r.role === "student").map((r) => r.user_id));
    setStudentResults((data as Student[]).filter((p) => studentIds.has(p.id)));
  };

  const loadStudentEnrollments = async (studentId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("enrollments")
      .select("id, session, created_at, student_id, course_id, courses(code, title, credit_units)")
      .eq("student_id", studentId)
      .order("session", { ascending: false })
      .order("created_at");
    const rows: EnrollmentRow[] = (data ?? []).map((e: any) => ({
      id: e.id,
      session: e.session,
      created_at: e.created_at,
      student_id: e.student_id,
      course_id: e.course_id,
      course_code: e.courses?.code,
      course_title: e.courses?.title,
      credit_units: e.courses?.credit_units,
    }));
    setStudentEnrollments(rows);
    setLoading(false);
  };

  const loadCoursesForStudent = async (s: Student) => {
    let query = supabase
      .from("courses")
      .select("id, code, title, credit_units, level, semester, department_id")
      .order("level")
      .order("code");
    if (s.department_id) query = query.eq("department_id", s.department_id);
    const { data } = await query;
    setCourses((data as Course[]) ?? []);
  };

  const pickStudent = async (s: Student) => {
    setSelectedStudent(s);
    setStudentResults([]);
    setStudentQuery(`${s.full_name}${s.matric_number ? " · " + s.matric_number : ""}`);
    await Promise.all([loadStudentEnrollments(s.id), loadCoursesForStudent(s)]);
  };

  const enrolStudent = async (course_id: string) => {
    if (!selectedStudent) return;
    const { error } = await supabase.from("enrollments").insert({
      student_id: selectedStudent.id,
      course_id,
      session,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Course registered");
    void loadStudentEnrollments(selectedStudent.id);
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this course registration?")) return;
    const { error } = await supabase.from("enrollments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed");
    if (selectedStudent) void loadStudentEnrollments(selectedStudent.id);
  };

  const enrolledIds = useMemo(
    () => new Set(studentEnrollments.filter((e) => e.session === session).map((e) => e.course_id)),
    [studentEnrollments, session],
  );

  return (
    <>
      <PageHeader
        title="Course Registration"
        subtitle="Register courses for students each session. Students see this as read-only."
        actions={
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Bulk import CSV
          </Button>
        }
      />
      <PageBody>
        <Card className="mb-4 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_200px]">
            <div className="relative space-y-2">
              <Label>Find student</Label>
              <Input
                value={studentQuery}
                onChange={(e) => {
                  setStudentQuery(e.target.value);
                  setSelectedStudent(null);
                  void searchStudents(e.target.value);
                }}
                placeholder="Search by name or matric number…"
              />
              {studentResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-popover shadow-elegant">
                  {studentResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => void pickStudent(s)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <div className="font-medium">{s.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.matric_number ?? "no matric"} · Level {s.level ?? "—"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Session</Label>
              <Input value={session} onChange={(e) => setSession(e.target.value)} placeholder="2024/2025" />
            </div>
          </div>
        </Card>

        {!selectedStudent ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <div className="font-serif text-lg">Pick a student to manage their courses</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Search by name or matric number. You can also bulk import a CSV from the school portal.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-serif text-lg">{selectedStudent.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedStudent.matric_number ?? "no matric"} · Level {selectedStudent.level ?? "—"}
                </div>
              </div>
              <Button onClick={() => setAddOpen(true)} disabled={courses.length === 0}>
                <Plus className="h-4 w-4" /> Register course
              </Button>
            </div>

            <Card className="overflow-hidden p-0">
              <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Registered courses
              </div>
              {loading ? (
                <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : studentEnrollments.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No courses registered yet.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {studentEnrollments.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium">
                          {e.course_code} <span className="text-muted-foreground">· {e.course_title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {e.session} · {e.credit_units ?? "—"} units
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{e.session}</Badge>
                        <Button size="icon" variant="ghost" onClick={() => void remove(e.id)} title="Remove">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </PageBody>

      {/* Add-course dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register a course for {selectedStudent?.full_name}</DialogTitle>
            <DialogDescription>Session {session}. Department-matched courses are listed.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-auto">
            {courses.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No courses available for this department.</p>
            ) : (
              <ul className="divide-y divide-border">
                {courses.map((c) => {
                  const already = enrolledIds.has(c.id);
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-2 py-3 text-sm">
                      <div>
                        <div className="font-medium">{c.code} <span className="text-muted-foreground">· {c.title}</span></div>
                        <div className="text-xs text-muted-foreground">Level {c.level} · {c.semester} · {c.credit_units} units</div>
                      </div>
                      <Button size="sm" disabled={already} onClick={() => void enrolStudent(c.id)}>
                        {already ? "Registered" : "Register"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportEnrollmentsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        defaultSession={session}
        onImported={() => {
          if (selectedStudent) void loadStudentEnrollments(selectedStudent.id);
        }}
      />
    </>
  );
}

/* ---------------- CSV import ---------------- */

type ImportRow = {
  matric_number: string;
  course_code: string;
  session: string;
  _student_id?: string;
  _course_id?: string;
  _error?: string;
  _existing?: boolean;
};

function BulkImportEnrollmentsDialog({
  open,
  onOpenChange,
  defaultSession,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSession: string;
  onImported: () => void;
}) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setRows([]);
      setFileName("");
    }
  }, [open]);

  const splitRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { out.push(cur); cur = ""; } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const onFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const header = splitRow(lines[0]).map((h) => h.toLowerCase());
    const iMatric = header.indexOf("matric_number");
    const iCode = header.indexOf("course_code");
    const iSession = header.indexOf("session");
    if (iMatric < 0 || iCode < 0) {
      toast.error("CSV needs columns: matric_number, course_code (session optional)");
      return;
    }
    const parsed: ImportRow[] = lines.slice(1).map((l) => {
      const cols = splitRow(l);
      return {
        matric_number: (cols[iMatric] ?? "").toUpperCase(),
        course_code: (cols[iCode] ?? "").toUpperCase(),
        session: iSession >= 0 ? (cols[iSession] ?? defaultSession) : defaultSession,
      };
    }).filter((r) => r.matric_number && r.course_code);

    // Resolve students & courses
    const matrics = Array.from(new Set(parsed.map((r) => r.matric_number)));
    const codes = Array.from(new Set(parsed.map((r) => r.course_code)));
    const [{ data: students }, { data: cs }] = await Promise.all([
      supabase.from("profiles").select("id, matric_number").in("matric_number", matrics),
      supabase.from("courses").select("id, code").in("code", codes),
    ]);
    const studentMap = new Map((students ?? []).map((s: any) => [s.matric_number, s.id]));
    const courseMap = new Map((cs ?? []).map((c: any) => [c.code, c.id]));

    const resolved = parsed.map((r) => {
      const sid = studentMap.get(r.matric_number);
      const cid = courseMap.get(r.course_code);
      const err = !sid ? "Unknown student" : !cid ? "Unknown course" : undefined;
      return { ...r, _student_id: sid, _course_id: cid, _error: err } as ImportRow;
    });

    // Check existing enrollments to flag duplicates (block & notice)
    const sids = Array.from(new Set(resolved.map((r) => r._student_id).filter(Boolean) as string[]));
    if (sids.length) {
      const { data: existing } = await supabase
        .from("enrollments")
        .select("student_id, course_id, session")
        .in("student_id", sids);
      const key = (s: string, c: string, ss: string) => `${s}|${c}|${ss}`;
      const existSet = new Set((existing ?? []).map((e) => key(e.student_id, e.course_id, e.session)));
      resolved.forEach((r) => {
        if (r._student_id && r._course_id && existSet.has(key(r._student_id, r._course_id, r.session))) {
          r._existing = true;
        }
      });
    }
    setRows(resolved);
  };

  const importable = rows.filter((r) => !r._error && !r._existing);

  const runImport = async () => {
    if (importable.length === 0) {
      toast.error("Nothing to import");
      return;
    }
    setBusy(true);
    const payload = importable.map((r) => ({
      student_id: r._student_id!,
      course_id: r._course_id!,
      session: r.session,
    }));
    const { error } = await supabase.from("enrollments").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Registered ${payload.length} course${payload.length === 1 ? "" : "s"}`);
    onImported();
    onOpenChange(false);
  };

  const sample = "matric_number,course_code,session\nMTU/CSC/21/0001,CSC201,2024/2025\nMTU/CSC/21/0001,MTH201,2024/2025\n";
  const downloadSample = () => {
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enrollments-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk import course registrations</DialogTitle>
          <DialogDescription>
            Columns: <code>matric_number</code>, <code>course_code</code>, <code>session</code> (optional, defaults to {defaultSession}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Choose CSV
            </Button>
            <Button variant="ghost" onClick={downloadSample}>
              <Download className="h-4 w-4" /> Sample CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
            {fileName && <span className="self-center text-xs text-muted-foreground">{fileName}</span>}
          </div>

          {rows.length > 0 && (
            <div className="rounded-md border border-border">
              <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                <div className="col-span-4">Matric</div>
                <div className="col-span-3">Course</div>
                <div className="col-span-2">Session</div>
                <div className="col-span-3">Status</div>
              </div>
              <ul className="max-h-[320px] divide-y divide-border overflow-auto">
                {rows.map((r, i) => (
                  <li key={i} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs">
                    <div className="col-span-4 truncate font-medium">{r.matric_number}</div>
                    <div className="col-span-3 truncate">{r.course_code}</div>
                    <div className="col-span-2 truncate">{r.session}</div>
                    <div className="col-span-3">
                      {r._error ? (
                        <Badge variant="destructive">{r._error}</Badge>
                      ) : r._existing ? (
                        <Badge variant="outline">Already registered</Badge>
                      ) : (
                        <Badge variant="secondary">Ready</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {importable.length} ready · {rows.filter((r) => r._existing).length} duplicates skipped · {rows.filter((r) => r._error).length} errors
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void runImport()} disabled={busy || importable.length === 0}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {importable.length || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

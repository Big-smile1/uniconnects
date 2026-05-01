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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, Plus, Upload, Trash2, UserMinus, Loader2, Download } from "lucide-react";

export const Route = createFileRoute("/app/admin/courses")({
  head: () => ({ meta: [{ title: "Courses — Admin · Mountain Top University" }] }),
  component: () => (
    <RequireRole role="admin">
      <AdminCourses />
    </RequireRole>
  ),
});

type Department = { id: string; code: string; name: string };
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

const SEMESTERS = ["First", "Second"] as const;
const LEVELS = [100, 200, 300, 400, 500] as const;

function AdminCourses() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturerNames, setLecturerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const loadDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("id, code, name")
      .order("name");
    if (error) toast.error(error.message);
    setDepartments(data ?? []);
  };

  const loadCourses = async () => {
    setLoading(true);
    let query = supabase
      .from("courses")
      .select("id, code, title, level, semester, credit_units, department_id, lecturer_id")
      .order("level")
      .order("code");
    if (departmentId !== "all") query = query.eq("department_id", departmentId);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    const list = (data as Course[]) ?? [];
    setCourses(list);

    const lecturerIds = Array.from(
      new Set(list.map((c) => c.lecturer_id).filter((x): x is string => !!x)),
    );
    if (lecturerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", lecturerIds);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => {
        map[p.id] = p.full_name;
      });
      setLecturerNames(map);
    } else {
      setLecturerNames({});
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadDepartments();
  }, []);
  useEffect(() => {
    void loadCourses();
  }, [departmentId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(needle) || c.title.toLowerCase().includes(needle),
    );
  }, [courses, q]);

  const removeCourse = async (id: string) => {
    if (!confirm("Delete this course? Enrollments and results linked to it will be affected.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Course deleted");
    void loadCourses();
  };

  const unassignLecturer = async (id: string) => {
    const { error } = await supabase.from("courses").update({ lecturer_id: null }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lecturer unassigned");
    void loadCourses();
  };

  const departmentName = (id: string | null) =>
    id ? departments.find((d) => d.id === id)?.code ?? "—" : "—";

  return (
    <>
      <PageHeader
        title="Courses"
        subtitle="Create courses department-by-department or bulk-import via CSV. Lecturers will then pick what they teach."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Bulk import CSV
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New course
            </Button>
          </div>
        }
      />
      <PageBody>
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2 min-w-[200px]">
              <Label>Search</Label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search code or title…"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filtered.length} course{filtered.length === 1 ? "" : "s"}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-2">Code</div>
              <div className="col-span-4">Title</div>
              <div className="col-span-1">Level</div>
              <div className="col-span-1">Sem</div>
              <div className="col-span-1">Units</div>
              <div className="col-span-1">Dept</div>
              <div className="col-span-2 text-right">Lecturer</div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <BookOpen className="mx-auto mb-2 h-6 w-6 opacity-50" />
              No courses yet. Create one or import a CSV to get started.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => (
                <li key={c.id} className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm">
                  <div className="col-span-2 font-medium">{c.code}</div>
                  <div className="col-span-4 truncate">{c.title}</div>
                  <div className="col-span-1">{c.level}</div>
                  <div className="col-span-1">{c.semester}</div>
                  <div className="col-span-1">{c.credit_units}</div>
                  <div className="col-span-1 text-muted-foreground">{departmentName(c.department_id)}</div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {c.lecturer_id ? (
                      <>
                        <Badge variant="secondary" className="truncate max-w-[140px]">
                          {lecturerNames[c.lecturer_id] ?? "Assigned"}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Unassign lecturer"
                          onClick={() => void unassignLecturer(c.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline">Unassigned</Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Delete course"
                      onClick={() => void removeCourse(c.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </PageBody>

      <CreateCourseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        departments={departments}
        defaultDepartmentId={departmentId !== "all" ? departmentId : ""}
        onCreated={() => void loadCourses()}
      />
      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        departments={departments}
        defaultDepartmentId={departmentId !== "all" ? departmentId : ""}
        onImported={() => void loadCourses()}
      />
    </>
  );
}

/* ---------------- Create dialog ---------------- */

function CreateCourseDialog({
  open,
  onOpenChange,
  departments,
  defaultDepartmentId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departments: Department[];
  defaultDepartmentId: string;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<string>("100");
  const [semester, setSemester] = useState<string>("First");
  const [credits, setCredits] = useState<string>("3");
  const [deptId, setDeptId] = useState<string>(defaultDepartmentId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setDeptId(defaultDepartmentId);
  }, [open, defaultDepartmentId]);

  const reset = () => {
    setCode("");
    setTitle("");
    setLevel("100");
    setSemester("First");
    setCredits("3");
  };

  const submit = async () => {
    if (!code.trim() || !title.trim() || !deptId) {
      toast.error("Code, title and department are required");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("courses").insert({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      level: Number(level),
      semester,
      credit_units: Number(credits) || 3,
      department_id: deptId,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Course created");
    reset();
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New course</DialogTitle>
          <DialogDescription>Add a single course to a department.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CSC 201" />
            </div>
            <div className="space-y-2">
              <Label>Credit units</Label>
              <Input type="number" min={1} max={9} value={credits} onChange={(e) => setCredits(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Introduction to Programming" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={String(l)}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Create course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Bulk CSV import ---------------- */

type ParsedRow = {
  code: string;
  title: string;
  level: number;
  semester: string;
  credit_units: number;
  department_id: string;
  _error?: string;
  _existing?: boolean;
};

function BulkImportDialog({
  open,
  onOpenChange,
  departments,
  defaultDepartmentId,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departments: Department[];
  defaultDepartmentId: string;
  onImported: () => void;
}) {
  const [deptId, setDeptId] = useState<string>(defaultDepartmentId);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDeptId(defaultDepartmentId);
      setRows([]);
      setFileName("");
    }
  }, [open, defaultDepartmentId]);

  const deptByCode = useMemo(() => {
    const m: Record<string, string> = {};
    departments.forEach((d) => {
      m[d.code.toUpperCase()] = d.id;
    });
    return m;
  }, [departments]);

  const parseCsv = (text: string): ParsedRow[] => {
    // Simple CSV parser: split lines, split by comma, trim. Supports optional quotes.
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    const splitRow = (line: string): string[] => {
      const out: string[] = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQ = !inQ;
          continue;
        }
        if (ch === "," && !inQ) {
          out.push(cur);
          cur = "";
        } else cur += ch;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };

    const header = splitRow(lines[0]).map((h) => h.toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const iCode = idx("code");
    const iTitle = idx("title");
    const iLevel = idx("level");
    const iSem = idx("semester");
    const iUnits = idx("credit_units");
    const iDept = idx("department_code");

    if (iCode < 0 || iTitle < 0 || iLevel < 0 || iSem < 0) {
      toast.error("CSV must include columns: code, title, level, semester (credit_units, department_code optional)");
      return [];
    }

    return lines.slice(1).map((line) => {
      const cols = splitRow(line);
      const code = (cols[iCode] ?? "").toUpperCase();
      const title = cols[iTitle] ?? "";
      const lvl = Number(cols[iLevel]);
      const sem = cols[iSem] ?? "";
      const units = iUnits >= 0 ? Number(cols[iUnits]) || 3 : 3;
      const deptCode = iDept >= 0 ? (cols[iDept] ?? "").toUpperCase() : "";
      const resolvedDept = deptCode ? deptByCode[deptCode] ?? "" : deptId;

      let err: string | undefined;
      if (!code) err = "Missing code";
      else if (!title) err = "Missing title";
      else if (![100, 200, 300, 400, 500].includes(lvl)) err = "Invalid level";
      else if (!["First", "Second"].includes(sem)) err = "Semester must be First or Second";
      else if (!resolvedDept) err = "Unknown department";

      return {
        code,
        title,
        level: lvl,
        semester: sem,
        credit_units: units,
        department_id: resolvedDept,
        _error: err,
      };
    });
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);

    // Check existing course codes in target departments to flag duplicates.
    const codes = parsed.filter((r) => !r._error).map((r) => r.code);
    if (codes.length) {
      const { data: existing } = await supabase
        .from("courses")
        .select("code, department_id")
        .in("code", codes);
      const existingSet = new Set((existing ?? []).map((e: any) => `${e.code}::${e.department_id}`));
      parsed.forEach((r) => {
        if (!r._error && existingSet.has(`${r.code}::${r.department_id}`)) {
          r._existing = true;
        }
      });
    }
    setRows(parsed);
  };

  const downloadTemplate = () => {
    const csv =
      "code,title,level,semester,credit_units,department_code\n" +
      "CSC 201,Introduction to Programming,200,First,3,CSC\n" +
      "MTH 101,General Mathematics I,100,First,3,MTH\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "courses-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importable = rows.filter((r) => !r._error && !r._existing);
  const errors = rows.filter((r) => r._error);
  const dupes = rows.filter((r) => r._existing);

  const submit = async () => {
    if (importable.length === 0) {
      toast.error("Nothing to import");
      return;
    }
    setBusy(true);
    const payload = importable.map((r) => ({
      code: r.code,
      title: r.title,
      level: r.level,
      semester: r.semester,
      credit_units: r.credit_units,
      department_id: r.department_id,
    }));
    const { error } = await supabase.from("courses").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Imported ${payload.length} course${payload.length === 1 ? "" : "s"}`);
    onOpenChange(false);
    onImported();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import courses</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns:{" "}
            <code className="text-xs">code, title, level, semester, credit_units, department_code</code>.
            If <code className="text-xs">department_code</code> is missing, the default department below is used.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Default department</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" type="button" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Download template
            </Button>
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Choose CSV file
            </Button>
            {fileName && <span className="ml-3 text-sm text-muted-foreground">{fileName}</span>}
          </div>

          {rows.length > 0 && (
            <div className="rounded-md border border-border">
              <div className="flex flex-wrap gap-3 border-b border-border bg-muted/30 px-3 py-2 text-xs">
                <span><strong>{importable.length}</strong> ready</span>
                {dupes.length > 0 && <span className="text-amber-600">{dupes.length} already exist (skipped)</span>}
                {errors.length > 0 && <span className="text-destructive">{errors.length} with errors</span>}
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/20 text-left">
                    <tr>
                      <th className="px-2 py-1">Code</th>
                      <th className="px-2 py-1">Title</th>
                      <th className="px-2 py-1">Lvl</th>
                      <th className="px-2 py-1">Sem</th>
                      <th className="px-2 py-1">Units</th>
                      <th className="px-2 py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-2 py-1 font-medium">{r.code}</td>
                        <td className="px-2 py-1">{r.title}</td>
                        <td className="px-2 py-1">{r.level}</td>
                        <td className="px-2 py-1">{r.semester}</td>
                        <td className="px-2 py-1">{r.credit_units}</td>
                        <td className="px-2 py-1">
                          {r._error ? (
                            <span className="text-destructive">{r._error}</span>
                          ) : r._existing ? (
                            <span className="text-amber-600">Exists</span>
                          ) : (
                            <span className="text-emerald-600">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || importable.length === 0}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {importable.length || ""} course{importable.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

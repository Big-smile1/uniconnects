import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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
import { toast } from "sonner";
import { Loader2, Save, Send, Upload, Download } from "lucide-react";

export const Route = createFileRoute("/lecturer/scores")({
  head: () => ({ meta: [{ title: "Score entry — Lecturer" }] }),
  component: () => (
    <RequireRole role="lecturer">
      <LecturerScores />
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
};

type Row = {
  enrollment_id: string;
  student_id: string;
  matric: string | null;
  full_name: string;
  result_id: string | null;
  ca_score: number | null;
  exam_score: number | null;
  total: number | null;
  grade: string | null;
  status: string;
  dirty?: boolean;
};

const SESSIONS = ["2025/2026", "2024/2025", "2023/2024"];

function LecturerScores() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [session, setSession] = useState<string>(SESSIONS[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  // Load courses lecturer teaches
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, code, title, level, semester, credit_units")
        .eq("lecturer_id", user.id)
        .order("code");
      setCourses((data as Course[]) ?? []);
      if (data && data.length) setCourseId(data[0].id);
      setLoading(false);
    })();
  }, [user]);

  // Load roster + existing results for selected course/session
  const loadRoster = async () => {
    if (!courseId) return;
    setLoading(true);
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("id, student_id, session, profiles:student_id(full_name, matric_number)")
      .eq("course_id", courseId)
      .eq("session", session);

    const enrolList = (enrolls as any[]) ?? [];
    const studentIds = enrolList.map((e) => e.student_id);

    const { data: results } = await supabase
      .from("results")
      .select("id, student_id, ca_score, exam_score, total, grade, status, enrollment_id")
      .eq("course_id", courseId)
      .eq("session", session)
      .in("student_id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

    const resByStudent = new Map<string, any>();
    (results ?? []).forEach((r) => resByStudent.set(r.student_id, r));

    const merged: Row[] = enrolList.map((e) => {
      const r = resByStudent.get(e.student_id);
      return {
        enrollment_id: e.id,
        student_id: e.student_id,
        matric: e.profiles?.matric_number ?? null,
        full_name: e.profiles?.full_name ?? "—",
        result_id: r?.id ?? null,
        ca_score: r?.ca_score ?? null,
        exam_score: r?.exam_score ?? null,
        total: r?.total ?? null,
        grade: r?.grade ?? null,
        status: r?.status ?? "draft",
      };
    });
    merged.sort((a, b) => (a.matric ?? "").localeCompare(b.matric ?? ""));
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    if (courseId) void loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, session]);

  const updateScore = (studentId: string, field: "ca_score" | "exam_score", val: string) => {
    const num = val === "" ? null : Number(val);
    if (num !== null && (Number.isNaN(num) || num < 0 || num > (field === "ca_score" ? 40 : 60))) {
      toast.error(`${field === "ca_score" ? "CA" : "Exam"} must be 0–${field === "ca_score" ? 40 : 60}`);
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.student_id === studentId ? { ...r, [field]: num, dirty: true } : r,
      ),
    );
  };

  const currentCourse = courses.find((c) => c.id === courseId);

  const saveAll = async (submit: boolean) => {
    if (!user || !currentCourse) return;
    const dirty = rows.filter((r) => r.dirty || (submit && r.status === "draft"));
    if (dirty.length === 0 && !submit) {
      toast.info("Nothing to save.");
      return;
    }
    setBusy(true);
    const semester = currentCourse.semester.toLowerCase().includes("first") ? "first" : "second";

    let ok = 0;
    let fail = 0;
    for (const r of dirty) {
      const payload: any = {
        student_id: r.student_id,
        course_id: currentCourse.id,
        enrollment_id: r.enrollment_id,
        session,
        semester,
        ca_score: r.ca_score ?? 0,
        exam_score: r.exam_score ?? 0,
        uploaded_by: user.id,
        status: submit ? "submitted" : (r.status === "submitted" || r.status === "admin_approved" ? r.status : "draft"),
      };
      if (r.result_id) {
        const { error } = await supabase.from("results").update(payload).eq("id", r.result_id);
        if (error) fail++; else ok++;
      } else {
        const { error } = await supabase.from("results").insert(payload);
        if (error) fail++; else ok++;
      }
    }
    setBusy(false);
    if (fail) toast.error(`${fail} row(s) failed; ${ok} saved.`);
    else toast.success(submit ? `Submitted ${ok} result(s) for approval.` : `Saved ${ok} row(s).`);
    void loadRoster();
  };

  const onCSV = async (file: File) => {
    if (!currentCourse) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error("CSV is empty.");
      return;
    }
    // Expected headers: matric_number, ca_score, exam_score
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const mIdx = header.indexOf("matric_number");
    const caIdx = header.indexOf("ca_score");
    const exIdx = header.indexOf("exam_score");
    if (mIdx < 0 || caIdx < 0 || exIdx < 0) {
      toast.error("CSV must include columns: matric_number, ca_score, exam_score");
      return;
    }
    const byMatric = new Map<string, { ca: number; ex: number }>();
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(",").map((c) => c.trim());
      const m = cells[mIdx];
      const ca = Number(cells[caIdx]);
      const ex = Number(cells[exIdx]);
      if (!m || Number.isNaN(ca) || Number.isNaN(ex)) continue;
      byMatric.set(m.toUpperCase(), { ca, ex });
    }
    let matched = 0;
    setRows((prev) =>
      prev.map((r) => {
        const m = r.matric?.toUpperCase();
        if (m && byMatric.has(m)) {
          matched++;
          const { ca, ex } = byMatric.get(m)!;
          return { ...r, ca_score: ca, exam_score: ex, dirty: true };
        }
        return r;
      }),
    );
    toast.success(`Matched ${matched} row(s) from CSV. Click "Save" to persist.`);
  };

  const downloadTemplate = () => {
    const csv = "matric_number,ca_score,exam_score\n" +
      rows.map((r) => `${r.matric ?? ""},${r.ca_score ?? ""},${r.exam_score ?? ""}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentCourse?.code ?? "scores"}-${session.replace("/", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((r) => r.full_name.toLowerCase().includes(n) || (r.matric ?? "").toLowerCase().includes(n));
  }, [rows, q]);

  return (
    <>
      <PageHeader
        title="Score entry"
        subtitle="Enter CA (out of 40) and Exam (out of 60). Save as draft, then submit for admin approval."
      />
      <PageBody>
        <Card className="mb-4 flex flex-wrap items-end gap-3 p-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Pick a course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Session</Label>
            <Select value={session} onValueChange={setSession}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SESSIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 flex-1 min-w-[180px]">
            <Label className="text-xs">Search student</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="matric or name…" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate} disabled={!rows.length}>
              <Download className="h-4 w-4" /> CSV template
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void onCSV(f);
                }}
              />
              <Button variant="outline" size="sm" asChild>
                <span><Upload className="h-4 w-4" /> Upload CSV</span>
              </Button>
            </label>
          </div>
        </Card>

        {courses.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            You don't teach any courses yet. Pick courses from the "My Courses" page first.
          </Card>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading roster…
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3 text-sm">
              <div><strong>{filtered.length}</strong> student{filtered.length === 1 ? "" : "s"} enrolled</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void saveAll(false)} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
                </Button>
                <Button size="sm" onClick={() => void saveAll(true)} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit for approval
                </Button>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No students enrolled in this course for {session}. Ask the admin to enroll them.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left">Matric</th>
                    <th className="px-2 py-3 text-left">Name</th>
                    <th className="px-2 py-3 text-right w-24">CA /40</th>
                    <th className="px-2 py-3 text-right w-24">Exam /60</th>
                    <th className="px-2 py-3 text-right w-20">Total</th>
                    <th className="px-2 py-3 text-center w-16">Grade</th>
                    <th className="px-5 py-3 text-right w-32">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const locked = r.status === "admin_approved" || r.status === "hod_approved" || r.status === "submitted";
                    const total = (r.ca_score ?? 0) + (r.exam_score ?? 0);
                    return (
                      <tr key={r.student_id} className={`border-t border-border ${r.dirty ? "bg-warning/5" : ""}`}>
                        <td className="px-5 py-2 font-mono text-xs">{r.matric ?? "—"}</td>
                        <td className="px-2 py-2">{r.full_name}</td>
                        <td className="px-2 py-2 text-right">
                          <Input
                            type="number" min={0} max={40} step="0.5"
                            value={r.ca_score ?? ""}
                            onChange={(e) => updateScore(r.student_id, "ca_score", e.target.value)}
                            disabled={locked}
                            className="h-8 text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Input
                            type="number" min={0} max={60} step="0.5"
                            value={r.exam_score ?? ""}
                            onChange={(e) => updateScore(r.student_id, "exam_score", e.target.value)}
                            disabled={locked}
                            className="h-8 text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.ca_score !== null || r.exam_score !== null ? total.toFixed(0) : "—"}</td>
                        <td className="px-2 py-2 text-center font-bold">{r.grade ?? "—"}</td>
                        <td className="px-5 py-2 text-right"><StatusBadge s={r.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        )}
      </PageBody>
    </>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    submitted: { label: "Submitted", cls: "bg-warning/15 text-warning-foreground border-warning/30" },
    hod_approved: { label: "HOD approved", cls: "bg-primary/10 text-primary border-primary/20" },
    admin_approved: { label: "Published", cls: "bg-success/15 text-success border-success/20" },
    rejected: { label: "Rejected", cls: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  const it = map[s] ?? { label: s, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={it.cls}>{it.label}</Badge>;
}

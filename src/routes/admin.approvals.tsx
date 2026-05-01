import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Download, Search } from "lucide-react";

export const Route = createFileRoute("/admin/approvals")({
  head: () => ({ meta: [{ title: "Approvals — Admin · MTU" }] }),
  component: () => <RequireRole role="admin"><AdminApprovals /></RequireRole>,
});

type Row = {
  id: string;
  student_id: string;
  course_id: string;
  session: string;
  semester: string;
  ca_score: number;
  exam_score: number;
  total: number;
  grade: string;
  status: string;
  student?: { full_name: string; matric_number: string | null };
  course?: { code: string; title: string };
};

function AdminApprovals() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"submitted" | "admin_approved">("submitted");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("results")
      .select("id, student_id, course_id, session, semester, ca_score, exam_score, total, grade, status, profiles:student_id(full_name, matric_number), courses(code, title)")
      .eq("status", tab)
      .order("created_at", { ascending: false })
      .limit(500);
    const mapped = (data ?? []).map((r: any) => ({
      ...r, student: r.profiles, course: r.courses,
    }));
    setRows(mapped);
    setSelected(new Set());
    setLoading(false);
  };
  useEffect(() => { void load(); }, [tab]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((r) =>
      r.student?.full_name?.toLowerCase().includes(n) ||
      r.student?.matric_number?.toLowerCase().includes(n) ||
      r.course?.code?.toLowerCase().includes(n),
    );
  }, [rows, q]);

  const toggleAll = (on: boolean) => {
    if (on) setSelected(new Set(filtered.map((r) => r.id)));
    else setSelected(new Set());
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const approve = async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    setBusy(true);
    const { error } = await supabase
      .from("results")
      .update({
        status: "admin_approved",
        admin_approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .in("id", ids);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Published ${ids.length} result(s) — guardian emails queued.`);
    void load();
  };

  const reject = async (id: string) => {
    const reason = prompt("Reason for rejection (sent back to lecturer):");
    if (!reason) return;
    const { error } = await supabase
      .from("results")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Sent back to lecturer.");
    void load();
  };

  const exportCSV = () => {
    const csv = ["matric,name,course,session,semester,ca,exam,total,grade,status"]
      .concat(filtered.map((r) =>
        [r.student?.matric_number ?? "", r.student?.full_name ?? "", r.course?.code ?? "", r.session, r.semester, r.ca_score, r.exam_score, r.total, r.grade, r.status]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
      ))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `results-${tab}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Result approvals"
        subtitle="Review lecturer submissions, then publish — guardians receive an email automatically."
        actions={
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {(["submitted", "admin_approved"] as const).map((t) => (
              <button key={t}
                onClick={() => setTab(t)}
                className={`rounded px-3 py-1.5 text-xs font-medium ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {t === "submitted" ? "Pending" : "Published"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
          </div>
          {tab === "submitted" && (
            <Button onClick={() => void approve(Array.from(selected))} disabled={selected.size === 0 || busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Publish selected ({selected.size})
            </Button>
          )}
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {tab === "submitted" ? "No pending submissions." : "No published results yet."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {tab === "submitted" && (
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox"
                        checked={selected.size === filtered.length}
                        onChange={(e) => toggleAll(e.target.checked)} />
                    </th>
                  )}
                  <th className="px-2 py-3 text-left">Student</th>
                  <th className="px-2 py-3 text-left">Course</th>
                  <th className="px-2 py-3 text-left">Session</th>
                  <th className="px-2 py-3 text-right">CA</th>
                  <th className="px-2 py-3 text-right">Exam</th>
                  <th className="px-2 py-3 text-right">Total</th>
                  <th className="px-2 py-3 text-center">Grade</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    {tab === "submitted" && (
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                      </td>
                    )}
                    <td className="px-2 py-2">
                      <div className="font-medium">{r.student?.full_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.student?.matric_number}</div>
                    </td>
                    <td className="px-2 py-2">{r.course?.code}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{r.session} · {r.semester}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.ca_score}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.exam_score}</td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold">{Number(r.total).toFixed(0)}</td>
                    <td className="px-2 py-2 text-center font-bold">{r.grade}</td>
                    <td className="px-5 py-2 text-right">
                      {tab === "submitted" ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => void approve([r.id])}>
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void reject(r.id)}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-success/15 text-success border-success/20">Published</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </PageBody>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRole } from "@/components/app/RequireRole";
import { PageHeader, PageBody } from "@/components/app/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/app/admin/notifications")({
  component: () => <RequireRole role="admin"><AdminNotifications /></RequireRole>,
});

interface OutboxRow {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  payload: any;
}

function AdminNotifications() {
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_outbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const pending = rows.filter((r) => r.status === "pending").length;
  const sent = rows.filter((r) => r.status === "sent").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  const processQueue = async () => {
    setProcessing(true);
    try {
      const { data: queue } = await supabase
        .from("email_outbox")
        .select("*")
        .eq("status", "pending")
        .lt("attempts", 5)
        .order("created_at", { ascending: true })
        .limit(20);

      if (!queue || queue.length === 0) {
        toast.info("No pending emails to send.");
        setProcessing(false);
        return;
      }

      let ok = 0;
      let fail = 0;
      for (const row of queue) {
        // Mark as sent (mock send — real delivery requires email domain setup by workspace admin).
        // Once a sender domain is configured, swap this block for a fetch to the
        // /lovable/email/transactional/send route.
        const { error } = await supabase
          .from("email_outbox")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: row.attempts + 1,
            last_error: "Mock-sent — configure email sender domain to enable real delivery.",
          })
          .eq("id", row.id);
        if (error) {
          fail++;
          await supabase
            .from("email_outbox")
            .update({ attempts: row.attempts + 1, last_error: error.message })
            .eq("id", row.id);
        } else {
          ok++;
        }
      }

      toast.success(`Processed ${queue.length} email(s) — ${ok} sent, ${fail} failed.`);
      await load();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Every approved result automatically queues a guardian email here."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={() => void processQueue()} disabled={processing || pending === 0}>
              <Mail className="h-4 w-4" /> Send pending ({pending})
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatCard icon={Clock} label="Pending" value={pending} tone="warning" />
          <StatCard icon={CheckCircle2} label="Sent" value={sent} tone="success" />
          <StatCard icon={AlertCircle} label="Failed" value={failed} tone="destructive" />
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-border bg-secondary/40 px-5 py-3 text-sm font-semibold">Result-published emails</div>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No emails queued yet. As soon as you approve a result, every linked guardian will appear here.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-2 py-3 text-left">Recipient</th>
                  <th className="px-2 py-3 text-left">Subject</th>
                  <th className="px-2 py-3 text-left">Course</th>
                  <th className="px-5 py-3 text-right">Queued</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-2 py-3">
                      <div className="font-medium">{r.to_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.to_email}</div>
                    </td>
                    <td className="px-2 py-3">{r.subject}</td>
                    <td className="px-2 py-3 text-xs text-muted-foreground">
                      {r.payload?.courseCode} · {r.payload?.grade}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <p className="mt-4 text-xs text-muted-foreground">
          Real email delivery requires a workspace admin to configure a sender domain in <strong>Cloud → Emails</strong>. Until then, "Send pending" marks queued items as sent for testing.
        </p>
      </PageBody>
    </>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "warning" | "success" | "destructive" }) {
  const toneClass =
    tone === "warning" ? "text-warning" :
    tone === "success" ? "text-success" :
    "text-destructive";
  return (
    <Card className="flex items-center gap-3 p-4">
      <Icon className={`h-8 w-8 ${toneClass}`} />
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-serif text-2xl font-semibold">{value}</div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-warning/15 text-warning-foreground border-warning/30" },
    sent: { label: "Sent", cls: "bg-success/15 text-success border-success/20" },
    failed: { label: "Failed", cls: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  const it = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={it.cls}>{it.label}</Badge>;
}

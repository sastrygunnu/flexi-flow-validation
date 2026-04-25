import { useMemo, useState } from "react";
import { ChevronDown, Search, Download, FileText, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuditLog, LogStatus } from "@/lib/audit-logs";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { arcTxUrl, normalizeEvmTxHash } from "@/lib/arc";

const statusMeta: Record<LogStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  success: {
    label: "Success",
    className: "bg-success/10 text-success border-success/30",
    Icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    Icon: XCircle,
  },
  timeout: {
    label: "Timeout",
    className: "bg-accent/10 text-accent border-accent/30",
    Icon: Clock,
  },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function LogRow({ log }: { log: AuditLog }) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta[log.status];

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full grid grid-cols-[auto_1fr_140px_120px_140px_90px_80px_auto] items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-smooth text-left"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-smooth ${open ? "rotate-180" : "-rotate-90"}`}
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{log.stepLabel}</div>
          <div className="text-xs text-muted-foreground font-mono truncate">{log.id}</div>
        </div>
        <div className="text-xs font-mono text-muted-foreground truncate">{log.flow}</div>
        <div className="text-xs font-mono text-muted-foreground truncate">{log.userId}</div>
        <div className="text-xs">{log.provider}</div>
        <div className="text-xs font-mono text-muted-foreground">{log.durationMs}ms</div>
        <div className="text-xs font-mono">${log.costUsd.toFixed(3)}</div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border ${meta.className}`}
        >
          <meta.Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </button>

      {open && (
        <div className="grid md:grid-cols-2 gap-3 px-4 pb-4 pt-1 bg-secondary/20 animate-fade-in-up">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
              Input params
            </div>
            <pre className="text-xs font-mono bg-background border border-border rounded-md p-3 overflow-x-auto">
              {JSON.stringify(log.input, null, 2)}
            </pre>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
              Output params
            </div>
            <pre className="text-xs font-mono bg-background border border-border rounded-md p-3 overflow-x-auto">
              {JSON.stringify(log.output, null, 2)}
            </pre>
          </div>
          <div className="md:col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold flex items-center gap-2">
              Payment receipt
              <span
                className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  log.payment.status === "paid"
                    ? "bg-success/10 text-success border-success/30"
                    : log.payment.status === "pending"
                    ? "bg-accent/10 text-accent border-accent/30"
                    : log.payment.status === "skipped"
                    ? "bg-muted text-muted-foreground border-border"
                    : "bg-destructive/10 text-destructive border-destructive/30"
                }`}
              >
                ◎ {log.payment.status}
              </span>
              <span className="text-[10px] text-muted-foreground normal-case tracking-normal">
                {log.payment.rail === "circle_arc" ? "Circle Arc · Nanopayment" : "x402"}
              </span>
            </div>
              <div className="bg-background border border-border rounded-md p-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-mono">
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Amount</span><span>{log.payment.amountUsdc.toFixed(6)} USDC</span></div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Gas</span>
                <span>
                  {log.payment.rail === "x402"
                    ? "Batched"
                    : typeof log.payment.gasUsdc === "number"
                      ? `${log.payment.gasUsdc.toFixed(6)} USDC`
                      : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Finality</span><span>{log.payment.settlementNs} ns</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Settled</span><span>{new Date(log.payment.settledAt).toISOString()}</span></div>
              <div className="flex justify-between gap-2 sm:col-span-2"><span className="text-muted-foreground shrink-0">Payer</span><span className="truncate" title={log.payment.payerWallet}>{log.payment.payerWallet}</span></div>
              <div className="flex justify-between gap-2 sm:col-span-2"><span className="text-muted-foreground shrink-0">Payee ({log.provider})</span><span className="truncate" title={log.payment.payeeWallet}>{log.payment.payeeWallet}</span></div>
              <div className="flex justify-between gap-2 sm:col-span-2">
                <span className="text-muted-foreground shrink-0">Arc tx</span>
                {(() => {
                  const txHash = normalizeEvmTxHash(log.arcTxHash) || normalizeEvmTxHash(log.payment?.arcTxHash);
                  const url = arcTxUrl(txHash);
                  return url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-smooth group"
                    title="View on Arc Explorer"
                  >
                    <span className="truncate font-mono text-xs group-hover:underline underline-offset-2" title={txHash || ""}>
                      {txHash}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  ) : (
                    <span className="truncate" title={String(log.payment?.arcTxHash || "")}>
                      {log.payment?.gatewayTransferId || log.payment?.arcTxHash || "pending"}
                    </span>
                  );
                })()}
              </div>
              <div className="flex justify-between gap-2 sm:col-span-2"><span className="text-muted-foreground shrink-0">Nanopayment</span><span className="truncate">{log.payment.nanopaymentId}</span></div>
              <div className="flex justify-between gap-2 sm:col-span-2"><span className="text-muted-foreground shrink-0">Invoice</span><span className="truncate">{log.payment.invoiceId}</span></div>
              {log.payment.reason && (
                <div className="sm:col-span-2 text-muted-foreground italic normal-case">{log.payment.reason}</div>
              )}
            </div>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground pt-1">
            <span>
              Timestamp: <span className="text-foreground font-mono">{new Date(log.timestamp).toISOString()}</span>
            </span>
            <span>
              Provider: <span className="text-foreground">{log.provider}</span>
            </span>
            <span>
              Latency: <span className="text-foreground font-mono">{log.durationMs}ms</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function AuditLogs() {
  const logsQuery = useQuery({
    queryKey: ["logs"],
    queryFn: async () =>
      (await api.logs.list({ limit: 400, hydrate: true, hydrateLimit: 25, hydrateTimeoutMs: 1500 })).logs,
    refetchInterval: (query) => {
      const logs = query.state.data as AuditLog[] | undefined;
      const hasPending = Boolean(
        logs?.some(
          (l) =>
            Boolean(l.payment?.gatewayTransferId) &&
            !normalizeEvmTxHash(l.arcTxHash) &&
            !normalizeEvmTxHash(l.payment?.arcTxHash),
        ),
      );
      return hasPending ? 5000 : false;
    },
  });

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stepFilter, setStepFilter] = useState<string>("all");

  const allLogs = logsQuery.data || [];

  const stepOptions = useMemo(
    () => Array.from(new Set(allLogs.map((l) => l.stepLabel))),
    [allLogs],
  );

  const filtered = useMemo(() => {
    return allLogs.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (stepFilter !== "all" && l.stepLabel !== stepFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${l.id} ${l.flow} ${l.userId} ${l.provider} ${l.stepLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allLogs, query, statusFilter, stepFilter]);

  const exportCsv = () => {
    const headers = [
      "id",
      "timestamp",
      "flow",
      "userId",
      "step",
      "provider",
      "status",
      "duration_ms",
      "cost_usd",
      "input",
      "output",
    ];
    const escape = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = filtered.map((l) =>
      [
        l.id,
        l.timestamp,
        l.flow,
        l.userId,
        l.stepLabel,
        l.provider,
        l.status,
        l.durationMs,
        l.costUsd,
        JSON.stringify(l.input),
        JSON.stringify(l.output),
      ]
        .map(escape)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} logs to CSV`);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Validly — Audit Logs", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Generated ${new Date().toLocaleString()} · ${filtered.length} entries`,
      14,
      21,
    );

    autoTable(doc, {
      startY: 26,
      head: [["Time", "Flow", "User", "Step", "Provider", "Status", "ms", "Cost"]],
      body: filtered.map((l) => [
        formatTime(l.timestamp),
        l.flow,
        l.userId,
        l.stepLabel,
        l.provider,
        l.status,
        String(l.durationMs),
        `$${l.costUsd.toFixed(3)}`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [88, 80, 236] },
    });

    doc.save(`audit-logs-${Date.now()}.pdf`);
    toast.success(`Exported ${filtered.length} logs to PDF`);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="gradient-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by id, user, flow, provider…"
            className="pl-9"
          />
        </div>

        <Select value={stepFilter} onValueChange={setStepFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Step" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All steps</SelectItem>
            {stepOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="timeout">Timeout</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total calls", value: filtered.length },
          {
            label: "Success rate",
            value:
              filtered.length === 0
                ? "—"
                : `${Math.round(
                    (filtered.filter((l) => l.status === "success").length / filtered.length) * 100,
                  )}%`,
          },
          {
            label: "Avg latency",
            value:
              filtered.length === 0
                ? "—"
                : `${Math.round(filtered.reduce((s, l) => s + l.durationMs, 0) / filtered.length)}ms`,
          },
          {
            label: "Total cost",
            value: `$${filtered.reduce((s, l) => s + l.costUsd, 0).toFixed(2)}`,
          },
        ].map((s) => (
          <div key={s.label} className="gradient-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="gradient-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_140px_120px_140px_90px_80px_auto] items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          <span className="w-3.5" />
          <span>Step / ID</span>
          <span>Flow</span>
          <span>User</span>
          <span>Provider</span>
          <span>Latency</span>
          <span>Cost</span>
          <span>Status</span>
        </div>
        {logsQuery.isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Loading logs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No logs match your filters. Generate a run in “Flow Logs” to create logs.
          </div>
        ) : (
          <div className="max-h-[640px] overflow-y-auto">
            {filtered.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

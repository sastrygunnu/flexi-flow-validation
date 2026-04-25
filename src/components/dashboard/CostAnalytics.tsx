import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { DollarSign, Coins, Zap, Activity, ExternalLink } from "lucide-react";
import { groupLogsByRun, AuditLog } from "@/lib/audit-logs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ARC_EXPLORER_BASE_URL, arcTxUrl, normalizeEvmTxHash } from "@/lib/arc";

// HSL strings using design tokens
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(217 91% 60%)",
  "hsl(280 70% 60%)",
  "hsl(35 90% 55%)",
];

function formatUsdc(v: number) {
  return `${v.toFixed(4)} USDC`;
}

function ChartCard({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="gradient-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export function CostAnalytics() {
  const logsQuery = useQuery({
    queryKey: ["logs", "analytics"],
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

  const logs = logsQuery.data || [];
  const [showAllPayments, setShowAllPayments] = useState(false);
  const runs = useMemo(() => groupLogsByRun(logs), [logs]);

  // Per-flow cost
  const perFlow = useMemo(() => {
    const map = new Map<string, { flow: string; usdc: number; runs: number }>();
    for (const r of runs) {
      const cur = map.get(r.flow) || { flow: r.flow, usdc: 0, runs: 0 };
      cur.usdc += r.totalCostUsdc;
      cur.runs += 1;
      map.set(r.flow, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.usdc - a.usdc);
  }, [runs]);

  // Per-step × provider (stacked)
  const { perStep, providerKeys } = useMemo(() => {
    const stepMap = new Map<string, Record<string, number | string>>();
    const providers = new Set<string>();
    for (const log of logs) {
      providers.add(log.provider);
      const row = stepMap.get(log.stepLabel) || { step: log.stepLabel };
      row[log.provider] = ((row[log.provider] as number) || 0) + log.costUsdc;
      stepMap.set(log.stepLabel, row);
    }
    return {
      perStep: Array.from(stepMap.values()),
      providerKeys: Array.from(providers),
    };
  }, [logs]);

  // Provider spend share
  const perProvider = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of logs) {
      map.set(log.provider, (map.get(log.provider) || 0) + log.costUsdc);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [logs]);

  // Settlement timeline — Arc nanosecond finality per nanopayment
  const settlement = useMemo(() => {
    return [...logs]
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      .map((log, idx) => ({
        idx: idx + 1,
        time: new Date(log.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        ns: log.arcSettlementNs,
        provider: log.provider,
      }));
  }, [logs]);

  // Recent nanopayments
  const recentPayments = useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return sorted.slice(0, showAllPayments ? sorted.length : 6);
  }, [logs, showAllPayments]);

  const totals = useMemo(() => {
    const totalUsdc = logs.reduce((s, l) => s + l.costUsdc, 0);
    const totalPayments = logs.length;
    const avgNs = Math.round(
      logs.length ? logs.reduce((s, l) => s + l.arcSettlementNs, 0) / logs.length : 0,
    );
    const avgPerPayment = totalPayments ? totalUsdc / totalPayments : 0;
    return { totalUsdc, totalPayments, avgNs, avgPerPayment };
  }, [logs]);

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="gradient-card border border-primary/30 rounded-xl p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center shrink-0 shadow-glow">
          <Coins className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">
            Cost analytics · Settled on Arc · Paid in USDC
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every provider call emits a Circle Nanopayment that settles on Arc
            (EVM L1) with sub-second finality. Track spend by flow, step, and
            provider.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-1 rounded-md">
          Arc · USDC
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          Icon={DollarSign}
          label="Total settled"
          value={`${totals.totalUsdc.toFixed(4)}`}
          unit="USDC"
        />
        <StatCard
          Icon={Activity}
          label="Nanopayments"
          value={totals.totalPayments.toString()}
          unit="emitted"
        />
        <StatCard
          Icon={Coins}
          label="Avg / payment"
          value={`${totals.avgPerPayment.toFixed(5)}`}
          unit="USDC"
        />
        <StatCard
          Icon={Zap}
          label="Avg Arc finality"
          value={totals.avgNs.toString()}
          unit="nanoseconds"
          tone="accent"
        />
      </div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard
          title="Cost per flow"
          subtitle="USDC settled on Arc per validation flow"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perFlow}>
              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="flow"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(v) => `${v.toFixed(2)}`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [formatUsdc(v), "USDC"]}
              />
              <Bar
                dataKey="usdc"
                fill="hsl(var(--primary))"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Provider spend share"
          subtitle="Share of total USDC settled by provider"
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={perProvider}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
              >
                {perProvider.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => formatUsdc(v)}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconType="circle"
                formatter={(value) => (
                  <span style={{ color: "hsl(var(--foreground))" }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Cost per step × provider"
          subtitle="Stacked USDC spend per validation step, by provider"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={perStep}>
              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="step"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(v) => `${v.toFixed(2)}`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => formatUsdc(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              {providerKeys.map((p, i) => (
                <Bar
                  key={p}
                  dataKey={p}
                  stackId="cost"
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={i === providerKeys.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Arc settlement latency"
          subtitle="Nanopayment finality on Arc (nanoseconds, lower is better)"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={settlement}>
              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="idx"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                label={{
                  value: "Nanopayment #",
                  position: "insideBottom",
                  offset: -2,
                  style: {
                    fontSize: 10,
                    fill: "hsl(var(--muted-foreground))",
                  },
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(v) => `${v}ns`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${v} ns`, "Arc finality"]}
                labelFormatter={(l) => `Payment #${l}`}
              />
              <Line
                type="monotone"
                dataKey="ns"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "hsl(var(--accent))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent nanopayments */}
      <div className="gradient-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold">Recent payments</h3>
            <p className="text-xs text-muted-foreground">
              Gateway transfers batch later; Arc transaction link appears once Circle includes a blockchain tx hash
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllPayments((v) => !v)}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border bg-background/40 px-2 py-1 rounded-md transition-smooth"
              title={showAllPayments ? "Show fewer payments" : "Show all payments"}
            >
              {showAllPayments ? "Show Less" : "Show All"}
              <span className="text-muted-foreground/70">({logs.length})</span>
            </button>
            <a
              href={ARC_EXPLORER_BASE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 border border-primary/30 bg-primary/10 px-2 py-1 rounded-md transition-smooth"
            >
              <ExternalLink className="h-3 w-3" />
              Arc Explorer
            </a>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-1 rounded-md">
              Live · Testnet
            </span>
          </div>
        </div>
        <div className={`divide-y divide-border ${showAllPayments ? "max-h-[420px] overflow-auto" : ""}`}>
          {logsQuery.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading payments…</div>
          ) : recentPayments.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No payments yet. Generate a run in “Flow Logs” to create nanopayments.
            </div>
          ) : (
            recentPayments.map((p) => <PaymentRow key={p.id} payment={p} />)
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentRow({ payment }: { payment: AuditLog }) {
  const txHash = normalizeEvmTxHash(payment.arcTxHash) || normalizeEvmTxHash(payment.payment?.arcTxHash);
  const url = arcTxUrl(txHash);
  const hasGatewayTransfer = Boolean(payment.payment?.gatewayTransferId);
  const transferId = payment.payment?.gatewayTransferId;
  const transferUrl = transferId
    ? `${import.meta.env.VITE_API_URL || "http://localhost:8787"}/api/x402/transfers/${encodeURIComponent(transferId)}`
    : null;
  const transferStatus = payment.payment?.gatewayTransferStatus || "received";
  
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 text-sm hover:bg-secondary/40 transition-smooth">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{payment.stepLabel}</span>
          <span className="text-xs text-muted-foreground">
            via {payment.provider}
          </span>
          {hasGatewayTransfer && (
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-success/10 text-success border border-success/30">
              Gateway
            </span>
          )}
          {hasGatewayTransfer && (
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
              {transferStatus}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 mt-1">
          {/* Arc Transaction Hash */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground w-12">
              Arc Tx
            </span>
            {url ? (
              <a
                className="inline-flex items-center gap-1.5 min-w-0 text-primary hover:text-primary/80 transition-smooth group"
                href={url}
                target="_blank"
                rel="noreferrer"
                title="View transaction on Arc Explorer"
              >
                <code className="text-[10px] font-mono truncate max-w-[240px] group-hover:underline underline-offset-2">
                  {txHash}
                </code>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <code className="text-[10px] font-mono text-muted-foreground truncate max-w-[240px]">
                {hasGatewayTransfer ? "pending" : payment.arcTxHash || payment.payment?.arcTxHash || "pending"}
              </code>
            )}
          </div>
          {/* Gateway Transfer ID */}
          {hasGatewayTransfer && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground w-12">
                Transfer
              </span>
              <code className="text-[10px] font-mono text-muted-foreground truncate max-w-[240px]" title={transferId}>
                {transferId}
              </code>
              {transferUrl && (
                <a
                  href={transferUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border px-1.5 py-0.5 rounded-md transition-smooth"
                  title="Open Gateway transfer details (local JSON)"
                >
                  JSON
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="text-xs font-mono tabular-nums text-accent">
        {payment.arcSettlementNs}ns
      </div>
      <div className="text-xs text-muted-foreground font-mono tabular-nums w-32 truncate text-right">
        {payment.nanopaymentId}
      </div>
      <div className="text-sm font-mono tabular-nums font-semibold w-28 text-right">
        {payment.costUsdc.toFixed(4)} <span className="text-xs text-muted-foreground">USDC</span>
      </div>
    </div>
  );
}

function StatCard({
  Icon,
  label,
  value,
  unit,
  tone,
}: {
  Icon: typeof DollarSign;
  label: string;
  value: string;
  unit: string;
  tone?: "accent";
}) {
  return (
    <div className="gradient-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon
          className={`h-4 w-4 ${tone === "accent" ? "text-accent" : "text-primary"}`}
        />
      </div>
      <div className="text-2xl font-bold mt-2 tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{unit}</div>
    </div>
  );
}

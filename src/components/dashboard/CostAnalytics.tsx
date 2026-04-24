import { useMemo } from "react";
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
import { generateMockLogs, groupLogsByRun, AuditLog } from "@/lib/audit-logs";

const LOGS = generateMockLogs(28);
const RUNS = groupLogsByRun(LOGS);

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
  // Per-flow cost
  const perFlow = useMemo(() => {
    const map = new Map<string, { flow: string; usdc: number; runs: number }>();
    for (const r of RUNS) {
      const cur = map.get(r.flow) || { flow: r.flow, usdc: 0, runs: 0 };
      cur.usdc += r.totalCostUsdc;
      cur.runs += 1;
      map.set(r.flow, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.usdc - a.usdc);
  }, []);

  // Per-step × provider (stacked)
  const { perStep, providerKeys } = useMemo(() => {
    const stepMap = new Map<string, Record<string, number | string>>();
    const providers = new Set<string>();
    for (const log of LOGS) {
      providers.add(log.provider);
      const row = stepMap.get(log.stepLabel) || { step: log.stepLabel };
      row[log.provider] = ((row[log.provider] as number) || 0) + log.costUsdc;
      stepMap.set(log.stepLabel, row);
    }
    return {
      perStep: Array.from(stepMap.values()),
      providerKeys: Array.from(providers),
    };
  }, []);

  // Provider spend share
  const perProvider = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of LOGS) {
      map.set(log.provider, (map.get(log.provider) || 0) + log.costUsdc);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  // Settlement timeline — Arc nanosecond finality per nanopayment
  const settlement = useMemo(() => {
    return [...LOGS]
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
  }, []);

  // Recent nanopayments
  const recentPayments = useMemo(() => LOGS.slice(0, 6), []);

  const totals = useMemo(() => {
    const totalUsdc = LOGS.reduce((s, l) => s + l.costUsdc, 0);
    const totalPayments = LOGS.length;
    const avgNs = Math.round(
      LOGS.reduce((s, l) => s + l.arcSettlementNs, 0) / LOGS.length,
    );
    const avgPerPayment = totalUsdc / totalPayments;
    return { totalUsdc, totalPayments, avgNs, avgPerPayment };
  }, []);

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
            <h3 className="text-sm font-semibold">Recent Arc nanopayments</h3>
            <p className="text-xs text-muted-foreground">
              On-chain settlements via Circle Nanopayments
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-1 rounded-md">
            Live · Arc Mainnet
          </span>
        </div>
        <div className="divide-y divide-border">
          {recentPayments.map((p) => (
            <PaymentRow key={p.id} payment={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PaymentRow({ payment }: { payment: AuditLog }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{payment.stepLabel}</span>
          <span className="text-xs text-muted-foreground">
            via {payment.provider}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <code className="text-[10px] font-mono text-muted-foreground truncate max-w-[280px]">
            {payment.arcTxHash}
          </code>
          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
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

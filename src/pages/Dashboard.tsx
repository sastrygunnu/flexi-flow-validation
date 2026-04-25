import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { FlowBuilder } from "@/components/dashboard/FlowBuilder";
import { AuditLogs } from "@/components/dashboard/AuditLogs";
import { FlowLogs } from "@/components/dashboard/FlowLogs";
import { Overview } from "@/components/dashboard/Overview";
import { CostAnalytics } from "@/components/dashboard/CostAnalytics";
import { ScenarioRunner } from "@/components/dashboard/ScenarioRunner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabKey = "overview" | "builder" | "scenario" | "flow-logs" | "logs" | "costs";

const Dashboard = () => {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container space-y-6">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
              Validly Dashboard
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Pay-per-use validation with real-time payments
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Build your validation flow, test with real Circle payments, and track every API call.
              Pay only for what you use — charged instantly via Circle Gateway nanopayments.
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="builder">Flow Builder</TabsTrigger>
              <TabsTrigger value="scenario">Run Scenario</TabsTrigger>
              <TabsTrigger value="flow-logs">Flow Logs</TabsTrigger>
              <TabsTrigger value="logs">Audit Logs</TabsTrigger>
              <TabsTrigger value="costs">Cost Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Overview onNavigate={(t) => setTab(t)} />
            </TabsContent>

            <TabsContent value="builder">
              <FlowBuilder />
            </TabsContent>

            <TabsContent value="scenario">
              <ScenarioRunner />
            </TabsContent>

            <TabsContent value="flow-logs">
              <FlowLogs />
            </TabsContent>

            <TabsContent value="logs">
              <AuditLogs />
            </TabsContent>

            <TabsContent value="costs">
              <CostAnalytics />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

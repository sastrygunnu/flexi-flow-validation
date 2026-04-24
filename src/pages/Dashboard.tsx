import { Navbar } from "@/components/Navbar";
import { FlowBuilder } from "@/components/dashboard/FlowBuilder";
import { AuditLogs } from "@/components/dashboard/AuditLogs";
import { Simulator } from "@/components/dashboard/Simulator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container space-y-6">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
              Dashboard
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Build flows. Audit every call.
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Compose your validation flow and inspect every API call with full input/output params.
              Switch providers anytime — your integration code never changes.
            </p>
          </div>

          <Tabs defaultValue="builder" className="space-y-6">
            <TabsList>
              <TabsTrigger value="builder">Flow Builder</TabsTrigger>
              <TabsTrigger value="simulator">Simulator</TabsTrigger>
              <TabsTrigger value="logs">Audit Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="builder">
              <FlowBuilder />
            </TabsContent>

            <TabsContent value="simulator">
              <Simulator />
            </TabsContent>

            <TabsContent value="logs">
              <AuditLogs />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

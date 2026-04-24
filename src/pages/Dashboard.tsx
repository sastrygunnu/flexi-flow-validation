import { Navbar } from "@/components/Navbar";
import { FlowBuilder } from "@/components/dashboard/FlowBuilder";

const Dashboard = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container space-y-6">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
                Flow Builder
              </p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Compose your validation flow
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Drag steps from the library into the canvas. Pick a provider per step.
                Switch providers anytime — your integration code never changes.
              </p>
            </div>
          </div>
          <FlowBuilder />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

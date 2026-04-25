import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Plus,
  Rocket,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";
import { STEP_LIBRARY, StepKind, getStep, ProviderOption } from "@/lib/validation-steps";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api, Flow } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface FlowStep {
  id: string;
  kind: StepKind;
  providerId: string;
}

const initialFlow: FlowStep[] = [
  { id: "s1", kind: "phone", providerId: "twilio" },
  { id: "s2", kind: "identity", providerId: "persona" },
  { id: "s3", kind: "address", providerId: "google" },
];

/* ---------- Palette item (draggable source) ---------- */
function PaletteItem({ kind }: { kind: StepKind }) {
  const step = getStep(kind);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${kind}`,
    data: { fromPalette: true, kind },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/40 hover:border-primary/50 hover:bg-secondary cursor-grab active:cursor-grabbing transition-smooth ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="h-9 w-9 rounded-md bg-background border border-border flex items-center justify-center shrink-0">
        <step.icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{step.label}</div>
        <div className="text-xs text-muted-foreground truncate">{step.unitCost} per check</div>
      </div>
      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}

/* ---------- Sortable canvas card ---------- */
function FlowCard({
  step,
  index,
  onProviderChange,
  onRemove,
}: {
  step: FlowStep;
  index: number;
  onProviderChange: (id: string, providerId: string) => void;
  onRemove: (id: string) => void;
}) {
  const def = getStep(step.kind);
  const provider = def.providers.find((p) => p.id === step.providerId)!;
  const [open, setOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative gradient-card border border-border rounded-xl p-4 hover:border-primary/40 transition-smooth shadow-card"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center shrink-0 shadow-glow">
          <def.icon className="h-5 w-5 text-primary-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">Step {index + 1}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {def.unitCost}
            </span>
          </div>
          <h4 className="font-semibold text-sm">{def.label}</h4>
          <p className="text-xs text-muted-foreground">{def.description}</p>

          {/* Provider selector */}
          <div className="mt-3 relative">
            <button
              onClick={() => setOpen(!open)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background border border-border hover:border-primary/40 transition-smooth text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
                <span className="font-medium">{provider.name}</span>
                <span className="text-muted-foreground text-xs">· {provider.cost}</span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-smooth ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <div className="absolute z-20 left-0 right-0 mt-1.5 rounded-lg bg-popover border border-border shadow-elegant overflow-hidden animate-fade-in-up">
                {def.providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onProviderChange(step.id, p.id);
                      setOpen(false);
                      if (p.id !== provider.id) {
                        toast.success(`Switched to ${p.name}`, {
                          description: "Live for next user. No deploy needed.",
                        });
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-secondary transition-smooth text-left ${
                      p.id === provider.id ? "bg-secondary/60" : ""
                    }`}
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.reliability}% uptime
                      </div>
                    </div>
                    <span className="font-mono text-xs text-primary">{p.cost}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onRemove(step.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-smooth"
          aria-label="Remove step"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------- Drop zone wrapper ---------- */
function CanvasDropZone({
  steps,
  children,
}: {
  steps: FlowStep[];
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "canvas" });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] rounded-xl border-2 border-dashed transition-smooth p-4 space-y-3 ${
        isOver
          ? "border-primary bg-primary/5"
          : steps.length === 0
          ? "border-border bg-secondary/20"
          : "border-transparent"
      }`}
    >
      {children}
      {steps.length === 0 && (
        <div className="h-72 flex flex-col items-center justify-center text-center text-muted-foreground">
          <div className="h-14 w-14 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-4">
            <Plus className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium">Drag steps here to build your flow</p>
          <p className="text-xs mt-1">Order matters — each step runs in sequence</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Main builder ---------- */
export function FlowBuilder() {
  const qc = useQueryClient();
  const [flowName, setFlowName] = useState("us_onboarding");
  const [steps, setSteps] = useState<FlowStep[]>(initialFlow);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [hydratedFromApi, setHydratedFromApi] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePaletteKind, setActivePaletteKind] = useState<StepKind | null>(null);
  const [copied, setCopied] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const flowsQuery = useQuery({
    queryKey: ["flows"],
    queryFn: async () => {
      const { flows } = await api.flows.list();
      return flows;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; name: string; steps: FlowStep[] }) => {
      const stepsConfig = payload.steps.map((s) => ({ type: s.kind, provider: s.providerId }));
      if (payload.id) {
        const { flow } = await api.flows.update(payload.id, { name: payload.name, steps: stepsConfig });
        return flow;
      }
      const { flow } = await api.flows.create({ name: payload.name, steps: stepsConfig });
      return flow;
    },
    onSuccess: (flow: Flow) => {
      setFlowId(flow.id);
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Flow saved", { description: `"${flow.name}"` });
    },
    onError: (e) => {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Unknown error" });
    },
  });

  useEffect(() => {
    if (hydratedFromApi) return;
    if (!flowsQuery.data || flowsQuery.data.length === 0) return;
    const latest = flowsQuery.data[0];
    setFlowId(latest.id);
    setFlowName(latest.name);
    setSteps(
      latest.steps.map((s, idx) => ({
        id: `s_${idx}_${Date.now()}`,
        kind: s.type,
        providerId: s.provider,
      })),
    );
    setHydratedFromApi(true);
  }, [flowsQuery.data, hydratedFromApi]);

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current;
    if (data?.fromPalette) {
      setActivePaletteKind(data.kind);
    } else {
      setActiveId(e.active.id as string);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    setActivePaletteKind(null);
    if (!over) return;

    const data = active.data.current;

    // Add from palette
    if (data?.fromPalette) {
      const kind = data.kind as StepKind;
      const def = getStep(kind);
      const newStep: FlowStep = {
        id: `s_${Date.now()}`,
        kind,
        providerId: def.providers[0].id,
      };
      setSteps((prev) => [...prev, newStep]);
      toast.success(`${def.label} added`);
      return;
    }

    // Reorder existing
    if (active.id !== over.id) {
      setSteps((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const updateProvider = (id: string, providerId: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, providerId } : s)));

  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id));

  const totalCost = steps.reduce((sum, s) => {
    const v = parseFloat(getStep(s.kind).unitCost.replace("$", ""));
    return sum + v;
  }, 0);

  const config = {
    flow: flowName,
    steps: steps.map((s) => ({
      type: s.kind,
      provider: s.providerId,
    })),
  };

  const codeSnippet = `import { validly } from '@validly/sdk';

const result = await validly.run({
  flow: "${flowName}",
  user: {
    phone: "+1...",
    email: "user@app.com",
    // ...
  },
});`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    toast.success("Snippet copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeploy = () => {
    saveMutation.mutate({ id: flowId ?? undefined, name: flowName, steps });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid lg:grid-cols-[280px_1fr_360px] gap-6">
        {/* LEFT — Palette */}
        <aside className="space-y-4">
          <div className="gradient-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Step Library
            </h3>
            <div className="space-y-2">
              {STEP_LIBRARY.map((s) => (
                <PaletteItem key={s.kind} kind={s.kind} />
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground px-2">
            Drag any step into the canvas. Reorder by grabbing the handle.
          </p>
        </aside>

        {/* CENTER — Canvas */}
        <div className="space-y-4">
          <div className="gradient-card border border-border rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <label className="text-xs text-muted-foreground font-mono">flow:</label>
                <input
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value.replace(/\s+/g, "_"))}
                  className="bg-background border border-border rounded-md px-3 py-1.5 text-sm font-mono font-semibold focus:outline-none focus:border-primary transition-smooth flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">
                  Est.{" "}
                  <span className="font-mono font-semibold text-foreground">
                    ${totalCost.toFixed(3)}
                  </span>{" "}
                  / user
                </div>
                <Button variant="hero" size="sm" onClick={handleDeploy}>
                  <Rocket className="h-3.5 w-3.5" />
                  {saveMutation.isPending ? "Saving…" : "Deploy"}
                </Button>
              </div>
            </div>
          </div>

          <CanvasDropZone steps={steps}>
            <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {steps.map((step, i) => (
                <FlowCard
                  key={step.id}
                  step={step}
                  index={i}
                  onProviderChange={updateProvider}
                  onRemove={removeStep}
                />
              ))}
            </SortableContext>
          </CanvasDropZone>
        </div>

        {/* RIGHT — Code & config */}
        <aside className="space-y-4">
          <div className="gradient-card border border-primary/30 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs font-mono text-primary">integration.ts</span>
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground transition-smooth"
                aria-label="Copy snippet"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto text-muted-foreground">
              {codeSnippet}
            </pre>
          </div>

          <div className="gradient-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs font-mono text-muted-foreground">flow.json</span>
              <span className="text-[10px] uppercase tracking-wider text-success">Live config</span>
            </div>
            <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto max-h-[300px]">
              <span className="text-primary">{JSON.stringify(config, null, 2)}</span>
            </pre>
          </div>

          <div className="gradient-card border border-border rounded-xl p-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Why this matters
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Switch any provider above — your code stays identical. The next API call
              automatically uses the new vendor.
            </p>
          </div>
        </aside>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activePaletteKind ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-primary bg-card shadow-elegant w-64">
            {(() => {
              const s = getStep(activePaletteKind);
              return (
                <>
                  <div className="h-9 w-9 rounded-md gradient-primary flex items-center justify-center">
                    <s.icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="text-sm font-semibold">{s.label}</div>
                </>
              );
            })()}
          </div>
        ) : activeId ? (
          <div className="gradient-card border border-primary rounded-xl p-4 shadow-elegant w-full opacity-90">
            <div className="text-sm font-semibold">
              {getStep(steps.find((s) => s.id === activeId)!.kind).label}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

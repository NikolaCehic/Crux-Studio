import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  RunBundle,
  RunSummary,
  SourcePolicy,
} from "@crux-studio/crux-provider";
import {
  AlertTriangle,
  Ban,
  Boxes,
  Check,
  CircleCheck,
  CircleDashed,
  CircleX,
  Download,
  FileJson,
  FileText,
  GitCompareArrows,
  NotebookText,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  SquareActivity,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  annotateEvidence,
  cancelRunJob,
  compareRuns,
  createProject,
  createSourcePack,
  getRunJob,
  getRun,
  listDemos,
  listEvidenceTasks,
  listProjects,
  listProviders,
  listRunJobs,
  listRuns,
  listSourcePacks,
  replayRun,
  retryRunJob,
  resolveEvidenceTask,
  reviewClaim,
  startRunJob,
  type ProviderRegistry,
  type DemoQuestion,
  type RunComparison,
  type RunJob,
  type StudioEvidenceTask,
  type StudioProject,
  type StudioReview,
  type StudioSourcePack,
} from "./api";
import "./styles.css";

type AskFormState = {
  question: string;
  context: string;
  timeHorizon: string;
  sourcePolicy: SourcePolicy;
};

type SourceDraftFile = {
  name: string;
  content: string;
  size: number;
};

type ArtifactTab =
  | "Brief"
  | "Memo"
  | "Claims"
  | "Evidence"
  | "Sources"
  | "Contradictions"
  | "Uncertainty"
  | "Agents"
  | "Council"
  | "Diagnostics"
  | "Trace";

const artifactTabs: ArtifactTab[] = [
  "Brief",
  "Memo",
  "Claims",
  "Evidence",
  "Sources",
  "Contradictions",
  "Uncertainty",
  "Agents",
  "Council",
  "Diagnostics",
  "Trace",
];

const policyOptions: SourcePolicy[] = ["offline", "hybrid", "web"];

const initialForm: AskFormState = {
  question: "",
  context: "",
  timeHorizon: "30 days",
  sourcePolicy: "offline",
};

const defaultSourceDraft = "# Source note\n\nPaste Markdown, TXT, or CSV evidence here.";

const policyHelp: Record<SourcePolicy, string> = {
  offline: "Draft with local context only. Treat source-free output as untrusted.",
  hybrid: "Use attached source packs first, then provider context when available.",
  web: "Connector-ready mode for providers that can resolve live sources.",
};

const navItems = [
  { href: "#ask", icon: Plus, label: "New run" },
  { href: "#memo", icon: NotebookText, label: "Current run" },
  { href: "#artifacts", icon: Boxes, label: "Artifacts" },
  { href: "#trace", icon: SquareActivity, label: "Trace" },
];

const formatConfidence = (value: number) => `${Math.round(value * 100)}%`;

export function App() {
  const [form, setForm] = useState<AskFormState>(initialForm);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [sourcePacks, setSourcePacks] = useState<StudioSourcePack[]>([]);
  const [providers, setProviders] = useState<ProviderRegistry["providers"]>([]);
  const [demos, setDemos] = useState<DemoQuestion[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedSourcePackId, setSelectedSourcePackId] = useState("");
  const [sourcePackName, setSourcePackName] = useState("Wholesale intake notes");
  const [sourceDraft, setSourceDraft] = useState(defaultSourceDraft);
  const [sourceFiles, setSourceFiles] = useState<SourceDraftFile[]>([]);
  const [run, setRun] = useState<RunSummary | null>(null);
  const [bundle, setBundle] = useState<RunBundle | null>(null);
  const [review, setReview] = useState<StudioReview | null>(null);
  const [evidenceTasks, setEvidenceTasks] = useState<StudioEvidenceTask[]>([]);
  const [comparison, setComparison] = useState<RunComparison | null>(null);
  const [jobs, setJobs] = useState<RunJob[]>([]);
  const [activeJob, setActiveJob] = useState<RunJob | null>(null);
  const [activeTab, setActiveTab] = useState<ArtifactTab>("Brief");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingBundle, setIsLoadingBundle] = useState(false);

  const selectedRun = bundle ?? run;
  const activeProvider = providers[0];
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedSourcePack = sourcePacks.find((pack) => pack.id === selectedSourcePackId);
  const isJobPending = activeJob ? isPendingJob(activeJob.status) : false;
  const canRun = form.question.trim().length > 0 && !isRunning && !isJobPending;
  const visibleSourcePacks = useMemo(
    () =>
      sourcePacks.filter(
        (pack) => !selectedProjectId || pack.projectId === selectedProjectId,
      ),
    [selectedProjectId, sourcePacks],
  );

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      listRuns(),
      listProjects(),
      listSourcePacks(),
      listProviders(),
      listDemos(),
      listRunJobs(),
    ])
      .then(([history, loadedProjects, loadedSourcePacks, registry, loadedDemos, loadedJobs]) => {
        if (!cancelled) {
          setRuns(history);
          setProjects(loadedProjects);
          setSourcePacks(loadedSourcePacks);
          setProviders(registry.providers);
          setDemos(loadedDemos);
          setJobs(loadedJobs);
          setActiveJob((current) => current ?? loadedJobs[0] ?? null);
          setSelectedProjectId(loadedProjects[0]?.id ?? "");
          setSelectedSourcePackId(
            loadedSourcePacks.find(
              (pack) => pack.projectId === loadedProjects[0]?.id,
            )?.id ?? "",
          );
          if (history[0]) {
            setRun(history[0]);
            void loadBundle(history[0].runId);
          }
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Run history failed to load.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeJob || !isPendingJob(activeJob.status)) {
      return;
    }

    let cancelled = false;

    const jobId = activeJob.jobId;

    async function pollJob() {
      try {
        const nextJob = await getRunJob(jobId);
        if (cancelled) {
          return;
        }

        await applyRunJob(nextJob);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Run job failed to load.");
        }
      }
    }

    void pollJob();
    const intervalId = window.setInterval(() => void pollJob(), 1200);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeJob?.jobId, activeJob?.status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canRun) {
      setError("Question is required.");
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const nextJob = await startRunJob({
        question: form.question,
        context: form.context,
        timeHorizon: form.timeHorizon,
        sourcePolicy: form.sourcePolicy,
        projectId: selectedProjectId || undefined,
        sourcePackId: selectedSourcePackId || undefined,
      });
      setActiveJob(nextJob);
      setJobs((current) => upsertJob(current, nextJob));
      setActiveTab("Brief");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Run job failed to start.");
    } finally {
      setIsRunning(false);
    }
  }

  async function applyRunJob(nextJob: RunJob) {
    setActiveJob(nextJob);
    setJobs((current) => upsertJob(current, nextJob));

    if (nextJob.status === "succeeded" && nextJob.run) {
      setRun(nextJob.run);
      setRuns((current) => upsertRun(current, nextJob.run as RunSummary));
      setActiveTab("Brief");
      setError(null);
      await loadBundle(nextJob.run.runId);
    } else if (nextJob.status === "failed") {
      setError(nextJob.error ?? "Run job failed.");
    } else if (nextJob.status === "cancelled") {
      setError(null);
    }
  }

  async function loadBundle(runId: string) {
    setIsLoadingBundle(true);
    setError(null);

    try {
      const [nextBundle, nextEvidenceTasks] = await Promise.all([
        getRun(runId),
        listEvidenceTasks(runId).catch(() => []),
      ]);
      setBundle(nextBundle);
      setRun(nextBundle);
      setReview(reviewFromBundle(nextBundle));
      setEvidenceTasks(nextEvidenceTasks);
      setRuns((current) => upsertRun(current, nextBundle));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Run bundle failed to load.");
    } finally {
      setIsLoadingBundle(false);
    }
  }

  async function handleCreateProject() {
    try {
      const project = await createProject("New Crux Project");
      setProjects((current) => upsertById(current, project));
      setSelectedProjectId(project.id);
      setSelectedSourcePackId("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Project creation failed.");
    }
  }

  function handleUseDemo(demo: DemoQuestion) {
    setForm({
      question: demo.question,
      context: demo.context,
      timeHorizon: demo.timeHorizon,
      sourcePolicy: demo.sourcePolicy,
    });
    setError(null);
  }

  function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedSourcePackId(
      sourcePacks.find((pack) => pack.projectId === projectId)?.id ?? "",
    );
  }

  async function handleCreateSourcePack() {
    try {
      const files = sourceFiles.length
        ? sourceFiles.map((file) => ({ name: file.name, content: file.content }))
        : [{ name: "studio-source.md", content: sourceDraft.trim() }];

      if (!sourcePackName.trim() || files.every((file) => !file.content.trim())) {
        setError("Source pack name and at least one source file or pasted source are required.");
        return;
      }

      const projectId = selectedProjectId || projects[0]?.id;
      if (!projectId) {
        const project = await createProject("Default Project");
        setProjects((current) => upsertById(current, project));
        setSelectedProjectId(project.id);
        const pack = await createSourcePack({
          projectId: project.id,
          name: sourcePackName.trim(),
          files,
        });
        setSourcePacks((current) => upsertById(current, pack));
        setSelectedSourcePackId(pack.id);
        return;
      }

      const pack = await createSourcePack({
        projectId,
        name: sourcePackName.trim(),
        files,
      });
      setSourcePacks((current) => upsertById(current, pack));
      setSelectedSourcePackId(pack.id);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Source pack creation failed.");
    }
  }

  async function handleSelectSourceFiles(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) {
      setSourceFiles([]);
      return;
    }

    try {
      setSourceFiles(await Promise.all(selectedFiles.map(readSourceDraftFile)));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Source files failed to load.");
    }
  }

  async function handleReviewClaim(claimId: string, status: "approved" | "rejected") {
    if (!selectedRun) return;

    try {
      const nextReview = await reviewClaim(selectedRun.runId, {
        claimId,
        status,
        reviewer: "Studio reviewer",
        rationale: status === "approved" ? "Approved in Studio." : "Rejected in Studio.",
      });
      setReview(nextReview);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Claim review failed.");
    }
  }

  async function handleAnnotateEvidence(evidenceId: string) {
    if (!selectedRun) return;

    try {
      const nextReview = await annotateEvidence(selectedRun.runId, {
        evidenceId,
        reviewer: "Studio reviewer",
        note: "Annotated in Studio.",
      });
      setReview(nextReview);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Evidence annotation failed.");
    }
  }

  async function handleResolveEvidenceTask(taskId: string) {
    if (!selectedRun) return;

    const sourceContent = sourceDraft.trim();
    if (!sourceContent || sourceContent === defaultSourceDraft.trim()) {
      setError("Paste source evidence before resolving an evidence task.");
      return;
    }

    try {
      const task = evidenceTasks.find((item) => item.taskId === taskId);
      const result = await resolveEvidenceTask(selectedRun.runId, taskId, {
        sourcePackName: sourcePackName.trim() || `Evidence closure for ${task?.title ?? selectedRun.runId}`,
        sourceName: `${slugify(task?.title ?? "evidence-gap") || "evidence-gap"}.md`,
        sourceContent,
        note: `Resolved from Studio for ${selectedRun.runId}.`,
      });
      setEvidenceTasks((current) => upsertEvidenceTask(current, result.task));
      setSourcePacks((current) => upsertById(current, result.sourcePack));
      setSelectedProjectId(result.sourcePack.projectId);
      setSelectedSourcePackId(result.sourcePack.id);
      await applyRunJob(result.job);
      setActiveTab("Brief");
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Evidence task resolution failed.");
    }
  }

  async function handleReplay() {
    if (!selectedRun) return;

    try {
      const replayed = await replayRun(selectedRun.runId);
      setRuns((current) => upsertRun(current, replayed));
      setRun(replayed);
      setActiveTab("Brief");
      await loadBundle(replayed.runId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Replay failed.");
    }
  }

  async function handleCancelJob(jobId: string) {
    try {
      await applyRunJob(await cancelRunJob(jobId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Run job cancellation failed.");
    }
  }

  async function handleRetryJob(jobId: string) {
    try {
      const nextJob = await retryRunJob(jobId);
      setActiveJob(nextJob);
      setJobs((current) => upsertJob(current, nextJob));
      setActiveTab("Brief");
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Run job retry failed.");
    }
  }

  async function handleCompareLatest() {
    if (runs.length < 2) {
      setError("At least two runs are required for comparison.");
      return;
    }

    const [right, left] = runs;
    try {
      setComparison(await compareRuns(left.runId, right.runId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Run comparison failed.");
    }
  }

  return (
    <main className="min-h-svh bg-background text-foreground lg:grid lg:grid-cols-[256px_minmax(0,1fr)_320px]">
      <aside
        aria-label="Workspace navigation"
        className="border-border/80 bg-sidebar p-4 text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:overflow-y-auto lg:border-r"
      >
        <div className="flex items-center gap-3">
          <CruxMark />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">Crux Studio</h1>
            <p className="font-mono text-[0.72rem] text-muted-foreground">
              v0.11 · workspace
            </p>
          </div>
        </div>

        <nav aria-label="Run sections" className="mt-6 grid gap-1">
          <p className="px-2 font-mono text-[0.68rem] font-semibold uppercase text-muted-foreground">
            Workspace
          </p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
            {navItems.map((item) => (
              <Button
                asChild
                className={cn(
                  "h-9 justify-start gap-2 px-2.5",
                  item.href === "#ask" && "bg-accent text-accent-foreground",
                )}
                key={item.href}
                variant="ghost"
              >
                <a aria-current={item.href === "#ask" ? "page" : undefined} href={item.href}>
                  <item.icon className="size-4" />
                  {item.label}
                </a>
              </Button>
            ))}
          </div>
        </nav>

        <Separator className="my-5" />

        <section aria-label="Run history" className="grid gap-3">
          <div className="grid gap-2">
            <p className="text-sm font-semibold">
              Provider: {activeProvider?.id ?? "unknown"}
            </p>
            {activeProvider?.capabilities.length ? (
              <div className="flex flex-wrap gap-1.5" aria-label="Provider capabilities">
                {activeProvider.capabilities.map((capability) => (
                  <Badge className="bg-emerald-100 text-emerald-900 ring-emerald-300/70" key={capability} variant="outline">
                    {capability}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-muted-foreground">Run history</span>
            <Badge variant="secondary">{runs.length}</Badge>
          </div>

          {runs.length ? (
            <ScrollArea className="max-h-56">
              <div className="grid gap-2 pr-2">
                {runs.slice(0, 8).map((item) => (
                  <Button
                    className="h-auto justify-start whitespace-normal px-3 py-2 text-left"
                    key={item.runId}
                    onClick={() => {
                      setActiveTab("Brief");
                      void loadBundle(item.runId);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="line-clamp-1 text-sm font-medium">{item.question}</span>
                      <span className="truncate font-mono text-[0.68rem] text-muted-foreground">
                        {item.runId}
                      </span>
                    </span>
                    <TrustBadge status={item.trust.status} />
                  </Button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">No runs indexed yet.</p>
          )}
        </section>

        <Separator className="my-5" />

        <section aria-label="Project workspace" className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted-foreground">Project</span>
            <Button size="sm" type="button" onClick={() => void handleCreateProject()}>
              <Plus className="size-3.5" />
              New
            </Button>
          </div>

          <NativeSelect
            aria-label="Project"
            className="w-full"
            value={selectedProjectId}
            onChange={(event) => handleSelectProject(event.target.value)}
          >
            <NativeSelectOption value="">No project yet</NativeSelectOption>
            {projects.map((project) => (
              <NativeSelectOption key={project.id} value={project.id}>
                {project.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>

          <div className="grid gap-2">
            {visibleSourcePacks.length ? (
              visibleSourcePacks.map((pack) => (
                <Button
                  aria-pressed={pack.id === selectedSourcePackId}
                  className={cn(
                    "h-auto justify-between gap-3 whitespace-normal px-3 py-2 text-left",
                    pack.id === selectedSourcePackId &&
                      "border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-100",
                  )}
                  key={pack.id}
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedSourcePackId(pack.id)}
                >
                  <span className="line-clamp-1 font-medium">{pack.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {pack.sourceCount} sources
                  </span>
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No source packs in this project.</p>
            )}
          </div>
        </section>

        <div className="mt-5 border-t pt-4 text-sm lg:mt-auto">
          <p className="text-muted-foreground">Current run</p>
          <p className="break-all font-mono text-xs font-semibold">
            {selectedRun?.runId ?? "None"}
          </p>
        </div>
      </aside>

      <section className="min-w-0">
        <header
          aria-label="Workspace status"
          className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 lg:px-8"
        >
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>workspace</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{selectedProject?.name ?? "No project"}</BreadcrumbPage>
              </BreadcrumbItem>
              {selectedSourcePack ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{selectedSourcePack.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : null}
            </BreadcrumbList>
          </Breadcrumb>
          <Badge className="gap-1.5 bg-emerald-100 text-emerald-900 ring-emerald-300/70" variant="outline">
            <span className="size-1.5 rounded-full bg-emerald-700" />
            harness engine ready
          </Badge>
        </header>

        <section className="grid gap-6 p-4 xl:grid-cols-[minmax(300px,390px)_minmax(0,1fr)] xl:p-8" id="ask">
          <RunForm
            activeJob={activeJob}
            canRun={canRun}
            demos={demos}
            error={error}
            form={form}
            isRunning={isRunning}
            policyHelp={policyHelp[form.sourcePolicy]}
            selectedProjectName={selectedProject?.name ?? "workspace"}
            selectedSourcePackId={selectedSourcePackId}
            sourceDraft={sourceDraft}
            sourceFiles={sourceFiles}
            sourcePackName={sourcePackName}
            visibleSourcePacks={visibleSourcePacks}
            onCancelJob={(jobId) => void handleCancelJob(jobId)}
            onCreateSourcePack={() => void handleCreateSourcePack()}
            onClearSourceFiles={() => setSourceFiles([])}
            onFormChange={setForm}
            onSelectSourceFiles={(files) => void handleSelectSourceFiles(files)}
            onSetSourceDraft={setSourceDraft}
            onSetSourcePackName={setSourcePackName}
            onSetSourcePackId={setSelectedSourcePackId}
            onSubmit={handleSubmit}
            onRetryJob={(jobId) => void handleRetryJob(jobId)}
            onUseDemo={handleUseDemo}
          />

          <MemoPanel
            activeTab={activeTab}
            bundle={bundle}
            comparison={comparison}
            evidenceTasks={evidenceTasks}
            isLoadingBundle={isLoadingBundle}
            review={review}
            selectedRun={selectedRun}
            onAnnotateEvidence={handleAnnotateEvidence}
            onChangeTab={setActiveTab}
            onCompareLatest={() => void handleCompareLatest()}
            onReplay={() => void handleReplay()}
            onResolveEvidenceTask={(taskId) => void handleResolveEvidenceTask(taskId)}
            onReviewClaim={handleReviewClaim}
          />
        </section>
      </section>

      <aside
        aria-label="Run inspector"
        className="grid gap-4 border-t bg-sidebar p-4 text-sidebar-foreground lg:sticky lg:top-0 lg:h-svh lg:overflow-y-auto lg:border-l lg:border-t-0"
      >
        <InspectorCard label="Lifecycle">
          <RunLifecyclePanel
            compact
            job={activeJob}
            recentJobs={jobs.slice(0, 4)}
            onCancelJob={(jobId) => void handleCancelJob(jobId)}
            onRetryJob={(jobId) => void handleRetryJob(jobId)}
          />
        </InspectorCard>

        <InspectorCard label="Readiness">
          <ReadinessCard run={selectedRun} />
        </InspectorCard>

        <InspectorCard label="Trust">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Trust gate</h2>
            <TrustBadge status={selectedRun?.trust.status ?? "pending"} />
          </div>
          <FactList
            items={[
              {
                label: "Confidence",
                value: selectedRun ? formatConfidence(selectedRun.trust.confidence) : "Waiting",
              },
              { label: "Answerability", value: selectedRun?.answerability ?? "Not evaluated" },
              { label: "Risk", value: selectedRun?.risk ?? "Not evaluated" },
            ]}
          />
        </InspectorCard>

        <InspectorCard label="Blocking issues">
          {selectedRun?.trust.blockingIssues.length ? (
            <ul className="grid gap-2">
              {selectedRun.trust.blockingIssues.map((issue) => (
                <li
                  className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-950"
                  key={issue}
                >
                  {issue}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {selectedRun ? "No blocking issues reported." : "Waiting"}
            </p>
          )}
        </InspectorCard>

        <InspectorCard label="Bounded agents">
          <AgentSummaryCard agents={selectedRun?.agents} />
        </InspectorCard>

        <InspectorCard label="Sources">
          <SourceWorkspaceCard sourceWorkspace={selectedRun?.sourceWorkspace} />
        </InspectorCard>

        <InspectorCard label="Evidence gaps">
          <EvidenceTaskPanel
            compact
            tasks={evidenceTasks}
            onResolveTask={(taskId) => void handleResolveEvidenceTask(taskId)}
          />
        </InspectorCard>

        <InspectorCard id="artifacts" label="Artifacts">
          <FactList
            mono
            items={[
              { label: "Input", value: selectedRun?.paths.generatedInput ?? "Not generated" },
              { label: "Memo", value: selectedRun?.paths.decisionMemo ?? "Not generated" },
              { label: "Report", value: selectedRun?.paths.htmlReport ?? "Not generated" },
            ]}
          />
          {selectedRun ? (
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Raw artifact links">
              <Button asChild size="sm" variant="outline">
                <a href={`/api/runs/${selectedRun.runId}/artifacts/claims`}>
                  <FileJson className="size-3.5" />
                  Claims JSON
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`/api/runs/${selectedRun.runId}/artifacts/evidence`}>
                  <FileJson className="size-3.5" />
                  Evidence JSON
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`/api/runs/${selectedRun.runId}/artifacts/source-inventory`}>
                  <FileJson className="size-3.5" />
                  Sources JSON
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`/api/runs/${selectedRun.runId}/artifacts/agents`}>
                  <FileJson className="size-3.5" />
                  Agents JSON
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`/api/runs/${selectedRun.runId}/artifacts/trace`}>
                  <FileJson className="size-3.5" />
                  Trace JSON
                </a>
              </Button>
            </div>
          ) : null}
        </InspectorCard>

        <InspectorCard label="Review">
          <ReviewSummary review={review} runId={selectedRun?.runId} compact />
        </InspectorCard>
      </aside>
    </main>
  );
}

function RunForm({
  activeJob,
  canRun,
  demos,
  error,
  form,
  isRunning,
  policyHelp,
  selectedProjectName,
  selectedSourcePackId,
  sourceDraft,
  sourceFiles,
  sourcePackName,
  visibleSourcePacks,
  onCancelJob,
  onCreateSourcePack,
  onClearSourceFiles,
  onFormChange,
  onSelectSourceFiles,
  onSetSourceDraft,
  onSetSourcePackId,
  onSetSourcePackName,
  onSubmit,
  onRetryJob,
  onUseDemo,
}: {
  activeJob: RunJob | null;
  canRun: boolean;
  demos: DemoQuestion[];
  error: string | null;
  form: AskFormState;
  isRunning: boolean;
  policyHelp: string;
  selectedProjectName: string;
  selectedSourcePackId: string;
  sourceDraft: string;
  sourceFiles: SourceDraftFile[];
  sourcePackName: string;
  visibleSourcePacks: StudioSourcePack[];
  onCancelJob: (jobId: string) => void;
  onCreateSourcePack: () => void;
  onClearSourceFiles: () => void;
  onFormChange: Dispatch<SetStateAction<AskFormState>>;
  onSelectSourceFiles: (files: FileList | null) => void;
  onSetSourceDraft: (value: string) => void;
  onSetSourcePackId: (value: string) => void;
  onSetSourcePackName: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRetryJob: (jobId: string) => void;
  onUseDemo: (demo: DemoQuestion) => void;
}) {
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <form className="self-start" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <div>
            <p className="font-mono text-[0.68rem] font-semibold uppercase text-muted-foreground">
              New run · {selectedProjectName}
            </p>
            <CardTitle className="mt-2 text-xl">Ask a decision-grade question.</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {demos.length ? (
              <div className="grid gap-2 rounded-lg border bg-muted/25 p-3" aria-label="Demo questions">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="size-4 text-primary" />
                  Demo spine
                </div>
                <div className="grid gap-2">
                  {demos.slice(0, 5).map((demo) => (
                    <Button
                      className="h-auto justify-start whitespace-normal px-3 py-2 text-left"
                      key={demo.id}
                      type="button"
                      variant="outline"
                      onClick={() => onUseDemo(demo)}
                    >
                      {demo.title}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <Field>
              <FieldLabel htmlFor="question">Question</FieldLabel>
              <Textarea
                id="question"
                name="question"
                rows={4}
                value={form.question}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, question: event.target.value }))
                }
                placeholder="How should a support team reduce first-response time without hiring more agents this month?"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="context">Context</FieldLabel>
              <Textarea
                id="context"
                name="context"
                rows={3}
                value={form.context}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, context: event.target.value }))
                }
                placeholder="Constraints, goals, tradeoffs, stakeholders"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(210px,1fr)]">
              <Field>
                <FieldLabel htmlFor="timeHorizon">Time horizon</FieldLabel>
                <Input
                  id="timeHorizon"
                  name="timeHorizon"
                  value={form.timeHorizon}
                  onChange={(event) =>
                    onFormChange((current) => ({
                      ...current,
                      timeHorizon: event.target.value,
                    }))
                  }
                />
              </Field>

              <FieldSet aria-label="Source policy" className="gap-2">
                <FieldLegend variant="label">Source policy</FieldLegend>
                <div className="grid grid-cols-3 rounded-lg border bg-background p-1">
                  {policyOptions.map((policy) => (
                    <Button
                      aria-pressed={form.sourcePolicy === policy}
                      className={cn(
                        "h-8 capitalize",
                        form.sourcePolicy === policy &&
                          "bg-accent text-accent-foreground hover:bg-accent",
                      )}
                      key={policy}
                      type="button"
                      variant="ghost"
                      onClick={() => onFormChange((current) => ({ ...current, sourcePolicy: policy }))}
                    >
                      {policy}
                    </Button>
                  ))}
                </div>
                <FieldDescription>{policyHelp}</FieldDescription>
              </FieldSet>
            </div>

            <Field>
              <FieldLabel htmlFor="sourcePack">Source pack</FieldLabel>
              <NativeSelect
                aria-label="Source pack"
                className="w-full"
                id="sourcePack"
                value={selectedSourcePackId}
                onChange={(event) => onSetSourcePackId(event.target.value)}
              >
                <NativeSelectOption value="">No source pack</NativeSelectOption>
                {visibleSourcePacks.map((pack) => (
                  <NativeSelectOption key={pack.id} value={pack.id}>
                    {pack.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <div aria-label="Source attachment" className="grid gap-3 rounded-lg border border-dashed bg-muted/35 p-4">
              <Field>
                <FieldLabel htmlFor="sourcePackName">New source pack</FieldLabel>
                <Input
                  id="sourcePackName"
                  value={sourcePackName}
                  onChange={(event) => onSetSourcePackName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="sourceFiles">Attach source files</FieldLabel>
                <Input
                  accept=".md,.markdown,.txt,.csv,text/markdown,text/plain,text/csv"
                  id="sourceFiles"
                  multiple
                  ref={sourceFileInputRef}
                  type="file"
                  onChange={(event) => onSelectSourceFiles(event.currentTarget.files)}
                />
                <FieldDescription>
                  Markdown, TXT, and CSV files become Harness sources.
                </FieldDescription>
              </Field>
              {sourceFiles.length ? (
                <div className="grid gap-2 rounded-md border bg-background p-2" aria-label="Selected source files">
                  {sourceFiles.map((file) => (
                    <div className="flex items-center justify-between gap-3 text-sm" key={`${file.name}-${file.size}`}>
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{file.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[0.68rem] text-muted-foreground">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  ))}
                  <Button
                    className="justify-self-start"
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (sourceFileInputRef.current) {
                        sourceFileInputRef.current.value = "";
                      }
                      onClearSourceFiles();
                    }}
                  >
                    <X className="size-3.5" />
                    Clear files
                  </Button>
                </div>
              ) : null}
              <Field>
                <FieldLabel htmlFor="sourceDraft">Source content</FieldLabel>
                <Textarea
                  id="sourceDraft"
                  rows={4}
                  value={sourceDraft}
                  onChange={(event) => onSetSourceDraft(event.target.value)}
                />
              </Field>
              <Button type="button" variant="secondary" onClick={onCreateSourcePack}>
                <Plus className="size-4" />
                Create source pack
              </Button>
            </div>

            <RunLifecyclePanel
              job={activeJob}
              recentJobs={[]}
              onCancelJob={onCancelJob}
              onRetryJob={onRetryJob}
            />

            {error ? <FieldError>{error}</FieldError> : null}

            <div className="flex justify-end">
              <Button className="min-w-32" disabled={!canRun} type="submit">
                <Play className="size-4" />
                {isRunning ? "Running" : "Run Crux"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}

function RunLifecyclePanel({
  compact = false,
  job,
  recentJobs,
  onCancelJob,
  onRetryJob,
}: {
  compact?: boolean;
  job: RunJob | null;
  recentJobs: RunJob[];
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
}) {
  const failedJobs = recentJobs
    .filter((item) => item.status === "failed" || item.status === "cancelled")
    .filter((item) => item.jobId !== job?.jobId)
    .slice(0, compact ? 2 : 1);

  return (
    <section
      aria-label="Run lifecycle"
      className={cn("grid gap-3 rounded-lg border bg-muted/25 p-3", compact && "border-0 bg-transparent p-0")}
    >
      {!compact ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Run lifecycle</p>
          {job ? <RunJobBadge status={job.status} /> : null}
        </div>
      ) : null}

      {job ? (
        <div className="grid gap-2">
          {compact ? (
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Active job</p>
                <RunJobBadge status={job.status} />
              </div>
              <p className="line-clamp-1 break-all font-mono text-xs text-muted-foreground">
                {job.run?.runId ?? job.jobId}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Run state</p>
              <RunJobBadge status={job.status} />
            </div>
          )}
          {!compact ? (
            <FactList
              mono
              items={[
                { label: "Status", value: runJobLabel(job.status) },
                { label: "Job", value: job.jobId },
                { label: "Question", value: job.input.question },
                ...(job.run ? [{ label: "Run", value: job.run.runId }] : []),
                ...(job.error ? [{ label: "Note", value: job.error }] : []),
              ]}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {isPendingJob(job.status) ? (
              <Button size="sm" type="button" variant="outline" onClick={() => onCancelJob(job.jobId)}>
                <Ban className="size-3.5" />
                Cancel run
              </Button>
            ) : null}
            {job.status === "failed" || job.status === "cancelled" ? (
              <Button size="sm" type="button" variant="secondary" onClick={() => onRetryJob(job.jobId)}>
                <RefreshCw className="size-3.5" />
                Retry run
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Run jobs will appear here while Crux is queued, running, complete, failed, or cancelled.
        </p>
      )}

      {failedJobs.length ? (
        <div className="grid gap-2 border-t pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Needs action</p>
          {failedJobs.map((item) => (
            <div className="grid gap-2 rounded-md border bg-background p-2" key={item.jobId}>
              <div className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-sm">{item.input.question}</span>
                <RunJobBadge status={item.status} />
              </div>
              {item.error ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">{item.error}</p>
              ) : null}
              <Button
                className="justify-self-start"
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => onRetryJob(item.jobId)}
              >
                <RefreshCw className="size-3.5" />
                Retry run
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function MemoPanel({
  activeTab,
  bundle,
  comparison,
  evidenceTasks,
  isLoadingBundle,
  review,
  selectedRun,
  onAnnotateEvidence,
  onChangeTab,
  onCompareLatest,
  onReplay,
  onResolveEvidenceTask,
  onReviewClaim,
}: {
  activeTab: ArtifactTab;
  bundle: RunBundle | null;
  comparison: RunComparison | null;
  evidenceTasks: StudioEvidenceTask[];
  isLoadingBundle: boolean;
  review: StudioReview | null;
  selectedRun: RunBundle | RunSummary | null;
  onAnnotateEvidence: (evidenceId: string) => void;
  onChangeTab: (tab: ArtifactTab) => void;
  onCompareLatest: () => void;
  onReplay: () => void;
  onResolveEvidenceTask: (taskId: string) => void;
  onReviewClaim: (claimId: string, status: "approved" | "rejected") => void;
}) {
  return (
    <Card id="memo" aria-live="polite" className="min-h-[680px]">
      <CardHeader>
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase text-muted-foreground">
            Current run
          </p>
          <CardTitle className="mt-2 text-xl">
            {selectedRun ? "Workbench" : "No run yet"}
          </CardTitle>
        </div>
        {selectedRun ? (
          <CardAction className="flex flex-wrap justify-end gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`/api/runs/${selectedRun.runId}/export/memo`}>
                <Download className="size-3.5" />
                Export memo
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/runs/${selectedRun.runId}/export/decision-package`}>
                <Download className="size-3.5" />
                Decision package
              </a>
            </Button>
            <Button size="sm" type="button" variant="outline" onClick={onReplay}>
              <RotateCcw className="size-3.5" />
              Replay run
            </Button>
            <Button size="sm" type="button" variant="outline" onClick={onCompareLatest}>
              <GitCompareArrows className="size-3.5" />
              Compare latest
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent>
        {selectedRun ? (
          <>
            <ArtifactInspector
              activeTab={activeTab}
              bundle={bundle}
              evidenceTasks={evidenceTasks}
              isLoading={isLoadingBundle}
              onAnnotateEvidence={onAnnotateEvidence}
              onChangeTab={onChangeTab}
              onResolveEvidenceTask={onResolveEvidenceTask}
              onReviewClaim={onReviewClaim}
            />
            <ReviewSummary review={review} runId={selectedRun.runId} />
            {comparison ? <ComparisonSummary comparison={comparison} /> : null}
          </>
        ) : (
          <div className="grid min-h-36 place-items-center rounded-lg border border-dashed bg-muted/35 p-8 text-center text-sm text-muted-foreground">
            Ask a question to create the first inspectable Crux run.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ArtifactInspector({
  activeTab,
  bundle,
  evidenceTasks,
  isLoading,
  onAnnotateEvidence,
  onChangeTab,
  onResolveEvidenceTask,
  onReviewClaim,
}: {
  activeTab: ArtifactTab;
  bundle: RunBundle | null;
  evidenceTasks: StudioEvidenceTask[];
  isLoading: boolean;
  onAnnotateEvidence: (evidenceId: string) => void;
  onChangeTab: (tab: ArtifactTab) => void;
  onResolveEvidenceTask: (taskId: string) => void;
  onReviewClaim: (claimId: string, status: "approved" | "rejected") => void;
}) {
  return (
    <section className="mt-8 border-t pt-5" aria-label="Artifact inspector">
      <Tabs value={activeTab} onValueChange={(value) => onChangeTab(value as ArtifactTab)}>
        <TabsList
          aria-label="Artifact tabs"
          className="!h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0 pb-1"
          variant="line"
        >
          {artifactTabs.map((tab) => (
            <TabsTrigger
              className="h-9 flex-none rounded-lg border bg-background px-3"
              key={tab}
              value={tab}
              onClick={() => onChangeTab(tab)}
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        {artifactTabs.map((tab) => (
          <TabsContent className="mt-4" key={tab} value={tab}>
            {isLoading ? (
              <div className="grid gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : (
              renderArtifactTab(
                tab,
                bundle,
                evidenceTasks,
                onReviewClaim,
                onAnnotateEvidence,
                onChangeTab,
                onResolveEvidenceTask,
              )
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function DecisionBrief({
  evidenceTasks,
  memoText,
  run,
  onChangeTab,
  onResolveEvidenceTask,
}: {
  evidenceTasks: StudioEvidenceTask[];
  memoText: string;
  run: RunBundle | RunSummary;
  onChangeTab: (tab: ArtifactTab) => void;
  onResolveEvidenceTask: (taskId: string) => void;
}) {
  const recommendation =
    extractMemoSection(memoText, "Recommendation") ||
    firstMemoParagraph(memoText) ||
    run.memoPreview;
  const summary = extractMemoSection(memoText, "Executive Summary");
  const nextActions = uniqueStrings([
    run.readiness.nextAction,
    run.agents?.nextActions[0],
    ...(run.sourceWorkspace?.missingEvidence.slice(0, 2) ?? []),
  ]).slice(0, 3);
  const blockers = uniqueStrings([
    ...run.trust.blockingIssues,
    ...(run.agents?.blockingIssues ?? []),
  ]).slice(0, 3);

  return (
    <section
      aria-label="Decision brief"
      className="grid gap-5 rounded-lg border bg-muted/20 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[72ch]">
          <p className="font-mono text-[0.68rem] font-semibold uppercase text-muted-foreground">
            Answer first
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Decision brief</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReadinessBadge status={run.readiness.status} />
          <TrustBadge status={run.trust.status} />
        </div>
      </div>

      <div className="max-w-[72ch] space-y-3">
        <p className="text-base leading-7">{recommendation}</p>
        {summary ? (
          <p className="text-sm leading-6 text-muted-foreground">{truncateText(summary, 460)}</p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-semibold">Review readiness</p>
          <FactList
            items={[
              { label: "State", value: run.readiness.label },
              { label: "Confidence", value: formatConfidence(run.trust.confidence) },
              { label: "Sources", value: String(run.sourceWorkspace?.sourceCount ?? 0) },
              { label: "Chunks", value: String(run.sourceWorkspace?.sourceChunkCount ?? 0) },
            ]}
          />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-semibold">Next action</p>
          {nextActions.length ? (
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {nextActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Review claims and export when approved.
            </p>
          )}
        </div>
      </div>

      {blockers.length ? (
        <div className="rounded-md border border-amber-300 bg-amber-100 p-3 text-sm text-amber-950">
          <p className="font-semibold">Trust blockers</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <EvidenceTaskPanel
        tasks={evidenceTasks}
        onResolveTask={onResolveEvidenceTask}
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="button" variant="secondary" onClick={() => onChangeTab("Memo")}>
          <NotebookText className="size-3.5" />
          Open full memo
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={() => onChangeTab("Claims")}>
          <SearchCheck className="size-3.5" />
          Inspect claims
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={() => onChangeTab("Sources")}>
          <FileText className="size-3.5" />
          Inspect sources
        </Button>
      </div>
    </section>
  );
}

function EvidenceTaskPanel({
  compact = false,
  tasks,
  onResolveTask,
}: {
  compact?: boolean;
  tasks: StudioEvidenceTask[];
  onResolveTask: (taskId: string) => void;
}) {
  const openTasks = tasks.filter((task) => task.status === "open");
  const visibleTasks = (compact ? openTasks.slice(0, 2) : tasks.slice(0, 4));

  return (
    <section
      aria-label="Evidence gap closure"
      className={cn("grid gap-3 rounded-md border bg-background p-3", compact && "border-0 bg-transparent p-0")}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Evidence gap closure</p>
          {!compact ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Resolve a task with the source note in the ask panel, then Crux reruns with the new source pack.
            </p>
          ) : null}
        </div>
        <Badge variant={openTasks.length ? "secondary" : "outline"}>
          {openTasks.length ? `${openTasks.length} open` : "clear"}
        </Badge>
      </div>

      {visibleTasks.length ? (
        <div className="grid gap-2">
          {visibleTasks.map((task) => (
            <div className="grid gap-2 rounded-md border bg-muted/20 p-2" key={task.taskId}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
                  {!compact ? (
                    <p className="mt-1 font-mono text-[0.68rem] uppercase text-muted-foreground">
                      {evidenceTaskKindLabel(task.kind)}
                    </p>
                  ) : null}
                </div>
                <Badge variant={task.status === "resolved" ? "outline" : "secondary"}>
                  {task.status}
                </Badge>
              </div>
              {task.status === "open" ? (
                <Button
                  className="justify-self-start"
                  size="sm"
                  type="button"
                  variant="secondary"
                  onClick={() => onResolveTask(task.taskId)}
                >
                  <Plus className="size-3.5" />
                  Resolve with source note
                </Button>
              ) : task.rerunJobId ? (
                <p className="font-mono text-xs text-muted-foreground">Rerun job: {task.rerunJobId}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No evidence gaps are open for this run.</p>
      )}
    </section>
  );
}

function renderArtifactTab(
  tab: ArtifactTab,
  bundle: RunBundle | null,
  evidenceTasks: StudioEvidenceTask[],
  onReviewClaim: (claimId: string, status: "approved" | "rejected") => void,
  onAnnotateEvidence: (evidenceId: string) => void,
  onChangeTab: (tab: ArtifactTab) => void,
  onResolveEvidenceTask: (taskId: string) => void,
) {
  if (!bundle) {
    return <p className="text-sm text-muted-foreground">Select or create a run to inspect artifacts.</p>;
  }

  switch (tab) {
    case "Brief":
      return (
        <DecisionBrief
          evidenceTasks={evidenceTasks}
          memoText={bundle.memo}
          run={bundle}
          onChangeTab={onChangeTab}
          onResolveEvidenceTask={onResolveEvidenceTask}
        />
      );
    case "Memo":
      return <ReadableMemo memo={bundle.memo} />;
    case "Claims":
      return renderClaims(bundle.artifacts.claims, onReviewClaim);
    case "Evidence":
      return renderEvidence(bundle.artifacts.evidence, onAnnotateEvidence);
    case "Sources":
      return renderSources(bundle, evidenceTasks, onResolveEvidenceTask);
    case "Diagnostics":
      return renderDiagnostics(bundle.artifacts.diagnostics);
    case "Trace":
      return renderTrace(bundle.artifacts.trace);
    case "Contradictions":
      return <JsonArtifact value={bundle.artifacts.contradictions} />;
    case "Uncertainty":
      return <JsonArtifact value={bundle.artifacts.uncertainty} />;
    case "Agents":
      return renderAgents(bundle.artifacts.agents);
    case "Council":
      return <JsonArtifact value={bundle.artifacts.council} />;
  }
}

function AgentSummaryCard({ agents }: { agents: RunSummary["agents"] | undefined }) {
  if (!agents) {
    return <p className="text-sm text-muted-foreground">No bounded agent findings available.</p>;
  }

  return (
    <div className="grid gap-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{agents.agentCount} agents</span>
        <TrustBadge status={agents.status} />
      </div>
      <FactList
        items={[
          { label: "Confidence", value: formatConfidence(agents.confidence) },
          { label: "Warnings", value: String(agents.warningCount) },
          { label: "Failures", value: String(agents.failingCount) },
        ]}
      />
      {agents.nextActions.length ? (
        <div className="grid gap-1.5">
          <p className="font-medium text-muted-foreground">Next action</p>
          <p>{agents.nextActions[0]}</p>
        </div>
      ) : null}
    </div>
  );
}

function ReadinessCard({ run }: { run: RunBundle | RunSummary | null }) {
  if (!run) {
    return <p className="text-sm text-muted-foreground">Waiting for the first run.</p>;
  }

  return (
    <div className="grid gap-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{run.readiness.label}</h2>
        <ReadinessBadge status={run.readiness.status} />
      </div>
      <p className="text-muted-foreground">{run.readiness.reason}</p>
      <FactList
        items={[
          { label: "Blockers", value: String(run.readiness.blockerCount) },
          { label: "Harness", value: run.harnessVersion ?? "provider" },
        ]}
      />
      {run.readiness.nextAction ? (
        <div className="grid gap-1.5">
          <p className="font-medium text-muted-foreground">Next action</p>
          <p>{run.readiness.nextAction}</p>
        </div>
      ) : null}
    </div>
  );
}

function SourceWorkspaceCard({ sourceWorkspace }: { sourceWorkspace: RunSummary["sourceWorkspace"] | undefined }) {
  if (!sourceWorkspace) {
    return <p className="text-sm text-muted-foreground">No source workspace summary available.</p>;
  }

  return (
    <div className="grid gap-3 text-sm">
      <FactList
        items={[
          { label: "Sources", value: String(sourceWorkspace.sourceCount) },
          { label: "Chunks", value: String(sourceWorkspace.sourceChunkCount) },
          { label: "Pack", value: sourceWorkspace.sourcePackName ?? "none" },
        ]}
      />
      {sourceWorkspace.missingEvidence.length ? (
        <div className="grid gap-1.5">
          <p className="font-medium text-muted-foreground">Missing evidence</p>
          <ul className="list-inside list-disc">
            {sourceWorkspace.missingEvidence.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-muted-foreground">No source gaps reported.</p>
      )}
    </div>
  );
}

function renderAgents(value: unknown) {
  const record = asRecord(value);
  const synthesis = asRecord(record.synthesis);
  const findings = arrayField(record, "findings");
  const nextActions = stringArrayField(synthesis, "next_actions");
  const blockingIssues = stringArrayField(synthesis, "blocking_issues");

  if (!findings.length) {
    return <JsonArtifact value={value} />;
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-muted/25 p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Agent synthesis</h3>
          <TrustBadge status={stringField(synthesis, "status") ?? "pending"} />
        </div>
        {blockingIssues.length ? (
          <ul className="mt-3 grid gap-2">
            {blockingIssues.map((issue) => (
              <li
                className="rounded-md border border-amber-300 bg-amber-100 px-3 py-2 text-amber-950"
                key={issue}
              >
                {issue}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted-foreground">No agent-level blockers reported.</p>
        )}
        {nextActions.length ? (
          <div className="mt-3 grid gap-1">
            <p className="font-medium">Next actions</p>
            <ul className="list-inside list-disc">
              {nextActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <ItemGroup>
        {findings.map((finding, index) => {
          const item = asRecord(finding);
          const id = stringField(item, "agent_id") ?? `agent-${index + 1}`;
          const name = stringField(item, "name") ?? id;
          const role = stringField(item, "role") ?? "Bounded reviewer";
          const summary = stringField(item, "summary") ?? "No summary provided.";
          const status = stringField(item, "status") ?? "pending";
          const confidence = numberField(item, "confidence");
          const agentNextActions = stringArrayField(item, "next_actions");

          return (
            <Item
              className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 2xl:grid-cols-[auto_minmax(0,1fr)_auto]"
              key={id}
              variant="outline"
            >
              <ItemMediaIcon icon={ShieldCheck} />
              <ItemContent>
                <ItemTitle className="line-clamp-none">{name}</ItemTitle>
                <ItemDescription>{role}</ItemDescription>
                <p className="mt-2 text-sm">{summary}</p>
                {agentNextActions.length ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Next: {agentNextActions[0]}
                  </p>
                ) : null}
              </ItemContent>
              <ItemActions className="col-span-2 flex flex-wrap gap-2 2xl:col-span-1 2xl:justify-end">
                <TrustBadge status={status} />
                {confidence === undefined ? null : (
                  <Badge variant="secondary">{formatConfidence(confidence)}</Badge>
                )}
              </ItemActions>
            </Item>
          );
        })}
      </ItemGroup>
    </div>
  );
}

function renderSources(
  bundle: RunBundle,
  evidenceTasks: StudioEvidenceTask[],
  onResolveEvidenceTask: (taskId: string) => void,
) {
  const inventory = asRecord(bundle.artifacts.sourceInventory);
  const chunksArtifact = asRecord(bundle.artifacts.sourceChunks);
  const sources = Array.isArray(inventory.sources) ? inventory.sources : [];
  const chunks = Array.isArray(chunksArtifact.chunks) ? chunksArtifact.chunks : [];
  const missingEvidence = bundle.sourceWorkspace?.missingEvidence ?? [];

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-muted/25 p-4 text-sm">
        <h3 className="font-semibold">Source workspace</h3>
        <FactList
          items={[
            { label: "Sources", value: String(bundle.sourceWorkspace?.sourceCount ?? sources.length) },
            { label: "Chunks", value: String(bundle.sourceWorkspace?.sourceChunkCount ?? chunks.length) },
            { label: "Source pack", value: bundle.sourceWorkspace?.sourcePackName ?? "none" },
          ]}
        />
        {missingEvidence.length ? (
          <div className="mt-3 grid gap-1">
            <p className="font-medium">Missing evidence</p>
            <ul className="list-inside list-disc">
              {missingEvidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <EvidenceTaskPanel
        tasks={evidenceTasks}
        onResolveTask={onResolveEvidenceTask}
      />

      {sources.length ? (
        <ItemGroup>
          {sources.map((source, index) => {
            const item = asRecord(source);
            const id = stringField(item, "id") ?? `source-${index + 1}`;
            const title = stringField(item, "title") ?? stringField(item, "path") ?? id;
            const sourceChunkCount = chunks.filter((chunk) => {
              return stringField(asRecord(chunk), "source_id") === id;
            }).length;

            return (
              <Item key={id} variant="outline">
                <ItemMediaIcon icon={FileText} />
                <ItemContent>
                  <ItemTitle className="line-clamp-none">{title}</ItemTitle>
                  <ItemDescription className="font-mono">
                    {id} · {sourceChunkCount} chunks
                  </ItemDescription>
                </ItemContent>
              </Item>
            );
          })}
        </ItemGroup>
      ) : (
        <JsonArtifact value={{ sourceInventory: bundle.artifacts.sourceInventory, sourceChunks: bundle.artifacts.sourceChunks }} />
      )}
    </div>
  );
}

function renderClaims(
  value: unknown,
  onReviewClaim: (claimId: string, status: "approved" | "rejected") => void,
) {
  const claims = arrayField(value, "claims");

  if (!claims.length) {
    return <JsonArtifact value={value} />;
  }

  return (
    <ItemGroup>
      {claims.map((claim, index) => {
        const record = asRecord(claim);
        const id = stringField(record, "id") ?? `claim-${index + 1}`;
        const text = stringField(record, "text") ?? stringField(record, "claim") ?? id;
        const confidence = numberField(record, "confidence");
        return (
          <Item
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 2xl:grid-cols-[auto_minmax(0,1fr)_auto]"
            key={id}
            variant="outline"
          >
            <ItemMediaIcon icon={SearchCheck} />
            <ItemContent>
              <ItemTitle className="line-clamp-none">{text}</ItemTitle>
              <ItemDescription className="font-mono">{id}</ItemDescription>
            </ItemContent>
            <ItemActions className="col-span-2 grid gap-2 2xl:col-span-1 2xl:flex 2xl:flex-wrap 2xl:justify-end">
              <Button className="w-full whitespace-normal 2xl:w-auto" size="sm" type="button" variant="outline" onClick={() => onReviewClaim(id, "approved")}>
                <Check className="size-3.5" />
                Approve {id}
              </Button>
              <Button className="w-full whitespace-normal 2xl:w-auto" size="sm" type="button" variant="outline" onClick={() => onReviewClaim(id, "rejected")}>
                <X className="size-3.5" />
                Reject {id}
              </Button>
              {confidence === undefined ? null : (
                <Badge variant="secondary">{formatConfidence(confidence)}</Badge>
              )}
            </ItemActions>
          </Item>
        );
      })}
    </ItemGroup>
  );
}

function renderEvidence(
  value: unknown,
  onAnnotateEvidence: (evidenceId: string) => void,
) {
  const evidence = arrayField(value, "evidence");

  if (!evidence.length) {
    return <JsonArtifact value={value} />;
  }

  return (
    <ItemGroup>
      {evidence.map((item, index) => {
        const record = asRecord(item);
        const id = stringField(record, "id") ?? `evidence-${index + 1}`;
        const summary = stringField(record, "summary") ?? stringField(record, "text") ?? id;
        const relevance = numberField(record, "relevance");
        return (
          <Item
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 2xl:grid-cols-[auto_minmax(0,1fr)_auto]"
            key={id}
            variant="outline"
          >
            <ItemMediaIcon icon={FileText} />
            <ItemContent>
              <ItemTitle className="line-clamp-none">{summary}</ItemTitle>
              <ItemDescription className="font-mono">{id}</ItemDescription>
            </ItemContent>
            <ItemActions className="col-span-2 grid gap-2 2xl:col-span-1 2xl:flex 2xl:flex-wrap 2xl:justify-end">
              <Button className="w-full whitespace-normal 2xl:w-auto" size="sm" type="button" variant="outline" onClick={() => onAnnotateEvidence(id)}>
                Annotate {id}
              </Button>
              {relevance === undefined ? null : (
                <Badge variant="secondary">{formatConfidence(relevance)}</Badge>
              )}
            </ItemActions>
          </Item>
        );
      })}
    </ItemGroup>
  );
}

function ReviewSummary({
  compact = false,
  review,
  runId,
}: {
  compact?: boolean;
  review: StudioReview | null;
  runId?: string;
}) {
  const approved = review?.summary.approvedClaims.join(", ") || "none";
  const rejected = review?.summary.rejectedClaims.join(", ") || "none";
  const notes =
    review?.summary.evidenceAnnotations
      .map((item) => `${item.evidenceId} (${item.noteCount})`)
      .join(", ") || "none";

  return (
    <div className={cn("grid gap-2 rounded-lg border bg-muted/25 p-4 text-sm", compact && "border-0 bg-transparent p-0")}>
      <p>Approved claims: {approved}</p>
      <p>Rejected claims: {rejected}</p>
      <p>Evidence notes: {notes}</p>
      {runId ? (
        <Button asChild className="w-fit" size="sm" variant="outline">
          <a href={`/api/runs/${runId}/export/reviewed-memo`}>
            <Download className="size-3.5" />
            Export reviewed memo
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function ComparisonSummary({ comparison }: { comparison: RunComparison }) {
  const delta = comparison.delta;
  const sourceDelta = formatSignedCount(delta.sourceMovement.sourceCountDelta, "source");
  const chunkDelta = formatSignedCount(delta.sourceMovement.sourceChunkDelta, "chunk");
  const readinessValue = `${delta.readinessMovement.from} to ${delta.readinessMovement.to}`;

  return (
    <section aria-label="Decision delta" className="mt-4 grid gap-4 rounded-lg border bg-muted/25 p-4 text-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <GitCompareArrows className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Decision delta</h3>
            <Badge variant="secondary">{delta.trustMovement.direction}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">{delta.verdict}</p>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <DeltaMetric
          label="Trust"
          value={delta.trustMovementLabel}
          detail={`${delta.trustMovement.fromStatus} to ${delta.trustMovement.toStatus}`}
        />
        <DeltaMetric
          label="Readiness"
          value={readinessValue}
          detail={delta.readinessMovement.changed ? "state changed" : "state stable"}
        />
        <DeltaMetric
          label="Sources"
          value={sourceDelta}
          detail={chunkDelta}
        />
        <DeltaMetric
          label="Evidence gaps"
          value={`${delta.sourceMovement.closedGaps.length} closed`}
          detail={`${delta.sourceMovement.remainingGaps.length} remaining`}
        />
      </dl>

      <div className="grid gap-3 md:grid-cols-2">
        <DeltaList
          empty="No closed evidence gaps in this comparison."
          icon={CircleCheck}
          items={delta.sourceMovement.closedGaps}
          title="Closed evidence gaps"
        />
        <DeltaList
          empty="No remaining blockers on the newer run."
          icon={AlertTriangle}
          items={delta.blockerMovement.remainingBlockers}
          title="Remaining blockers"
        />
      </div>

      <div className="grid gap-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <p className="font-semibold">Next step</p>
        </div>
        <p className="text-muted-foreground">{delta.nextStep}</p>
      </div>

      <div className="grid gap-2 border-t pt-3">
        <p className="font-semibold">Changed artifact paths</p>
      <p className="break-all font-mono text-xs text-muted-foreground">
        {comparison.leftRunId} to {comparison.rightRunId}
      </p>
        <ul className="list-inside list-disc text-muted-foreground">
        {comparison.differences.map((difference) => (
          <li key={difference.path}>{difference.path}</li>
        ))}
      </ul>
    </div>
    </section>
  );
}

function DeltaMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 border-l pl-3">
      <dt className="font-mono text-[0.68rem] font-semibold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-sm font-semibold leading-snug">{value}</dd>
      <dd className="text-xs text-muted-foreground">{detail}</dd>
    </div>
  );
}

function DeltaList({
  empty,
  icon: Icon,
  items,
  title,
}: {
  empty: string;
  icon: typeof AlertTriangle;
  items: string[];
  title: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <p className="font-semibold">{title}</p>
      </div>
      {items.length ? (
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function formatSignedCount(value: number, noun: string) {
  if (value === 0) {
    return `No ${noun} change`;
  }

  const suffix = Math.abs(value) === 1 ? noun : `${noun}s`;
  return `${value > 0 ? "+" : ""}${value} ${suffix}`;
}

function renderDiagnostics(value: unknown) {
  const record = asRecord(value);
  const blockingIssues = stringArrayField(record, "blockingIssues");
  const nextFixes = stringArrayField(record, "nextFixes");

  if (!blockingIssues.length && !nextFixes.length) {
    return <JsonArtifact value={value} />;
  }

  return (
    <div className="grid gap-4">
      {blockingIssues.length ? (
        <DiagnosticList icon={AlertTriangle} items={blockingIssues} title="Blocking issues" />
      ) : null}
      {nextFixes.length ? (
        <DiagnosticList icon={ShieldCheck} items={nextFixes} title="Next fixes" />
      ) : null}
    </div>
  );
}

function renderTrace(value: unknown) {
  const trace = Array.isArray(value) ? value : [];

  if (!trace.length) {
    return <JsonArtifact value={value} />;
  }

  return (
    <ol className="grid gap-2">
      {trace.map((event, index) => {
        const record = asRecord(event);
        const stage = stringField(record, "stage") ?? `stage-${index + 1}`;
        const message = stringField(record, "message") ?? stringField(record, "event_type") ?? "";
        return (
          <li className="rounded-lg border bg-muted/25 p-3 text-sm" key={`${stage}-${index}`}>
            <code className="mr-2 rounded bg-background px-1.5 py-0.5 font-mono text-xs text-primary">
              {stage}
            </code>
            <span>{message}</span>
          </li>
        );
      })}
    </ol>
  );
}

function DiagnosticList({
  icon: Icon,
  items,
  title,
}: {
  icon: typeof AlertTriangle;
  items: string[];
  title: string;
}) {
  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ItemGroup>
        {items.map((item) => (
          <Item key={item} variant="outline">
            <ItemMediaIcon icon={Icon} />
            <ItemContent>
              <ItemTitle className="line-clamp-none">{item}</ItemTitle>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
}

function JsonArtifact({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/35 p-4 font-mono text-xs leading-6 text-foreground">
      {typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2)}
    </pre>
  );
}

function InspectorCard({
  children,
  id,
  label,
}: {
  children: ReactNode;
  id?: string;
  label: string;
}) {
  return (
    <Card id={id} size="sm">
      <CardHeader>
        <p className="font-mono text-[0.68rem] font-semibold uppercase text-muted-foreground">
          {label}
        </p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FactList({
  items,
  mono = false,
}: {
  items: Array<{ label: string; value: string }>;
  mono?: boolean;
}) {
  return (
    <dl className="mt-4 grid gap-3 text-sm">
      {items.map((item) => (
        <div className="grid gap-0.5" key={item.label}>
          <dt className="font-medium text-muted-foreground">{item.label}</dt>
          <dd className={cn("break-words", mono && "font-mono text-xs font-semibold")}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ItemMediaIcon({ icon: Icon }: { icon: typeof SearchCheck }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <Icon className="size-4" />
    </span>
  );
}

function RunJobBadge({ status }: { status: RunJob["status"] }) {
  const statusClasses: Record<RunJob["status"], string> = {
    queued: "border-sky-300 bg-sky-100 text-sky-900",
    running: "border-blue-300 bg-blue-100 text-blue-900",
    succeeded: "border-emerald-300 bg-emerald-100 text-emerald-900",
    failed: "border-red-300 bg-red-100 text-red-900",
    cancelled: "border-muted bg-muted text-muted-foreground",
  };
  const icons: Record<RunJob["status"], typeof CircleDashed> = {
    queued: CircleDashed,
    running: Sparkles,
    succeeded: CircleCheck,
    failed: CircleX,
    cancelled: Ban,
  };
  const Icon = icons[status];

  return (
    <Badge className={cn("shrink-0 gap-1.5", statusClasses[status])} variant="outline">
      <Icon className="size-3" />
      {runJobLabel(status)}
    </Badge>
  );
}

function TrustBadge({ status }: { status: string }) {
  const statusClasses: Record<string, string> = {
    pass: "border-emerald-300 bg-emerald-100 text-emerald-900",
    warn: "border-amber-300 bg-amber-100 text-amber-950",
    fail: "border-red-300 bg-red-100 text-red-900",
    pending: "border-border bg-muted text-muted-foreground",
  };

  return (
    <Badge className={cn("shrink-0 uppercase", statusClasses[status] ?? statusClasses.pending)} variant="outline">
      {status}
    </Badge>
  );
}

function ReadinessBadge({ status }: { status: string }) {
  const statusClasses: Record<string, string> = {
    ready: "border-emerald-300 bg-emerald-100 text-emerald-900",
    usable_with_warnings: "border-amber-300 bg-amber-100 text-amber-950",
    blocked: "border-red-300 bg-red-100 text-red-900",
  };

  const labels: Record<string, string> = {
    ready: "ready",
    usable_with_warnings: "warnings",
    blocked: "blocked",
  };

  return (
    <Badge className={cn("shrink-0 uppercase", statusClasses[status] ?? "border-border bg-muted text-muted-foreground")} variant="outline">
      {labels[status] ?? status}
    </Badge>
  );
}

function CruxMark() {
  return (
    <span className="grid size-7 shrink-0 place-content-center gap-1 rounded-lg bg-primary" aria-hidden="true">
      <span className="block h-0.5 w-3.5 rounded-full bg-primary-foreground" />
      <span className="block h-0.5 w-3.5 rounded-full bg-primary-foreground" />
      <span className="block h-0.5 w-2.5 rounded-full bg-primary-foreground" />
    </span>
  );
}

function ReadableMemo({ memo }: { memo: string }) {
  const sections = memo.trim().split("\n\n").filter(Boolean);

  return (
    <div className="max-w-[68ch] space-y-5 text-[0.98rem] leading-7">
      {sections.map((section) => renderMemoSection(section))}
    </div>
  );
}

function renderMemoSection(section: string) {
  if (section.startsWith("## ")) {
    return (
      <h3 className="pt-3 text-lg font-semibold tracking-tight" key={section}>
        {section.replace("## ", "")}
      </h3>
    );
  }

  if (/^\d\./m.test(section)) {
    return (
      <ol className="list-inside list-decimal space-y-1" key={section}>
        {section
          .split("\n")
          .filter(Boolean)
          .map((item) => (
            <li key={item}>{item.replace(/^\d+\.\s*/, "")}</li>
          ))}
      </ol>
    );
  }

  return <p key={section}>{section}</p>;
}

function extractMemoSection(memo: string, heading: string): string {
  const lines = memo.replace(/\r\n/g, "\n").split("\n");
  const expectedHeading = `## ${heading}`.toLowerCase();
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === expectedHeading,
  );
  if (start === -1) {
    return "";
  }

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.trim().startsWith("## "));
  const sectionLines = end === -1 ? rest : rest.slice(0, end);
  return normalizeMemoText(sectionLines.join("\n"));
}

function firstMemoParagraph(memo: string): string {
  return memo
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .filter((paragraph) => !/^#+\s+[^\n]+$/.test(paragraph.trim()))
    .map((paragraph) => normalizeMemoText(paragraph).replace(/^#+\s*/, "").trim())
    .find(Boolean) ?? "";
}

function normalizeMemoText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
}

function truncateText(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function isPendingJob(status: RunJob["status"]): boolean {
  return status === "queued" || status === "running";
}

function runJobLabel(status: RunJob["status"]): string {
  const labels: Record<RunJob["status"], string> = {
    queued: "Queued",
    running: "Running",
    succeeded: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  };

  return labels[status];
}

function evidenceTaskKindLabel(kind: StudioEvidenceTask["kind"]): string {
  const labels: Record<StudioEvidenceTask["kind"], string> = {
    missing_evidence: "Missing evidence",
    trust_blocker: "Trust blocker",
    agent_blocker: "Agent blocker",
    agent_next_action: "Agent next action",
  };

  return labels[kind];
}

function upsertRun(current: RunSummary[], run: RunSummary): RunSummary[] {
  return [run, ...current.filter((item) => item.runId !== run.runId)];
}

function upsertJob(current: RunJob[], job: RunJob): RunJob[] {
  return [job, ...current.filter((item) => item.jobId !== job.jobId)];
}

function upsertEvidenceTask(
  current: StudioEvidenceTask[],
  task: StudioEvidenceTask,
): StudioEvidenceTask[] {
  return [task, ...current.filter((item) => item.taskId !== task.taskId)];
}

function upsertById<T extends { id: string }>(current: T[], item: T): T[] {
  return [item, ...current.filter((candidate) => candidate.id !== item.id)];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function readSourceDraftFile(file: File): Promise<SourceDraftFile> {
  return {
    name: file.name,
    content: await readFileText(file),
    size: file.size,
  };
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("File read failed.")));
    reader.readAsText(file);
  });
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${Math.round(size / 102.4) / 10} KB`;
}

function reviewFromBundle(bundle: RunBundle): StudioReview | null {
  const record = asRecord(bundle);
  const review = record.review;
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return null;
  }

  return review as StudioReview;
}

function arrayField(value: unknown, field: string): unknown[] {
  const record = asRecord(value);
  const found = record[field];
  return Array.isArray(found) ? found : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  return typeof value === "string" ? value : undefined;
}

function numberField(record: Record<string, unknown>, field: string): number | undefined {
  const value = record[field];
  return typeof value === "number" ? value : undefined;
}

function stringArrayField(record: Record<string, unknown>, field: string): string[] {
  const value = record[field];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

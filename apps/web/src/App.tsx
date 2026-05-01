import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  RunBundle,
  RunSummary,
  SourcePolicy,
} from "@crux-studio/crux-provider";
import {
  annotateEvidence,
  askCrux,
  compareRuns,
  createProject,
  createSourcePack,
  getRun,
  listProjects,
  listProviders,
  listRuns,
  listSourcePacks,
  replayRun,
  reviewClaim,
  type ProviderRegistry,
  type RunComparison,
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

type ArtifactTab =
  | "Memo"
  | "Claims"
  | "Evidence"
  | "Contradictions"
  | "Uncertainty"
  | "Council"
  | "Diagnostics"
  | "Trace";

const artifactTabs: ArtifactTab[] = [
  "Memo",
  "Claims",
  "Evidence",
  "Contradictions",
  "Uncertainty",
  "Council",
  "Diagnostics",
  "Trace",
];

const initialForm: AskFormState = {
  question: "",
  context: "",
  timeHorizon: "30 days",
  sourcePolicy: "offline",
};

const formatConfidence = (value: number) => `${Math.round(value * 100)}%`;
const policyHelp: Record<SourcePolicy, string> = {
  offline: "Draft with local context only. Treat source-free output as untrusted.",
  hybrid: "Use attached source packs first, then provider context when available.",
  web: "Connector-ready mode for providers that can resolve live sources.",
};

const policyOptions: SourcePolicy[] = ["offline", "hybrid", "web"];

export function App() {
  const [form, setForm] = useState<AskFormState>(initialForm);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [sourcePacks, setSourcePacks] = useState<StudioSourcePack[]>([]);
  const [providers, setProviders] = useState<ProviderRegistry["providers"]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedSourcePackId, setSelectedSourcePackId] = useState("");
  const [sourcePackName, setSourcePackName] = useState("Wholesale intake notes");
  const [sourceDraft, setSourceDraft] = useState(
    "# Source note\n\nPaste Markdown, TXT, or CSV evidence here.",
  );
  const [run, setRun] = useState<RunSummary | null>(null);
  const [bundle, setBundle] = useState<RunBundle | null>(null);
  const [review, setReview] = useState<StudioReview | null>(null);
  const [comparison, setComparison] = useState<RunComparison | null>(null);
  const [activeTab, setActiveTab] = useState<ArtifactTab>("Memo");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingBundle, setIsLoadingBundle] = useState(false);

  const selectedRun = bundle ?? run;
  const activeProvider = providers[0];
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedSourcePack = sourcePacks.find((pack) => pack.id === selectedSourcePackId);
  const canRun = form.question.trim().length > 0 && !isRunning;
  const memoText = bundle?.memo ?? run?.memoPreview ?? "";
  const memoSections = useMemo(() => memoText.split("\n\n").filter(Boolean), [memoText]);
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
    ])
      .then(([history, loadedProjects, loadedSourcePacks, registry]) => {
        if (!cancelled) {
          setRuns(history);
          setProjects(loadedProjects);
          setSourcePacks(loadedSourcePacks);
          setProviders(registry.providers);
          setSelectedProjectId(loadedProjects[0]?.id ?? "");
          setSelectedSourcePackId(
            loadedSourcePacks.find(
              (pack) => pack.projectId === loadedProjects[0]?.id,
            )?.id ?? "",
          );
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canRun) {
      setError("Question is required.");
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const nextRun = await askCrux({
        question: form.question,
        context: form.context,
        timeHorizon: form.timeHorizon,
        sourcePolicy: form.sourcePolicy,
        projectId: selectedProjectId || undefined,
        sourcePackId: selectedSourcePackId || undefined,
      });
      setRun(nextRun);
      setRuns((current) => upsertRun(current, nextRun));
      setActiveTab("Memo");
      await loadBundle(nextRun.runId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Crux run failed.");
    } finally {
      setIsRunning(false);
    }
  }

  async function loadBundle(runId: string) {
    setIsLoadingBundle(true);
    setError(null);

    try {
      const nextBundle = await getRun(runId);
      setBundle(nextBundle);
      setRun(nextBundle);
      setReview(reviewFromBundle(nextBundle));
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

  function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedSourcePackId(
      sourcePacks.find((pack) => pack.projectId === projectId)?.id ?? "",
    );
  }

  async function handleCreateSourcePack() {
    try {
      if (!sourcePackName.trim() || !sourceDraft.trim()) {
        setError("Source pack name and content are required.");
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
          files: [{ name: "studio-source.md", content: sourceDraft.trim() }],
        });
        setSourcePacks((current) => upsertById(current, pack));
        setSelectedSourcePackId(pack.id);
        return;
      }

      const pack = await createSourcePack({
        projectId,
        name: sourcePackName.trim(),
        files: [{ name: "studio-source.md", content: sourceDraft.trim() }],
      });
      setSourcePacks((current) => upsertById(current, pack));
      setSelectedSourcePackId(pack.id);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Source pack creation failed.");
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

  async function handleReplay() {
    if (!selectedRun) return;

    try {
      const replayed = await replayRun(selectedRun.runId);
      setRuns((current) => upsertRun(current, replayed));
      setRun(replayed);
      setActiveTab("Memo");
      await loadBundle(replayed.runId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Replay failed.");
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
    <main className="studio-shell">
      <aside className="left-rail" aria-label="Workspace navigation">
        <div className="brand-lockup">
          <CruxMark />
          <div>
            <h1>Crux Studio</h1>
            <p className="brand-meta">v0.2 · local</p>
          </div>
        </div>
        <nav className="rail-nav" aria-label="Run sections">
          <p className="rail-label">Workspace</p>
          <a aria-current="page" href="#ask">New run</a>
          <a href="#memo">Current run</a>
          <a href="#artifacts">Artifacts</a>
          <a href="#trace">Trace</a>
        </nav>
        <section className="history-panel" aria-label="Run history">
          <p className="provider-line">
            Provider: {activeProvider?.id ?? "unknown"}
          </p>
          {activeProvider?.capabilities.length ? (
            <div className="provider-capabilities" aria-label="Provider capabilities">
              {activeProvider.capabilities.map((capability) => (
                <span key={capability}>{capability}</span>
              ))}
            </div>
          ) : null}
          <div className="history-heading">
            <span>Run history</span>
            <strong>{runs.length}</strong>
          </div>
          {runs.length ? (
            <div className="history-list">
              {runs.slice(0, 8).map((item) => (
                <button
                  className="history-item"
                  key={item.runId}
                  type="button"
                  onClick={() => {
                    setActiveTab("Memo");
                    void loadBundle(item.runId);
                  }}
                >
                  <span>{item.question}</span>
                  <em>{item.runId}</em>
                  <small>{item.trust.status}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="quiet-copy">No runs indexed yet.</p>
          )}
        </section>
        <section className="workspace-panel" aria-label="Project workspace">
          <div className="history-heading">
            <span>Project</span>
            <button type="button" onClick={() => void handleCreateProject()}>
              New
            </button>
          </div>
          <select
            aria-label="Project"
            value={selectedProjectId}
            onChange={(event) => handleSelectProject(event.target.value)}
          >
            <option value="">No project yet</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <div className="source-pack-list">
            {visibleSourcePacks.length ? (
              visibleSourcePacks.map((pack) => (
                <button
                  className="source-pack-item"
                  key={pack.id}
                  aria-pressed={pack.id === selectedSourcePackId}
                  type="button"
                  onClick={() => setSelectedSourcePackId(pack.id)}
                >
                  <span>{pack.name}</span>
                  <small>{pack.sourceCount} sources</small>
                </button>
              ))
            ) : (
              <p className="quiet-copy">No source packs in this project.</p>
            )}
          </div>
        </section>
        <div className="run-strip">
          <span>Current run</span>
          <strong>{selectedRun?.runId ?? "None"}</strong>
        </div>
      </aside>

      <section className="studio-main">
        <header className="topbar" aria-label="Workspace status">
          <div>
            <span>workspace</span>
            <span>/</span>
            <strong>{selectedProject?.name ?? "No project"}</strong>
            {selectedSourcePack ? (
              <>
                <span>/</span>
                <strong>{selectedSourcePack.name}</strong>
              </>
            ) : null}
          </div>
          <p>harness engine ready</p>
        </header>

        <section className="workspace" id="ask">
          <form className="ask-panel" onSubmit={handleSubmit}>
            <div className="section-heading">
              <p className="eyebrow">New run · {selectedProject?.name ?? "workspace"}</p>
              <h2>Ask a decision-grade question.</h2>
            </div>

            <label className="field">
              <span>Question</span>
              <textarea
                id="question"
                name="question"
                rows={4}
                value={form.question}
                onChange={(event) =>
                  setForm((current) => ({ ...current, question: event.target.value }))
                }
                placeholder="How should a support team reduce first-response time without hiring more agents this month?"
              />
            </label>

            <label className="field">
              <span>Context</span>
              <textarea
                id="context"
                name="context"
                rows={3}
                value={form.context}
                onChange={(event) =>
                  setForm((current) => ({ ...current, context: event.target.value }))
                }
                placeholder="Constraints, goals, tradeoffs, stakeholders"
              />
            </label>

            <div className="field-grid">
              <label className="field">
                <span>Time horizon</span>
                <input
                  id="timeHorizon"
                  name="timeHorizon"
                  value={form.timeHorizon}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      timeHorizon: event.target.value,
                    }))
                  }
                />
              </label>

              <fieldset className="source-policy" aria-label="Source policy">
                <legend>Source policy</legend>
                <div>
                  {policyOptions.map((policy) => (
                    <button
                      aria-pressed={form.sourcePolicy === policy}
                      key={policy}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, sourcePolicy: policy }))
                      }
                    >
                      {policy}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <p className="help-copy">{policyHelp[form.sourcePolicy]}</p>

            <label className="field">
              <span>Source pack</span>
              <select
                aria-label="Source pack"
                value={selectedSourcePackId}
                onChange={(event) => setSelectedSourcePackId(event.target.value)}
              >
                <option value="">No source pack</option>
                {visibleSourcePacks.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="source-builder" aria-label="Source attachment">
              <label className="field">
                <span>New source pack</span>
                <input
                  value={sourcePackName}
                  onChange={(event) => setSourcePackName(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Source content</span>
                <textarea
                  rows={4}
                  value={sourceDraft}
                  onChange={(event) => setSourceDraft(event.target.value)}
                />
              </label>
              <button type="button" onClick={() => void handleCreateSourcePack()}>
                Create source pack
              </button>
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <div className="form-actions">
              <button type="submit" disabled={!canRun}>
                {isRunning ? "Running" : "Run Crux"}
              </button>
            </div>
          </form>

          <article className="memo-panel" id="memo" aria-live="polite">
            <div className="section-heading with-action">
              <div>
                <p className="eyebrow">Memo</p>
                <h2>{selectedRun ? "Decision memo" : "No run yet"}</h2>
              </div>
              {selectedRun ? (
                <div className="memo-actions">
                  <a
                    className="text-action"
                    href={`/api/runs/${selectedRun.runId}/export/memo`}
                  >
                    Export memo
                  </a>
                  <button type="button" onClick={() => void handleReplay()}>
                    Replay run
                  </button>
                  <button type="button" onClick={() => void handleCompareLatest()}>
                    Compare latest
                  </button>
                </div>
              ) : null}
            </div>

            {selectedRun ? (
              <>
                <div className="memo-copy">
                  {memoSections.map((section) => renderMemoSection(section))}
                </div>
                <ArtifactInspector
                  activeTab={activeTab}
                  bundle={bundle}
                  isLoading={isLoadingBundle}
                  onAnnotateEvidence={handleAnnotateEvidence}
                  onChangeTab={setActiveTab}
                  onReviewClaim={handleReviewClaim}
                />
                <ReviewSummary review={review} runId={selectedRun.runId} />
                {comparison ? <ComparisonSummary comparison={comparison} /> : null}
              </>
            ) : (
              <p className="empty-copy">
                Ask a question to create the first inspectable Crux run.
              </p>
            )}
          </article>
        </section>
      </section>

      <aside className="right-inspector" aria-label="Run inspector">
        <section className="inspector-section">
          <p className="eyebrow">Trust</p>
          <div className="trust-heading">
            <h2>Trust gate</h2>
            <span
              className={`trust-badge trust-${selectedRun?.trust.status ?? "empty"}`}
            >
              {selectedRun?.trust.status ?? "pending"}
            </span>
          </div>
          <dl className="fact-list">
            <div>
              <dt>Confidence</dt>
              <dd>
                {selectedRun ? formatConfidence(selectedRun.trust.confidence) : "Waiting"}
              </dd>
            </div>
            <div>
              <dt>Answerability</dt>
              <dd>{selectedRun?.answerability ?? "Not evaluated"}</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>{selectedRun?.risk ?? "Not evaluated"}</dd>
            </div>
          </dl>
        </section>

        <section className="inspector-section">
          <p className="eyebrow">Blocking issues</p>
          {selectedRun?.trust.blockingIssues.length ? (
            <ul className="issue-list">
              {selectedRun.trust.blockingIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="quiet-copy">
              {selectedRun ? "No blocking issues reported." : "Waiting"}
            </p>
          )}
        </section>

        <section className="inspector-section" id="artifacts">
          <p className="eyebrow">Artifacts</p>
          <dl className="path-list">
            <div>
              <dt>Input</dt>
              <dd>{selectedRun?.paths.generatedInput ?? "Not generated"}</dd>
            </div>
            <div>
              <dt>Memo</dt>
              <dd>{selectedRun?.paths.decisionMemo ?? "Not generated"}</dd>
            </div>
            <div>
              <dt>Report</dt>
              <dd>{selectedRun?.paths.htmlReport ?? "Not generated"}</dd>
            </div>
          </dl>
          {selectedRun ? (
            <div className="raw-link-list" aria-label="Raw artifact links">
              <a href={`/api/runs/${selectedRun.runId}/artifacts/claims`}>Claims JSON</a>
              <a href={`/api/runs/${selectedRun.runId}/artifacts/evidence`}>Evidence JSON</a>
              <a href={`/api/runs/${selectedRun.runId}/artifacts/trace`}>Trace JSON</a>
            </div>
          ) : null}
        </section>
        <section className="inspector-section">
          <p className="eyebrow">Review</p>
          <ReviewSummary review={review} runId={selectedRun?.runId} compact />
        </section>
      </aside>
    </main>
  );
}

function CruxMark() {
  return (
    <span className="crux-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function ArtifactInspector({
  activeTab,
  bundle,
  isLoading,
  onAnnotateEvidence,
  onChangeTab,
  onReviewClaim,
}: {
  activeTab: ArtifactTab;
  bundle: RunBundle | null;
  isLoading: boolean;
  onAnnotateEvidence: (evidenceId: string) => void;
  onChangeTab: (tab: ArtifactTab) => void;
  onReviewClaim: (claimId: string, status: "approved" | "rejected") => void;
}) {
  return (
    <section className="artifact-inspector" aria-label="Artifact inspector">
      <div className="tab-list" role="tablist" aria-label="Artifact tabs">
        {artifactTabs.map((tab) => (
          <button
            aria-selected={activeTab === tab}
            className="tab-button"
            key={tab}
            onClick={() => onChangeTab(tab)}
            role="tab"
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="artifact-body" role="tabpanel">
        {isLoading ? (
          <p className="quiet-copy">Loading run bundle.</p>
        ) : (
          renderArtifactTab(activeTab, bundle, onReviewClaim, onAnnotateEvidence)
        )}
      </div>
    </section>
  );
}

function renderArtifactTab(
  tab: ArtifactTab,
  bundle: RunBundle | null,
  onReviewClaim: (claimId: string, status: "approved" | "rejected") => void,
  onAnnotateEvidence: (evidenceId: string) => void,
) {
  if (!bundle) {
    return <p className="quiet-copy">Select or create a run to inspect artifacts.</p>;
  }

  switch (tab) {
    case "Memo":
      return <pre className="artifact-pre">{bundle.memo}</pre>;
    case "Claims":
      return renderClaims(bundle.artifacts.claims, onReviewClaim);
    case "Evidence":
      return renderEvidence(bundle.artifacts.evidence, onAnnotateEvidence);
    case "Diagnostics":
      return renderDiagnostics(bundle.artifacts.diagnostics);
    case "Trace":
      return renderTrace(bundle.artifacts.trace);
    case "Contradictions":
      return <JsonArtifact value={bundle.artifacts.contradictions} />;
    case "Uncertainty":
      return <JsonArtifact value={bundle.artifacts.uncertainty} />;
    case "Council":
      return <JsonArtifact value={bundle.artifacts.council} />;
  }
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
    <div className="artifact-list">
      {claims.map((claim, index) => {
        const record = asRecord(claim);
        const id = stringField(record, "id") ?? `claim-${index + 1}`;
        const text = stringField(record, "text") ?? stringField(record, "claim") ?? id;
        const confidence = numberField(record, "confidence");
        return (
          <article className="artifact-row" key={id}>
            <div>
              <strong>{text}</strong>
              <span>{id}</span>
            </div>
            <div className="row-actions">
              <button type="button" onClick={() => onReviewClaim(id, "approved")}>
                Approve {id}
              </button>
              <button type="button" onClick={() => onReviewClaim(id, "rejected")}>
                Reject {id}
              </button>
            </div>
            {confidence === undefined ? null : <small>{formatConfidence(confidence)}</small>}
          </article>
        );
      })}
    </div>
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
    <div className="artifact-list">
      {evidence.map((item, index) => {
        const record = asRecord(item);
        const id = stringField(record, "id") ?? `evidence-${index + 1}`;
        const summary = stringField(record, "summary") ?? stringField(record, "text") ?? id;
        const relevance = numberField(record, "relevance");
        return (
          <article className="artifact-row" key={id}>
            <div>
              <strong>{summary}</strong>
              <span>{id}</span>
            </div>
            <button type="button" onClick={() => onAnnotateEvidence(id)}>
              Annotate {id}
            </button>
            {relevance === undefined ? null : <small>{formatConfidence(relevance)}</small>}
          </article>
        );
      })}
    </div>
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
    <div className={compact ? "review-summary compact" : "review-summary"}>
      <p>Approved claims: {approved}</p>
      <p>Rejected claims: {rejected}</p>
      <p>Evidence notes: {notes}</p>
      {runId ? (
        <a className="text-action" href={`/api/runs/${runId}/export/reviewed-memo`}>
          Export reviewed memo
        </a>
      ) : null}
    </div>
  );
}

function ComparisonSummary({ comparison }: { comparison: RunComparison }) {
  return (
    <section className="comparison-summary">
      <h3>Run comparison</h3>
      <p>Trust movement: {formatConfidence(comparison.trustMovement)}</p>
      <p>
        {comparison.leftRunId} to {comparison.rightRunId}
      </p>
      <ul>
        {comparison.differences.map((difference) => (
          <li key={difference.path}>{difference.path}</li>
        ))}
      </ul>
    </section>
  );
}

function renderDiagnostics(value: unknown) {
  const record = asRecord(value);
  const blockingIssues = stringArrayField(record, "blockingIssues");
  const nextFixes = stringArrayField(record, "nextFixes");

  if (!blockingIssues.length && !nextFixes.length) {
    return <JsonArtifact value={value} />;
  }

  return (
    <div className="diagnostic-stack">
      {blockingIssues.length ? (
        <div>
          <h3>Blocking issues</h3>
          <ul>
            {blockingIssues.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {nextFixes.length ? (
        <div>
          <h3>Next fixes</h3>
          <ul>
            {nextFixes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
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
    <ol className="trace-list">
      {trace.map((event, index) => {
        const record = asRecord(event);
        const stage = stringField(record, "stage") ?? `stage-${index + 1}`;
        const message = stringField(record, "message") ?? stringField(record, "event_type") ?? "";
        return (
          <li key={`${stage}-${index}`}>
            <code>{stage}</code>
            <span>{message}</span>
          </li>
        );
      })}
    </ol>
  );
}

function JsonArtifact({ value }: { value: unknown }) {
  return <pre className="artifact-pre">{JSON.stringify(value ?? null, null, 2)}</pre>;
}

function renderMemoSection(section: string) {
  if (section.startsWith("## ")) {
    return <h3 key={section}>{section.replace("## ", "")}</h3>;
  }

  if (/^\d\./m.test(section)) {
    return (
      <ol key={section}>
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

function upsertRun(current: RunSummary[], run: RunSummary): RunSummary[] {
  return [run, ...current.filter((item) => item.runId !== run.runId)];
}

function upsertById<T extends { id: string }>(current: T[], item: T): T[] {
  return [item, ...current.filter((candidate) => candidate.id !== item.id)];
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
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  RunBundle,
  RunSummary,
  SourcePolicy,
} from "@crux-studio/crux-provider";
import { askCrux, getRun, listRuns } from "./api";
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

export function App() {
  const [form, setForm] = useState<AskFormState>(initialForm);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [run, setRun] = useState<RunSummary | null>(null);
  const [bundle, setBundle] = useState<RunBundle | null>(null);
  const [activeTab, setActiveTab] = useState<ArtifactTab>("Memo");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingBundle, setIsLoadingBundle] = useState(false);

  const selectedRun = bundle ?? run;
  const canRun = form.question.trim().length > 0 && !isRunning;
  const memoText = bundle?.memo ?? run?.memoPreview ?? "";
  const memoSections = useMemo(() => memoText.split("\n\n").filter(Boolean), [memoText]);

  useEffect(() => {
    let cancelled = false;

    listRuns()
      .then((history) => {
        if (!cancelled) {
          setRuns(history);
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
      setRuns((current) => upsertRun(current, nextBundle));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Run bundle failed to load.");
    } finally {
      setIsLoadingBundle(false);
    }
  }

  return (
    <main className="studio-shell">
      <aside className="left-rail" aria-label="Workspace navigation">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Crux Studio</h1>
        </div>
        <nav className="rail-nav" aria-label="Run sections">
          <a aria-current="page" href="#ask">
            Ask
          </a>
          <a href="#memo">Memo</a>
          <a href="#artifacts">Artifacts</a>
          <a href="#trace">Trace</a>
        </nav>
        <section className="history-panel" aria-label="Run history">
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
                  <span>{item.runId}</span>
                  <small>{item.trust.status}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="quiet-copy">No runs indexed yet.</p>
          )}
        </section>
        <div className="run-strip">
          <span>Current run</span>
          <strong>{selectedRun?.runId ?? "None"}</strong>
        </div>
      </aside>

      <section className="workspace" id="ask">
        <form className="ask-panel" onSubmit={handleSubmit}>
          <div className="section-heading">
            <p className="eyebrow">Ask</p>
            <h2>New analysis run</h2>
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

            <label className="field">
              <span>Source policy</span>
              <select
                id="sourcePolicy"
                name="sourcePolicy"
                value={form.sourcePolicy}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sourcePolicy: event.target.value as SourcePolicy,
                  }))
                }
              >
                <option value="offline">offline</option>
                <option value="hybrid">hybrid</option>
                <option value="web">web</option>
              </select>
            </label>
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
              <a className="text-action" href={`/api/runs/${selectedRun.runId}/export/memo`}>
                Export memo
              </a>
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
                onChangeTab={setActiveTab}
              />
            </>
          ) : (
            <p className="empty-copy">
              Ask a question to create the first inspectable Crux run.
            </p>
          )}
        </article>
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
      </aside>
    </main>
  );
}

function ArtifactInspector({
  activeTab,
  bundle,
  isLoading,
  onChangeTab,
}: {
  activeTab: ArtifactTab;
  bundle: RunBundle | null;
  isLoading: boolean;
  onChangeTab: (tab: ArtifactTab) => void;
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
          renderArtifactTab(activeTab, bundle)
        )}
      </div>
    </section>
  );
}

function renderArtifactTab(tab: ArtifactTab, bundle: RunBundle | null) {
  if (!bundle) {
    return <p className="quiet-copy">Select or create a run to inspect artifacts.</p>;
  }

  switch (tab) {
    case "Memo":
      return <pre className="artifact-pre">{bundle.memo}</pre>;
    case "Claims":
      return renderClaims(bundle.artifacts.claims);
    case "Evidence":
      return renderEvidence(bundle.artifacts.evidence);
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

function renderClaims(value: unknown) {
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
            {confidence === undefined ? null : <small>{formatConfidence(confidence)}</small>}
          </article>
        );
      })}
    </div>
  );
}

function renderEvidence(value: unknown) {
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
            {relevance === undefined ? null : <small>{formatConfidence(relevance)}</small>}
          </article>
        );
      })}
    </div>
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

import { FormEvent, useMemo, useState } from "react";
import type { RunSummary, SourcePolicy } from "@crux-studio/crux-provider";
import { askCrux } from "./api";
import "./styles.css";

type AskFormState = {
  question: string;
  context: string;
  timeHorizon: string;
  sourcePolicy: SourcePolicy;
};

const initialForm: AskFormState = {
  question: "",
  context: "",
  timeHorizon: "30 days",
  sourcePolicy: "offline",
};

const formatConfidence = (value: number) => `${Math.round(value * 100)}%`;

export function App() {
  const [form, setForm] = useState<AskFormState>(initialForm);
  const [run, setRun] = useState<RunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const canRun = form.question.trim().length > 0 && !isRunning;
  const memoSections = useMemo(() => run?.memoPreview.split("\n\n") ?? [], [run]);

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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Crux run failed.");
    } finally {
      setIsRunning(false);
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
        <div className="run-strip">
          <span>Current run</span>
          <strong>{run?.runId ?? "None"}</strong>
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
          <div className="section-heading">
            <p className="eyebrow">Memo</p>
            <h2>{run ? "Decision memo" : "No run yet"}</h2>
          </div>

          {run ? (
            <div className="memo-copy">
              {memoSections.map((section) => {
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
              })}
            </div>
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
            <span className={`trust-badge trust-${run?.trust.status ?? "empty"}`}>
              {run?.trust.status ?? "pending"}
            </span>
          </div>
          <dl className="fact-list">
            <div>
              <dt>Confidence</dt>
              <dd>{run ? formatConfidence(run.trust.confidence) : "Waiting"}</dd>
            </div>
            <div>
              <dt>Answerability</dt>
              <dd>{run?.answerability ?? "Not evaluated"}</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>{run?.risk ?? "Not evaluated"}</dd>
            </div>
          </dl>
        </section>

        <section className="inspector-section">
          <p className="eyebrow">Blocking issues</p>
          {run?.trust.blockingIssues.length ? (
            <ul className="issue-list">
              {run.trust.blockingIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="quiet-copy">{run ? "No blocking issues reported." : "Waiting"}</p>
          )}
        </section>

        <section className="inspector-section" id="artifacts">
          <p className="eyebrow">Artifacts</p>
          <dl className="path-list">
            <div>
              <dt>Input</dt>
              <dd>{run?.paths.generatedInput ?? "Not generated"}</dd>
            </div>
            <div>
              <dt>Memo</dt>
              <dd>{run?.paths.decisionMemo ?? "Not generated"}</dd>
            </div>
            <div>
              <dt>Report</dt>
              <dd>{run?.paths.htmlReport ?? "Not generated"}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </main>
  );
}


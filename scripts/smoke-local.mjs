const serverUrl = process.env.CRUX_STUDIO_SERVER_URL ?? "http://127.0.0.1:4318";
const webUrl = process.env.CRUX_STUDIO_WEB_URL ?? "http://127.0.0.1:5173";

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function postText(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.text();
}

async function getText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.text();
}

async function waitForJob(jobId) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const job = await getJson(`${serverUrl}/api/runs/jobs/${jobId}`);
    if (job.status === "succeeded") {
      return job;
    }

    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(`Lifecycle job ${jobId} ended with ${job.status}: ${job.error ?? "no error"}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Lifecycle job ${jobId} did not finish in time.`);
}

async function main() {
  const [health, providers, demos, runs] = await Promise.all([
    getJson(`${serverUrl}/health`),
    getJson(`${serverUrl}/api/providers`),
    getJson(`${serverUrl}/api/demos`),
    getJson(`${serverUrl}/api/runs`),
    fetch(webUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`${webUrl} returned ${response.status}`);
      }
      return response.text();
    }),
  ]);

  const provider = providers.providers?.[0];
  const latestAgentRun = runs.find((run) => run.agents);
  const stamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
  const project = await postJson(`${serverUrl}/api/projects`, {
    name: `Local smoke ${stamp}`,
  });
  const sourcePack = await postJson(`${serverUrl}/api/source-packs`, {
    projectId: project.id,
    name: `Source bridge smoke ${stamp}`,
    files: [
      {
        name: "queue-notes.md",
        content: "# Queue notes\n\nSupport tier handoffs create preventable first-response delays on Mondays.",
      },
      {
        name: "response-times.csv",
        content: "week,first_response_minutes\n1,82\n2,71\n3,64\n",
      },
    ],
  });
  const sourceBackedJob = await postJson(`${serverUrl}/api/runs/jobs`, {
    projectId: project.id,
    sourcePackId: sourcePack.id,
    question: "How should a support team reduce first-response time without hiring more agents this month?",
    context: "Use the attached queue notes and response-time sample as the source pack.",
    timeHorizon: "30 days",
    sourcePolicy: "offline",
  });
  const completedSourceBackedJob = await waitForJob(sourceBackedJob.jobId);
  const durableSourceBackedJob = await getJson(`${serverUrl}/api/runs/jobs/${sourceBackedJob.jobId}`);
  const durableJobHistory = await getJson(`${serverUrl}/api/runs/jobs`);
  const sourceBackedRun = completedSourceBackedJob.run;
  if (!sourceBackedRun?.runId) {
    throw new Error(`Lifecycle job ${sourceBackedJob.jobId} did not return a run.`);
  }
  if (durableSourceBackedJob.status !== "succeeded") {
    throw new Error(`Lifecycle job ${sourceBackedJob.jobId} was not durably inspectable after completion.`);
  }
  if (!durableJobHistory.some((job) => job.jobId === sourceBackedJob.jobId)) {
    throw new Error(`Lifecycle job ${sourceBackedJob.jobId} was missing from durable job history.`);
  }
  const sourceBackedBundle = await getJson(`${serverUrl}/api/runs/${sourceBackedRun.runId}`);
  const sourceCount = sourceBackedBundle.sourceWorkspace?.sourceCount ?? 0;
  const sourceChunkCount = sourceBackedBundle.sourceWorkspace?.sourceChunkCount ?? 0;

  if (sourceCount < 2 || sourceChunkCount < 2) {
    throw new Error(`Source-backed run did not preserve source inventory/chunks: ${sourceCount}/${sourceChunkCount}`);
  }

  const gapBaseJob = await postJson(`${serverUrl}/api/runs/jobs`, {
    projectId: project.id,
    question: "What evidence would make the support first-response recommendation ready to act on?",
    context: "Create a source-free draft so Studio can generate evidence closure tasks.",
    timeHorizon: "30 days",
    sourcePolicy: "offline",
  });
  const completedGapBaseJob = await waitForJob(gapBaseJob.jobId);
  const gapBaseRun = completedGapBaseJob.run;
  if (!gapBaseRun?.runId) {
    throw new Error(`Evidence gap base job ${gapBaseJob.jobId} did not return a run.`);
  }
  const evidenceTasks = await getJson(`${serverUrl}/api/runs/${gapBaseRun.runId}/evidence-tasks`);
  const openEvidenceTask = evidenceTasks.find((task) => task.status === "open");
  if (!openEvidenceTask) {
    throw new Error(`Run ${gapBaseRun.runId} did not produce an open evidence task.`);
  }
  const resolvedEvidenceTask = await postJson(
    `${serverUrl}/api/runs/${gapBaseRun.runId}/evidence-tasks/${openEvidenceTask.taskId}/resolve`,
    {
      sourcePackName: `Evidence closure smoke ${stamp}`,
      sourceName: "gap-closure.md",
      sourceContent: "# Gap closure\n\nMonday handoff notes show that triage ownership and macro coverage are the two highest-leverage response-time inputs.",
      note: "Resolved by local smoke evidence closure.",
    },
  );
  const completedEvidenceClosureJob = await waitForJob(resolvedEvidenceTask.job.jobId);
  const evidenceClosureRun = completedEvidenceClosureJob.run;
  if (!evidenceClosureRun?.runId) {
    throw new Error(`Evidence closure job ${resolvedEvidenceTask.job.jobId} did not return a run.`);
  }
  const evidenceClosureBundle = await getJson(`${serverUrl}/api/runs/${evidenceClosureRun.runId}`);
  const closureComparison = await postJson(`${serverUrl}/api/runs/compare`, {
    leftRunId: gapBaseRun.runId,
    rightRunId: evidenceClosureRun.runId,
  });
  const closureSourceCount = evidenceClosureBundle.sourceWorkspace?.sourceCount ?? 0;
  const closureDelta = closureComparison.delta;
  if (closureSourceCount < 1) {
    throw new Error(`Evidence closure run did not attach source evidence: ${closureSourceCount}`);
  }
  if (!closureDelta?.verdict || !closureDelta?.nextStep) {
    throw new Error("Evidence closure comparison did not return a readable decision delta.");
  }
  if (!closureDelta.sourceMovement || closureDelta.sourceMovement.sourceCountDelta < 1) {
    throw new Error(`Decision delta did not show source coverage improvement: ${JSON.stringify(closureDelta.sourceMovement)}`);
  }
  if (!Array.isArray(closureDelta.notableChanges) || closureDelta.notableChanges.length === 0) {
    throw new Error("Decision delta did not include notable changes.");
  }
  if (closureDelta.sourceMovement.closedGaps.length < 1) {
    throw new Error("Decision delta did not preserve the resolved evidence task as a closed gap.");
  }
  const deltaPackage = await postText(`${serverUrl}/api/runs/compare/export/decision-delta-package`, {
    leftRunId: gapBaseRun.runId,
    rightRunId: evidenceClosureRun.runId,
  });
  for (const expectedText of [
    "# Crux Decision Delta Package",
    "## Verdict",
    "## Closed Evidence Gaps",
    openEvidenceTask.title,
    "## Changed Artifact Paths",
    "## Newer Run Decision Memo",
  ]) {
    if (!deltaPackage.includes(expectedText)) {
      throw new Error(`Decision delta package is missing expected text: ${expectedText}`);
    }
  }
  const lineage = await getJson(`${serverUrl}/api/projects/${project.id}/lineage`);
  const lineageEventTypes = lineage.events?.map((event) => event.type) ?? [];
  for (const expectedType of [
    "run_created",
    "evidence_task_opened",
    "evidence_task_resolved",
    "rerun_completed",
    "decision_delta_available",
  ]) {
    if (!lineageEventTypes.includes(expectedType)) {
      throw new Error(`Decision lineage is missing event type: ${expectedType}`);
    }
  }
  const lineageDelta = lineage.events.find((event) => event.type === "decision_delta_available");
  if (!lineageDelta?.delta || lineageDelta.delta.direction !== "improved") {
    throw new Error(`Decision lineage did not preserve the improved delta: ${JSON.stringify(lineageDelta)}`);
  }
  if (lineage.summary?.latestRunId !== evidenceClosureRun.runId) {
    throw new Error(`Decision lineage latest run mismatch: ${lineage.summary?.latestRunId}`);
  }
  const dossierReview = await postJson(`${serverUrl}/api/runs/${evidenceClosureRun.runId}/review/claims`, {
    claimId: "claim-1",
    status: "approved",
    reviewer: "Local smoke",
    rationale: "Approved to validate the decision record dossier export.",
  });
  const dossier = await getJson(`${serverUrl}/api/projects/${project.id}/decision-record`);
  if (dossier.title !== "Decision Record Dossier") {
    throw new Error(`Decision record returned an unexpected title: ${dossier.title}`);
  }
  if (dossier.latestRunId !== evidenceClosureRun.runId) {
    throw new Error(`Decision record latest run mismatch: ${dossier.latestRunId}`);
  }
  if (!dossier.recommendation || !dossier.nextStep) {
    throw new Error("Decision record did not include a readable recommendation and next step.");
  }
  if (dossier.sourceSummary?.sourceCount < 1) {
    throw new Error(`Decision record lost source coverage: ${JSON.stringify(dossier.sourceSummary)}`);
  }
  if (!dossier.review?.approvedClaims?.includes("claim-1")) {
    throw new Error(`Decision record did not preserve human review: ${JSON.stringify(dossier.review)}`);
  }
  if (dossier.lineage?.deltaCount < 1 || dossier.lineage?.latestDelta?.direction !== "improved") {
    throw new Error(`Decision record did not preserve improved lineage delta: ${JSON.stringify(dossier.lineage)}`);
  }
  if (!dossier.keyArtifacts?.memo) {
    throw new Error(`Decision record did not include key artifacts: ${JSON.stringify(dossier.keyArtifacts)}`);
  }
  const dossierPackage = await getText(`${serverUrl}/api/projects/${project.id}/export/decision-record-dossier`);
  for (const expectedText of [
    "# Crux Decision Record Dossier",
    "## Final Recommendation",
    "## Human Review",
    "Approved claims: claim-1",
    "## Decision Lineage",
    "Decision delta ready",
    "## Final Memo",
  ]) {
    if (!dossierPackage.includes(expectedText)) {
      throw new Error(`Decision record dossier package is missing expected text: ${expectedText}`);
    }
  }
  const acceptanceGate = await getJson(`${serverUrl}/api/projects/${project.id}/acceptance-gate`);
  if (!["accepted", "needs_review"].includes(acceptanceGate.status)) {
    throw new Error(`Acceptance gate should not be blocked after evidence closure: ${JSON.stringify(acceptanceGate)}`);
  }
  if (!Array.isArray(acceptanceGate.checks) || acceptanceGate.checks.length < 8) {
    throw new Error(`Acceptance gate returned an incomplete checklist: ${JSON.stringify(acceptanceGate.checks)}`);
  }
  const acceptanceChecks = new Map(acceptanceGate.checks.map((check) => [check.id, check]));
  for (const requiredPassCheck of [
    "trust_gate",
    "source_coverage",
    "human_review",
    "lineage_delta",
    "blockers",
    "export_package",
  ]) {
    const check = acceptanceChecks.get(requiredPassCheck);
    if (check?.status !== "pass") {
      throw new Error(`Acceptance gate check ${requiredPassCheck} did not pass: ${JSON.stringify(check)}`);
    }
  }
  const remediationPlan = await getJson(`${serverUrl}/api/projects/${project.id}/remediation-plan`);
  if (!["complete", "action_required"].includes(remediationPlan.status)) {
    throw new Error(`Remediation plan returned an unexpected status: ${JSON.stringify(remediationPlan)}`);
  }
  if (acceptanceGate.status === "needs_review" && remediationPlan.status !== "action_required") {
    throw new Error(`Remediation plan should require action for a needs-review gate: ${JSON.stringify(remediationPlan)}`);
  }
  if (!Array.isArray(remediationPlan.actions) || remediationPlan.actions.length === 0) {
    throw new Error(`Remediation plan did not return any next actions: ${JSON.stringify(remediationPlan)}`);
  }
  if (acceptanceGate.status === "needs_review") {
    const planCheckIds = new Set(remediationPlan.actions.map((action) => action.gateCheckId));
    for (const expectedCheckId of ["readiness", "missing_evidence"]) {
      if (!planCheckIds.has(expectedCheckId)) {
        throw new Error(`Remediation plan is missing ${expectedCheckId}: ${JSON.stringify(remediationPlan.actions)}`);
      }
    }
  }

  console.log(JSON.stringify({
    ok: health.ok === true,
    provider: provider?.id ?? "unknown",
    capabilities: provider?.capabilities ?? [],
    demoCount: demos.demos?.length ?? 0,
    runCount: runs.length,
    latestAgentRun: latestAgentRun
      ? {
          runId: latestAgentRun.runId,
          readiness: latestAgentRun.readiness?.status,
          agents: latestAgentRun.agents?.agentCount,
        }
      : null,
    sourceBackedRun: {
      runId: sourceBackedRun.runId,
      jobId: sourceBackedJob.jobId,
      jobStatus: completedSourceBackedJob.status,
      durableJobStatus: durableSourceBackedJob.status,
      durableJobHistoryCount: durableJobHistory.length,
      readiness: sourceBackedRun.readiness?.status,
      sourceCount,
      sourceChunkCount,
    },
    evidenceClosure: {
      baseRunId: gapBaseRun.runId,
      taskId: openEvidenceTask.taskId,
      resolvedTaskStatus: resolvedEvidenceTask.task.status,
      rerunJobId: resolvedEvidenceTask.job.jobId,
      rerunId: evidenceClosureRun.runId,
      rerunSourceCount: closureSourceCount,
      comparisonDifferences: closureComparison.summary?.differenceCount ?? closureComparison.differences?.length ?? 0,
      deltaVerdict: closureDelta.verdict,
      deltaDirection: closureDelta.trustMovement?.direction,
      closedGapCount: closureDelta.sourceMovement.closedGaps.length,
      remainingBlockerCount: closureDelta.blockerMovement.remainingBlockers.length,
      nextStep: closureDelta.nextStep,
      deltaPackageBytes: deltaPackage.length,
      lineageEventCount: lineage.events.length,
      lineageDeltaCount: lineage.summary.deltaCount,
      lineageNextStep: lineage.summary.nextStep,
      dossierReviewApprovedClaims: dossierReview.summary.approvedClaims.length,
      dossierLatestRunId: dossier.latestRunId,
      dossierSourceCount: dossier.sourceSummary.sourceCount,
      dossierPackageBytes: dossierPackage.length,
      acceptanceStatus: acceptanceGate.status,
      acceptanceScore: acceptanceGate.score,
      acceptancePassCount: acceptanceGate.summary.passCount,
      acceptanceWarnCount: acceptanceGate.summary.warnCount,
      acceptanceFailCount: acceptanceGate.summary.failCount,
      remediationStatus: remediationPlan.status,
      remediationActionCount: remediationPlan.summary.totalActions,
      remediationBlockingActions: remediationPlan.summary.blockingActions,
      remediationWarningActions: remediationPlan.summary.warningActions,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

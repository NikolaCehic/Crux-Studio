export type SourcePolicy = "offline" | "hybrid" | "web";

export type TrustStatus = "pass" | "warn" | "fail";

export type SourcePackFileInput = {
  name: string;
  content: string;
  contentHash?: string;
  size?: number;
};

export type AskInput = {
  question: string;
  context?: string;
  timeHorizon?: string;
  sourcePolicy?: SourcePolicy;
  projectId?: string;
  sourcePackId?: string;
  sourcePack?: {
    id: string;
    name: string;
    path?: string;
    sourceCount: number;
    files?: SourcePackFileInput[];
  };
};

export type RunPaths = {
  generatedInput?: string;
  queryIntake?: string;
  decisionMemo?: string;
  htmlReport?: string;
};

export type TrustGate = {
  status: TrustStatus;
  confidence: number;
  blockingIssues: string[];
};

export type ReadinessStatus = "ready" | "usable_with_warnings" | "blocked";

export type ReadinessSummary = {
  status: ReadinessStatus;
  label: string;
  reason: string;
  blockerCount: number;
  nextAction?: string;
};

export type AgentSummary = {
  status: TrustStatus;
  confidence: number;
  agentCount: number;
  warningCount: number;
  failingCount: number;
  blockingIssues: string[];
  nextActions: string[];
};

export type SourceWorkspaceSummary = {
  sourceCount: number;
  sourceChunkCount: number;
  missingEvidence: string[];
  sourcePackName?: string;
};

export type RunSummary = {
  runId: string;
  runDir: string;
  projectId?: string;
  sourcePackId?: string;
  question: string;
  scope: string;
  intent: string;
  answerability: string;
  risk: string;
  createdAt: string;
  harnessVersion?: string;
  trust: TrustGate;
  readiness: ReadinessSummary;
  agents?: AgentSummary;
  sourceWorkspace?: SourceWorkspaceSummary;
  paths: RunPaths;
  memoPreview: string;
};

export type ClaimArtifact = {
  claims: Array<{
    id: string;
    text: string;
    status: "supported" | "challenged" | "needs_evidence";
    confidence: number;
    evidenceIds: string[];
  }>;
};

export type EvidenceArtifact = {
  evidence: Array<{
    id: string;
    summary: string;
    sourceType: "mock" | "source_pack" | "web" | "manual";
    reliability: number;
    relevance: number;
    supports: string[];
    challenges: string[];
  }>;
};

export type TraceEvent = {
  timestamp: string;
  stage: string;
  message: string;
};

export type RunBundle = RunSummary & {
  memo: string;
  artifacts: {
    queryIntake?: unknown;
    claims?: unknown;
    evidence?: unknown;
    contradictions?: unknown;
    uncertainty?: unknown;
    sourceInventory?: unknown;
    sourceChunks?: unknown;
    agentManifest?: unknown;
    agents?: unknown;
    council?: unknown;
    evalReport?: unknown;
    diagnostics?: unknown;
    trace?: unknown[];
  };
};

export interface CruxProvider {
  ask(input: AskInput): Promise<RunSummary>;
  listRuns(): Promise<RunSummary[]>;
  getRun(runId: string): Promise<RunBundle>;
}

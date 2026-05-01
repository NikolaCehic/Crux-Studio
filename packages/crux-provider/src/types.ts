export type SourcePolicy = "offline" | "hybrid" | "web";

export type TrustStatus = "pass" | "warn" | "fail";

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
  trust: TrustGate;
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
    council?: unknown;
    diagnostics?: unknown;
    trace?: unknown[];
  };
};

export interface CruxProvider {
  ask(input: AskInput): Promise<RunSummary>;
  listRuns(): Promise<RunSummary[]>;
  getRun(runId: string): Promise<RunBundle>;
}

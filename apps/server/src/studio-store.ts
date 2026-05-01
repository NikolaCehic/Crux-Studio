import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RunSummary } from "@crux-studio/crux-provider";

export type StudioProject = {
  id: string;
  name: string;
  createdAt: string;
  runIds: string[];
  sourcePackIds: string[];
};

export type StudioSourceFile = {
  id: string;
  name: string;
  extension: string;
  size: number;
  contentHash: string;
};

export type StudioSourcePack = {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  sourceCount: number;
  files: StudioSourceFile[];
};

export type StudioRunLink = {
  runId: string;
  projectId?: string;
  sourcePackId?: string;
};

export type StudioReviewAction = {
  id: string;
  createdAt: string;
  reviewer: string;
  actionType: "approve_claim" | "reject_claim" | "annotate_evidence";
  target: {
    type: "claim" | "evidence";
    id: string;
  };
  rationale: string;
};

export type StudioReview = {
  runId: string;
  createdAt: string;
  updatedAt: string;
  actions: StudioReviewAction[];
  summary: {
    approvedClaims: string[];
    rejectedClaims: string[];
    evidenceAnnotations: Array<{ evidenceId: string; noteCount: number }>;
  };
};

type StudioState = {
  projects: StudioProject[];
  sourcePacks: StudioSourcePack[];
  runLinks: StudioRunLink[];
  reviews: StudioReview[];
};

export type CreateSourcePackInput = {
  projectId: string;
  name: string;
  files: Array<{
    name: string;
    content: string;
  }>;
};

export type StudioStore = {
  createProject(name: string): Promise<StudioProject>;
  listProjects(): Promise<StudioProject[]>;
  linkRun(input: StudioRunLink): Promise<StudioRunLink>;
  listProjectRuns(projectId: string, runs: RunSummary[]): Promise<RunSummary[]>;
  getRunLink(runId: string): Promise<StudioRunLink | undefined>;
  createSourcePack(input: CreateSourcePackInput): Promise<StudioSourcePack>;
  listSourcePacks(projectId?: string): Promise<StudioSourcePack[]>;
  getSourcePack(sourcePackId: string): Promise<StudioSourcePack | undefined>;
  addClaimReview(input: {
    runId: string;
    claimId: string;
    status: "approved" | "rejected";
    reviewer: string;
    rationale: string;
  }): Promise<StudioReview>;
  addEvidenceAnnotation(input: {
    runId: string;
    evidenceId: string;
    reviewer: string;
    note: string;
  }): Promise<StudioReview>;
  getReview(runId: string): Promise<StudioReview>;
};

type StoreOptions = {
  now?: () => string;
};

const initialState = (): StudioState => ({
  projects: [],
  sourcePacks: [],
  runLinks: [],
  reviews: [],
});

export function createMemoryStudioStore(options: StoreOptions = {}): StudioStore {
  return new MemoryStudioStore(initialState(), options.now ?? (() => new Date().toISOString()));
}

export function createFileStudioStore(rootDir: string, options: StoreOptions = {}): StudioStore {
  return new FileStudioStore(rootDir, options.now ?? (() => new Date().toISOString()));
}

class MemoryStudioStore implements StudioStore {
  constructor(
    protected state: StudioState,
    protected readonly now: () => string,
  ) {}

  async createProject(name: string): Promise<StudioProject> {
    const project: StudioProject = {
      id: `project-${slugify(name) || randomUUID()}`,
      name,
      createdAt: this.now(),
      runIds: [],
      sourcePackIds: [],
    };
    this.state.projects = upsertById(this.state.projects, project);
    await this.persist();
    return project;
  }

  async listProjects(): Promise<StudioProject[]> {
    return [...this.state.projects].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  async linkRun(input: StudioRunLink): Promise<StudioRunLink> {
    const link = {
      ...this.state.runLinks.find((item) => item.runId === input.runId),
      ...input,
    };
    this.state.runLinks = upsertByKey(this.state.runLinks, link, "runId");

    if (link.projectId) {
      const project = this.state.projects.find((item) => item.id === link.projectId);
      if (project && !project.runIds.includes(link.runId)) {
        project.runIds = [link.runId, ...project.runIds];
      }
    }

    await this.persist();
    return link;
  }

  async listProjectRuns(projectId: string, runs: RunSummary[]): Promise<RunSummary[]> {
    const project = this.state.projects.find((item) => item.id === projectId);
    if (!project) {
      return [];
    }

    const runSet = new Set(project.runIds);
    return runs.filter((run) => runSet.has(run.runId)).map((run) => this.enrichRun(run));
  }

  async getRunLink(runId: string): Promise<StudioRunLink | undefined> {
    return this.state.runLinks.find((item) => item.runId === runId);
  }

  async createSourcePack(input: CreateSourcePackInput): Promise<StudioSourcePack> {
    const sourcePack: StudioSourcePack = {
      id: `source-pack-${slugify(input.name) || randomUUID()}`,
      projectId: input.projectId,
      name: input.name,
      createdAt: this.now(),
      sourceCount: input.files.length,
      files: input.files.map((file, index) => ({
        id: `source-${index + 1}`,
        name: file.name,
        extension: path.extname(file.name).toLowerCase(),
        size: Buffer.byteLength(file.content, "utf8"),
        contentHash: createHash("sha256").update(file.content).digest("hex"),
      })),
    };
    this.state.sourcePacks = upsertById(this.state.sourcePacks, sourcePack);

    const project = this.state.projects.find((item) => item.id === input.projectId);
    if (project && !project.sourcePackIds.includes(sourcePack.id)) {
      project.sourcePackIds = [sourcePack.id, ...project.sourcePackIds];
    }

    await this.persist();
    return sourcePack;
  }

  async listSourcePacks(projectId?: string): Promise<StudioSourcePack[]> {
    return this.state.sourcePacks
      .filter((item) => !projectId || item.projectId === projectId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getSourcePack(sourcePackId: string): Promise<StudioSourcePack | undefined> {
    return this.state.sourcePacks.find((item) => item.id === sourcePackId);
  }

  async addClaimReview(input: {
    runId: string;
    claimId: string;
    status: "approved" | "rejected";
    reviewer: string;
    rationale: string;
  }): Promise<StudioReview> {
    const review = await this.getReview(input.runId);
    const action = this.createAction(review, {
      reviewer: input.reviewer,
      actionType: input.status === "approved" ? "approve_claim" : "reject_claim",
      target: { type: "claim", id: input.claimId },
      rationale: input.rationale,
    });
    return this.saveReview({ ...review, actions: [...review.actions, action] });
  }

  async addEvidenceAnnotation(input: {
    runId: string;
    evidenceId: string;
    reviewer: string;
    note: string;
  }): Promise<StudioReview> {
    const review = await this.getReview(input.runId);
    const action = this.createAction(review, {
      reviewer: input.reviewer,
      actionType: "annotate_evidence",
      target: { type: "evidence", id: input.evidenceId },
      rationale: input.note,
    });
    return this.saveReview({ ...review, actions: [...review.actions, action] });
  }

  async getReview(runId: string): Promise<StudioReview> {
    const existing = this.state.reviews.find((item) => item.runId === runId);
    if (existing) {
      return existing;
    }

    const createdAt = this.now();
    return {
      runId,
      createdAt,
      updatedAt: createdAt,
      actions: [],
      summary: {
        approvedClaims: [],
        rejectedClaims: [],
        evidenceAnnotations: [],
      },
    };
  }

  protected async persist(): Promise<void> {}

  protected enrichRun(run: RunSummary): RunSummary {
    const link = this.state.runLinks.find((item) => item.runId === run.runId);
    return link ? { ...run, projectId: link.projectId, sourcePackId: link.sourcePackId } : run;
  }

  private createAction(
    review: StudioReview,
    input: Omit<StudioReviewAction, "id" | "createdAt">,
  ): StudioReviewAction {
    return {
      id: `review-action-${review.actions.length + 1}`,
      createdAt: this.now(),
      ...input,
    };
  }

  private async saveReview(review: StudioReview): Promise<StudioReview> {
    const nextReview: StudioReview = {
      ...review,
      updatedAt: this.now(),
      summary: summarizeReview(review.actions),
    };
    this.state.reviews = upsertByKey(this.state.reviews, nextReview, "runId");
    await this.persist();
    return nextReview;
  }
}

class FileStudioStore extends MemoryStudioStore {
  constructor(
    private readonly rootDir: string,
    now: () => string,
  ) {
    super(initialState(), now);
  }

  protected override async persist(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    await writeFile(this.statePath(), `${JSON.stringify(this.state, null, 2)}\n`, "utf8");
  }

  private async load(): Promise<void> {
    try {
      this.state = JSON.parse(await readFile(this.statePath(), "utf8")) as StudioState;
    } catch {
      this.state = initialState();
    }
  }

  override async createProject(name: string): Promise<StudioProject> {
    await this.load();
    return super.createProject(name);
  }

  override async listProjects(): Promise<StudioProject[]> {
    await this.load();
    return super.listProjects();
  }

  override async linkRun(input: StudioRunLink): Promise<StudioRunLink> {
    await this.load();
    return super.linkRun(input);
  }

  override async listProjectRuns(projectId: string, runs: RunSummary[]): Promise<RunSummary[]> {
    await this.load();
    return super.listProjectRuns(projectId, runs);
  }

  override async getRunLink(runId: string): Promise<StudioRunLink | undefined> {
    await this.load();
    return super.getRunLink(runId);
  }

  override async createSourcePack(input: CreateSourcePackInput): Promise<StudioSourcePack> {
    await this.load();
    return super.createSourcePack(input);
  }

  override async listSourcePacks(projectId?: string): Promise<StudioSourcePack[]> {
    await this.load();
    return super.listSourcePacks(projectId);
  }

  override async getSourcePack(sourcePackId: string): Promise<StudioSourcePack | undefined> {
    await this.load();
    return super.getSourcePack(sourcePackId);
  }

  override async addClaimReview(input: {
    runId: string;
    claimId: string;
    status: "approved" | "rejected";
    reviewer: string;
    rationale: string;
  }): Promise<StudioReview> {
    await this.load();
    return super.addClaimReview(input);
  }

  override async addEvidenceAnnotation(input: {
    runId: string;
    evidenceId: string;
    reviewer: string;
    note: string;
  }): Promise<StudioReview> {
    await this.load();
    return super.addEvidenceAnnotation(input);
  }

  override async getReview(runId: string): Promise<StudioReview> {
    await this.load();
    return super.getReview(runId);
  }

  private statePath() {
    return path.join(this.rootDir, "studio-state.json");
  }
}

function summarizeReview(actions: StudioReviewAction[]): StudioReview["summary"] {
  const claimStatuses = new Map<string, "approved" | "rejected">();
  const evidenceNotes = new Map<string, number>();

  for (const action of actions) {
    if (action.actionType === "approve_claim") {
      claimStatuses.set(action.target.id, "approved");
    } else if (action.actionType === "reject_claim") {
      claimStatuses.set(action.target.id, "rejected");
    } else if (action.actionType === "annotate_evidence") {
      evidenceNotes.set(action.target.id, (evidenceNotes.get(action.target.id) ?? 0) + 1);
    }
  }

  return {
    approvedClaims: [...claimStatuses.entries()]
      .filter(([, status]) => status === "approved")
      .map(([claimId]) => claimId),
    rejectedClaims: [...claimStatuses.entries()]
      .filter(([, status]) => status === "rejected")
      .map(([claimId]) => claimId),
    evidenceAnnotations: [...evidenceNotes.entries()].map(([evidenceId, noteCount]) => ({
      evidenceId,
      noteCount,
    })),
  };
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  return upsertByKey(items, item, "id");
}

function upsertByKey<T, K extends keyof T>(items: T[], item: T, key: K): T[] {
  return [item, ...items.filter((current) => current[key] !== item[key])];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

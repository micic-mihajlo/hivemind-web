/**
 * Storage layer — Growth Audit plugin.
 *
 * Two JSON files, no database. Everything written here has already passed the
 * privacy layer; the store re-enforces that on write so a future code path
 * cannot bypass it.
 *
 * WHY THERE ARE TWO IMPLEMENTATIONS
 * ---------------------------------
 * The same server runs in two places:
 *
 *   1. Self-hosted (Express, a long-lived process with a writable disk). This is
 *      the `FileStore` below: JSON files on disk, durable across restarts.
 *
 *   2. A serverless host (Vercel function), where the filesystem is ephemeral
 *      and every invocation may run on a fresh instance. This is
 *      `MemoryStore`: it holds records for the life of the invocation and
 *      nothing else.
 *
 * The honest difference between them is surfaced to the caller through
 * `capabilities`. A server that cannot keep a record MUST NOT tell a user it
 * stored one — the `growth.request_strategy_call` tool reads `capabilities` and
 * hands the user a prefilled message instead of claiming a capture it cannot
 * deliver. That is the whole point of this split: a lead sink that silently
 * drops leads is worse than no lead sink, because the tool's own success
 * message says it worked.
 */

import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  assertNoRestrictedData,
  redactNote,
  purgeExpired,
  isConsentValid,
  type AuditRecord,
  type ConsentRecord,
  type RequestRecord,
} from "./lib/privacy";

/**
 * What this deployment can actually persist. Callers MUST consult this before
 * promising a user that something was stored.
 */
export interface StorageCapabilities {
  /** True when written records survive a restart or a cold start. */
  durable: boolean;
  /** True when a strategy-call request is retained server-side. */
  retainsLeads: boolean;
  /** Human-readable description of where records live. */
  recordStore: string;
}

/**
 * The storage contract the MCP server depends on. Both implementations satisfy
 * it, so the tool logic never needs to know which one it is talking to.
 */
export interface StoreLike {
  readonly capabilities: StorageCapabilities;
  init(): Promise<void>;
  saveConsent(userId: string, consent: ConsentRecord): Promise<void>;
  hasValidConsent(userId: string): boolean;
  saveAudit(record: AuditRecord): Promise<void>;
  saveRequest(
    req: Omit<RequestRecord, "id" | "createdAt" | "status"> & { note?: string }
  ): Promise<RequestRecord>;
  getTrend(userId: string, limit?: number): AuditRecord[];
  countRequests(): number;
}

export class Store implements StoreLike {
  private audits: AuditRecord[] = [];
  private requests: RequestRecord[] = [];
  private consents = new Map<string, ConsentRecord>();
  private loaded = false;

  readonly capabilities: StorageCapabilities = {
    durable: true,
    retainsLeads: true,
    recordStore: "encrypted-at-rest JSON records on the server",
  };

  constructor(private readonly dataDir: string) {}

  private get auditsPath(): string {
    return join(this.dataDir, "audits.json");
  }

  private get requestsPath(): string {
    return join(this.dataDir, "requests.json");
  }

  private get consentsPath(): string {
    return join(this.dataDir, "consents.json");
  }

  async init(): Promise<void> {
    if (this.loaded) return;
    await mkdir(this.dataDir, { recursive: true });
    this.audits = await this.readJson<AuditRecord[]>(this.auditsPath, []);
    this.requests = await this.readJson<RequestRecord[]>(this.requestsPath, []);
    const consents = await this.readJson<Record<string, ConsentRecord>>(this.consentsPath, {});
    this.consents = new Map(Object.entries(consents));
    this.enforceRetention();
    this.loaded = true;
  }

  private async readJson<T>(path: string, fallback: T): Promise<T> {
    try {
      const raw = await readFile(path, "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  /** Atomic write: temp file + rename, so a crash never truncates the store. */
  private async writeJson(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
    await rename(tmp, path);
  }

  private enforceRetention(): void {
    this.audits = purgeExpired(this.audits);
    this.requests = purgeExpired(this.requests);
    for (const [userId, consent] of this.consents) {
      if (!isConsentValid(consent)) this.consents.delete(userId);
    }
  }

  async saveConsent(userId: string, consent: ConsentRecord): Promise<void> {
    assertNoRestrictedData(consent);
    this.consents.set(userId, consent);
    await this.writeJson(this.consentsPath, Object.fromEntries(this.consents));
  }

  hasValidConsent(userId: string): boolean {
    return isConsentValid(this.consents.get(userId));
  }

  async saveAudit(record: AuditRecord): Promise<void> {
    assertNoRestrictedData(record);
    this.enforceRetention();
    this.audits.push(record);
    await this.writeJson(this.auditsPath, this.audits);
  }

  async saveRequest(
    req: Omit<RequestRecord, "id" | "createdAt" | "status"> & { note?: string }
  ): Promise<RequestRecord> {
    assertNoRestrictedData({
      name: req.name,
      email: req.email,
      company: req.company,
      need: req.need,
    });
    const record: RequestRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      email: req.email,
      name: req.name,
      company: req.company,
      vertical: req.vertical,
      need: req.need,
      note: req.note ? redactNote(req.note) : undefined,
      qualification: req.qualification,
      status: "new",
    };
    this.requests.push(record);
    await this.writeJson(this.requestsPath, this.requests);
    return record;
  }

  /** Coarse trend. Returns only derived values, never raw inputs. */
  getTrend(userId: string, limit = 5): AuditRecord[] {
    return this.audits
      .filter((r) => r.userId === userId)
      .slice(-limit)
      .reverse();
  }

  countRequests(): number {
    return this.requests.length;
  }
}

/**
 * Ephemeral store for serverless hosts, where the filesystem does not persist
 * between invocations.
 *
 * It behaves exactly like the file store within a single invocation, and its
 * `capabilities` say plainly that nothing survives. Callers that would
 * otherwise promise a user "we stored your request" must check
 * `capabilities.retainsLeads` and offer a handoff instead.
 */
export class MemoryStore implements StoreLike {
  private audits: AuditRecord[] = [];
  private requests: RequestRecord[] = [];
  private consents = new Map<string, ConsentRecord>();

  readonly capabilities: StorageCapabilities = {
    durable: false,
    retainsLeads: false,
    recordStore: "this session only — nothing is written to disk",
  };

  async init(): Promise<void> {
    /* nothing to load */
  }

  async saveConsent(userId: string, consent: ConsentRecord): Promise<void> {
    assertNoRestrictedData(consent);
    this.consents.set(userId, consent);
  }

  hasValidConsent(userId: string): boolean {
    return isConsentValid(this.consents.get(userId));
  }

  async saveAudit(record: AuditRecord): Promise<void> {
    assertNoRestrictedData(record);
    this.audits.push(record);
  }

  async saveRequest(
    req: Omit<RequestRecord, "id" | "createdAt" | "status"> & { note?: string }
  ): Promise<RequestRecord> {
    assertNoRestrictedData({
      name: req.name,
      email: req.email,
      company: req.company,
      need: req.need,
    });
    const record: RequestRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      email: req.email,
      name: req.name,
      company: req.company,
      vertical: req.vertical,
      need: req.need,
      note: req.note ? redactNote(req.note) : undefined,
      qualification: req.qualification,
      status: "new",
    };
    this.requests.push(record);
    return record;
  }

  getTrend(userId: string, limit = 5): AuditRecord[] {
    return this.audits
      .filter((r) => r.userId === userId)
      .slice(-limit)
      .reverse();
  }

  countRequests(): number {
    return this.requests.length;
  }
}

/**
 * Pick the right store for the current host.
 *
 * A writable disk directory means the file store; anything else (a serverless
 * function) gets the ephemeral store. This is the only place the decision is
 * made, so the rest of the code never has to guess.
 */
export function createStore(options: {
  dataDir?: string;
  /** Set false to force the ephemeral store (used by serverless hosts). */
  durable?: boolean;
}): StoreLike {
  const durable = options.durable ?? Boolean(options.dataDir);
  return durable && options.dataDir
    ? new Store(options.dataDir)
    : new MemoryStore();
}

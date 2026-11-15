/**
 * Ephemeral storage — no filesystem, no `node:` built-ins beyond `crypto`.
 *
 * This module is deliberately free of `node:fs` so it can be imported by a
 * serverless runtime without dragging the filesystem along. The file-backed
 * store lives in store.ts and is only used by the self-hosted server, which
 * has a writable disk.
 *
 * The split exists so a serverless deployment can mount a store that tells the
 * truth about itself: `capabilities.retainsLeads` is false, and the request
 * tool checks it before promising a user that someone will be in touch.
 */

import { randomUUID } from "node:crypto";

import {
  assertNoRestrictedData,
  redactNote,
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
 * it, so tool logic never needs to know which one it is talking to.
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
  readonly capabilities: StorageCapabilities = {
    durable: false,
    retainsLeads: false,
    recordStore: "this session only — nothing is written to disk",
  };

  private audits: AuditRecord[] = [];
  private requests: RequestRecord[] = [];
  private consents = new Map<string, ConsentRecord>();

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

/**
 * End-user identity resolution for a multi-tenant MCP server.
 *
 * WHY THIS EXISTS
 * ---------------
 * The MCP SDK does not expose the raw Node request as `extra.req`. It exposes it as
 * `extra.requestInfo` (see `@modelcontextprotocol/sdk` `RequestHandlerExtra`). An
 * earlier version of this server read `extra.req?.headers`, which is ALWAYS undefined
 * on the streamable-HTTP transport. Every caller therefore resolved to the literal
 * string "anonymous", and all users shared one storage bucket — any user could read
 * any other user's progress trend.
 *
 * This module resolves identity correctly AND fails closed.
 */

/**
 * The subset of `RequestHandlerExtra` we depend on. Typed structurally so the
 * module can be unit-tested without the SDK's types.
 */
export interface IdentityExtra {
  /** SDK-provided HTTP request metadata (headers + URL). */
  requestInfo?: { headers?: Record<string, unknown> };
  /** SDK-provided validated access token, when the host performed OAuth. */
  authInfo?: { token?: string; clientId?: string; subject?: string };
}

export type IdentityResult =
  | { ok: true; userId: string; source: "auth-token" | "header" }
  | { ok: false; reason: "no-credential" };

/**
 * Headers that may carry a stable caller identity.
 *
 * `mcp-session-id` is deliberately NOT used: it is a transport session identifier,
 * not a user identity, and it is not stable across sessions for the same person.
 * Including it would have created a second, different sharing bucket.
 */
const IDENTITY_HEADERS = [
  "x-user-id",
  "x-openai-user-id",
  "x-account-id",
  "x-subject",
] as const;

function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function headerValue(
  headers: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const direct = headers[name];
  if (typeof direct === "string" && direct.length > 0) return direct;
  // Header names are case-insensitive; SDK header maps may not be normalized.
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted && typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * Resolve the caller's identity.
 *
 * Priority:
 *   1. The SDK's validated OAuth token (`authInfo.token`). This is the credential
 *      the host actually validated, so it is the strongest available signal.
 *   2. An explicit identity header injected by the auth layer.
 *
 * Deliberately NOT used as identity: `mcp-session-id`, `authorization` (raw header,
 * unvalidated and unbounded in length), or any other transport-level identifier.
 *
 * Returns `ok: false` when no identity can be resolved. Callers MUST treat that as
 * "refuse the operation" rather than falling back to a shared bucket.
 */
export function resolveUserId(extra: unknown): IdentityResult {
  const e = (extra ?? {}) as IdentityExtra;

  const token = e.authInfo?.token;
  if (typeof token === "string" && token.length > 0) {
    return { ok: true, userId: `u_${hash(token)}`, source: "auth-token" };
  }

  const headers = e.requestInfo?.headers;
  for (const name of IDENTITY_HEADERS) {
    const value = headerValue(headers, name);
    if (value) {
      return { ok: true, userId: `u_${hash(value)}`, source: "header" };
    }
  }

  return { ok: false, reason: "no-credential" };
}

/**
 * Resolve identity, or return null. Convenience wrapper for call sites that treat
 * an unidentifiable caller as "no stored data" rather than as an error.
 */
export function resolveUserIdOrNull(extra: unknown): string | null {
  const result = resolveUserId(extra);
  return result.ok ? result.userId : null;
}

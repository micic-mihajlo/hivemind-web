/**
 * Growth Audit — MCP server over a Vercel Node function.
 *
 * The tool implementation is vendored under /mcp-src/growth-audit and is the
 * SAME code the self-hosted Express server runs (see
 * vault/projects/growth-audit-plugin/src/server.ts). Only the transport
 * wrapper differs.
 *
 * WHY THIS SHAPE (three dead ends, measured, not guessed):
 *
 *   1. The MCP SDK's Node wrapper (StreamableHTTPServerTransport) converts
 *      Node req/res via @hono/node-server and calls `outgoing.writeHead()`.
 *      Vercel's VercelResponse does not implement that path here — the build
 *      succeeded and every request returned a bare 500.
 *   2. The SDK's web-standard transport speaks Request/Response directly, but
 *      exporting `{ fetch }` is an Edge-runtime shape. Vercel's Node runtime
 *      expects a function export, so an object export was invoked as a
 *      handler and every request 500'd before the body was ever read.
 *   3. The vendored server imported the file-backed store, which pulls in
 *      `node:fs`. The serverless path must never touch the filesystem, so the
 *      store was split: store-memory.ts (no fs) and store.ts (fs-backed).
 *
 * This version keeps the Node-style `(req, res)` export Vercel actually
 * supports, and bridges to the SDK's web-standard transport by hand:
 * build a Request, get a Response back, write it out. No SDK conversion
 * layer, no writeHead, no object export.
 *
 * STORAGE POSTURE: a serverless invocation has an ephemeral filesystem, so
 * this mounts the MemoryStore. That store reports `retainsLeads: false`, and
 * the request tool checks that flag — it hands the user an email/booking
 * handoff instead of claiming a capture it cannot deliver. A tool that says
 * "we'll be in touch" while the record evaporates is worse than no tool.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { buildServer } from "../mcp-src/growth-audit/server";
import { MemoryStore } from "../mcp-src/growth-audit/store-memory";

/** Build an absolute URL from Vercel's request (req.url is a path only). */
function absoluteUrl(req: VercelRequest): string {
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const path = req.url ?? "/api/mcp";
  return `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
}

async function writeResponse(res: VercelResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    // Set-Cookie arrives as multiple headers; preserve them all.
    if (key.toLowerCase() === "set-cookie") {
      const existing = res.getHeader("set-cookie");
      const list = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
      res.setHeader(key, [...list, value]);
    } else {
      res.setHeader(key, value);
    }
  });

  if (!response.body) {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const path = (req.url ?? "").split("?")[0];

  // Liveness probe. If this answers, the module loaded and the function is
  // running — which isolates a 500 on /api/mcp to the MCP path itself.
  if (path === "/api/healthz") {
    res.status(200).json({
      ok: true,
      service: "growth-audit",
      capabilities: {
        durable: false,
        retainsLeads: false,
        recordStore: "this session only — nothing is written to disk",
      },
    });
    return;
  }

  try {
    const store = new MemoryStore();
    await store.init();

    const server = buildServer(store, store.capabilities);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    const method = req.method ?? "GET";
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers.set(k, v);
      else if (Array.isArray(v)) headers.set(k, v.join(", "));
    }

    let body: string | undefined;
    if (method !== "GET" && method !== "HEAD") {
      if (typeof req.body === "string") {
        body = req.body;
      } else if (req.body && typeof req.body === "object") {
        body = JSON.stringify(req.body);
      }
    }

    const request = new Request(absoluteUrl(req), {
      method,
      headers,
      body,
    });

    await server.connect(transport);
    const response = await transport.handleRequest(request);
    await writeResponse(res, response);
  } catch (err) {
    console.error("[mcp] request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "mcp_request_failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

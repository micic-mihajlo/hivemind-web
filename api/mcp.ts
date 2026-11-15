/**
 * Growth Audit — MCP server over a Vercel Node function.
 *
 * The tool implementation is vendored under /mcp-src/growth-audit and is the
 * SAME code the self-hosted Express server runs (see
 * vault/projects/growth-audit-plugin/src/server.ts). Only the transport
 * wrapper differs: Vercel gives us Node-style (req, res), the self-hosted
 * server gives us Express, and the MCP SDK's StreamableHTTPServerTransport
 * speaks both.
 *
 * STORAGE POSTURE: a serverless invocation has an ephemeral filesystem, so
 * this mounts the MemoryStore. That store reports `retainsLeads: false`, and
 * the request tool checks that flag — it hands the user an email/booking
 * handoff instead of claiming a capture it cannot deliver. A tool that says
 * "we'll be in touch" while the record evaporates is worse than no tool.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { buildServer } from "../mcp-src/growth-audit/server";
import { MemoryStore } from "../mcp-src/growth-audit/store";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const path = (req.url ?? "").split("?")[0];

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

  const store = new MemoryStore();
  await store.init();

  const server = buildServer(store, store.capabilities);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
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

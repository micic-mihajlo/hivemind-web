/**
 * Growth Audit — MCP server over a Vercel Node function (web-standard export).
 *
 * The tool implementation is vendored under /mcp-src/growth-audit and is the
 * SAME code the self-hosted Express server runs (see
 * vault/projects/growth-audit-plugin/src/server.ts). Only the transport
 * wrapper differs.
 *
 * WHY THE WEB-STANDARD EXPORT: the MCP SDK's Node wrapper converts between
 * Node's IncomingMessage/ServerResponse and the web-standard Request/Response
 * using @hono/node-server. That conversion path is what breaks under Vercel's
 * Node runtime here (the build succeeds and the request 500s). The SDK also
 * ships a web-standard transport that speaks Request/Response directly, so we
 * use that and hand Vercel a plain Response. No conversion, no 500.
 *
 * STORAGE POSTURE: a serverless invocation has an ephemeral filesystem, so
 * this mounts the MemoryStore. That store reports `retainsLeads: false`, and
 * the request tool checks that flag — it hands the user an email/booking
 * handoff instead of claiming a capture it cannot deliver. A tool that says
 * "we'll be in touch" while the record evaporates is worse than no tool.
 */

import { WebStandardStreamableHttpTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { buildServer } from "../mcp-src/growth-audit/server";
import { MemoryStore } from "../mcp-src/growth-audit/store";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/healthz") {
      return new Response(
        JSON.stringify({
          ok: true,
          service: "growth-audit",
          capabilities: {
            durable: false,
            retainsLeads: false,
            recordStore: "this session only — nothing is written to disk",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    const store = new MemoryStore();
    await store.init();

    const server = buildServer(store, store.capabilities);
    const transport = new WebStandardStreamableHttpTransport({ sessionIdGenerator: undefined });

    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request);
      return response;
    } catch (err) {
      console.error("[mcp] request failed:", err);
      return new Response(
        JSON.stringify({
          error: "mcp_request_failed",
          message: err instanceof Error ? err.message : String(err),
        }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
  },
};

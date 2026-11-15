// PROBE: minimal MCP over a Vercel Node function (Node-style req/res handler).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

function buildServer(): McpServer {
  const server = new McpServer({ name: "hivemind-probe", version: "0.0.1" }, {
    instructions: "Probe server.",
  });
  server.registerTool(
    "probe.ping",
    {
      title: "Ping",
      description: "Returns pong.",
      inputSchema: { msg: z.string().optional() } as never,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (raw) => ({
      content: [{ type: "text" as const, text: `pong:${(raw as { msg?: string }).msg ?? ""}` }],
    })
  );
  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.url?.split("?")[0] === "/api/healthz") {
    res.status(200).json({ ok: true, service: "hivemind-probe" });
    return;
  }

  const server = buildServer();
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

// PROBE: minimal MCP over Vercel Node function (web-standard transport).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHttpTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
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

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname === "/api/healthz") {
    return new Response(JSON.stringify({ ok: true, service: "hivemind-probe" }), {
      headers: { "content-type": "application/json" },
    });
  }
  const server = buildServer();
  const transport = new WebStandardStreamableHttpTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  const res = await transport.handleRequest(req);
  return res;
}

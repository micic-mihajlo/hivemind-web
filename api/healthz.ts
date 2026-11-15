/**
 * Liveness probe for the Growth Audit MCP deployment.
 *
 * This exists as its own file because Vercel maps one file per route:
 * `api/healthz.ts` -> `/api/healthz`, `api/mcp.ts` -> `/api/mcp`. A probe that
 * lives inside the MCP handler would only answer on the MCP path, which
 * defeats the purpose — the whole point of this route is to answer when the
 * MCP route is broken.
 *
 * If this returns 200, the function bundle loaded and the runtime is healthy,
 * so a failure on /api/mcp is in the MCP request path and not in module
 * loading. If it 500s, the bundle itself is failing to load.
 */

export default function handler(_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }): void {
  res.status(200).json({
    ok: true,
    service: "growth-audit",
    route: "/api/healthz",
    capabilities: {
      durable: false,
      retainsLeads: false,
      recordStore: "this session only — nothing is written to disk",
    },
  });
}

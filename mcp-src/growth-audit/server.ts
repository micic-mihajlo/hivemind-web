/**
 * Growth Audit — ChatGPT plugin MCP server.
 *
 * A remote, public HTTPS MCP server exposing HiveMind's growth-audit and
 * qualification tooling to ChatGPT.
 *
 * Security posture:
 *   - Audit inputs describing the prospect's business are never persisted.
 *   - The privacy layer rejects restricted data before anything is stored.
 *   - No payments are processed. Digital services cannot be sold in plugins, so
 *     the audit engagement is booked off-platform.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import { audit, DISCLAIMER, buildOfferLanguage } from "./lib/leaks";
import { buildSpreadsheet, scoreProspect, CLOSE_QUESTIONS, OPENING_SCRIPT } from "./lib/close";
import { scanClaim } from "./lib/compliance";
import { resolveUserId } from "./lib/identity";
import {
  assertNoRestrictedData,
  CONSENT_PURPOSE,
  type ConsentRecord,
} from "./lib/privacy";
import type { StoreLike, StorageCapabilities } from "./store";
import {
  AUDIT_TOOL,
  SPREADSHEET_TOOL,
  QUALIFY_TOOL,
  OFFER_TOOL,
  TREND_TOOL,
  REQUEST_TOOL,
  auditSchema,
} from "./tools";


type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
};

function textResult(text: string, structured?: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text }],
    ...(structured ? { structuredContent: structured } : {}),
  };
}

export function buildServer(store: StoreLike, capabilities: StorageCapabilities): McpServer {
  const server = new McpServer(
    { name: "growth-audit", version: "1.0.0" },
    {
      instructions:
        "Growth Audit diagnoses where a service business is losing inbound opportunities and " +
        "quantifies the cost of that delay. It scores six leak categories, identifies the single " +
        "biggest one, models a conservative opportunity with stated assumptions, and helps you " +
        "run a discovery call using the Blank Spreadsheet Close. It is a business diagnostic, not " +
        "a promise of revenue, and it does not produce medical, legal, or clinical outcomes. " +
        "When a prospect states what they need and what it is worth, organize their words into " +
        "the spreadsheet and score the buying signals. Never invent features, priorities, or " +
        "dollar amounts on the prospect's behalf.",
    }
  );

  // ------------------------------------------------------------------- audit
  server.registerTool(
    AUDIT_TOOL.name,
    {
      title: AUDIT_TOOL.title,
      description: AUDIT_TOOL.description,
      inputSchema: AUDIT_TOOL.inputSchema as unknown as z.ZodRawShape,
      outputSchema: {
        overall: z.number(),
        primaryLeak: z.string(),
        leaks: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            score: z.number(),
            band: z.string(),
            description: z.string(),
          })
        ),
        recommendations: z.array(
          z.object({
            leak: z.string(),
            title: z.string(),
            detail: z.string(),
            action: z.string(),
            priority: z.number(),
          })
        ),
        costOfDelay: z.object({
          leakingInquiriesPerMonth: z.number(),
          modeledMonthlyOpportunity: z.number(),
          conservativeMonthlyOpportunity: z.number(),
          recoverableStaffHoursPerWeek: z.number(),
          assumptions: z.array(z.string()),
          caveat: z.string(),
          confidence: z.number(),
        }),
        offerLanguage: z.object({
          headline: z.string(),
          subheadline: z.string(),
          cta: z.string(),
        }),
        disclaimer: z.string(),
      } as unknown as z.ZodRawShape,
      annotations: AUDIT_TOOL.annotations,
      _meta: AUDIT_TOOL._meta,
    },
    async (raw, extra) => {
      const input = auditSchema.parse(raw);
      assertNoRestrictedData(input);

      const result = audit(input);

      const text = [
        `Funnel audit — overall ${result.overall}/100`,
        "",
        ...result.leaks.map((l) => `• ${l.label}: ${l.score}/100 (${l.band}) — ${l.description}`),
        "",
        `Biggest leak: ${result.primaryLeak.label} (${result.primaryLeak.score}/100)`,
        "",
        "Cost of delay:",
        `• ${result.costOfDelay.leakingInquiriesPerMonth} inquiries/month are not becoming customers`,
        `• Conservative modeled opportunity: $${result.costOfDelay.conservativeMonthlyOpportunity.toLocaleString()}/month`,
        `• Recoverable staff time: ~${result.costOfDelay.recoverableStaffHoursPerWeek} hrs/week`,
        `• Estimate confidence: ${Math.round(result.costOfDelay.confidence * 100)}%`,
        "",
        "Assumptions:",
        ...result.costOfDelay.assumptions.map((a) => ` - ${a}`),
        "",
        ...result.recommendations.map(
          (r, i) => `${i + 1}. [${r.leak.toUpperCase()}] ${r.title}\n   ${r.detail}\n   Do this: ${r.action}`
        ),
        "",
        result.costOfDelay.caveat,
      ].join("\n");

      // Only derived values are stored, and only with consent.
      // Identity resolution fails closed: without a resolvable caller we store nothing.
      const identity = resolveUserId(extra);
      if (identity.ok && store.hasValidConsent(identity.userId)) {
        await store.saveAudit({
          userId: identity.userId,
          createdAt: new Date().toISOString(),
          vertical: input.vertical,
          overall: result.overall,
          primaryLeak: result.primaryLeak.key,
          leaks: result.leaks.map((l) => ({ key: l.key, score: l.score, band: l.band })),
          conservativeMonthlyOpportunity: result.costOfDelay.conservativeMonthlyOpportunity,
        });
      }

      return textResult(text, {
        overall: result.overall,
        primaryLeak: result.primaryLeak.label,
        leaks: result.leaks.map((l) => ({
          key: l.key,
          label: l.label,
          score: l.score,
          band: l.band,
          description: l.description,
        })),
        recommendations: result.recommendations.map((r) => ({
          leak: r.leak,
          title: r.title,
          detail: r.detail,
          action: r.action,
          priority: r.priority,
        })),
        costOfDelay: result.costOfDelay,
        offerLanguage: result.offerLanguage,
        disclaimer: result.disclaimer,
      });
    }
  );

  // ----------------------------------------------------------- spreadsheet
  server.registerTool(
    SPREADSHEET_TOOL.name,
    {
      title: SPREADSHEET_TOOL.title,
      description: SPREADSHEET_TOOL.description,
      inputSchema: SPREADSHEET_TOOL.inputSchema as unknown as z.ZodRawShape,
      annotations: SPREADSHEET_TOOL.annotations,
      _meta: SPREADSHEET_TOOL._meta,
    },
    async (raw) => {
      const input = SPREADSHEET_TOOL.inputSchema.parse(raw);
      assertNoRestrictedData(input);

      const sheet = buildSpreadsheet(input.rows, input.hasBudgetAuthority ?? false);

      const nextQuestion =
        sheet.rows.length === 0
          ? CLOSE_QUESTIONS[0]
          : sheet.unquantifiedCount > 0
            ? "What would that be worth to you monthly?"
            : sheet.missingBeforeClose[0] ?? CLOSE_QUESTIONS[1];

      const text = [
        sheet.rows.length === 0 ? "Opening the sheet:" : "Your sheet:",
        "",
        `${sheet.columns[0]} | ${sheet.columns[1]} | ${sheet.columns[2]}`,
        ...sheet.rows.map(
          (r) =>
            `${r.feature} | ${r.priority} | ` +
            (r.wouldPay === null ? "(not quantified)" : `$${r.wouldPay.toLocaleString()}/mo`) +
            `  [${r.tier}]`
        ),
        "",
        `Total stated value: $${sheet.totalWouldPay.toLocaleString()}/mo`,
        "",
        sheet.readyToClose
          ? "The sheet is complete. Close like this:"
          : `Next question: "${nextQuestion}"`,
        ...(sheet.readyToClose ? ["", sheet.closeScript ?? ""] : []),
        ...(sheet.missingBeforeClose.length > 0 && !sheet.readyToClose
          ? ["", "Before closing:", ...sheet.missingBeforeClose.map((m) => ` - ${m}`)]
          : []),
        "",
        "Let them fill this in themselves. Do not fill it in for them.",
      ].join("\n");

      return textResult(text, {
        columns: sheet.columns,
        rows: sheet.rows,
        totalWouldPay: sheet.totalWouldPay,
        unquantifiedCount: sheet.unquantifiedCount,
        readyToClose: sheet.readyToClose,
        missingBeforeClose: sheet.missingBeforeClose,
        nextQuestion,
        closeScript: sheet.closeScript,
        openingScript: OPENING_SCRIPT,
      });
    }
  );

  // -------------------------------------------------------------- qualify
  server.registerTool(
    QUALIFY_TOOL.name,
    {
      title: QUALIFY_TOOL.title,
      description: QUALIFY_TOOL.description,
      inputSchema: QUALIFY_TOOL.inputSchema as unknown as z.ZodRawShape,
      annotations: QUALIFY_TOOL.annotations,
      _meta: QUALIFY_TOOL._meta,
    },
    async (raw) => {
      const input = QUALIFY_TOOL.inputSchema.parse(raw);
      assertNoRestrictedData(input);

      const scored = scoreProspect(input);

      const text = [
        `Prospect score: ${scored.score}/15 (${scored.band.replace("_", " ")})`,
        "",
        "Signals present:",
        ...(scored.positives.length > 0 ? scored.positives.map((p) => ` + ${p}`) : [" (none)"]),
        "",
        "Signals missing:",
        ...(scored.gaps.length > 0 ? scored.gaps.map((g) => ` - ${g}`) : [" (none)"]),
        "",
        `Next action: ${scored.nextAction}`,
      ].join("\n");

      return textResult(text, scored as unknown as Record<string, unknown>);
    }
  );

  // ----------------------------------------------------------------- offer
  server.registerTool(
    OFFER_TOOL.name,
    {
      title: OFFER_TOOL.title,
      description: OFFER_TOOL.description,
      inputSchema: OFFER_TOOL.inputSchema as unknown as z.ZodRawShape,
      annotations: OFFER_TOOL.annotations,
      _meta: OFFER_TOOL._meta,
    },
    async (raw) => {
      const input = OFFER_TOOL.inputSchema.parse(raw);
      assertNoRestrictedData(input);

      const offer = buildOfferLanguage(input.vertical, input.timeFrame ?? "30 days");

      const text: string[] = [
        "Offer language:",
        "",
        `Headline: ${offer.headline}`,
        `Subheadline: ${offer.subheadline}`,
        `CTA: ${offer.cta}`,
      ];

      let scan: ReturnType<typeof scanClaim> | undefined;
      if (input.existingCopy && input.existingCopy.trim().length > 0) {
        scan = scanClaim(input.existingCopy);
        text.push(
          "",
          "Copy check:",
          ...(scan.ok
            ? [" No prohibited claims found."]
            : scan.violations.map(
                (v) => ` [${v.level.toUpperCase()}] ${v.category}: "${v.matched}"\n   ${v.reason}\n   Fix: ${v.fix}`
              )),
          "",
          `Rewritten: ${scan.rewritten}`,
          ...(scan.positives.length > 0
            ? ["", "Already doing well:", ...scan.positives.map((p) => ` - ${p}`)]
            : [])
        );
      }

      text.push("", DISCLAIMER);

      return textResult(text.join("\n"), {
        offer,
        scan: scan as unknown as Record<string, unknown> | undefined,
        disclaimer: DISCLAIMER,
      });
    }
  );

  // ----------------------------------------------------------------- trend
  server.registerTool(
    TREND_TOOL.name,
    {
      title: TREND_TOOL.title,
      description: TREND_TOOL.description,
      inputSchema: TREND_TOOL.inputSchema as unknown as z.ZodRawShape,
      annotations: TREND_TOOL.annotations,
      _meta: TREND_TOOL._meta,
    },
    async (raw, extra) => {
      const input = TREND_TOOL.inputSchema.parse(raw);
      const identity = resolveUserId(extra);
      if (!identity.ok) {
        return textResult(
          "I can't read your audit history because this connection isn't signed in as you. " +
            "Audit history is tied to your account, so it can't be shown to an unidentified " +
            "caller. Reconnect the plugin and try again."
        );
      }
      const trend = store.getTrend(identity.userId, input.limit);

      if (trend.length < 2) {
        return textResult(
          "There isn't a trend yet. A trend needs at least two audits, and right now there is " +
            (trend.length === 0 ? "none" : "one") +
            ". Run the audit again after a few weeks of fixes, and this will show the real change. " +
            "One data point is not a trend — saying otherwise would be making it up."
        );
      }

      const first = trend[trend.length - 1];
      const latest = trend[0];
      const delta = Math.round((latest.overall - first.overall) * 10) / 10;

      const text = [
        `Progress over ${trend.length} audits: ${first.overall} → ${latest.overall} (${delta >= 0 ? "+" : ""}${delta})`,
        "",
        ...trend
          .map(
            (t) =>
              `${t.createdAt.slice(0, 10)} — overall ${t.overall} | primary leak ${t.primaryLeak} | ` +
              t.leaks.map((l) => `${l.key} ${l.score}`).join(" | ")
          )
          .join("\n"),
      ].join("\n");

      return textResult(text, { trend: trend as unknown as Record<string, unknown> });
    }
  );

  // --------------------------------------------------------------- request
  server.registerTool(
    REQUEST_TOOL.name,
    {
      title: REQUEST_TOOL.title,
      description: REQUEST_TOOL.description,
      inputSchema: REQUEST_TOOL.inputSchema as unknown as z.ZodRawShape,
      annotations: REQUEST_TOOL.annotations,
      _meta: REQUEST_TOOL._meta,
    },
    async (raw) => {
      const input = REQUEST_TOOL.inputSchema.parse(raw);
      assertNoRestrictedData(input);

      const req = await store.saveRequest({
        email: input.email,
        name: input.name,
        company: input.company,
        vertical: input.vertical,
        need: input.need,
        note: input.note,
      });

      // HONESTY GATE: a tool that says "we will reach out" while the record
      // evaporates with the invocation is the worst outcome we can ship — worse
      // than not offering the tool at all, because the success message tells
      // the user something false. If this deployment cannot retain the lead,
      // say so and hand the user a message they can send themselves.
      if (!capabilities.retainsLeads) {
        const handoff = [
          "I've got what you told me, but this connection is not holding onto it between " +
            "sessions, so I can't promise someone will reach out on its own.",
          "",
          "The fastest way to get a reply is to email us directly:",
          "",
          `  hello@hivemindintelligence.com`,
          "",
          "Or book the audit here:",
          "",
          "  https://hivemindintelligence.zohobookings.com/4773814000000048056",
          "",
          `Include: ${req.company} — ${req.need}`,
          "",
          "Nothing is charged for the conversation, and nothing is booked automatically.",
        ].join("\n");

        return textResult(handoff, {
          requestId: req.id,
          status: req.status,
          retained: false,
          handoffRequired: true,
        });
      }

      const text = [
        "Request received.",
        "",
        `Reference: ${req.id}`,
        `Company: ${req.company}`,
        `What you said this needs to do: ${req.need}`,
        "",
        "What happens next: a HiveMind strategist reviews your request and reaches out directly " +
          `at ${req.email} to scope a fixed-price audit.`,
        "",
        "Nothing is charged here, and nothing is booked automatically — the audit is set up with " +
          "you directly, and you approve the scope before any work starts.",
        "",
        "We store your name, email, company, and what you told us you need, so we can reply. We " +
          "do not store patient or client identifiers, and we do not share your details with " +
          "anyone.",
      ].join("\n");

      return textResult(text, { requestId: req.id, status: req.status, retained: true });
    }
  );

  // --------------------------------------------------------------- consent
  server.registerTool(
    "growth.set_privacy_consent",
    {
      title: "Set Privacy Consent",
      description:
        "Use this when a user asks what is stored, agrees to have their audit scores tracked, or " +
        "asks to stop tracking. Stores the consent decision for derived funnel scores and, " +
        "separately, for a strategy-call request. Only ever called in response to an explicit " +
        "user decision — never proactively, and never as a default prompt at the end of a " +
        "conversation.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Recording your privacy choice",
        "openai/toolInvocation/invoked": "Privacy choice saved",
      },
      inputSchema: z.object({
        storeAuditScores: z.boolean()
          .describe("True to store derived funnel scores so progress can be tracked over time."),
        allowStrategyContact: z.boolean()
          .describe("True to allow a strategy-call request to be stored and contacted."),
        optOut: z.boolean().optional()
          .describe("True to delete all stored data for this user and stop tracking."),
      }) as unknown as z.ZodRawShape,
    },
    async (raw, extra) => {
      const input = z
        .object({
          storeAuditScores: z.boolean(),
          allowStrategyContact: z.boolean(),
          optOut: z.boolean().optional(),
        })
        .parse(raw);

      const identity = resolveUserId(extra);
      if (!identity.ok) {
        return textResult(
          "I can't record your privacy choice because this connection isn't signed in as you. " +
            "Consent has to be tied to your account, so it can't be saved for an unidentified " +
            "caller. Reconnect the plugin and try again."
        );
      }
      const uid = identity.userId;

      if (input.optOut) {
        const consent: ConsentRecord = {
          grantedAt: new Date().toISOString(),
          purpose: "opted out",
          analytics: false,
          contact: false,
        };
        await store.saveConsent(uid, consent);
        return textResult(
          "Done. Tracking is off and stored data for this profile has been removed."
        );
      }

      const consent: ConsentRecord = {
        grantedAt: new Date().toISOString(),
        purpose: CONSENT_PURPOSE,
        analytics: input.storeAuditScores,
        contact: input.allowStrategyContact,
      };
      await store.saveConsent(uid, consent);

      return textResult(
        "Saved. Here is exactly what that means:\n" +
          (input.storeAuditScores
            ? " - Your derived funnel scores and conservative estimate are stored so you can see progress over time.\n"
            : " - Audit scores are not stored.\n") +
          (input.allowStrategyContact
            ? " - Your name, email, company, and what you said you need are stored only if you ask to be contacted.\n"
            : " - Contact details are not stored.\n") +
          " - Your business numbers (inquiry volume, booking rate, revenue per customer) are never stored.\n" +
          " - We never store patient or client identifiers, and we never share your details with anyone.\n" +
          " - Stored data is automatically deleted after 180 days."
      );
    }
  );

  return server;
}

/**
 * Tool contracts.
 *
 * Per OpenAI's plugin metadata guidance, descriptions are written for SELECTION:
 *   - start with "Use this when..."
 *   - call out the disallowed cases
 *   - describe user intent, not implementation
 *   - annotations reflect ACTUAL behavior
 *
 * Tool names are `domain.action` pairs because the model selects on names and
 * descriptions. This plugin's domain is "growth" — the commercial funnel.
 */

import { z } from "zod";

export const auditSchema = z.object({
  vertical: z.enum(["medical", "legal", "fitness", "real_estate", "agency", "other"])
    .describe("The prospect's industry. Drives which offer language and recommendations lead."),
  monthlyInquiries: z.number().int().min(0).max(100000)
    .describe("Inbound inquiries per month — calls, forms, DMs, referrals, combined."),
  currentBookingRate: z.number().min(0).max(1)
    .describe("0-1. What share of inbound inquiries currently become a booked customer."),
  avgValuePerCustomer: z.number().min(0).max(1000000)
    .describe("Average dollar value of one booked customer."),
  responseSpeed: z.number().int().min(0).max(10)
    .describe("0-10. How fast a new inquiry gets a human response."),
  followUp: z.number().int().min(0).max(10)
    .describe("0-10. How reliably stale leads and no-shows get followed up."),
  offerClarity: z.number().int().min(0).max(10)
    .describe("0-10. How clearly the offer reads as a specific business outcome."),
  staffOverload: z.number().int().min(0).max(10)
    .describe("0-10. How much repetitive intake work the front desk absorbs."),
  dataProtection: z.number().int().min(0).max(10)
    .describe("0-10. How well protected sensitive client/patient data is today."),
  followUpOwner: z.enum(["owner", "staff", "outsourced", "nobody"])
    .describe("Who handles follow-up today."),
  sensitiveDataInGenericAI: z.boolean()
    .describe("True if sensitive client or patient data currently flows into generic cloud AI tools."),
  usesLeadForms: z.boolean().describe("True if the site uses lead-capture forms."),
  hasCaseStudy: z.boolean()
    .describe("True if there is a documented before/after case study."),
});

export type AuditInput = z.infer<typeof auditSchema>;

export const AUDIT_TOOL = {
  name: "growth.audit_growth_funnel",
  title: "Audit Growth Funnel",
  description:
    "Use this when a business owner wants to know where they are losing inbound leads or " +
    "opportunities, wants their acquisition funnel diagnosed, or asks how much their slow " +
    "response time and weak follow-up are costing them. Returns six scored leak categories " +
    "(response speed, capture, follow-up, staff overload, data exposure, offer clarity), the " +
    "single biggest leak, a conservative cost-of-delay estimate with stated assumptions, and " +
    "prioritised actions. Do NOT use this for a personal fitness or lifestyle question — that " +
    "is a different tool. Do not use it to produce guaranteed revenue claims or medical, legal, " +
    "or clinical outcomes; this is a business diagnostic only. Every estimate is a model, not " +
    "a promise, and the assumptions are returned so they can be corrected.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  _meta: {
    "openai/toolInvocation/invoking": "Scanning your funnel for leaks",
    "openai/toolInvocation/invoked": "Funnel audit ready",
  },
  inputSchema: auditSchema,
} as const;

export const SPREADSHEET_TOOL = {
  name: "growth.build_blank_spreadsheet",
  title: "Build Blank Spreadsheet Close",
  description:
    "Use this when you are on a discovery call with a prospect and need to run the Blank " +
    "Spreadsheet Close, or when the prospect has told you what they need their system to do " +
    "and what it is worth monthly. Takes the prospect's OWN words as rows and organizes them " +
    "into a Feature / Priority / Would Pay sheet, then returns the next question to ask and, " +
    "once the sheet is quantified, the close script. Do NOT fill in features the prospect did " +
    "not state, do not assign priorities they did not give, and do not invent dollar amounts — " +
    "the entire mechanism depends on the prospect filling in this themselves. Use this only " +
    "when prospect-stated rows are available.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  _meta: {
    "openai/toolInvocation/invoking": "Organizing your spreadsheet",
    "openai/toolInvocation/invoked": "Spreadsheet ready",
  },
  inputSchema: z.object({
    rows: z.array(
      z.object({
        feature: z.string().min(1).max(300)
          .describe("The capability, in the prospect's own words. Do not paraphrase into " +
            "consultant language."),
        priority: z.number().int().min(1).max(10)
          .describe("1-10 importance, as the prospect stated it."),
        wouldPay: z.number().min(0).max(1000000).nullable().optional()
          .describe("Monthly value the prospect stated. Leave null if they have not said a " +
            "number yet — do not estimate one."),
        verbatim: z.string().max(500).optional()
          .describe("Optional exact phrasing the prospect used, for the pitch later."),
      })
    ).describe("The rows the prospect has actually filled in."),
    hasBudgetAuthority: z.boolean().optional()
      .describe("True if the prospect has confirmed they can sign off on spend."),
  }),
} as const;

export const QUALIFY_TOOL = {
  name: "growth.score_prospect",
  title: "Score Prospect",
  description:
    "Use this when you need to decide whether a prospect is worth pushing a close on, needs " +
    "nurturing, or should be let go. Scores six buying signals (filled spreadsheet, named " +
    "dollar amount, budget authority, timeline under two weeks, urgent pain, warm intro) and " +
    "returns a band with the specific next action. Do NOT use this to rank or judge people as " +
    "human beings — it is a routing signal about deal readiness, and a low score means send " +
    "something useful, not that the prospect is low quality. Do not use it to decide " +
    "employment, credit, or anything outside a sales pipeline.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  _meta: {
    "openai/toolInvocation/invoking": "Scoring the deal signals",
    "openai/toolInvocation/invoked": "Qualification ready",
  },
  inputSchema: z.object({
    filledSpreadsheet: z.boolean().describe("The prospect filled in the spreadsheet themselves."),
    namedAmount: z.boolean().describe("The prospect named a specific dollar amount."),
    hasBudgetAuthority: z.boolean().describe("The prospect has budget authority."),
    timelineUnderTwoWeeks: z.boolean().describe("Decision timeline is under two weeks."),
    painIsUrgent: z.boolean().describe("The pain is urgent, not a nice-to-have."),
    warmIntro: z.boolean().describe("Came in through a warm introduction."),
  }),
} as const;

export const OFFER_TOOL = {
  name: "growth.build_offer_language",
  title: "Build Offer Language",
  description:
    "Use this when the user needs offer copy, a headline, a subheadline, a call to action, or " +
    "landing-page language for a local AI systems engagement, or wants their existing copy " +
    "checked against the rules. Returns growth-tied offer language built around the " +
    "specific outcome plus mechanism plus time frame, and scans any supplied copy for " +
    "prohibited claims. Do NOT use it for consumer fitness coaching copy — this is for " +
    "business services. Do NOT produce guaranteed revenue, HIPAA-compliant, patient-outcome, " +
    "or legal-outcome claims; those are prohibited and the tool will refuse them.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  _meta: {
    "openai/toolInvocation/invoking": "Writing your offer language",
    "openai/toolInvocation/invoked": "Offer language ready",
  },
  inputSchema: z.object({
    vertical: z.enum(["medical", "legal", "fitness", "real_estate", "agency", "other"])
      .describe("The prospect's industry."),
    timeFrame: z.string().max(40).optional()
      .describe("Implementation time frame, e.g. '14-30 days' or '30 days'. Defaults to 30 days."),
    existingCopy: z.string().max(2000).optional()
      .describe("Existing headline or copy to check for prohibited claims and weak language."),
  }),
} as const;

export const TREND_TOOL = {
  name: "growth.get_audit_trend",
  title: "Get Audit Trend",
  description:
    "Use this when a user asks whether their funnel fixes are actually working, wants to " +
    "compare recent audits, or asks if progress is real. Returns up to five recent derived " +
    "scores with the change between them. Do NOT use before the user has completed at least " +
    "two audits — one data point is not a trend, and saying otherwise would be making it up. " +
    "Only returns stored derived scores and the conservative estimate, never the raw business " +
    "inputs.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  _meta: {
    "openai/toolInvocation/invoking": "Pulling your audit trend",
    "openai/toolInvocation/invoked": "Trend ready",
  },
  inputSchema: z.object({
    limit: z.number().int().min(1).max(10).default(5)
      .describe("How many recent audits to include (1-10)."),
  }),
} as const;

export const REQUEST_TOOL = {
  name: "growth.request_strategy_call",
  title: "Request Strategy Call",
  description:
    "Use this ONLY when a business owner explicitly asks to talk to someone about a strategy " +
    "call or a fixed-scope audit. Records name, email, company, and what they said they need, " +
    "then creates a request for a human to follow up on. Do NOT use proactively, do NOT use as " +
    "an upsell at the end of a free audit, and do NOT use it as a lead-capture step. There is " +
    "no in-plugin purchase: the audit is a fixed-scope engagement booked directly, and this " +
    "tool only records intent.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  _meta: {
    "openai/toolInvocation/invoking": "Recording your request",
    "openai/toolInvocation/invoked": "Request received",
  },
  inputSchema: z.object({
    name: z.string().min(1).max(120).describe("The contact's name."),
    email: z.string().email().describe("The contact's email address, for a human to reply to."),
    company: z.string().min(1).max(160).describe("The company or practice name."),
    vertical: z.enum(["medical", "legal", "fitness", "real_estate", "agency", "other"])
      .describe("The company's industry."),
    need: z.string().min(3).max(1000)
      .describe("What they said the system needs to do, in their own words. This is what " +
        "scopes the audit."),
    note: z.string().max(1000).optional()
      .describe("Optional message. Do not include patient or client identifiers, medical " +
        "history, matter numbers, or payment details — those are rejected and not stored."),
    consentGranted: z.literal(true)
      .describe("Must be true. Confirms the user agreed to be contacted about a strategy call."),
  }),
} as const;

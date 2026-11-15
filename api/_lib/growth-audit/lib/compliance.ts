/**
 * Compliance-safe claim scanner.
 *
 * The HiveMind playbook is unusually specific about what HiveMind may and may
 * not promise, and those rules are the difference between a usable plugin and a
 * legal liability. This module encodes them as an executable check so a bad
 * claim fails loudly instead of shipping.
 *
 * Source: vault/projects/hivemind/sales/playbooks/paid-ads-growth-offer-playbook.md
 *
 *   "Do not guarantee:
 *    - Patient health outcomes
 *    - Legal case outcomes
 *    - Revenue claims that depend on the client's market, staff, or sales process
 *    - Anything that implies HIPAA/legal compliance without signed BAAs and verified architecture"
 *
 *   "Use business-owner language" — not "AI automation", not "save time with AI".
 */

export type ViolationLevel = "blocked" | "review";

export interface ClaimViolation {
  level: ViolationLevel;
  category: string;
  /** What was found. */
  matched: string;
  /** Why it is a problem. */
  reason: string;
  /** Suggested rewrite. */
  fix: string;
}

export interface ClaimScanResult {
  ok: boolean;
  violations: ClaimViolation[];
  /** Language present in the claim that does satisfy the rules. */
  positives: string[];
  /** Rewritten version of the claim with blocked language removed. */
  rewritten: string;
}

/** Claims that are outright prohibited. */
const BLOCKED_PATTERNS: { category: string; pattern: RegExp; reason: string; fix: string }[] = [
  {
    category: "guaranteed_outcome",
    pattern:
      /\b(guarantee[ds]?|guaranteeing|promise[ds]?|ensures?)\b[^.]{0,80}\b(revenue|results?|appointments?|roi|growth|conversions?|patients?|clients?)\b/i,
    reason:
      "Guaranteed revenue or outcome claims are prohibited. Outcomes depend on the client's " +
      "market, staff, and sales process.",
    fix: "State the mechanism and time frame instead: 'We install a local AI front desk in 30 days so you…'",
  },
  {
    category: "health_outcome",
    pattern:
      /\b(improve|increase|reduce|lower|fix|cure|treat|reverse)\w*\b[^.]{0,60}\b(health|patient outcomes?|care quality|wellness outcomes?|clinical outcomes?|recovery(?!\s+time)|healing)\b/i,
    reason: "Patient health outcomes cannot be guaranteed.",
    fix: "Describe operational outcomes only — response speed, booking capture, staff hours.",
  },
  {
    category: "legal_outcome",
    pattern:
      /\b(wins?|winning|lose less|more settlements?|better outcomes? in court|case results?)\b/i,
    reason: "Legal case outcomes cannot be guaranteed.",
    fix: "Describe intake and routing outcomes only — qualified leads routed faster.",
  },
  {
    category: "compliance_claim",
    pattern: /\b(hipaa[- ]compliant|hipaa[- ]certified|attorney[- ]client privileged|baa[- ]compliant|fully compliant|soc 2 compliant)\b/i,
    reason:
      "Compliance cannot be implied without signed BAAs and verified architecture. Use 'HIPAA-ready' " +
      "or 'built for compliance', never 'HIPAA-compliant'.",
    fix: "Use 'HIPAA-ready' and state the architecture: 'patient data stays inside your approved systems'.",
  },
  {
    category: "guaranteed_roi",
    pattern: /\b(roi of|returns? \d+x|x roi|doubling|10x|triple|guaranteed roi)\b/i,
    reason: "Revenue claims that depend on the client's market and sales process cannot be guaranteed.",
    fix: "Model the opportunity as an estimate with stated assumptions, never a promise.",
  },
  {
    category: "medical_advice",
    pattern:
      /\b(diagnos|prescrib|treat patients?|medical advice|clinical recommendation|patient care plan)\w*/i,
    reason: "This is an operational tool, not a clinical one. Advice framing implies clinical scope.",
    fix: "Frame as operational workflow — intake, scheduling, follow-up, routing.",
  },
];

/** Generic AI language. Allowed by default, but discouraged — flagged as review. */
const WEAK_PATTERNS: { category: string; pattern: RegExp; reason: string; fix: string }[] = [
  {
    category: "generic_ai_language",
    pattern: /\b(save time with ai|ai automation|automate your (business|workflow) with ai|ai-powered solutions?|leverage ai|cutting[- ]edge ai)\b/i,
    reason:
      "The playbook says do not lead with generic AI positioning. Leads are not shopping for " +
      "automation; they are shopping for the outcome automation produces.",
    fix: "Lead with the business outcome, then the mechanism: 'capture more booked appointments…'",
  },
  {
    category: "passive_voice",
    pattern: /\b(leverage|utilize|harness|unlock|empower)\b/i,
    reason: "Consultant abstractions. Buyers respond to concrete outcomes and time frames.",
    fix: "Replace with a concrete verb: 'capture', 'respond', 'install', 'book'.",
  },
];

/** Language that satisfies the playbook's rules. */
const POSITIVE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bso (you|your team|your staff)\b/i, label: "outcome tied to the buyer" },
  { pattern: /\bin \d+[- ]day|\bin \d+ weeks?\b/i, label: "explicit time frame" },
  { pattern: /\b(capture|respond|book|booked|appointments?|routing|speed up)\b/i, label: "growth-tied verb" },
  { pattern: /\bwithout\b/i, label: "risk addressed" },
  { pattern: /\b(approved systems|your own systems|stays inside|without sending)\b/i, label: "data-boundary architecture" },
];

/**
 * Rewrite a claim by removing blocked phrases and replacing them with
 * compliant alternatives. This is a mechanical transform — it does not try to
 * invent new copy. Review the output before using it.
 */
export function rewriteClaim(claim: string): string {
  let out = claim;

  out = out.replace(/\bguarantee[ds]?\b/gi, "designed to");
  out = out.replace(/\bguarantees\b/gi, "is designed to");
  out = out.replace(/\bwill ensure\b/gi, "is built to");
  out = out.replace(/\bpromises?\b/gi, "is structured to");
  out = out.replace(/\bHIPAA[- ]compliant\b/gi, "HIPAA-ready");
  out = out.replace(/\bHIPAA[- ]certified\b/gi, "HIPAA-ready");
  out = out.replace(/\bfully compliant\b/gi, "built for compliance");
  out = out.replace(/\bSOC ?2 compliant\b/gi, "built for compliance");
  out = out.replace(/\bsave time with AI\b/gi, "capture more booked opportunities");
  out = out.replace(/\bAI automation\b/gi, "AI front desk");
  out = out.replace(/\bAI-powered solutions?\b/gi, "compliance-first local AI systems");
  out = out.replace(/\bleverage\b/gi, "use");
  out = out.replace(/\butilize\b/gi, "use");
  out = out.replace(/\bharness\b/gi, "deploy");
  out = out.replace(/\bunlock\b/gi, "open up");
  out = out.replace(/\bempower\b/gi, "give");

  // Tidy the spaces left behind by removals.
  out = out.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
  return out;
}

export function scanClaim(claim: string): ClaimScanResult {
  const violations: ClaimViolation[] = [];

  for (const rule of BLOCKED_PATTERNS) {
    const match = claim.match(rule.pattern);
    if (match) {
      violations.push({
        level: "blocked",
        category: rule.category,
        matched: match[0],
        reason: rule.reason,
        fix: rule.fix,
      });
    }
  }

  for (const rule of WEAK_PATTERNS) {
    const match = claim.match(rule.pattern);
    if (match) {
      violations.push({
        level: "review",
        category: rule.category,
        matched: match[0],
        reason: rule.reason,
        fix: rule.fix,
      });
    }
  }

  const positives = POSITIVE_PATTERNS.filter((p) => p.pattern.test(claim)).map((p) => p.label);

  return {
    ok: !violations.some((v) => v.level === "blocked"),
    violations,
    positives,
    rewritten: rewriteClaim(claim),
  };
}

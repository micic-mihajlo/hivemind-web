/**
 * Growth leak scoring engine — HiveMind Intelligence
 *
 * Pure functions, no I/O, no persistence. Fully unit-testable.
 *
 * Grounded in:
 *   vault/projects/hivemind/sales/playbooks/paid-ads-growth-offer-playbook.md
 *   vault/projects/hivemind/sales/quick-reference.md
 *
 * The model answers one question: where is this business losing booked
 * opportunities, and what is that costing them per month?
 *
 * Deliberate constraint: we model OPPORTUNITY, never promise revenue. The
 * playbook is explicit that HiveMind must not guarantee outcomes that depend
 * on the client's market, staff, or sales process. Every number produced here
 * carries its assumptions and a ceiling.
 */

export const SCALE_MAX = 100;

export type LeakKey =
  | "response_speed"
  | "capture"
  | "follow_up"
  | "staff_overload"
  | "data_exposure"
  | "offer_clarity";

export type LeakBand = "critical" | "weak" | "developing" | "strong";

export interface AuditInput {
  /** Monthly inbound inquiries of any kind (calls, forms, DMs, referrals). */
  monthlyInquiries: number;
  /** 0-1. Share of inquiries that currently become a booked appointment. */
  currentBookingRate: number;
  /** Average dollar value of one booked customer. */
  avgValuePerCustomer: number;
  /** 0-10. How fast a new inquiry gets a human response. */
  responseSpeed: number;
  /** 0-10. How reliably stale leads and no-shows get followed up. */
  followUp: number;
  /** 0-10. How consistent the offer reads as a specific growth outcome. */
  offerClarity: number;
  /** 0-10. How much repetitive intake work the front desk absorbs. */
  staffOverload: number;
  /** 0-10. How well protected sensitive client/patient data is today. */
  dataProtection: number;
  /** Who handles follow-up today. */
  followUpOwner: "owner" | "staff" | "outsourced" | "nobody";
  /** True if sensitive data currently flows into generic cloud AI tools. */
  sensitiveDataInGenericAI: boolean;
  /** True if the site uses lead-capture forms. */
  usesLeadForms: boolean;
  /** True if there is a documented before/after case study. */
  hasCaseStudy: boolean;
  /** Primary vertical, drives which recommendations lead. */
  vertical: "medical" | "legal" | "fitness" | "real_estate" | "agency" | "other";
}

export interface LeakScore {
  key: LeakKey;
  label: string;
  /** 0-100. Higher is better. */
  score: number;
  band: LeakBand;
  /** What this leak is, in one sentence. */
  description: string;
}

export interface LeakRecommendation {
  leak: LeakKey;
  title: string;
  detail: string;
  /** Concrete action for the next 7 days. */
  action: string;
  priority: 1 | 2 | 3;
}

export interface CostOfDelay {
  /** Inquiries per month that currently do not become a booked customer. */
  leakingInquiriesPerMonth: number;
  /** Conservative modeled monthly opportunity if capture improved. */
  modeledMonthlyOpportunity: number;
  /** Staff hours per week recoverable through intake automation. */
  recoverableStaffHoursPerWeek: number;
  /**
   * How much of the modeled opportunity we are willing to claim.
   * We never claim the full modeled number — the playbook forbids guaranteeing
   * outcomes that depend on the client's market or sales process.
   */
  conservativeMonthlyOpportunity: number;
  /** Explicit assumptions, surfaced so the prospect can correct them. */
  assumptions: string[];
  /** Mandatory caveat text. Never omit. */
  caveat: string;
  /** 0-1. How much we trust this estimate given the inputs supplied. */
  confidence: number;
}

export interface AuditResult {
  overall: number;
  leaks: LeakScore[];
  /** The single leak doing the most limiting work. */
  primaryLeak: LeakScore;
  recommendations: LeakRecommendation[];
  costOfDelay: CostOfDelay;
  /** Compliance-safe offer language tailored to the vertical. */
  offerLanguage: { headline: string; subheadline: string; cta: string };
  disclaimer: string;
}

export const DISCLAIMER =
  "This is a diagnostic estimate, not a promise of revenue. The modeled opportunity depends " +
  "on your market, your staff, and your sales process. HiveMind does not guarantee business " +
  "outcomes.";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number) => Math.round(n * 10) / 10;

export function band(score: number): LeakBand {
  if (score < 35) return "critical";
  if (score < 55) return "weak";
  if (score < 75) return "developing";
  return "strong";
}

/* ------------------------------------------------------------------ scoring */

function scoreResponseSpeed(i: AuditInput): number {
  let s = i.responseSpeed * 8;
  // Under 10 inquiries a month, response speed is not the binding constraint.
  if (i.monthlyInquiries < 10) s += 10;
  if (i.followUpOwner === "nobody") s -= 8;
  return clamp(Math.round(s), 0, 100);
}

function scoreCapture(i: AuditInput): number {
  let s = 60;
  // Every inquiry that does not become a customer is leaking capture.
  s += Math.round((1 - i.currentBookingRate) * 30);
  if (i.responseSpeed <= 4) s -= 10;
  if (i.usesLeadForms) s -= 8;
  if (i.followUpOwner === "nobody") s -= 12;
  return clamp(s, 0, 100);
}

function scoreFollowUp(i: AuditInput): number {
  let s = i.followUp * 9;
  if (i.followUpOwner === "nobody") s = Math.min(s, 20);
  if (i.followUpOwner === "owner") s -= 10;
  return clamp(Math.round(s), 0, 100);
}

function scoreStaffOverload(i: AuditInput): number {
  let s = 100 - i.staffOverload * 9;
  if (i.monthlyInquiries >= 50) s -= 10;
  if (i.followUpOwner === "nobody") s -= 8;
  return clamp(s, 0, 100);
}

function scoreDataExposure(i: AuditInput): number {
  let s = i.dataProtection * 9;
  if (i.sensitiveDataInGenericAI) s = Math.min(s, 25);
  return clamp(Math.round(s), 0, 100);
}

function scoreOfferClarity(i: AuditInput): number {
  let s = i.offerClarity * 9;
  // The playbook is explicit: ads before a real proof point is a mistake.
  if (!i.hasCaseStudy) s -= 12;
  if (i.offerClarity <= 3) s -= 5;
  return clamp(Math.round(s), 0, 100);
}

export const LEAK_DEFS: Record<
  LeakKey,
  { label: string; description: string; score: (i: AuditInput) => number }
> = {
  response_speed: {
    label: "Response Speed",
    description: "How quickly a new inquiry reaches a human before they call someone else.",
    score: scoreResponseSpeed,
  },
  capture: {
    label: "Capture & Conversion",
    description: "The share of inbound interest that actually becomes a booked customer.",
    score: scoreCapture,
  },
  follow_up: {
    label: "Follow-Up Discipline",
    description: "Whether stale leads, no-shows, and past inquiries get worked.",
    score: scoreFollowUp,
  },
  staff_overload: {
    label: "Staff Overload",
    description: "How much repetitive intake work is stealing hours from the team.",
    score: scoreStaffOverload,
  },
  data_exposure: {
    label: "Data Exposure",
    description: "How well protected sensitive client and patient data is today.",
    score: scoreDataExposure,
  },
  offer_clarity: {
    label: "Offer Clarity",
    description: "Whether the offer reads as a specific growth outcome or generic AI language.",
    score: scoreOfferClarity,
  },
};

/* ---------------------------------------------------------- cost of delay */

export function computeCostOfDelay(i: AuditInput): CostOfDelay {
  const leaking = Math.max(0, i.monthlyInquiries * (1 - i.currentBookingRate));

  // We model a conservative capture improvement, never to 100%.
  const plausibleTarget = Math.min(0.85, i.currentBookingRate + 0.25);
  const deltaBookings = Math.max(0, i.monthlyInquiries * (plausibleTarget - i.currentBookingRate));
  const modeled = deltaBookings * i.avgValuePerCustomer;

  // What we are willing to put in writing: a third of modeled opportunity,
  // because capture improvement depends on their market and sales process.
  const conservative = Math.round(modeled * 0.33);

  const recoverableHours = Math.round(
    Math.min(40, i.staffOverload * 1.5 + (i.monthlyInquiries >= 50 ? 8 : 0))
  );

  const assumptions: string[] = [];
  assumptions.push(`${i.monthlyInquiries} inbound inquiries per month`);
  assumptions.push(`${Math.round(i.currentBookingRate * 100)}% currently become a booked customer`);
  assumptions.push(`$${i.avgValuePerCustomer} average value per booked customer`);
  assumptions.push(
    `Modeled on a conservative capture improvement to ${Math.round(plausibleTarget * 100)}%, not to 100%`
  );
  if (i.followUpOwner === "nobody") {
    assumptions.push("No one currently owns follow-up, so the leak is assumed to be near-total");
  }
  if (i.sensitiveDataInGenericAI) {
    assumptions.push(
      "Sensitive data currently in generic cloud AI, which caps how fast intake can be automated"
    );
  }

  // Confidence drops when the core volume inputs are missing or tiny.
  let confidence = 0.8;
  if (i.monthlyInquiries <= 0) confidence = 0.2;
  else if (i.monthlyInquiries < 10) confidence = 0.4;
  if (i.avgValuePerCustomer <= 0) confidence = Math.min(confidence, 0.3);
  if (i.currentBookingRate <= 0 || i.currentBookingRate >= 1) {
    confidence = Math.min(confidence, 0.5);
  }

  return {
    leakingInquiriesPerMonth: Math.round(leaking),
    modeledMonthlyOpportunity: Math.round(modeled),
    recoverableStaffHoursPerWeek: recoverableHours,
    conservativeMonthlyOpportunity: conservative,
    assumptions,
    caveat: DISCLAIMER,
    confidence: round(confidence),
  };
}

/* --------------------------------------------------------- recommendations */

function recommendationsFor(leaks: LeakScore[], i: AuditInput): LeakRecommendation[] {
  const out: LeakRecommendation[] = [];
  const byKey = new Map(leaks.map((l) => [l.key, l]));

  if ((byKey.get("data_exposure")?.score ?? 100) < 40) {
    out.push({
      leak: "data_exposure",
      title: "Get sensitive data out of generic cloud tools",
      detail:
        "Sensitive client or patient information is flowing into tools that were never vetted for it. " +
        "This is a compliance liability before it is an efficiency problem, and it also caps how much " +
        "intake you can safely automate.",
      action:
        "Write down every place sensitive data enters a third-party AI tool this week. That list is " +
        "your migration order.",
      priority: 1,
    });
  }

  if ((byKey.get("capture")?.score ?? 100) < 50) {
    out.push({
      leak: "capture",
      title: "Instrument the gap between inquiries and bookings",
      detail:
        `You are taking roughly ${Math.round(i.monthlyInquiries * (1 - i.currentBookingRate))} inquiries ` +
        "a month and booking far fewer. Without a named reason for each drop, every fix is a guess.",
      action:
        "Start a one-line log today: date, channel, and outcome for every inquiry. Review ten entries " +
        "at the end of the week and name the top drop-off reason.",
      priority: 1,
    });
  }

  if ((byKey.get("follow_up")?.score ?? 100) < 45) {
    out.push({
      leak: "follow_up",
      title: "Give follow-up an owner and a cadence",
      detail:
        i.followUpOwner === "nobody"
          ? "Nobody owns follow-up. Unowned pipeline is not pipeline — it is a list of people who " +
            "called once and never heard back."
          : "Follow-up is inconsistent. The leads that convert are usually the ones somebody personally " +
            "remembered to call back.",
      action:
        "Name one owner and one recurring slot this week — a 30-minute block, twice a week, to work " +
        "every lead older than 48 hours.",
      priority: 1,
    });
  }

  if ((byKey.get("response_speed")?.score ?? 100) < 45 && i.monthlyInquiries >= 10) {
    out.push({
      leak: "response_speed",
      title: "Answer every inquiry fast, even if the answer is 'we will call you'",
      detail:
        "Speed wins the inquiry before quality does. A fast acknowledgment beats a perfect response " +
        "that arrives tomorrow, because the prospect has already called the next business.",
      action:
        "Set an auto-acknowledge within 5 minutes on every channel you receive inquiries on. It needs " +
        "no human to fire.",
      priority: 2,
    });
  }

  if ((byKey.get("staff_overload")?.score ?? 100) < 45) {
    out.push({
      leak: "staff_overload",
      title: "Remove intake questions that nobody needs",
      detail:
        "The team is absorbing repetitive intake work. Every question asked up front is a question a " +
        "human typed, and every one of them is a candidate for pre-qualification or automation.",
      action:
        "List every question your team asks on a new inquiry. Cross out the ones that only matter once " +
        "the person is already a customer.",
      priority: 2,
    });
  }

  if ((byKey.get("offer_clarity")?.score ?? 100) < 50) {
    out.push({
      leak: "offer_clarity",
      title: "Rewrite the offer around a business outcome, not AI",
      detail:
        "Leads are not shopping for automation — they are shopping for the thing automation is " +
        "supposed to produce. 'AI automation' and 'save time with AI' both lose to a specific outcome.",
      action:
        "Rewrite your headline as the outcome plus the mechanism, then the time frame. Swap every " +
        "instance of 'AI' for the business result it produces.",
      priority: 2,
    });
  }

  if (!i.hasCaseStudy) {
    out.push({
      leak: "offer_clarity",
      title: "Get one documented before/after before spending on ads",
      detail:
        "The playbook is explicit that paid ads come after the proof point, not before. Spending on " +
        "traffic without a case study buys conversations you cannot close.",
      action:
        "Pick your single strongest client result and write it up as a before/after with numbers. " +
        "One page is enough.",
      priority: 3,
    });
  }

  if (i.usesLeadForms) {
    out.push({
      leak: "capture",
      title: "Replace low-commitment lead forms with a direct call to action",
      detail:
        "Lead forms without a strong appointment-setting process produce low-quality leads. A DM " +
        "keyword or a booked call filters better than a form ever will.",
      action:
        "Swap the lead form for a direct action — 'DM AUDIT and we will show you the workflow' — on " +
        "your two highest-traffic pages.",
      priority: 3,
    });
  }

  return out.sort((a, b) => a.priority - b.priority).slice(0, 4);
}

/* ---------------------------------------------------------- offer language */

const VERTICAL_COPY: Record<
  AuditInput["vertical"],
  { outcome: string; mechanism: string; risk: string }
> = {
  medical: {
    outcome: "capture more booked appointments and stop losing inquiries to slow replies",
    mechanism: "a HIPAA-ready local AI front desk",
    risk: "without sending patient data into generic cloud tools",
  },
  legal: {
    outcome: "speed up qualified intake routing and stop losing consultations to slow replies",
    mechanism: "a local AI intake assistant",
    risk: "while privileged client information stays inside your approved systems",
  },
  fitness: {
    outcome: "fill your calendar and stop losing inbound leads to slow replies",
    mechanism: "an AI front desk that works while you train",
    risk: "without your client data sitting in random tools",
  },
  real_estate: {
    outcome: "respond to every lead in minutes instead of losing them to the next agent",
    mechanism: "a local AI intake assistant",
    risk: "while keeping client data inside your own systems",
  },
  agency: {
    outcome: "respond to inbound leads faster and stop dropping qualified opportunities",
    mechanism: "a compliance-first local AI front desk",
    risk: "without sending client data into random cloud tools",
  },
  other: {
    outcome: "capture more inbound opportunities and stop losing them to slow responses",
    mechanism: "a compliance-first local AI front desk",
    risk: "without sending client data into random cloud tools",
  },
};

export function buildOfferLanguage(
  vertical: AuditInput["vertical"],
  timeFrame = "30 days"
): { headline: string; subheadline: string; cta: string } {
  const c = VERTICAL_COPY[vertical];
  return {
    headline: `${cap(c.mechanism)} installed in ${timeFrame}, so you ${c.outcome}`,
    subheadline: `We install ${c.mechanism} for your team in ${timeFrame} so you ${c.outcome}, ${c.risk}.`,
    cta: 'DM "AUDIT" and we will show you the workflow.',
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ----------------------------------------------------------------- assess */

export function audit(i: AuditInput): AuditResult {
  const leaks: LeakScore[] = (Object.keys(LEAK_DEFS) as LeakKey[]).map((key) => {
    const def = LEAK_DEFS[key];
    const score = clamp(Math.round(def.score(i)), 0, 100);
    return {
      key,
      label: def.label,
      score,
      band: band(score),
      description: def.description,
    };
  });

  // The leak doing the most limiting work is the lowest-scoring one.
  const primaryLeak = leaks.reduce((worst, l) => (l.score < worst.score ? l : worst));

  const overall = round(leaks.reduce((sum, l) => sum + l.score, 0) / leaks.length);

  return {
    overall,
    leaks: leaks.sort((a, b) => a.score - b.score),
    primaryLeak,
    recommendations: recommendationsFor(leaks, i),
    costOfDelay: computeCostOfDelay(i),
    offerLanguage: buildOfferLanguage(i.vertical),
    disclaimer: DISCLAIMER,
  };
}

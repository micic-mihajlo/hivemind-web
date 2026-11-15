/**
 * The Blank Spreadsheet Close — mechanical implementation.
 *
 * This is the close from vault/projects/hivemind/sales/quick-reference.md.
 * The playbook describes it as "the primary close for discovery calls," and it
 * works because the prospect writes down their own priorities and their own
 * numbers, then sells themselves.
 *
 * The critical behavior, from the playbook's "What NOT to Do":
 *   - Don't pitch features before they tell you what they want
 *   - Don't fill in the spreadsheet yourself — let them drive
 *   - Don't skip the "$" column — numbers make it real
 *   - Don't rush — let silence work
 *
 * So this module does NOT generate a pitch. It generates the SPREADSHEET
 * STRUCTURE and the QUESTION SEQUENCE. The prospect supplies the content.
 * That is the entire point, and inverting it would break the close.
 */

export interface SpreadsheetRow {
  /** Feature or capability, in the prospect's own words. */
  feature: string;
  /** 1-10 importance as stated by the prospect. */
  priority: number;
  /** Monthly value the prospect stated. Null means not yet quantified. */
  wouldPay: number | null;
  /** Derived from priority and value. */
  tier: "anchor" | "core" | "secondary" | "unquantified";
  /** Verbatim phrasing the prospect used. */
  verbatim?: string;
}

export interface SpreadsheetState {
  columns: ["Feature", "Priority", "Would Pay"];
  rows: SpreadsheetRow[];
  /** Running total of stated monthly value. */
  totalWouldPay: number;
  /** How many rows are still unquantified. */
  unquantifiedCount: number;
  /** True once the sheet is complete enough to close. */
  readyToClose: boolean;
  /** What is still missing before a close attempt. */
  missingBeforeClose: string[];
  /** The close script, only once readyToClose is true. */
  closeScript?: string;
}

export interface ProspectSignal {
  /** The prospect filled in the spreadsheet themselves. */
  filledSpreadsheet: boolean;
  /** The prospect named a specific dollar amount. */
  namedAmount: boolean;
  /** The prospect has budget authority. */
  hasBudgetAuthority: boolean;
  /** Decision timeline under two weeks. */
  timelineUnderTwoWeeks: boolean;
  /** The pain is urgent, not "nice to have." */
  painIsUrgent: boolean;
  /** Came in through a warm introduction. */
  warmIntro: boolean;
}

export interface ProspectScore {
  score: number;
  band: "strong_close" | "nurture" | "move_on";
  signals: ProspectSignal;
  positives: string[];
  gaps: string[];
  nextAction: string;
}

/** Question sequence that produces the sheet. Ordered by the playbook's flow. */
export const CLOSE_QUESTIONS = [
  "What would this need to do for you to get value from it?",
  "If we could solve that, where would it rank in terms of importance?",
  "And if we solved that plus [other thing], what would it be worth to you monthly?",
] as const;

export const OPENING_SCRIPT =
  "I want to make sure we build something you'll actually pay for. Let me share my screen — I have " +
  "a blank sheet. As we talk, I want you to tell me what matters most. What would this need to do?";

export function tierFor(row: Omit<SpreadsheetRow, "tier">): SpreadsheetRow["tier"] {
  if (row.wouldPay === null) return "unquantified";
  if (row.priority >= 9 && row.wouldPay >= 1000) return "anchor";
  if (row.priority >= 7) return "core";
  return "secondary";
}

/**
 * Build the spreadsheet state from prospect-supplied rows.
 *
 * The `feature` values must be prospect language. The tool does not invent
 * features — it only organizes what was actually said.
 */
export function buildSpreadsheet(
  entries: { feature: string; priority: number; wouldPay?: number | null; verbatim?: string }[],
  hasAuthority = false
): SpreadsheetState {
  const rows: SpreadsheetRow[] = entries
    .filter((e) => e.feature.trim().length > 0)
    .map((e) => {
      const base = {
        feature: e.feature.trim(),
        priority: Math.min(10, Math.max(1, Math.round(e.priority))),
        wouldPay:
          e.wouldPay === undefined || e.wouldPay === null ? null : Math.max(0, Math.round(e.wouldPay)),
        verbatim: e.verbatim,
      };
      return { ...base, tier: tierFor(base) };
    });

  const totalWouldPay = rows.reduce((sum, r) => sum + (r.wouldPay ?? 0), 0);
  const unquantifiedCount = rows.filter((r) => r.wouldPay === null).length;

  const missing: string[] = [];
  if (rows.length === 0) missing.push("No features captured yet — ask what it needs to do");
  if (unquantifiedCount > 0) {
    missing.push(
      `${unquantifiedCount} row${unquantifiedCount === 1 ? " is" : "s are"} not quantified — ` +
        "ask what each is worth monthly"
    );
  }
  if (!hasAuthority && rows.length > 0) {
    missing.push("Budget authority unconfirmed — ask who signs off");
  }

  // Ready to close when there is real money on the sheet and nothing is unquantified.
  const readyToClose = rows.length >= 2 && totalWouldPay > 0 && unquantifiedCount === 0;

  const state: SpreadsheetState = {
    columns: ["Feature", "Priority", "Would Pay"],
    rows,
    totalWouldPay,
    unquantifiedCount,
    readyToClose,
    missingBeforeClose: missing,
  };

  if (readyToClose) {
    const anchor = rows.find((r) => r.tier === "anchor") ?? rows.find((r) => r.tier === "core");
    const list = rows.map((r) => r.feature).join(", ");
    state.closeScript = [
      anchor
        ? `Based on what you've said, it looks like you're valuing ${anchor.feature} at about ` +
          `$${anchor.wouldPay?.toLocaleString()}/month. Does that feel right? Because we could get ` +
          `started at that level.`
        : `Based on what you've said, it looks like you're valuing ${list} at about ` +
          `$${totalWouldPay.toLocaleString()}/month. Does that feel right?`,
      "",
      "Then: " +
        (anchor
          ? `confirm which piece matters most, and scope a fixed-price audit around ${anchor.feature}.`
          : "confirm which piece matters most, and scope a fixed-price audit around it."),
    ].join("\n");
  }

  return state;
}

/**
 * Score the prospect using the playbook's Quick Prospect Score table.
 *
 * Signals: filled spreadsheet +5, named $ amount +5, budget authority +3,
 * decision timeline <2 weeks +3, urgent pain +2, warm intro +2.
 * 15+ strong close, 8-14 nurture, below 8 move on.
 */
export function scoreProspect(signals: ProspectSignal): ProspectScore {
  const positives: string[] = [];
  const gaps: string[] = [];
  let score = 0;

  const add = (present: boolean, points: number, label: string) => {
    if (present) {
      score += points;
      positives.push(`${label} (+${points})`);
    } else {
      gaps.push(label);
    }
  };

  add(signals.filledSpreadsheet, 5, "Filled out the spreadsheet");
  add(signals.namedAmount, 5, "Named a specific dollar amount");
  add(signals.hasBudgetAuthority, 3, "Has budget authority");
  add(signals.timelineUnderTwoWeeks, 3, "Decision timeline under 2 weeks");
  add(signals.painIsUrgent, 2, "Pain is urgent");
  add(signals.warmIntro, 2, "Warm intro");

  const band = score >= 15 ? "strong_close" : score >= 8 ? "nurture" : "move_on";
  const nextAction =
    band === "strong_close"
      ? "Propose a fixed-scope audit with a booked close. Bring the blank spreadsheet to the call."
      : band === "nurture"
        ? "Send the case study and set a specific follow-up date. Do not push a close."
        : "Move on. Send nothing that sounds like a pitch.";

  return { score, band, signals, positives, gaps, nextAction };
}

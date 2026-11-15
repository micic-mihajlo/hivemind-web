/**
 * Privacy layer — Growth Audit plugin.
 *
 * Design rule, from the OpenAI plugin guidelines:
 *   "Gather only the minimum data required to perform the plugin's function."
 *
 * Differences from the health plugin, and why:
 *
 *   1. Audit inputs are TRANSIENT. The prospect's inquiry volume, booking rate,
 *      and value per customer describe their BUSINESS. They are used to compute
 *      an estimate and are never written to disk. A prospect's revenue figures
 *      are commercially sensitive, so the stricter of the two postures wins.
 *
 *   2. Only the derived audit score and the leak breakdown are persistable, and
 *      only with consent.
 *
 *   3. There is no PHI in this vertical at all — but a medical or legal prospect
 *      may still paste patient/client identifiers into a free-text note. The
 *      restricted-data guard applies to notes for exactly that reason.
 *
 *   4. This plugin CANNOT take payment. Digital services are prohibited in
 *      plugins, so the $1,500 audit is booked off-platform. The plugin records
 *      intent and qualification only.
 */

export const RETENTION_DAYS = 180;

export const RESTRICTED_FIELD_NAMES = [
  "ssn",
  "social_security",
  "social_security_number",
  "medication",
  "medications",
  "diagnosis",
  "diagnoses",
  "condition",
  "medical_record",
  "diagnosis_code",
  "icd10",
  "insurance_id",
  "policy_number",
  "patient_id",
  "patient_name",
  "mrn",
  "client_matter_number",
  "case_number",
  "card_number",
  "cvv",
  "api_key",
  "password",
  "otp",
  "mfa_code",
  "bank_account",
  "routing_number",
];

/**
 * Fail-closed guard. If any input key looks like restricted data, we refuse
 * the call rather than storing or processing it.
 */
export function assertNoRestrictedData(input: unknown, path = "input"): void {
  if (input === null || typeof input !== "object") return;

  if (Array.isArray(input)) {
    input.forEach((v, i) => assertNoRestrictedData(v, `${path}[${i}]`));
    return;
  }

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[\s-]/g, "_");
    if (RESTRICTED_FIELD_NAMES.includes(normalized)) {
      throw new Error(
        `Rejected: field "${path}.${key}" is a restricted data category and must not be ` +
          `collected, transmitted, or stored by this plugin. Remove it and continue.`
      );
    }
    assertNoRestrictedData(value, `${path}.${key}`);
  }
}

export interface ConsentRecord {
  grantedAt: string;
  purpose: string;
  /** Whether derived audit scores may be retained. */
  analytics: boolean;
  /** Whether a strategy-call request may be stored. */
  contact: boolean;
}

export const CONSENT_PURPOSE =
  "Store my derived growth audit scores so you can show me progress on the funnel, and store " +
  "my contact details only if I explicitly ask to be contacted about a strategy call.";

export function isConsentValid(consent: ConsentRecord | undefined | null): boolean {
  if (!consent) return false;
  const ageDays = (Date.now() - new Date(consent.grantedAt).getTime()) / 86_400_000;
  if (Number.isNaN(ageDays) || ageDays > RETENTION_DAYS) return false;
  if (!consent.analytics && !consent.contact) return false;
  return true;
}

export interface AuditRecord {
  userId: string;
  createdAt: string;
  vertical: string;
  overall: number;
  primaryLeak: string;
  leaks: { key: string; score: number; band: string }[];
  /** Only the conservative estimate is retained, never the raw inputs. */
  conservativeMonthlyOpportunity: number;
}

export interface RequestRecord {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  company: string;
  vertical: string;
  /** What they said they need it to do, in their words. */
  need: string;
  /** Free text. Must be scanned before storage. */
  note?: string;
  /** Prospect score band from the close model. */
  qualification?: string;
  status: "new" | "contacted" | "booked" | "closed";
}

/**
 * Free-text notes are where identifiers sneak in, so they are scanned. We
 * redact rather than reject here: the note is optional and the request is
 * still worth making, so dropping the whole request would be over-strict.
 */
export function noteContainsRestrictedData(note: string): boolean {
  const s = note.toLowerCase();
  const patterns: RegExp[] = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{13,19}\b/, // long card-like number
    /\b(social security|ssn)\b/,
    /\b(diagnos|prescri|medication|prescription)\w*/,
    /\b(insurance|policy|matter|case)\s*(#|number|id)\b/,
    /\b(patient|mrn|medical record)\s*(#|number|id)\b/,
    // MRN / patient identifiers written as a label followed by digits.
    /\b(mrn|medical record|patient id|patient number)\s*[:#]?\s*\w+\b/i,
    // Bare MRN label followed by digits, e.g. "MRN 44512".
    /\bmrn\s*[:#]?\s*\d{3,}\b/i,
    /\bapi[_ -]?key\b/,
    /\bpassword\b/,
  ];
  return patterns.some((p) => p.test(s));
}

export function redactNote(note: string): string {
  if (!noteContainsRestrictedData(note)) return note;
  return "[redacted: note contained data that this plugin is not permitted to store]";
}

export function purgeExpired<T extends { createdAt: string }>(records: T[], now = Date.now()): T[] {
  const cutoff = now - RETENTION_DAYS * 86_400_000;
  return records.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });
}

export const PRIVACY_SUMMARY = {
  retentionDays: RETENTION_DAYS,
  auditInputsStored: false,
  contactStoredOnlyWithConsent: true,
  restrictedDataCollected: false,
  paymentsProcessed: false,
  thirdPartySharing: "none",
} as const;

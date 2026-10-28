# Privacy Policy — Growth Audit

**Effective:** October 21, 2026
**Applies to:** The Growth Audit plugin for ChatGPT and Codex, operated by HiveMind
Intelligence ("we", "us", "HiveMind").

This plugin is a business diagnostic tool. It is not a financial advisor, a medical
provider, or a legal adviser.

---

## 1. Summary

| Question | Answer |
|---|---|
| What do you collect? | Business inputs, briefly — and **never store them**. Derived scores, optionally. Contact details, only on request. |
| What do you store? | Derived funnel scores and a conservative estimate (with consent). Name, email, company, and what they said they need (only for call requests). |
| Do you collect client/patient data? | **No.** Identifiers, medical records, and matter numbers are actively rejected by the system. |
| Do you take payments? | **No.** Payment for services happens off-platform, under a separate agreement. |
| Do you share data with third parties? | **No.** No exceptions, no selling, no ad-tech, no analytics vendors. |
| How long is data kept? | Maximum **180 days**, then automatically deleted. |
| How do I delete my data? | Ask the assistant to stop tracking, or contact us. Deletion is immediate. |

---

## 2. What we collect, and what we do with it

### 2.1 Business inputs — processed, never stored

When you run an audit, the plugin receives: your industry, monthly inbound inquiry volume,
what share of inquiries become a customer, your average value per booked customer, and
self-ratings for response speed, follow-up discipline, offer clarity, staff overload, and
data protection, plus a few yes/no facts about your current setup.

These are **held in memory for the duration of the request only**. They are used to compute
scores and a modeled estimate. They are **not written to disk, not logged, and not
transmitted to us.**

This matters more than it might seem. Inquiry volume, conversion rate, and revenue per
customer describe your business in detail. We deliberately treat them as transient.

### 2.2 Derived funnel scores — stored only with your consent

The system may store the *derived* results: your overall score, the six leak scores and
their bands, your primary leak, and the conservative opportunity estimate.

This happens only after you explicitly agree via the privacy consent step, and you can
withdraw that consent at any time. Withdrawing stops future storage and deletes what has
been collected.

### 2.3 Contact details — stored only when you request a strategy call

If you explicitly ask to be contacted about a strategy call, we store:

- Your name
- Your email address
- Your company or practice name
- Your industry
- What you told us the system needs to do
- Any optional note you write

We use these for exactly one purpose: to reply about a strategy call and scope an audit.

### 2.4 What we never collect

The plugin's server **actively rejects** requests containing any of the following, and
returns an error rather than storing them:

- Patient or client identifiers, medical record numbers (MRN), medical records, ICD codes
- Medications, prescriptions, diagnoses
- Legal matter numbers, case numbers
- Payment card details, bank account and routing numbers
- Government identifiers (including Social Security numbers)
- API keys, passwords, MFA codes, or other authentication secrets

Free-text notes are scanned for identifiers before storage and redacted if they contain
them. We also do not engage in surveillance, behavioral profiling, or tracking of your
query patterns beyond what is necessary to operate the plugin.

---

## 3. How we use your data

- Derived scores: to show you your own progress over time, and to let a strategist review
  trends **only if you have separately requested a strategy call**.
- Contact details: to reply to your request.

We do not use your data for advertising, profiling, model training, or marketing.

---

## 4. Sharing

**We do not share your personal data with third parties.** No data brokers, no ad networks,
no analytics vendors, no third-party model training. Data is not sold.

Data is hosted on infrastructure operated by us. Our infrastructure providers process data
strictly on our instructions as subprocessors and are not permitted to use it for their own
purposes.

---

## 5. Payments

**This plugin does not process payments and cannot sell services.** Any engagement with
HiveMind — including the AI Practice Audit — is contracted and paid for separately, off
this platform, under a written scope. Nothing in the plugin is a purchase, a quote, or a
commitment to a price.

---

## 6. Retention

- Business inputs: not retained.
- Derived scores: retained only with consent, maximum 180 days, then automatically purged.
- Contact details: maximum 180 days, then automatically purged.

Retention is enforced in code: expired records are purged on every read and write, not on a
schedule that could be delayed.

---

## 7. Your rights

You can, at any time:

- Ask what is stored about you
- Change or withdraw consent
- Request deletion of all stored data

Deletion requests are honoured immediately and cover derived scores and contact details.
There is no data to delete for business inputs, because they are never stored.

To exercise any of these rights, ask the assistant in the plugin, or contact us at
**privacy@hivemindintelligence.com**.

---

## 8. Children

This plugin is not directed at children under 13 and is not intended for use by them.

---

## 9. Health and legal information

This plugin provides business diagnostics for acquisition funnels. It does not provide
medical advice, legal advice, diagnosis, or treatment, and it is not a substitute for a
licensed professional or a financial advisor. Outputs are estimates and models with stated
assumptions, not guarantees, and they depend on the user's own market, staff, and sales
process.

---

## 10. Security

Data is transmitted over TLS. The MCP server validates all input against a strict schema
and rejects restricted data categories at the boundary.

Your identity is resolved at the server edge, and the identity of the caller is
pseudonymous: the credential used to establish it is hashed, never stored raw. Where a
caller cannot be identified, the server refuses the request rather than treating it as
belonging to a shared or default account. Stored scores and any contact details are
therefore partitioned per caller, so one user's audit history is never visible to
another.

Where the platform provides an authenticated session, that authenticated identity is used.
Where the platform does not, the server relies on the caller's own signed-in account on
the platform side. The plugin does not accept a raw, unverified credential from the
request as a substitute for that.

We will not launch the plugin until authorization at the server edge is enforced by our
own token endpoint. We are stating this plainly rather than claiming a control we have
not yet switched on.

---

## 11. Changes

Material changes to this policy will be published here with an updated effective date.
Continuing to use the plugin after a change means you accept the updated policy.

---

## 12. Contact

**HiveMind Intelligence**
Miami, Florida, United States
privacy@hivemindintelligence.com

# Competitor scan — 2026-11-25

Scope: public product/marketing pages and 2026 comparison roundups. Not a live trial of each product, and pricing/feature claims change.

## Iranian rivals (record-keeping focus)

| Rival | What they emphasise | Gap Pishbin can hold |
|---|---|---|
| Chortke | Online accounting, sales/purchase invoices, cheque control, multi-branch | Answers "what was recorded"; does not show the effect on next-30-day cash |
| Chalak Hesab | Invoicing, cheque registry, instalments, taxpayer-system integration | Strong compliance; no forward liquidity decision view |
| Hesabfa | Cloud accounting, no install | Broad ledger; no receivables decision workflow |
| Pooya System | Modular Windows/Android accounting: inventory, POS, instalments | Desktop/ERP depth; not a cash-decision cockpit |
| Noora CashFlow | Cash-flow forecasting positioning (closest conceptual rival) | Needs deeper review; Pishbin differentiates with in-app invoice/cheque data rather than integration-first |

## International rivals (forecasting focus)

| Rival | What they emphasise | Gap |
|---|---|---|
| Float | 13-week to 3-year forecasting layered on Xero/QBO, limited scenarios | Requires an existing cloud ledger; no Persian/RTL or Iranian cheque model |
| Cash Flow Frog | Driver-based forecasting across many ledgers | Integration-heavy, English-first |
| Agicap | Treasury visibility, bank connections, invoice-to-cash timing | Enterprise pricing, complex bank sync |
| Chaser | Collections-based forecasting, late-payment prediction, chasing | Collections-centric; assumes accounting integration |
| Fathom | Multi-entity reporting and forecasting | Advisor-facing, not owner-first |

Common thread in 2026 roundups: buyers pick on **integration fit** and **how late payment affects the forecast** more than on chart variety. Iranian tools are strong on compliance/recording and thin on forward-looking decisions; international tools are strong on forecasting and weak on Iranian cheque/rial reality.

## Five features adopted

Chosen for being computable from data Pishbin already stores, with no invented numbers:

1. **13-week rolling view** — weekly inflow/outflow/closing balance from recorded due dates (Float's horizon, Chaser's focus on payment timing).
2. **Payment reliability per customer** — on-time rate, observed average delay, bounced-cheque count, and explicit "unknown" when there is no history (replaces risk scores).
3. **Explainable collection priority** — every ranked invoice shows its reasons (days late, amount, customer delay history, bounced cheques, missing phone).
4. **Obligation coverage** — arithmetic ratio of outstanding issued cheques to available cash, banded ample/balanced/strained/unknown.
5. **Receivables aging buckets** (current → 90+) plus a personalised follow-up message draft.

Deliberately **not** added: AI-generated risk scores, confidence percentages, predicted payment dates presented as certainties, and automatic sending of reminders.

## Sources

- https://www.chortke.app/guidelines/invoices-and-transactions/
- https://chalakhesab.ir/accounting-software-for-check-registration
- https://chalakhesab.ir/blog/which-accounting-software-is-better
- https://pooyasystem.com/en
- https://cashflowpick.com/best-cash-flow-forecasting-software/
- https://www.chaserhq.com/blog/best-cash-flow-forecasting-software
- https://cashflowfrog.com/blog/best-cash-flow-forecasting-software/
- https://www.prophix.com/blog/best-cash-flow-forecasting-software

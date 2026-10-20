# Pishbin: product review and five-feature decision desk

Review date: 2026-10-20. Scope: source inspection, public competitor pages, frontend type checking and deterministic unit tests; not a production API audit or customer research.

## What the app should represent

Pishbin should help an Iranian small-business owner answer: **Can I meet my commitments, what can I afford, and whom should I follow up with today?** It should complement accounting software rather than compete on ledger breadth. The best initial customer hypothesis is an owner-managed service or trading business with credit sales, checks and several bank accounts. Validate this hypothesis with interviews; no market-size or demand claim is established here.

The current product mixes personal budgets/goals, startup ARR/MRR/runway, and SME checks/invoices. The new decision desk provides a coherent SME entry point without silently replacing those existing tools. Its positioning is explainable next actions, not autonomous AI finance or guaranteed prediction.

## Iranian competitors

| Product | Publicly documented capabilities | Consequence for Pishbin |
| --- | --- | --- |
| Sepidar | Receipt/payment operations, issued/received checks, due-date alerts, bank reconciliation and bank-balance prediction | Forecasting alone is not differentiation. Emphasize transparent assumptions and a short path from shortage to action. |
| Hesabfa | Cloud accounting, invoices, bank/check management, multi-currency, inventory, online payments and integrations | Do not attempt to rebuild its accounting breadth. Focus on daily owner decisions and eventually reliable imports. |
| Fardad | Cloud-accounting positioning appeared in search, but version-specific capability verification was insufficient | Treat as a follow-up research candidate, not a verified feature comparison. |

These are official-page observations, not hands-on competitive tests; a feature omitted from a homepage may still exist. Prices and relative usability were not verified.

Sources:
- https://www.sepidarsystem.com/products/sepidar/receipt-and-payment-system/
- https://www.sepidarsystem.com/products/sepidar/
- https://www.hesabfa.com

## Five implemented capabilities

All five live at `/decisions`, reachable from the navbar and dashboard. Shared Persian RTL UI uses semantic cards, badges and buttons, responsive tool navigation, clear loading/error/empty states, and refresh timestamps.

| Priority | Capability | User flow | Business value | Suggested validation metric |
| --- | --- | --- | --- | --- |
| 1 | Conservative cash calendar | Choose 7/30/90 days → inspect first shortage → open contributing check → export CSV | Earlier visibility into known commitments | Time to identify first shortage |
| 2 | Purchase/expense simulation | Enter purchase/date/daily expense → optionally assume receipts → compare minimum and closing balance → reset | Avoid decisions based on headline bank balance alone | Completed scenario comparisons per active owner |
| 3 | Collections work queue | Filter aging/search customer → inspect oldest debt → copy and review reminder → open invoice | Make daily collections prioritization concrete | Overdue invoices reviewed and subsequently settled |
| 4 | Customer payment behavior | Compare outstanding/overdue balances and actual settlement delays → open customer | Identify relationships needing attention without invented credit scores | Customer reviews leading to documented follow-up |
| 5 | Data-readiness checklist | Inspect missing cash accounts, currency incompatibility, old checks, contacts and overdue invoices → open corrective workflow | Show why a result may be unreliable | First usable plan and resolved checklist items |

Reminder copying does not send messages. Customer behavior is not Sayad inquiry or formal credit scoring. Simulations do not modify records or move money. Metrics above are recommendations, not instrumented or measured results.

## Endpoint and workflow review

The new desk consumes existing authenticated GET endpoints under `/api/v1`: `/accounts`, `/checks`, `/invoices`, `/customers`. No backend endpoint, migration or financial mutation was introduced.

| Existing flow | Endpoint family | Source-review finding |
| --- | --- | --- |
| Account setup | `/businesses`, `/accounts` | Backend account creation requires `business_id`; current frontend account form omits it. Onboarding remains a release blocker to resolve with an explicit business selection. |
| Receivable lifecycle | `/customers`, `/invoices`, `/customers/{id}/score` | Marking paid updates invoice state/date, not the bank balance or ledger. Do not describe it as a reconciled cash receipt. |
| Check lifecycle | `/checks`, `/checks/cash-flow-forecast` | Changing check state does not itself create a ledger transaction or adjust balances. |
| Forecasting | `/dashboard/cash-flow-forecast`, `/alerts/cash-flow` | Existing backend forecast combines account balances, invoice/check events and historical trends; mixed currencies and duplicate receipt representation need reconciliation before stronger reliability claims. |
| Bank reconciliation | `/reconciliation/bank-statement` | Read-only CSV matching, not autonomous bank synchronization. |
| Bank messages | `/banking-messages` | Parsing/import is separate from reviewed transaction creation. |
| Payments | `/payments` | ZarinPal request/callback/history and income recording are distinct from collections reminder preparation. |
| Authentication | `/auth` | ProtectedRoute loading guard and refresh-token handling need a dedicated integration-tested fix; the new desk reports authentication failure explicitly. |
| Other modules | `/transactions`, `/budgets`, `/goals`, `/recurring`, `/reports`, `/backup` | Existing operational features remain; they are not all included in this planning baseline. |

## Planning contract and boundaries

- Uses active checking/savings/other cash accounts; investment, loan and credit-card balances are not spendable cash.
- Only IRT accounts are supported; missing or unsupported pending-check accounts block cash calculations. Invoices currently have no currency, so تومان is an explicit assumption.
- The account endpoint defaults to 100 records. This version fails closed at 100 or more returned accounts rather than pretending the list is complete. Paginated, stable snapshot loading remains follow-up work.
- Baseline subtracts pending issued checks, including overdue obligations once on day zero. It does not automatically include invoice receipts, incoming checks, payroll, recurring expenses or unrecorded liabilities. It is a known-commitment plan, not a full cash forecast.
- Receipt percentage and delay are assumptions chosen by the user, not predicted probabilities. Invoice/check overlap may double-count receipts; keep receipt percentage at zero until overlap is resolved.
- No mock data replaces failed requests. Invalid amount/status/calendar data is rejected.
- All four lists are user-scoped, not business-filtered or transactionally snapshotted. Concurrent financial changes can require refresh.
- Arithmetic uses JavaScript numbers; do not treat this as a ledger-grade monetary engine.
- Existing detail anchors are provided; asynchronous anchor scrolling and visual behavior have not been browser-tested.

## Release priorities and business model hypothesis

Before a production pilot: repair account/business onboarding, auth refresh/route guarding, currency consistency, settlement-to-ledger linkage and stable complete data loading. Test these against the actual backend. These issues are documented, not represented as fixed by the new interface.

Then interview 5–10 owners using their existing reconciliation process: can they locate a real shortage, explain its cause and select an action without assistance? Compare this with their current accounting report, not merely a polished screenshot.

A subscription for a daily decision workspace is a hypothesis worth testing after reliable data ingestion. Do not price or promise automated credit, banking integrations or tax compliance until those capabilities exist. The strongest retention test is repeated weekly decision use, not dashboard page views.

## Validation performed

Twenty calculation/validation tests, whole-frontend TypeScript checking, focused ESLint and whitespace checks. Repaired a pre-existing invoice JSX error and case-conflicting Button wrapper imports. No production build, browser/visual test, deployment, live payment test or authenticated API integration test was performed.

Image briefs are in `docs/decision-desk-image-prompts.md`; the interface works without generated assets.

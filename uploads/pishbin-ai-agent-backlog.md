# Pishbin — AI Agent UI/UX Backlog

This document contains a ready-to-use backlog for improving **Pishbin** with a modern, glassy UI/UX style.

> **Product context:** Pishbin (“پیش‌بین”) is described as an intelligent financial decision-making assistant for Iranian small and medium businesses. It brings invoices, checks, and customer payment behavior together, and shows how today’s decisions may affect the next 30 days. This backlog focuses on making cash-flow visibility, receivables, checks, customer risk, and decision support clear, trustworthy, and actionable. Before implementation, an AI agent must audit the actual frontend stack, routes, components, data model, permissions, and backend capabilities.

## How to use

1. Copy each section into a separate GitHub Issue, or let an AI coding agent read this file directly.
2. Implement issues in the recommended order.
3. Keep each pull request small and focused.
4. Preserve existing financial calculations, APIs, permissions, data privacy, and audit trails.
5. Never present forecasts, risk scores, or AI recommendations as guaranteed financial advice.

## Recommended implementation order

1. Create a reusable glass UI design system
2. Redesign app shell and navigation
3. Define accessible glass surface recipes
4. Add a financial health dashboard
5. Improve 30-day cash-flow forecast
6. Improve invoices and receivables management
7. Improve checks and payment commitments
8. Add customer payment-behavior profiles
9. Improve decision simulations and recommendations
10. Upgrade transactions, invoices, and checks tables
11. Improve notifications, reminders, and follow-ups
12. Make forms, settings, and errors actionable
13. Improve Persian typography and RTL consistency
14. Add polished light and dark themes
15. Add restrained motion and interaction feedback
16. Meet WCAG AA across primary flows
17. Optimize frontend performance
18. Add security, privacy, audit, and quality gates

## Global rules for AI agents

- Preserve existing functionality, APIs, financial calculations, permissions, and audit trails.
- Prefer the project’s existing frontend framework, styling system, and component conventions.
- Use design tokens instead of hard-coded colors, spacing, radii, shadows, and blur values.
- Support both Persian/RTL and English/LTR where applicable.
- Maintain WCAG AA contrast and keyboard accessibility.
- Add loading, empty, error, offline, and permission-denied states to new UI.
- Avoid excessive backdrop blur; glassmorphism must not harm readability or performance.
- Clearly distinguish AI-generated forecasts, insights, and recommendations from verified accounting data.
- Use appropriate currency, calendar, date, and number localization for Iranian users.
- Mask or restrict sensitive financial and customer data according to permissions.
- Include screenshots or short recordings in pull requests when UI changes are visible.

---

## 1. Create a reusable glass UI design system

**Labels:** `design-system`, `ui/ux`, `glassmorphism`, `frontend`

### Goal

Establish a trustworthy, premium visual language for a financial decision-support product.

### Scope

- Add design tokens for:
  - Color
  - Surface and background
  - Blur
  - Border
  - Shadow
  - Radius
  - Spacing
  - Typography
  - Motion
  - Z-index
  - Financial status colors
- Create reusable components:
  - `GlassCard`
  - `GlassPanel`
  - `GlassButton`
  - `GlassIconButton`
  - `GlassInput`
  - `GlassSelect`
  - `GlassDatePicker`
  - `GlassTable`
  - `GlassTabs`
  - `GlassModal`
  - `GlassDrawer`
  - `GlassPopover`
  - `GlassToast`
  - `GlassTooltip`
  - `GlassSidebar`
  - `GlassTopBar`
  - `KpiCard`
  - `TrendIndicator`
  - `RiskBadge`
  - `StatusBadge`
  - `ConfidenceIndicator`
  - `CashFlowChart`
- Support light and dark themes.
- Support RTL/Persian text.

### Acceptance criteria

- [ ] Tokens are defined in a central theme/configuration file.
- [ ] Components use tokens rather than hard-coded styles.
- [ ] Interactive components include hover, focus-visible, active, disabled, loading, and error states.
- [ ] Financial status, risk, confidence, and trend states are visually consistent.
- [ ] Components work in RTL and LTR layouts.
- [ ] Existing screens do not regress.

### AI-agent prompt

```text
Audit Pishbin’s frontend stack, routing structure, component library, and styling approach. Create a token-based glass design system for a financial decision-support product. Include accessible financial status, risk, confidence, and trend states. Prefer CSS variables or the project’s existing theme mechanism.
```

---

## 2. Redesign app shell and navigation

**Labels:** `ui/ux`, `frontend`, `glassmorphism`

### Goal

Make Pishbin feel like a focused, modern financial cockpit for small-business owners.

### Requirements

- Responsive application shell.
- Fixed glass sidebar on desktop.
- Collapsible drawer/sidebar on mobile.
- Sticky glass top bar.
- Global search for customers, invoices, checks, and transactions where supported.
- Notifications for due checks, overdue invoices, and important cash-flow changes.
- User/profile menu.
- Business/workspace switcher where supported.
- Environment indicator, such as production, staging, or sandbox.
- Theme toggle.
- Clear active-route indication.
- Quick links to cash flow, receivables, checks, customers, and reports.

### Acceptance criteria

- [ ] Sidebar collapses on smaller viewports.
- [ ] Top bar remains usable while scrolling.
- [ ] Active navigation item is visually and programmatically indicated.
- [ ] All navigation is reachable by keyboard.
- [ ] Environment is clearly identifiable to reduce operational mistakes.
- [ ] Layout works correctly in RTL.
- [ ] No business logic is changed.

### AI-agent prompt

```text
Refactor Pishbin’s app layout into a responsive financial cockpit with a glass sidebar, sticky top bar, and content area. Preserve existing routes and data behavior. Include a clear environment indicator and ensure navigation works with keyboard, screen readers, and RTL.
```

---

## 3. Define accessible glass surface recipes

**Labels:** `ui/ux`, `glassmorphism`, `accessibility`

### Goal

Avoid unreadable text, inconsistent blur, and inaccessible contrast.

### Surface variants

| Variant | Use case |
|---|---|
| `subtle` | Page background layers, quiet containers |
| `medium` | KPI cards, panels, filters, forms |
| `elevated` | Modals, drawers, forecast scenarios, approvals, toasts, popovers |

### Requirements

- Use restrained blur and semi-transparent fills.
- Add a subtle 1px light border for definition.
- Guarantee WCAG AA contrast for text, icons, currency values, and interactive controls.
- Provide fallbacks when `backdrop-filter` is unavailable.
- Respect `prefers-reduced-motion`.
- Do not reduce readability of invoices, checks, charts, or financial tables.

### Acceptance criteria

- [ ] `GlassSurface` component exists with `subtle`, `medium`, and `elevated` variants.
- [ ] Contrast passes WCAG AA in light and dark themes.
- [ ] A no-backdrop-filter fallback is implemented.
- [ ] Focus states are visible on glass surfaces.
- [ ] Financial data and dense tables remain readable.

### AI-agent prompt

```text
Create a GlassSurface primitive with subtle, medium, and elevated variants. Include hover, focus-visible, disabled, loading, and error states. Add reduced-motion and no-backdrop-filter fallbacks.
```

---

## 4. Add a financial health dashboard

**Labels:** `feature`, `ui/ux`, `frontend`

### Goal

Give business owners an immediate view of liquidity, receivables, checks, and customer risk.

### Dashboard content

- KPI cards:
  - Available cash or projected cash position, where available
  - Incoming payments
  - Upcoming check obligations
  - Overdue invoices
  - Outstanding receivables
  - At-risk customers
  - Net cash-flow trend
- Charts:
  - Cash inflow and outflow over time
  - Receivables aging
  - Check calendar or maturity schedule
  - Customer payment-performance distribution
  - Forecast versus actuals where available
- Filters:
  - Date range
  - Customer
  - Invoice status
  - Check status
  - Payment method
  - Business entity or workspace, where supported

### Acceptance criteria

- [ ] KPI cards are clickable and navigate to filtered views.
- [ ] Charts have accessible labels, legends, and tooltips.
- [ ] Filters update the dashboard without a full-page reload where practical.
- [ ] Loading skeletons are shown during data fetches.
- [ ] Empty, error, and no-permission states are implemented.
- [ ] Financial values use correct currency and localization.
- [ ] Sensitive financial metrics are visible only to authorized roles.

### AI-agent prompt

```text
Add a financial health dashboard to Pishbin using existing data sources and metrics. If an endpoint does not exist, create clearly typed mock services marked with TODOs. Use glass KPI cards, charts, filters, and accessible empty/loading/error states.
```

---

## 5. Improve 30-day cash-flow forecast

**Labels:** `feature`, `ux`, `ai`, `frontend`

### Goal

Make the next 30 days understandable, adjustable, and actionable.

### Requirements

- Daily or weekly cash-flow timeline showing projected inflows, outflows, and net position.
- Clearly distinguish confirmed, expected, uncertain, and user-adjusted amounts.
- Show the impact of individual invoices, checks, and customer payment assumptions where supported.
- Allow scenario adjustments only where the backend supports them, such as changing expected payment dates or amounts.
- Clearly label AI-generated forecasts and assumptions.
- Show confidence, data limitations, and last-updated time where available.
- Provide a comparison between forecast and actual results where historical data exists.
- Prevent misleading certainty or guarantees.

### Acceptance criteria

- [ ] Users can understand projected liquidity over the next 30 days.
- [ ] Forecast assumptions and uncertainty are visible.
- [ ] Users can inspect the drivers behind a forecast.
- [ ] AI-generated insights are distinguishable from verified data.
- [ ] Loading, empty, error, and unauthorized states are implemented.
- [ ] Existing forecast calculations and data are preserved.

### AI-agent prompt

```text
Improve Pishbin’s 30-day cash-flow forecast UX. Use existing forecast data and calculations. Create a clear timeline, driver inspection, scenario controls only where supported, and honest AI/uncertainty labeling.
```

---

## 6. Improve invoices and receivables management

**Labels:** `feature`, `ux`, `frontend`

### Goal

Make outstanding invoices and customer receivables easy to track and act on.

### Requirements

- Invoice list with customer, amount, issue date, due date, status, and aging.
- Receivables aging buckets, such as current, 1–30, 31–60, 61–90, and 90+ days, where supported.
- Invoice detail with line items, payments, attachments, customer context, and history.
- Clear statuses for draft, sent, partially paid, paid, overdue, disputed, and cancelled where supported.
- Record-payment, send-reminder, and follow-up actions according to permissions.
- Preserve an audit trail for payment and status changes.
- Prevent ambiguous invoice state changes.

### Acceptance criteria

- [ ] Users can identify overdue and at-risk receivables quickly.
- [ ] Invoice status and payment history are clear.
- [ ] Users can navigate from an invoice to its customer and related checks.
- [ ] Actions are permission-aware and confirmed where appropriate.
- [ ] Loading, empty, error, and unauthorized states are implemented.
- [ ] Existing invoice and accounting behavior is preserved.

### AI-agent prompt

```text
Improve Pishbin’s invoice and receivables management UX. Create clear invoice lists, aging views, invoice details, payment context, and permission-aware follow-up actions. Preserve all accounting and audit behavior.
```

---

## 7. Improve checks and payment commitments

**Labels:** `feature`, `ux`, `frontend`

### Goal

Make incoming and outgoing checks easy to monitor and plan around.

### Requirements

- Check calendar or maturity schedule showing incoming and outgoing checks by date.
- Check list with amount, counterparty, due date, status, bank details where appropriate, and linked invoice or deal.
- Clear statuses for pending, deposited, cleared, bounced, cancelled, and replaced where supported.
- Show upcoming liquidity pressure and conflicts between inflows and outflows.
- Allow users to inspect the cash-flow impact of a check where supported.
- Prevent accidental status changes through confirmation and permission checks.
- Preserve an audit trail for check actions.

### Acceptance criteria

- [ ] Users can see upcoming check obligations and collections.
- [ ] Check status and counterparty context are clear.
- [ ] Cash-flow impact is understandable.
- [ ] Actions are permission-aware and confirmed where appropriate.
- [ ] Loading, empty, error, and unauthorized states are implemented.
- [ ] Existing check and accounting behavior is preserved.

### AI-agent prompt

```text
Improve Pishbin’s check and payment-commitment management UX. Create a check calendar, status-aware check list, and cash-flow context using existing data. Preserve all financial calculations, permissions, and audit behavior.
```

---

## 8. Add customer payment-behavior profiles

**Labels:** `feature`, `ux`, `ai`, `frontend`

### Goal

Help users understand customer reliability and tailor follow-up actions.

### Requirements

- Customer profile with outstanding balance, invoices, checks, payment history, and related notes.
- Payment-behavior indicators such as average delay, on-time rate, overdue amount, and risk level where data supports them.
- Clear explanation of what drives a risk indicator.
- Timeline of invoices, payments, checks, reminders, and important events.
- Quick actions to contact, remind, create an invoice, or record a payment according to permissions.
- Clearly distinguish observed history from AI-generated risk assessments.
- Mask sensitive customer information according to role and privacy policy.

### Acceptance criteria

- [ ] Users can understand a customer’s payment reliability.
- [ ] Risk indicators include context and are not presented as guarantees.
- [ ] Related invoices, checks, and communications are easy to access.
- [ ] Sensitive customer data is protected by permissions.
- [ ] Empty, loading, error, and unauthorized states are implemented.

### AI-agent prompt

```text
Improve Pishbin’s customer payment-behavior profile UX. Use existing customer, invoice, check, and payment data. Clearly separate observed history from AI-generated risk assessments and protect sensitive information.
```

---

## 9. Improve decision simulations and recommendations

**Labels:** `feature`, `ux`, `ai`, `frontend`

### Goal

Help users evaluate the cash-flow impact of a decision before acting.

### Requirements

- Decision or scenario view showing baseline forecast versus adjusted scenario.
- Allow users to adjust supported inputs, such as expected payment date, amount, new expense, or planned purchase.
- Show before-and-after cash position, liquidity gap, and affected obligations where calculations support it.
- Explain assumptions, data sources, and limitations.
- Clearly label AI recommendations as decision support, not financial advice.
- Require explicit confirmation before saving or applying a scenario where applicable.
- Preserve an audit trail for scenario creation and application where supported.

### Acceptance criteria

- [ ] Users can compare a baseline and adjusted scenario.
- [ ] Scenario assumptions and limitations are clear.
- [ ] Users can see which invoices, checks, or customers drive the result.
- [ ] AI recommendations are distinguishable from verified calculations.
- [ ] Existing calculation logic and permissions are preserved.

### AI-agent prompt

```text
Improve Pishbin’s decision-simulation and recommendation UX. Use existing forecast and scenario capabilities only. Show baseline versus adjusted outcomes, explain assumptions, and clearly label AI recommendations as decision support.
```

---

## 10. Upgrade transactions, invoices, and checks tables

**Labels:** `ui/ux`, `performance`, `frontend`

### Goal

Make large volumes of financial records fast to review and manage.

### Requirements

- Sticky headers.
- Column sorting.
- Advanced filtering by date, customer, status, amount range, invoice, check, and payment method.
- Saved views or operational queues where supported.
- Pagination or virtualization for large datasets.
- CSV or Excel export only when authorized and safe.
- Numeric alignment and localized currency, number, and date formatting.
- Bulk actions with confirmation and permission checks.
- Loading skeletons.
- Mobile-friendly behavior through responsive columns or a detail drawer.

### Acceptance criteria

- [ ] A reusable data-table component exists.
- [ ] Large datasets remain responsive.
- [ ] Filters and exports do not block the UI.
- [ ] Bulk actions are permission-aware and confirmed.
- [ ] Persian and English currency, number, and date formats are handled correctly.
- [ ] Empty and error states are implemented.

### AI-agent prompt

```text
Audit Pishbin’s transaction, invoice, and check tables. Implement a reusable high-performance data table with filtering, sorting, bulk actions, and export only where the backend and permissions support them.
```

---

## 11. Improve notifications, reminders, and follow-ups

**Labels:** `feature`, `ux`, `frontend`

### Goal

Help users act before cash-flow problems become urgent.

### Requirements

- Notification center for due checks, overdue invoices, low projected cash, and important customer changes.
- Notification grouping by customer, due date, severity, and type.
- Clear navigation from a notification to the relevant invoice, check, customer, or forecast.
- Reminder scheduling and follow-up status where supported.
- Quiet hours, mute, and preference controls where supported.
- Accessible notification announcements for important events.

### Acceptance criteria

- [ ] Users can see and manage important financial alerts.
- [ ] Notification source and context are clear.
- [ ] Users can navigate from a notification to its relevant record.
- [ ] Notification preferences are understandable.
- [ ] Notifications do not interrupt critical financial review workflows.

### AI-agent prompt

```text
Improve Pishbin’s notification, reminder, and follow-up UX using existing backend capabilities. Add a notification center, clear unread states, contextual navigation, and accessible announcements. Do not add realtime features unless the project already has the required infrastructure.
```

---

## 12. Make forms, settings, and errors actionable

**Labels:** `ux`, `frontend`, `accessibility`

### Goal

Help users manage business settings, customers, invoices, checks, and preferences confidently.

### Requirements

- Inline field-level validation.
- Summary of validation failures at the top of long forms.
- Links from summary items to the relevant fields.
- Distinct handling for validation errors, permission errors, payment errors, network errors, and system failures.
- Preserve user input after an error.
- Clear save, saving, saved, unsaved-changes, and discard states.
- Group related settings and use progressive disclosure for advanced options.
- Require confirmation for high-impact financial or configuration changes.

### Acceptance criteria

- [ ] A shared error-message catalog exists.
- [ ] Error messages are specific and actionable.
- [ ] Users can recover from failed submissions without losing input.
- [ ] High-impact changes are confirmed.
- [ ] Errors are announced accessibly.
- [ ] Persian and English messages are available.

### AI-agent prompt

```text
Standardize Pishbin’s form, settings, and API error handling. Create a shared error-message catalog and ensure validation, permission, network, and system failures are visible, specific, and recoverable.
```

---

## 13. Improve Persian typography and RTL consistency

**Labels:** `i18n`, `ui/ux`, `accessibility`

### Goal

Make the Persian-first financial experience feel native and polished.

### Requirements

- Use a high-quality Persian font with sensible fallbacks.
- Set correct `dir`, alignment, punctuation, numerals, and mixed Persian/English handling.
- Use appropriate Persian calendar, currency, and number formatting where applicable.
- Test dashboards, forecasts, invoices, checks, tables, forms, modals, and toasts in RTL.
- Avoid mirroring direction-sensitive icons.
- Prevent clipping or overflow with longer Persian labels.
- Handle customer names, bank names, emails, URLs, and technical values correctly in bidirectional text.

### Acceptance criteria

- [ ] All primary screens render correctly in RTL.
- [ ] Mixed Persian/English content is readable.
- [ ] Icons with directional meaning are not incorrectly mirrored.
- [ ] No major text overflow or clipping.
- [ ] Typography hierarchy is consistent.

### AI-agent prompt

```text
Audit every Pishbin screen for RTL and Persian typography issues. Fix layout mirroring, icon direction, currency and number formatting, calendar handling, bidirectional text, and overflow. Add visual regression checks if the project has a testing setup.
```

---

## 14. Add polished light and dark themes

**Labels:** `ui/ux`, `glassmorphism`, `frontend`

### Goal

Provide a premium dark experience without losing financial readability.

### Requirements

- Theme toggle persisted in user preferences.
- Default to the operating-system preference.
- Use tokens rather than hard-coded colors.
- Tune glass opacity, blur, borders, and shadows separately per theme.
- Ensure charts, tables, badges, forecasts, and status indicators remain legible.

### Acceptance criteria

- [ ] Users can switch between light and dark themes.
- [ ] Theme preference persists across sessions.
- [ ] All major screens are verified in both themes.
- [ ] Hard-coded colors are replaced with tokens.
- [ ] Glass surfaces remain readable in dark mode.

### AI-agent prompt

```text
Implement theme tokens and a persisted light/dark toggle for Pishbin. Refactor hard-coded colors into tokens. Verify dashboards, forecasts, invoices, checks, and settings in both themes.
```

---

## 15. Add restrained motion and interaction feedback

**Labels:** `ui/ux`, `glassmorphism`, `accessibility`

### Goal

Make the interface feel responsive without distracting users from financial decisions.

### Requirements

- Subtle transitions for page changes, drawers, modals, toasts, popovers, and hover states.
- UI feedback animations should generally be 200–300ms or less.
- Loading skeletons.
- Success and error toasts.
- Optimistic updates only for safe actions, with rollback on failure.
- Respect `prefers-reduced-motion`.

### Acceptance criteria

- [ ] Motion tokens are centralized.
- [ ] Interactive components have consistent transitions.
- [ ] Reduced-motion users receive a non-animated equivalent.
- [ ] Animations do not delay comprehension of cash-flow or risk information.
- [ ] No excessive or decorative animation is added.

### AI-agent prompt

```text
Add a motion token set and apply consistent transitions to Pishbin’s interactive components. Ensure reduced-motion users get a non-animated equivalent.
```

---

## 16. Meet WCAG AA across primary flows

**Labels:** `accessibility`, `ui/ux`

### Goal

Ensure the redesigned financial cockpit is usable by everyone.

### Requirements

- Visible focus rings on all interactive elements.
- Keyboard-only operation for navigation, tables, filters, forms, modals, drawers, and forecast scenarios.
- Semantic HTML, landmarks, labels, and ARIA only where necessary.
- WCAG AA contrast, including text over glass surfaces and charts.
- Screen-reader testing for dashboard, forecast, invoices, checks, and customer profiles.
- Do not rely on color alone to communicate risk, status, or cash-flow direction.

### Acceptance criteria

- [ ] All interactive controls are keyboard accessible.
- [ ] Focus is visible and logically managed.
- [ ] Modals, drawers, and popovers manage focus appropriately.
- [ ] Financial status and risk are conveyed with text or icons as well as color.
- [ ] Primary flows pass WCAG AA checks.

### AI-agent prompt

```text
Run an accessibility review of Pishbin’s primary pages and flows. Fix issues without changing backend behavior. Prioritize keyboard navigation, focus management, contrast, semantic structure, and non-color-dependent financial status indicators.
```

---

## 17. Optimize frontend performance

**Labels:** `performance`, `frontend`

### Goal

Keep the glass UI fast for data-heavy financial dashboards and tables.

### Requirements

- Avoid excessive nested backdrop filters and large blur radii.
- Lazy-load routes, charts, forecast scenarios, and heavy components.
- Virtualize long transaction, invoice, or check lists only where justified.
- Memoize expensive chart and table calculations where appropriate.
- Add skeleton loaders and avoid layout shift.
- Measure Core Web Vitals before and after changes.

### Acceptance criteria

- [ ] Heavy routes and components are code-split or lazy-loaded where appropriate.
- [ ] Glass effects do not cause severe scroll or interaction jank.
- [ ] Large financial tables remain responsive.
- [ ] Charts do not block initial page interaction.
- [ ] Layout shift is minimized.
- [ ] Before/after performance metrics are documented.
- [ ] No functional regressions are introduced.

### AI-agent prompt

```text
Profile Pishbin’s heaviest pages and interaction flows. Identify render, bundle, chart, table, and blur-performance bottlenecks, then optimize without changing functionality. Document before/after metrics in the pull request.
```

---

## 18. Add security, privacy, audit, and quality gates

**Labels:** `security`, `privacy`, `testing`, `ui/ux`, `frontend`

### Goal

Ensure the redesigned product remains secure, private, auditable, and maintainable.

### Requirements

- Verify role-based access for every new screen, action, export, and sensitive financial field.
- Mask or redact bank details, customer identifiers, credentials, and personal information where appropriate.
- Ensure invoice, check, payment, forecast, and settings changes remain auditable.
- Prevent AI features from making payments, changing financial records, or sending communications without explicit approval.
- Add or improve linting, type checking, formatting, and test checks.
- Add unit tests for reusable UI components where a test setup exists.
- Add visual regression coverage for light/dark and RTL/LTR states where practical.
- Test primary flows: dashboard, forecast, invoices, checks, customer profiles, and settings.
- Document how contributors run checks locally.

### Acceptance criteria

- [ ] New UI respects existing authentication and authorization rules.
- [ ] Sensitive financial data is not exposed in DOM, logs, exports, or client state.
- [ ] Consequential actions are auditable.
- [ ] AI features cannot bypass human approval or audit controls.
- [ ] Contributors can run quality checks with a documented command where practical.
- [ ] Core reusable components have tests or documented manual test steps.
- [ ] Visual checks cover RTL and dark mode where tooling exists.
- [ ] CI fails on meaningful security, UI, type, lint, or accessibility regressions.

### AI-agent prompt

```text
Audit Pishbin’s security, privacy, authorization, audit, test, and CI setup. Ensure the glass UI redesign does not expose sensitive financial data or allow AI features to bypass human approval. Add pragmatic quality gates without over-engineering the project.
```

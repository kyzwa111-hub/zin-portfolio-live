# ZHTE HR Toolkit — Phase 2 Audit

Date: 2 October 2026

## Scope audited

- Public service section and information architecture
- Video / explainer section
- Protected workspace access gate
- Payroll calculator and bulk payroll tools
- C&B resource center and HR sector forms
- Pricing and value messaging
- Telegram approval, contact, and payment flow
- Existing deployment declarations for a permanent website

## Current journey

1. Homepage hero sends users to `#services` or public events.
2. Service section opens with a large Telegram unlock message.
3. Explainer video appears before the user sees the exact access value, service choices, or pricing context.
4. Workspace access asks for a name and starts a Telegram approval request.
5. A requester-only panel can show KBZPay instructions and a request ID after the request succeeds.
6. Payroll, C&B, and HR sector tools remain unavailable until admin approval; bulk payroll has a second locked state tied to the shared approval.
7. Existing public tools include the scenario lab, events, Zeke assistant, and toolkit cards.

## Findings

### What is working

- The product has real utility: payroll estimates, bulk exports, official-source C&B references, HR templates, scenario practice, events, and Zeke assistance.
- Sensitive payroll functionality is gated and salary rows are designed to remain local in the browser.
- The Telegram approval flow has a concrete request ID and a requester-only payment instruction panel.
- Legal pages and a payroll disclaimer exist.
- The existing repository already includes Render, Vercel, and Cloudflare deployment declarations.

### Conversion friction

- The first service CTA is generic (`Request access`) and does not explain who the workspace is for, what is included, or what the next step costs.
- The video is placed before a compact value summary, so users must watch before understanding the offer.
- Public resources, protected payroll, team support, and official compliance references are mixed in one long scroll.
- The current pricing cards are broad labels (`Explore`, `Protect`, `Scale`) without a compact comparison of access, outputs, and intended user.
- The access form and payment instruction are technically clear but feel like an operational handoff rather than a premium conversion moment.
- Service cards are present in the React tree but a legacy CSS rule hides the whole `.service-cards` group and the status labels.
- There is no single “best next step” recommendation for a first-time visitor.

### UX / mobile / accessibility opportunities

- Reduce the service section's vertical footprint with a concise value rail and a three-choice conversion grid.
- Keep the video optional and secondary on mobile; the CTA and value summary should appear before it.
- Make the selected workspace and locked state visually explicit without hiding the choices.
- Preserve existing gates, calculations, forms, local-only processing, and Telegram approval behavior.
- Improve focus order, button labels, section landmarks, and bilingual microcopy around the conversion moments.

### Permanent hosting finding

- `render.yaml` is configured for a Node service and requires runtime secrets/database values.
- `vercel.json` declares a static build plus API rewrites.
- `wrangler.jsonc` declares a Cloudflare Worker with static assets, D1, AI, scheduled work, and an existing worker name.
- The current canonical URL and prior live media references point at the Cloudflare Worker/Pages setup, so the lowest-risk permanent path is to keep the existing Cloudflare deployment architecture rather than introduce a new paid service or domain purchase.
- Production publication should happen only after the redesign is previewed and the user confirms the final public release target; no domain purchase, paid service, or LinkedIn API/OAuth request is required.

## Redesign direction

### Positioning

**ZHTE HR Toolkit is a practical operating layer for Myanmar HR teams: understand the issue, prepare the work, and move to the official next step with confidence.**

### Premium compact conversion structure

1. **Service value rail:** who it is for, what is included, and the single recommended next action.
2. **Choose your path:** public resources, protected payroll workspace, or team conversation.
3. **Proof / explainer:** optional video with concise bullets instead of making the video the gate.
4. **Access gate:** keep Telegram approval and requester-only payment instructions unchanged, but frame them as the next operational step.
5. **Workspace selector:** restore visible Payroll, Bulk payroll, and C&B choices plus HR sector forms after approval.
6. **Trust footer:** official-source boundary, privacy, terms, payroll disclaimer, and Telegram contact.

### Constraints to preserve

- Do not change existing calculators, tax rules, bulk payroll processing, HR form data, or access session behavior.
- Do not add paid services, domain purchases, or LinkedIn API/OAuth requests.
- Do not submit payments or government records on the user's behalf.
- Keep public resources usable without unlocking the protected workspace.

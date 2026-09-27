# Cloudflare Telegram approval setup

The Cloudflare Worker now handles payroll access requests and status checks directly. Request state is stored in the Cloudflare D1 database `DB`, and Telegram approvals are processed by the Worker webhook. The Telegram unlock path no longer depends on the Manus backend.

## Required Worker settings

In Cloudflare Dashboard, open Workers & Pages → zin-portfolio-live → Settings → Variables and Secrets. Add the bot token as a **Secret** named `TELEGRAM_BOT_TOKEN`. Never add it to GitHub, frontend variables, or this chat. The public admin username variable is configured as `TELEGRAM_ADMIN_USERNAME=zinmin2244`; change it in `wrangler.jsonc` if the Telegram username differs.

The token shared in chat was exposed. Revoke it in BotFather and generate a new token before adding the replacement secret in Cloudflare.

## Connect the administrator

After saving the secret and deploying the Worker, open `https://zin-portfolio-live.kyzwa111.workers.dev/api/health`. The Worker automatically registers its webhook at `/api/telegram/webhook` using a secret derived from the bot token. Then open the bot in Telegram and send `/start` from the configured admin account. The username must match `TELEGRAM_ADMIN_USERNAME`.

Visitors submit their name on the portfolio page. The Worker creates a 10-minute request, sends Approve/Deny buttons to the admin chat, stores only a SHA-256 hash of the browser token, and returns status to the page until approved or expired. No payroll data is sent in the access request.

## Database

Cloudflare D1 database `zin-portfolio-telegram` is bound to the Worker as `DB`. The migration `migrations/0001_telegram_access.sql` has been applied. Requests and admin-chat settings stay in D1; no Manus database is used by the Worker.

## Scope note

The Cloudflare Worker currently supports the Telegram unlock request/status flow and Approve/Deny callbacks. The old web admin control room, Telegram inbox/replies, and LinkedIn content APIs have not been migrated to Cloudflare yet.

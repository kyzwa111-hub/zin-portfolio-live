# Cloudflare Telegram approval and admin setup

The Cloudflare Worker handles payroll access requests, Telegram approvals, admin sign-in, and the Admin Control Center. Request state, one-time admin links, sessions, and manual payment records are stored in the Cloudflare D1 database `zin-portfolio-telegram`. The Worker does not call the Manus backend.

## Cloudflare settings

The Worker uses the D1 binding `DB` and the public variable `TELEGRAM_ADMIN_USERNAME=zinmin2244`. Add the Telegram token only as a Production **Secret** named `TELEGRAM_BOT_TOKEN` in Cloudflare → Workers & Pages → zin-portfolio-live → Settings → Variables and Secrets. Never put it in GitHub, frontend variables, or chat.

Any token previously pasted into chat or stored as a plain Variable must be revoked in BotFather. Create a replacement token and add only the new token as the Worker Secret.

## Connect Telegram

Open `https://zin-portfolio-live.kyzwa111.workers.dev/api/health`. When the secret is configured, it registers the Worker webhook at `/api/telegram/webhook`; the response should show `telegramWebhookReady: true`.

From the configured admin Telegram account, open `@ayechanmoe123` and send `/start` once. The Telegram username must match `TELEGRAM_ADMIN_USERNAME`, and when `TELEGRAM_ADMIN_USER_ID` is configured the numeric Telegram user ID must also match. Visitors can then request access on the portfolio and the admin receives Approve/Deny buttons in Telegram.

## Admin Control Center

In the bot chat, send `/admin`. The bot replies with a private, one-use sign-in link to `/admin`. It expires after 10 minutes; do not share it. The dashboard lists access requests, allows revocation, and provides a manual payment ledger for admin-verified payments. It does not process payments or store receipt images.

## Official payroll references

After approval, Payroll Tool shows the official IRD 03-06 monthly PAYE form, 03-06(a) electronic field guide, annual 03-07 salary statement, and SSB references. The SSB monthly Form 13 / contribution workbook is not publicly downloadable from the source website; obtain the current version from SSB or the relevant township office rather than using an unofficial file.

HR-sector CSV forms are local working templates, not government forms. Form data is not submitted to a server.

## Scope

Telegram access approvals and the Admin Control Center are on Cloudflare. LinkedIn content management, Telegram inbox/replies, and the legacy `/admin/updates` page have not been migrated to the Cloudflare Worker.

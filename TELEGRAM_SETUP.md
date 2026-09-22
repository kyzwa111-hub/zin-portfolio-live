# Telegram admin-approval setup

This project includes a Telegram approval gate for the payroll calculator. The calculator stays locked until an access request is approved from the configured Telegram admin chat.

## Required server secrets

Set these as server-side environment variables. Never use the `VITE_` prefix for them.

```text
TELEGRAM_BOT_TOKEN=<token from BotFather>
TELEGRAM_ADMIN_USERNAME=<admin username without the @, for example zzzinmin>
```

The admin must open the bot and send `/start` once. The webhook stores the admin chat ID only after the incoming Telegram username matches `TELEGRAM_ADMIN_USERNAME`.

## Admin control room

Open `/admin/updates` while signed in as an administrator. The control room now includes the original LinkedIn post URL field, Telegram access request history, and a **Revoke** action for pending or approved requests. Revoking a request changes its status to `revoked`; the calculator's browser status check sees that state and locks the calculator again.

The Telegram inbox in the same control room stores bot messages for review. A user can message the bot directly. The bot forwards the message to the connected admin chat; the administrator can reply in Telegram by replying to that forwarded message, or send a reply from the admin control room. The user receives the administrator's reply through the bot.

## Webhook

Register the public HTTPS endpoint below after deployment:

```text
POST https://<your-domain>/api/telegram/webhook
```

The application derives a webhook secret from `TELEGRAM_BOT_TOKEN` and verifies Telegram's `x-telegram-bot-api-secret-token` header. Use Telegram's `setWebhook` method with the same derived secret when deploying to a new domain.

## Security notes

The bot token must not be committed to GitHub or placed in client-side code. The token used during the original setup was exposed in chat and should be revoked and regenerated in BotFather before production use. Access requests use random one-time browser tokens, store only SHA-256 hashes in the database, and expire after 10 minutes.

## Local development

Install dependencies, configure the database and server secrets, apply the Drizzle migration, then run:

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm dev
```

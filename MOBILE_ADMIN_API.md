# Mobile Admin API

This API is designed for a native mobile client. It uses a short-lived, one-use code delivered only in the configured administrator's private Telegram chat, opaque Bearer access tokens, and rotating refresh tokens. The browser admin remains on its existing one-use Telegram link + HttpOnly cookie flow.

## Current deployment status

The mobile API and Telegram fixes are implemented in the Worker source but are **not live until the pending release is deployed**. Before release, apply `migrations/0004_mobile_admin_auth.sql` and route `/api/mobile/*` through Cloudflare Access to the Worker. The Worker enforces one-use-code/Bearer authentication on those routes; do not expose mobile admin data without that Worker check. The `/admin` login/PWA shell and `/api/admin/*` must also reach the Worker, where the one-use Telegram link and HttpOnly admin session enforce browser-admin access.

Current API host: `https://zin-portfolio-live.kyzwa111.workers.dev`

The candidate custom domain `zhte.com` is still pending Cloudflare activation; do not use it until its registrar nameservers are changed and Cloudflare reports the zone as active.

## Sign in

1. In the configured admin bot's private chat, send `/mobilecode`.
2. The bot replies with a random one-use code that expires in five minutes. Do not forward it or put it in logs.
3. Exchange it once:

```http
POST /api/mobile/auth/exchange
Content-Type: application/json

{"code":"<one-time-code>"}
```

The response includes `tokenType`, `accessToken`, `refreshToken`, `accessExpiresAt`, and `refreshExpiresAt`.

4. Send the access token in every admin API request:

```http
Authorization: Bearer <accessToken>
```

5. When the access token expires, rotate the session:

```http
POST /api/mobile/auth/refresh
Content-Type: application/json

{"refreshToken":"<refresh-token>"}
```

Refresh tokens rotate on each successful refresh; discard the old refresh token immediately. Store the refresh token in iOS Keychain / Android Keystore (for Expo, use SecureStore), never in source code, logs, or a browser URL.

6. End the session with `POST /api/mobile/auth/logout` and the current Bearer token.

The installable browser/PWA Control Center is served at `/admin`. Its browser session is separate from the native-client Bearer API session.

Access tokens last 15 minutes; refresh tokens last 30 days. Only token hashes are stored in D1. One-time login codes are consumed atomically and cannot be reused.

## Admin endpoints

All endpoints below require `Authorization: Bearer <accessToken>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/mobile/admin/overview` | Latest access requests and payment records |
| POST | `/api/mobile/admin/requests/revoke` | Body: `{"requestId":"..."}` |
| POST | `/api/mobile/admin/requests/restore` | Body: `{"requestId":"..."}`; restores eligible requests for 24 hours |
| GET | `/api/mobile/admin/payments` | List payment records |
| POST | `/api/mobile/admin/payments` | Record a payment against an existing request |
| POST | `/api/mobile/admin/payments/update` | Update payment status/reference/note |
| GET | `/api/mobile/admin/video-links?status=pending` | List video links, optionally by review status |
| POST | `/api/mobile/admin/video-links` | Add a video link for review |
| POST | `/api/mobile/admin/video-links/review` | Set video review status to `pending`, `approved`, or `rejected` |

Invalid or expired access tokens return `401`; the app should attempt one refresh and then require a new Telegram code if refresh also fails.

## Admin bot commands

The Worker is being updated to support:

- `/pending` — show active request codes.
- `/status REQUEST_CODE` — inspect a request.
- `/approve REQUEST_CODE` and `/deny REQUEST_CODE` — decide a pending request.
- `/revoke REQUEST_CODE` and `/restore REQUEST_CODE` — revoke or restore an eligible request.
- `/update REQUEST_CODE approve|deny|revoke|restore` — equivalent explicit update command.
- `/mobilecode` — issue a one-time app login code.

Commands are accepted only in the configured admin's private chat. Access-request decisions still require a request code and reject expired or already-processed requests.

## Public website access requests

The public access-request endpoint saves the request to D1 independently of Telegram notifications. A successful response with `adminNotified: false` means the request is saved and remains visible in the admin panel, but the bot could not notify the administrator; the page shows that status instead of falsely reporting a failed submission. Notification delivery becomes active after the configured token is verified as `@ayechanmoe123` and its webhook is installed.

## CORS and app origin

Native HTTP clients generally do not rely on browser CORS. For a web/PWA client, set the Worker variable `MOBILE_APP_ORIGINS` to a comma-separated list of exact HTTPS origins (for example, `https://zhte.com`) after the domain is active. The Worker accepts same-origin requests by default and does not enable wildcard credentialed CORS.

## Bot credential

To switch from the current `@Payroll_Officer_bot` to `@ayechanmoe123`, the Worker secret `TELEGRAM_BOT_TOKEN` must be updated to the new bot's BotFather token, then the webhook must be registered again. **Do not paste the token into chat or commit it to GitHub.** The old bot remains configured until this secret is changed.


## Switch to `@ayechanmoe123`

The Worker secret currently points to the existing bot. Keep it unchanged until the updated Worker is deployed. Then:

1. In Cloudflare Worker **Settings → Variables and Secrets**, replace the secret `TELEGRAM_BOT_TOKEN` with the new bot's BotFather token. Do not put the token in GitHub or chat.
2. Open `/admin`. Its public bootstrap check calls `GET /api/telegram/bootstrap`, verifies the secret with Telegram `getMe`, rejects any token that is not for `@ayechanmoe123`, then idempotently registers the webhook. Alternatively, use `POST /api/admin/telegram/setup` (browser session) or `POST /api/mobile/admin/telegram/setup` (Bearer token). Setup returns only the public webhook URL and username; it does not discard pending Telegram updates.
3. Message `/start` to `@ayechanmoe123` from the configured admin's private Telegram account. The existing D1 admin-chat binding is used as the numeric identity allow-list; do not replace it with a guessed ID.
4. Send `/mobilecode` in that private chat to sign in to the mobile client.

`GET /api/health` is now read-only; it must never remove or change the Telegram webhook.


## Live site verification (2026-09-29)

- Public homepage responds: https://zin-portfolio-live.kyzwa111.workers.dev/ . It still links to the old `@Payroll_Officer_bot` because the source-branch changes have not been deployed.
- Public events page responds: https://zin-portfolio-live.kyzwa111.workers.dev/webinars . It currently lists “Business KPIs Awareness” dated 26 September 2026, but its recording and slides still say “pending”; no event video has been published there yet.
- The mobile API, new bot username, and custom domain are not live. `zhte.com` still needs its Cloudflare zone activated before it can be attached as a Worker custom domain.


## Custom domain state (Cloudflare API check, 2026-09-29)

Cloudflare reports the `zhte.com` zone as **pending**. Cloudflare-assigned nameservers are `elmo.ns.cloudflare.com` and `leah.ns.cloudflare.com`; the current nameservers are `ns1.dropcatch.com` and `ns2.dropcatch.com`. At the domain registrar, replace the current nameservers with those two Cloudflare nameservers, then wait until the zone becomes **Active**. Only then can the Worker be attached to `https://zhte.com` and TLS/DNS be verified. The Google Cloud APIs Library page is not where this nameserver change is made.


### Manual webhook fallback (only after the Worker update is deployed)

If no authenticated admin session is available for the setup endpoint, the bot owner can set the webhook from their own trusted terminal. This does not send the token to Manus or store it in the repository; it uses the same secret-header format checked by the Worker:

```bash
read -s -p 'BotFather token: ' TELEGRAM_BOT_TOKEN; printf '\n'
TG_SECRET=$(printf '%s' "$TELEGRAM_BOT_TOKEN" | sha256sum | cut -c1-32)
curl --fail --silent --show-error \\
  --data-urlencode 'url=https://zin-portfolio-live.kyzwa111.workers.dev/api/telegram/webhook' \\
  --data-urlencode "secret_token=$TG_SECRET" \\
  --data-urlencode 'allowed_updates=["message","callback_query"]' \\
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook"
unset TELEGRAM_BOT_TOKEN TG_SECRET
```

After that, send `/start` to `@ayechanmoe123` from the configured admin account. The Worker will save the bot's actual username via Telegram `getMe`; then `/mobilecode` can issue the first app login code.

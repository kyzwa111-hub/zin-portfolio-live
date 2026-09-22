# Render and Neon environment variables

Add these variables in the Render service dashboard. Do not commit real values to GitHub.

| Variable | Value / purpose |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon PostgreSQL connection string, including `sslmode=require` |
| `JWT_SECRET` | Long random server-side session secret |
| `VITE_APP_ID` | Manus OAuth application ID, if retaining Manus login |
| `OAUTH_SERVER_URL` | OAuth server base URL |
| `VITE_OAUTH_PORTAL_URL` | OAuth portal URL |
| `OWNER_OPEN_ID` | Admin owner's Manus open ID |
| `OWNER_NAME` | Admin owner's display name |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token; keep server-side only |
| `TELEGRAM_ADMIN_USERNAME` | Telegram admin username without `@` |

## Deployment steps

1. Create a Neon PostgreSQL project and copy its pooled or direct `DATABASE_URL`.
2. In a local clone, run `pnpm install`, then `pnpm drizzle-kit migrate` with `DATABASE_URL` set to the Neon URL. The generated migration is `drizzle/0000_unique_vector.sql`.
3. Confirm the six tables and seven PostgreSQL enum types exist in Neon before adding any production data.
4. Create a Render Web Service from the GitHub repository `kyzwa111-hub/zin-portfolio-live`. Render can read `render.yaml` from the repository root.
5. Add the environment variables above in Render. Never paste Telegram tokens, JWT secrets, or database credentials into source files or GitHub.
6. Deploy and confirm the public home page, `/api/trpc` requests, calculator request flow, and Telegram webhook endpoint.
7. Register Telegram's webhook against the Render HTTPS domain using the same secret derivation already implemented by the server.

## Future updates

Edit locally or in GitHub, commit to `main`, and push. Render will automatically build and deploy the new commit. Database schema changes must be generated and reviewed before running `pnpm drizzle-kit migrate` against Neon.

## Important migration note

The repository now targets PostgreSQL/Neon. The legacy MySQL migrations are retained under `drizzle/mysql-legacy/` for reference only. Existing Manus-hosted MySQL data is not copied automatically; export and transform any production records before using them in Neon.

import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { getTelegramWebhookSecret, handleTelegramWebhook } from "../server/telegram";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);

app.post("/api/telegram/webhook", async (req, res) => {
  if (req.header("x-telegram-bot-api-secret-token") !== getTelegramWebhookSecret()) {
    res.status(401).json({ ok: false });
    return;
  }

  try {
    await handleTelegramWebhook(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error("[Telegram] Webhook error:", error);
    res.status(500).json({ ok: false });
  }
});

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

export default app;

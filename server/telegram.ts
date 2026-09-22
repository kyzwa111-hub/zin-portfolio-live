import { createHash } from "crypto";
import { createTelegramMessage, getAccessRequest, getAccessRequestByRequestId, getTelegramMessageByExternalId, getTelegramSetting, updateAccessRequest, upsertTelegramSetting } from "./db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const ADMIN_USERNAME = (process.env.TELEGRAM_ADMIN_USERNAME ?? "zzzinmin").replace(/^@/, "").toLowerCase();
const ADMIN_CHAT_SETTING = "admin_chat_id";

type TelegramUser = { id: number; username?: string; first_name?: string };
type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  from?: TelegramUser;
  text?: string;
  reply_to_message?: { message_id: number };
};
type TelegramCallback = { id: string; from: TelegramUser; data?: string; message?: { chat: { id: number }; message_id: number } };
type TelegramUpdate = { message?: TelegramMessage; callback_query?: TelegramCallback };
type TelegramSentMessage = { message_id: number };

async function telegramApi<T>(method: string, body: Record<string, unknown>) {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { ok: boolean; result?: T; description?: string };
  if (!response.ok || !payload.ok) throw new Error(payload.description ?? `Telegram ${method} failed`);
  return payload.result as T;
}

export function hashAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getTelegramWebhookSecret() {
  return hashAccessToken(BOT_TOKEN).slice(0, 32);
}

export async function getTelegramBotUsername() {
  const bot = await telegramApi<{ username?: string }>("getMe", {});
  return bot?.username ?? "Payroll_Officer_bot";
}

async function storeMessage(input: Parameters<typeof createTelegramMessage>[0]) {
  try {
    await createTelegramMessage(input);
  } catch (error) {
    console.warn("[Telegram] Could not store message:", error);
  }
}

async function sendText(chatId: string, text: string, relatedChatId: string, user?: TelegramUser, replyToTelegramMessageId?: number) {
  const sent = await telegramApi<TelegramSentMessage>("sendMessage", {
    chat_id: chatId,
    text,
    ...(replyToTelegramMessageId ? { reply_to_message_id: replyToTelegramMessageId } : {}),
  });
  await storeMessage({
    chatId: relatedChatId,
    telegramUserId: user ? String(user.id) : null,
    telegramUsername: user?.username ?? null,
    direction: "outbound",
    messageText: text,
    telegramMessageId: String(sent.message_id),
    replyToTelegramMessageId: replyToTelegramMessageId ? String(replyToTelegramMessageId) : null,
  });
  return sent;
}

async function sendAdminMessage(requestId: string) {
  const adminChatId = await getTelegramSetting(ADMIN_CHAT_SETTING);
  if (!adminChatId) return false;
  const text = `Payroll calculator access request\n\nRequest ID: ${requestId}\nExpires in 10 minutes.\n\nApprove only if you recognize this request.`;
  const sent = await telegramApi<TelegramSentMessage>("sendMessage", {
    chat_id: adminChatId,
    text,
    reply_markup: { inline_keyboard: [[
      { text: "Approve", callback_data: `approve:${requestId}` },
      { text: "Deny", callback_data: `deny:${requestId}` },
    ]] },
  });
  await storeMessage({ chatId: adminChatId, telegramUserId: null, telegramUsername: ADMIN_USERNAME, direction: "outbound", messageText: text, telegramMessageId: String(sent.message_id), replyToTelegramMessageId: null });
  return true;
}

async function handleStart(message: TelegramMessage) {
  const username = message.from?.username?.toLowerCase();
  if (!username || username !== ADMIN_USERNAME) {
    await sendText(String(message.chat.id), "This bot is restricted to the configured administrator.", String(message.chat.id), message.from);
    return;
  }
  await upsertTelegramSetting(ADMIN_CHAT_SETTING, String(message.chat.id));
  await sendText(String(message.chat.id), "Admin approval is connected. You will receive calculator access requests here. You can also reply to a user message from this chat to continue the conversation.", String(message.chat.id), message.from);
}

async function handleAdminReply(message: TelegramMessage, adminChatId: string) {
  if (!message.reply_to_message) return false;
  const original = await getTelegramMessageByExternalId(String(message.reply_to_message.message_id));
  if (!original || original.chatId === adminChatId || !message.text) return false;
  await sendText(original.chatId, `Admin reply:\n\n${message.text}`, original.chatId, message.from);
  return true;
}

async function handleConversationMessage(message: TelegramMessage) {
  if (!message.text) return;
  const adminChatId = await getTelegramSetting(ADMIN_CHAT_SETTING);
  const currentChatId = String(message.chat.id);
  const isAdmin = Boolean(adminChatId && currentChatId === adminChatId && message.from?.username?.toLowerCase() === ADMIN_USERNAME);
  if (isAdmin) {
    if (await handleAdminReply(message, adminChatId!)) return;
    await sendText(currentChatId, "To reply to a user, reply directly to the forwarded user message. Use the website admin panel to review the full history.", currentChatId, message.from);
    return;
  }

  await storeMessage({ chatId: currentChatId, telegramUserId: message.from ? String(message.from.id) : null, telegramUsername: message.from?.username ?? null, direction: "inbound", messageText: message.text, telegramMessageId: String(message.message_id), replyToTelegramMessageId: message.reply_to_message ? String(message.reply_to_message.message_id) : null });
  if (!adminChatId) {
    await sendText(currentChatId, "Your message was received, but the administrator has not connected the bot yet.", currentChatId, message.from);
    return;
  }
  const sender = message.from?.username ? `@${message.from.username}` : message.from?.first_name ?? "Telegram user";
  const adminText = `New message from ${sender}\n\n${message.text}\n\nReply to this message to respond directly to the user.`;
  const forwarded = await telegramApi<TelegramSentMessage>("sendMessage", { chat_id: adminChatId, text: adminText });
  await storeMessage({ chatId: currentChatId, telegramUserId: message.from ? String(message.from.id) : null, telegramUsername: message.from?.username ?? null, direction: "outbound", messageText: adminText, telegramMessageId: String(forwarded.message_id), replyToTelegramMessageId: null });
  await sendText(currentChatId, "Your message has been sent to the administrator. You will receive a reply here.", currentChatId, message.from);
}

async function handleCallback(callback: TelegramCallback) {
  const data = callback.data ?? "";
  const [action, requestId] = data.split(":");
  const configuredAdminChatId = await getTelegramSetting(ADMIN_CHAT_SETTING);
  const callbackChatId = callback.message?.chat.id;
  const isAdmin = configuredAdminChatId && callback.from.id === Number(configuredAdminChatId) && callbackChatId === Number(configuredAdminChatId);
  if (!isAdmin || !requestId || (action !== "approve" && action !== "deny")) {
    await answerCallbackSafely(callback.id, "Not authorized", true);
    return;
  }
  const request = await getAccessRequestByRequestId(requestId);
  if (!request || request.expiresAt.getTime() <= Date.now()) {
    await answerCallbackSafely(callback.id, "Request expired");
    return;
  }
  if (request.status !== "pending") {
    await answerCallbackSafely(callback.id, `Request already ${request.status}`);
    return;
  }
  const nextStatus = action === "approve" ? "approved" : "denied";
  await updateAccessRequest(requestId, { status: nextStatus, telegramUserId: String(callback.from.id), telegramUsername: callback.from.username ?? null, approvedAt: action === "approve" ? new Date() : null });
  await answerCallbackSafely(callback.id, action === "approve" ? "Access approved" : "Access denied");
  if (callback.message) {
    try {
      await telegramApi("editMessageReplyMarkup", { chat_id: callback.message.chat.id, message_id: callback.message.message_id, reply_markup: { inline_keyboard: [] } });
    } catch (error) {
      if (!String(error).includes("message is not modified")) throw error;
    }
  }
}

async function answerCallbackSafely(callbackId: string, text: string, showAlert = false) {
  try {
    await telegramApi("answerCallbackQuery", { callback_query_id: callbackId, text, show_alert: showAlert });
  } catch (error) {
    const message = String(error);
    if (!message.includes("query is too old") && !message.includes("query ID is invalid")) throw error;
  }
}

export async function handleTelegramWebhook(update: TelegramUpdate) {
  if (update.message?.text?.startsWith("/start")) {
    await handleStart(update.message);
    return;
  }
  if (update.message) await handleConversationMessage(update.message);
  if (update.callback_query) await handleCallback(update.callback_query);
}

export async function requestAdminApproval(requestId: string) {
  return sendAdminMessage(requestId);
}

export async function sendTelegramAdminReply(chatId: string, text: string) {
  const adminChatId = await getTelegramSetting(ADMIN_CHAT_SETTING);
  if (!adminChatId) throw new Error("Telegram admin chat is not connected");
  const sent = await sendText(chatId, text, chatId);
  await sendText(adminChatId, `Reply sent to chat ${chatId}.`, adminChatId);
  return sent;
}

export async function getApprovalStatus(requestId: string, token: string) {
  const request = await getAccessRequest(requestId, hashAccessToken(token));
  if (!request) return { status: "invalid" as const };
  if (request.expiresAt.getTime() <= Date.now() && request.status === "pending") {
    await updateAccessRequest(requestId, { status: "expired" });
    return { status: "expired" as const };
  }
  return { status: request.status, expiresAt: request.expiresAt.toISOString() };
}

export const telegramAdminUsername = ADMIN_USERNAME;

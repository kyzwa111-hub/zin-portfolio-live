import { COOKIE_NAME } from "@shared/const";
import { randomBytes } from "crypto";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createAccessRequest, createFormTemplate, createLinkedInUpdate, deleteFormTemplate, deleteLinkedInUpdate, listAccessRequests, listFormTemplates, listLinkedInUpdates, listTelegramMessages, revokeAccessRequest, updateFormTemplate, updateLinkedInUpdate } from "./db";
import { getApprovalStatus, getTelegramBotUsername, hashAccessToken, requestAdminApproval, sendTelegramAdminReply } from "./telegram";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  calculatorAccess: router({
    request: publicProcedure.input(z.object({ requesterName: z.string().trim().min(2).max(160) })).mutation(async ({ input }) => {
      const requestId = randomBytes(12).toString("base64url");
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await createAccessRequest({ requestId, requesterName: input.requesterName, tokenHash: hashAccessToken(token), expiresAt });
      let adminNotified = false;
      try { adminNotified = await requestAdminApproval(requestId, input.requesterName); } catch (error) { console.warn("[Telegram] Could not notify admin:", error); }
      let botUsername = "Payroll_Officer_bot";
      try { botUsername = await getTelegramBotUsername(); } catch (error) { console.warn("[Telegram] Could not read bot username:", error); }
      return { requestId, token, expiresAt: expiresAt.toISOString(), botUsername, adminNotified } as const;
    }),
    status: publicProcedure.input(z.object({ requestId: z.string().min(8).max(64), token: z.string().min(16).max(128) })).query(({ input }) => getApprovalStatus(input.requestId, input.token)),
  }),

  telegramAdmin: router({
    requests: adminProcedure.query(() => listAccessRequests()),
    revoke: adminProcedure.input(z.object({ requestId: z.string().min(8).max(64) })).mutation(({ input }) => revokeAccessRequest(input.requestId)),
    messages: adminProcedure.query(() => listTelegramMessages()),
    reply: adminProcedure.input(z.object({ chatId: z.string().min(1).max(64), text: z.string().trim().min(1).max(4000) })).mutation(({ input }) => sendTelegramAdminReply(input.chatId, input.text)),
  }),

  linkedinUpdates: router({
    list: publicProcedure.query(() => listLinkedInUpdates()),
    create: adminProcedure.input(z.object({
      label: z.string().trim().min(1).max(80), title: z.string().trim().min(1).max(220), excerpt: z.string().trim().min(1).max(5000), dateLabel: z.string().trim().min(1).max(40), status: z.enum(["Published on LinkedIn", "Ready to sync"]), linkedinUrl: z.string().url().max(500).optional().or(z.literal("")),
    })).mutation(({ input }) => createLinkedInUpdate({ ...input, linkedinUrl: input.linkedinUrl || null })),
    update: adminProcedure.input(z.object({
      id: z.number().int().positive(), label: z.string().trim().min(1).max(80), title: z.string().trim().min(1).max(220), excerpt: z.string().trim().min(1).max(5000), dateLabel: z.string().trim().min(1).max(40), status: z.enum(["Published on LinkedIn", "Ready to sync"]), linkedinUrl: z.string().url().max(500).optional().or(z.literal("")),
    })).mutation(({ input }) => { const { id, ...update } = input; return updateLinkedInUpdate(id, update); }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteLinkedInUpdate(input.id)),
  }),

  formTemplates: router({
    list: publicProcedure.query(() => listFormTemplates(true)),
    adminList: adminProcedure.query(() => listFormTemplates(false)),
    create: adminProcedure.input(z.object({
      cadence: z.enum(["monthly", "annual"]), kind: z.enum(["monthly-paye", "monthly-ssb", "monthly-tax-card", "annual-ird", "annual-cover-letter"]), title: z.string().trim().min(1).max(220), versionLabel: z.string().trim().min(1).max(120), description: z.string().trim().min(1).max(5000), fileType: z.enum(["xlsx", "docx", "pdf"]), fileUrl: z.string().trim().min(1).max(500), officialLabel: z.string().trim().min(1).max(160), officialUrl: z.string().trim().url().max(500), isActive: z.boolean(),
    })).mutation(({ input }) => createFormTemplate({ ...input, isActive: input.isActive ? 1 : 0 })),
    update: adminProcedure.input(z.object({
      id: z.number().int().positive(), cadence: z.enum(["monthly", "annual"]), kind: z.enum(["monthly-paye", "monthly-ssb", "monthly-tax-card", "annual-ird", "annual-cover-letter"]), title: z.string().trim().min(1).max(220), versionLabel: z.string().trim().min(1).max(120), description: z.string().trim().min(1).max(5000), fileType: z.enum(["xlsx", "docx", "pdf"]), fileUrl: z.string().trim().min(1).max(500), officialLabel: z.string().trim().min(1).max(160), officialUrl: z.string().trim().url().max(500), isActive: z.boolean(),
    })).mutation(({ input }) => { const { id, isActive, ...rest } = input; return updateFormTemplate(id, { ...rest, isActive: isActive ? 1 : 0 }); }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteFormTemplate(input.id)),
  }),
});

export type AppRouter = typeof appRouter;

import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const accessStatusEnum = pgEnum("access_status", ["pending", "approved", "denied", "expired", "revoked"]);
export const linkedinStatusEnum = pgEnum("linkedin_status", ["Published on LinkedIn", "Ready to sync"]);
export const cadenceEnum = pgEnum("cadence", ["monthly", "annual"]);
export const templateKindEnum = pgEnum("template_kind", ["monthly-paye", "monthly-ssb", "monthly-tax-card", "annual-ird", "annual-cover-letter"]);
export const fileTypeEnum = pgEnum("file_type", ["xlsx", "docx", "pdf"]);
export const telegramDirectionEnum = pgEnum("telegram_direction", ["inbound", "outbound"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export const accessRequests = pgTable("access_requests", {
  id: serial("id").primaryKey(),
  requestId: varchar("requestId", { length: 64 }).notNull().unique(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  status: accessStatusEnum("status").default("pending").notNull(),
  telegramUserId: varchar("telegramUserId", { length: 64 }),
  telegramUsername: varchar("telegramUsername", { length: 128 }),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  approvedAt: timestamp("approvedAt", { withTimezone: true }),
  revokedAt: timestamp("revokedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const telegramSettings = pgTable("telegram_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("settingKey", { length: 64 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const linkedinUpdates = pgTable("linkedin_updates", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 80 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  excerpt: text("excerpt").notNull(),
  dateLabel: varchar("dateLabel", { length: 40 }).notNull(),
  status: linkedinStatusEnum("status").default("Ready to sync").notNull(),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const formTemplates = pgTable("form_templates", {
  id: serial("id").primaryKey(),
  cadence: cadenceEnum("cadence").notNull(),
  kind: templateKindEnum("kind").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  versionLabel: varchar("versionLabel", { length: 120 }).notNull(),
  description: text("description").notNull(),
  fileType: fileTypeEnum("fileType").notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  officialLabel: varchar("officialLabel", { length: 160 }).notNull(),
  officialUrl: varchar("officialUrl", { length: 500 }).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const telegramMessages = pgTable("telegram_messages", {
  id: serial("id").primaryKey(),
  chatId: varchar("chatId", { length: 64 }).notNull(),
  telegramUserId: varchar("telegramUserId", { length: 64 }),
  telegramUsername: varchar("telegramUsername", { length: 128 }),
  direction: telegramDirectionEnum("direction").notNull(),
  messageText: text("messageText").notNull(),
  telegramMessageId: varchar("telegramMessageId", { length: 64 }),
  replyToTelegramMessageId: varchar("replyToTelegramMessageId", { length: 64 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AccessRequest = typeof accessRequests.$inferSelect;
export type TelegramSetting = typeof telegramSettings.$inferSelect;
export type LinkedInUpdate = typeof linkedinUpdates.$inferSelect;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type TelegramMessage = typeof telegramMessages.$inferSelect;

import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

const roleEnum = mysqlEnum("role", ["user", "admin"]);
const accessStatusEnum = mysqlEnum("status", ["pending", "approved", "denied", "expired", "revoked"]);
const linkedinStatusEnum = mysqlEnum("status", ["Published on LinkedIn", "Ready to sync"]);
const cadenceEnum = mysqlEnum("cadence", ["monthly", "annual"]);
const templateKindEnum = mysqlEnum("kind", ["monthly-paye", "monthly-ssb", "monthly-tax-card", "annual-ird", "annual-cover-letter"]);
const fileTypeEnum = mysqlEnum("fileType", ["xlsx", "docx", "pdf"]);
const telegramDirectionEnum = mysqlEnum("direction", ["inbound", "outbound"]);

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum.notNull().default("user"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const accessRequests = mysqlTable("access_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestId: varchar("requestId", { length: 64 }).notNull().unique(),
  requesterName: varchar("requesterName", { length: 160 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  status: accessStatusEnum.notNull().default("pending"),
  telegramUserId: varchar("telegramUserId", { length: 64 }),
  telegramUsername: varchar("telegramUsername", { length: 128 }),
  expiresAt: timestamp("expiresAt").notNull(),
  approvedAt: timestamp("approvedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const telegramSettings = mysqlTable("telegram_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 64 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const linkedinUpdates = mysqlTable("linkedin_updates", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 80 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  excerpt: text("excerpt").notNull(),
  dateLabel: varchar("dateLabel", { length: 40 }).notNull(),
  status: linkedinStatusEnum.notNull().default("Ready to sync"),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const formTemplates = mysqlTable("form_templates", {
  id: int("id").autoincrement().primaryKey(),
  cadence: cadenceEnum.notNull(),
  kind: templateKindEnum.notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  versionLabel: varchar("versionLabel", { length: 120 }).notNull(),
  description: text("description").notNull(),
  fileType: fileTypeEnum.notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  officialLabel: varchar("officialLabel", { length: 160 }).notNull(),
  officialUrl: varchar("officialUrl", { length: 500 }).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const telegramMessages = mysqlTable("telegram_messages", {
  id: int("id").autoincrement().primaryKey(),
  chatId: varchar("chatId", { length: 64 }).notNull(),
  telegramUserId: varchar("telegramUserId", { length: 64 }),
  telegramUsername: varchar("telegramUsername", { length: 128 }),
  direction: telegramDirectionEnum.notNull(),
  messageText: text("messageText").notNull(),
  telegramMessageId: varchar("telegramMessageId", { length: 64 }),
  replyToTelegramMessageId: varchar("replyToTelegramMessageId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AccessRequest = typeof accessRequests.$inferSelect;
export type TelegramSetting = typeof telegramSettings.$inferSelect;
export type LinkedInUpdate = typeof linkedinUpdates.$inferSelect;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type TelegramMessage = typeof telegramMessages.$inferSelect;

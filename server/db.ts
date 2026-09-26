import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AccessRequest, FormTemplate, InsertUser, LinkedInUpdate, TelegramMessage, accessRequests, formTemplates, linkedinUpdates, telegramMessages, telegramSettings, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Partial<InsertUser> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    updateSet.updatedAt = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAccessRequest(input: { requestId: string; requesterName: string; tokenHash: string; expiresAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.insert(accessRequests).values(input);
}

export async function getAccessRequest(requestId: string, tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accessRequests).where(and(eq(accessRequests.requestId, requestId), eq(accessRequests.tokenHash, tokenHash))).limit(1);
  return result[0];
}

export async function getAccessRequestByRequestId(requestId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accessRequests).where(eq(accessRequests.requestId, requestId)).limit(1);
  return result[0];
}

export async function updateAccessRequest(requestId: string, update: Partial<Pick<AccessRequest, "status" | "telegramUserId" | "telegramUsername" | "approvedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(accessRequests).set({ ...update, updatedAt: new Date() }).where(eq(accessRequests.requestId, requestId));
}

export async function listAccessRequests(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accessRequests).orderBy(desc(accessRequests.createdAt)).limit(limit);
}

export async function revokeAccessRequest(requestId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(accessRequests).set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() }).where(eq(accessRequests.requestId, requestId));
}

export async function getTelegramSetting(settingKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(telegramSettings).where(eq(telegramSettings.settingKey, settingKey)).limit(1);
  return result[0]?.settingValue;
}

export async function upsertTelegramSetting(settingKey: string, settingValue: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(telegramSettings).values({ settingKey, settingValue }).onDuplicateKeyUpdate({ set: { settingValue, updatedAt: new Date() } });
}

export async function listLinkedInUpdates(): Promise<LinkedInUpdate[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(linkedinUpdates).orderBy(desc(linkedinUpdates.createdAt));
  } catch (error) {
    console.warn("[Database] LinkedIn updates table unavailable; returning empty list:", error);
    return [];
  }
}

export async function createLinkedInUpdate(input: Pick<LinkedInUpdate, "label" | "title" | "excerpt" | "dateLabel" | "status" | "linkedinUrl">) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(linkedinUpdates).values(input);
}

export async function updateLinkedInUpdate(id: number, input: Partial<Pick<LinkedInUpdate, "label" | "title" | "excerpt" | "dateLabel" | "status" | "linkedinUrl">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(linkedinUpdates).set({ ...input, updatedAt: new Date() }).where(eq(linkedinUpdates.id, id));
}

export async function deleteLinkedInUpdate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(linkedinUpdates).where(eq(linkedinUpdates.id, id));
}

export async function listFormTemplates(activeOnly = false): Promise<FormTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const query = db.select().from(formTemplates).orderBy(desc(formTemplates.updatedAt));
    if (activeOnly) return await query.where(eq(formTemplates.isActive, 1));
    return await query;
  } catch (error) {
    console.warn("[Database] Form templates table unavailable; returning empty list:", error);
    return [];
  }
}

export async function createFormTemplate(input: Omit<FormTemplate, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(formTemplates).values(input);
}

export async function updateFormTemplate(id: number, input: Partial<Omit<FormTemplate, "id" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(formTemplates).set({ ...input, updatedAt: new Date() }).where(eq(formTemplates.id, id));
}

export async function deleteFormTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(formTemplates).where(eq(formTemplates.id, id));
}

export async function createTelegramMessage(input: Omit<TelegramMessage, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(telegramMessages).values(input);
}

export async function listTelegramMessages(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(telegramMessages).orderBy(desc(telegramMessages.createdAt)).limit(limit);
  return rows.reverse();
}

export async function getTelegramMessageByExternalId(telegramMessageId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(telegramMessages).where(eq(telegramMessages.telegramMessageId, telegramMessageId)).limit(1);
  return rows[0];
}

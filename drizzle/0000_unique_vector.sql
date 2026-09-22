CREATE TYPE "public"."access_status" AS ENUM('pending', 'approved', 'denied', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."cadence" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('xlsx', 'docx', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."linkedin_status" AS ENUM('Published on LinkedIn', 'Ready to sync');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."telegram_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."template_kind" AS ENUM('monthly-paye', 'monthly-ssb', 'monthly-tax-card', 'annual-ird', 'annual-cover-letter');--> statement-breakpoint
CREATE TABLE "access_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" varchar(64) NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"status" "access_status" DEFAULT 'pending' NOT NULL,
	"telegramUserId" varchar(64),
	"telegramUsername" varchar(128),
	"expiresAt" timestamp with time zone NOT NULL,
	"approvedAt" timestamp with time zone,
	"revokedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_requests_requestId_unique" UNIQUE("requestId")
);
--> statement-breakpoint
CREATE TABLE "form_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"cadence" "cadence" NOT NULL,
	"kind" "template_kind" NOT NULL,
	"title" varchar(220) NOT NULL,
	"versionLabel" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"fileType" "file_type" NOT NULL,
	"fileUrl" varchar(500) NOT NULL,
	"officialLabel" varchar(160) NOT NULL,
	"officialUrl" varchar(500) NOT NULL,
	"isActive" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linkedin_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(80) NOT NULL,
	"title" varchar(220) NOT NULL,
	"excerpt" text NOT NULL,
	"dateLabel" varchar(40) NOT NULL,
	"status" "linkedin_status" DEFAULT 'Ready to sync' NOT NULL,
	"linkedinUrl" varchar(500),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"chatId" varchar(64) NOT NULL,
	"telegramUserId" varchar(64),
	"telegramUsername" varchar(128),
	"direction" "telegram_direction" NOT NULL,
	"messageText" text NOT NULL,
	"telegramMessageId" varchar(64),
	"replyToTelegramMessageId" varchar(64),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"settingKey" varchar(64) NOT NULL,
	"settingValue" text NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_settings_settingKey_unique" UNIQUE("settingKey")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);

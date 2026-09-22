CREATE TABLE `telegram_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatId` varchar(64) NOT NULL,
	`telegramUserId` varchar(64),
	`telegramUsername` varchar(128),
	`direction` enum('inbound','outbound') NOT NULL,
	`messageText` text NOT NULL,
	`telegramMessageId` varchar(64),
	`replyToTelegramMessageId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegram_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `access_requests` MODIFY COLUMN `status` enum('pending','approved','denied','expired','revoked') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `access_requests` ADD `revokedAt` timestamp;
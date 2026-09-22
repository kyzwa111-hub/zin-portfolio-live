CREATE TABLE `access_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` varchar(64) NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`status` enum('pending','approved','denied','expired') NOT NULL DEFAULT 'pending',
	`telegramUserId` varchar(64),
	`telegramUsername` varchar(128),
	`expiresAt` timestamp NOT NULL,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `access_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_requests_requestId_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE `telegram_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(64) NOT NULL,
	`settingValue` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_settings_settingKey_unique` UNIQUE(`settingKey`)
);

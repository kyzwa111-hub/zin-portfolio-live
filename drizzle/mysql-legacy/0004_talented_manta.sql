CREATE TABLE `form_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cadence` enum('monthly','annual') NOT NULL,
	`kind` enum('monthly-paye','monthly-ssb','monthly-tax-card','annual-ird','annual-cover-letter') NOT NULL,
	`title` varchar(220) NOT NULL,
	`versionLabel` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`fileType` enum('xlsx','docx','pdf') NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`officialLabel` varchar(160) NOT NULL,
	`officialUrl` varchar(500) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_templates_id` PRIMARY KEY(`id`)
);

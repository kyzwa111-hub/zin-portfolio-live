CREATE TABLE `linkedin_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(80) NOT NULL,
	`title` varchar(220) NOT NULL,
	`excerpt` text NOT NULL,
	`dateLabel` varchar(40) NOT NULL,
	`status` enum('Published on LinkedIn','Ready to sync') NOT NULL DEFAULT 'Ready to sync',
	`linkedinUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `linkedin_updates_id` PRIMARY KEY(`id`)
);

CREATE TABLE `public_saves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(16) NOT NULL,
	`gameSlug` varchar(128) NOT NULL,
	`slot` int NOT NULL,
	`objectKey` varchar(255) NOT NULL,
	`sizeBytes` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `public_saves_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_saves_slot_unique` UNIQUE(`platform`,`gameSlug`,`slot`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

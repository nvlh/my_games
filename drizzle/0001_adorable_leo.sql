ALTER TABLE `public_saves` DROP INDEX `public_saves_slot_unique`;--> statement-breakpoint
ALTER TABLE `public_saves` MODIFY COLUMN `slot` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `public_saves` ADD `saveName` varchar(160) DEFAULT '未命名存档' NOT NULL;--> statement-breakpoint
ALTER TABLE `public_saves` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;
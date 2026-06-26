ALTER TABLE `uploads` ADD `url` text;--> statement-breakpoint
ALTER TABLE `uploads` ADD `timeout` integer DEFAULT (unixepoch()) + 900 NOT NULL;--> statement-breakpoint
ALTER TABLE `uploads` ADD `s3_id` text;
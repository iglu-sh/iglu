PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`derivations_tenants_links` text NOT NULL,
	`direction` text NOT NULL,
	`date` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`url` text NOT NULL,
	FOREIGN KEY (`derivations_tenants_links`) REFERENCES `derivations_tenants_links`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_requests`("id", "derivations_tenants_links", "direction", "date", "url") SELECT "id", "derivations_tenants_links", "direction", "date", "url" FROM `requests`;--> statement-breakpoint
DROP TABLE `requests`;--> statement-breakpoint
ALTER TABLE `__new_requests` RENAME TO `requests`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
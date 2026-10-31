CREATE TABLE `database_version` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`state` text,
	`meta` text
);
--> statement-breakpoint
ALTER TABLE `access_rules` ADD `managed_by` text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `managed_by` text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `deployment_keys` ADD `managed_by` text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `keypairs` ADD `managed_by` text DEFAULT 'server' NOT NULL;--> statement-breakpoint
ALTER TABLE `signing_keys` ADD `managed_by` text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `managed_by` text DEFAULT 'other' NOT NULL;
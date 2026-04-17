CREATE TABLE `access_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`tenants_id` text,
	`ip_block` text NOT NULL,
	`start_ip` integer NOT NULL,
	`end_ip` integer NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`action` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`tenants_id`) REFERENCES `tenants`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ip_idx` ON `access_rules` (`start_ip`,`end_ip`);--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`hash` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `api_keys_tenants_link` (
	`id` text PRIMARY KEY NOT NULL,
	`tenants_id` text,
	`api_keys_id` text,
	FOREIGN KEY (`tenants_id`) REFERENCES `tenants`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`api_keys_id`) REFERENCES `api_keys`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `derivations` (
	`id` text PRIMARY KEY NOT NULL,
	`signing_keys_id` text,
	`cderiver` text NOT NULL,
	`cfilehash` text NOT NULL,
	`cnarhash` text NOT NULL,
	`cnarsize` text NOT NULL,
	`creferences` text NOT NULL,
	`csig` text NOT NULL,
	`cstorehash` text NOT NULL,
	`cstoresuffix` text NOT NULL,
	`parts` text NOT NULL,
	`compression` text NOT NULL,
	FOREIGN KEY (`signing_keys_id`) REFERENCES `signing_keys`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `derivations_tenants_links` (
	`id` text PRIMARY KEY NOT NULL,
	`tenants_id` text,
	`derivations_id` text,
	FOREIGN KEY (`tenants_id`) REFERENCES `tenants`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`derivations_id`) REFERENCES `derivations`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`derivations_tenants_links` text NOT NULL,
	`direction` text NOT NULL,
	`date` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`url` text NOT NULL,
	FOREIGN KEY (`derivations_tenants_links`) REFERENCES `derivations_tenants_links`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `signing_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`api_keys_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`api_keys_id`) REFERENCES `api_keys`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`github_username` text NOT NULL,
	`is_public` integer NOT NULL,
	`name` text NOT NULL,
	`permission` text NOT NULL,
	`preferred_compression_method` text NOT NULL,
	`uri` text NOT NULL,
	`priority` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_name_unique` ON `tenants` (`name`);
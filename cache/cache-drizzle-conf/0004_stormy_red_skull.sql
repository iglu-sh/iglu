CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`tenants_id` text NOT NULL,
	`last_key_used` text NOT NULL,
	`last_seen` integer DEFAULT (unixepoch()) NOT NULL,
	`version` text NOT NULL,
	`os` text NOT NULL,
	`is_online` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`tenants_id`) REFERENCES `tenants`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`last_key_used`) REFERENCES `deployment_keys`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `agents_deployments_links` (
	`id` text PRIMARY KEY NOT NULL,
	`deployments_id` text NOT NULL,
	`agents_id` text NOT NULL,
	`log` text,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`deployments_id`) REFERENCES `deployments`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`agents_id`) REFERENCES `deployments`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `deployment_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`tenants_id` text NOT NULL,
	`type` text NOT NULL,
	`hash` text NOT NULL,
	`expires_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`tenants_id`) REFERENCES `tenants`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenants_id` text NOT NULL,
	`key_used` text NOT NULL,
	`deployment_index` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`closure_size` integer,
	`status` text NOT NULL,
	`deploy_json` text NOT NULL,
	`store_path` text NOT NULL,
	FOREIGN KEY (`tenants_id`) REFERENCES `tenants`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`key_used`) REFERENCES `deployment_keys`(`id`) ON UPDATE cascade ON DELETE cascade
);

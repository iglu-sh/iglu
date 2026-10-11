CREATE TABLE `keypairs` (
	`id` text PRIMARY KEY NOT NULL,
	`private_key` text NOT NULL,
	`signing_keys_id` text NOT NULL,
	`tenants_id` text NOT NULL,
	FOREIGN KEY (`signing_keys_id`) REFERENCES `signing_keys`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`tenants_id`) REFERENCES `tenants`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `tenants` ADD `signing_method` text DEFAULT 'client' NOT NULL;
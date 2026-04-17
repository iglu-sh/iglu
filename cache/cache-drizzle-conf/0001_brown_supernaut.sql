CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`tenants_id` text,
	`signed_by` text,
	FOREIGN KEY (`tenants_id`) REFERENCES `tenants`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`signed_by`) REFERENCES `api_keys`(`id`) ON UPDATE cascade ON DELETE cascade
);

PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`tenants_id` text NOT NULL,
	`signed_by` text NOT NULL,
	`md5` text NOT NULL,
	`compression` text NOT NULL,
	FOREIGN KEY (`tenants_id`) REFERENCES `tenants`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`signed_by`) REFERENCES `api_keys`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_uploads`("id", "tenants_id", "signed_by", "md5", "compression") SELECT "id", "tenants_id", "signed_by", "md5", "compression" FROM `uploads`;--> statement-breakpoint
DROP TABLE `uploads`;--> statement-breakpoint
ALTER TABLE `__new_uploads` RENAME TO `uploads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
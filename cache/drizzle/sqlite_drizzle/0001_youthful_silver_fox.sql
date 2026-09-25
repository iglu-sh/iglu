PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_derivations` (
	`id` text PRIMARY KEY NOT NULL,
	`cderiver` text NOT NULL,
	`cfilehash` text NOT NULL,
	`cfilesize` integer NOT NULL,
	`cnarhash` text NOT NULL,
	`cnarsize` text NOT NULL,
	`creferences` text NOT NULL,
	`cstorehash` text NOT NULL,
	`cstoresuffix` text NOT NULL,
	`parts` text NOT NULL,
	`compression` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_derivations`("id", "cderiver", "cfilehash", "cfilesize", "cnarhash", "cnarsize", "creferences", "cstorehash", "cstoresuffix", "parts", "compression") SELECT "id", "cderiver", "cfilehash", "cfilesize", "cnarhash", "cnarsize", "creferences", "cstorehash", "cstoresuffix", "parts", "compression" FROM `derivations`;--> statement-breakpoint
DROP TABLE `derivations`;--> statement-breakpoint
ALTER TABLE `__new_derivations` RENAME TO `derivations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `derivations_tenants_links` ADD `signing_keys_id` text NOT NULL REFERENCES signing_keys(id);--> statement-breakpoint
ALTER TABLE `derivations_tenants_links` ADD `csig` text NOT NULL;
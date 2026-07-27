CREATE TABLE `building_images` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`source` text NOT NULL,
	`source_image_id` text NOT NULL,
	`source_page_url` text NOT NULL,
	`image_url` text NOT NULL,
	`thumbnail_url` text,
	`title` text,
	`creator` text,
	`license` text,
	`license_url` text,
	`captured_at` text,
	`match_method` text NOT NULL,
	`confidence` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "building_images_status_valid" CHECK("building_images"."status" IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `building_images_source_unique` ON `building_images` (`source`,`source_image_id`);--> statement-breakpoint
CREATE INDEX `building_images_building_status_idx` ON `building_images` (`building_id`,`status`);
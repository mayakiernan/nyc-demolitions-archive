CREATE TABLE `admin_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`reviewer` text NOT NULL,
	`decision` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "admin_reviews_decision_valid" CHECK("admin_reviews"."decision" IN ('approve', 'reject', 'request_edit'))
);
--> statement-breakpoint
CREATE INDEX `admin_reviews_submission_idx` ON `admin_reviews` (`submission_id`);--> statement-breakpoint
CREATE TABLE `buildings` (
	`id` text PRIMARY KEY NOT NULL,
	`bbl` text,
	`borough` text NOT NULL,
	`bin` integer,
	`house_number` text,
	`street_name` text,
	`block` integer,
	`lot` integer,
	`zip_code` text,
	`job_id` text NOT NULL,
	`job_doc_id` text NOT NULL,
	`job_type` text DEFAULT 'DM' NOT NULL,
	`building_type` text,
	`residential` integer DEFAULT false NOT NULL,
	`filing_date` text,
	`issuance_date` text,
	`expiration_date` text,
	`job_start_date` text,
	`permit_status` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`council_district` integer,
	`census_tract` text,
	`nta_name` text,
	`construction_year` integer,
	`architect_name` text,
	`landmark_status` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`source_updated_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "buildings_job_type_dm" CHECK("buildings"."job_type" = 'DM')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buildings_job_document_unique` ON `buildings` (`job_id`,`job_doc_id`);--> statement-breakpoint
CREATE INDEX `buildings_bbl_idx` ON `buildings` (`bbl`);--> statement-breakpoint
CREATE INDEX `buildings_status_issuance_idx` ON `buildings` (`permit_status`,`issuance_date`);--> statement-breakpoint
CREATE INDEX `buildings_location_idx` ON `buildings` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `buildings_construction_year_idx` ON `buildings` (`construction_year`);--> statement-breakpoint
CREATE TABLE `submission_media` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`url` text NOT NULL,
	`alt_text` text,
	`media_type` text DEFAULT 'image' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `submission_media_submission_idx` ON `submission_media` (`submission_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`submitter_name` text,
	`submitter_email` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`moderation_score` real,
	`moderation_reasons` text DEFAULT '[]' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "submissions_status_valid" CHECK("submissions"."status" IN ('pending', 'approved', 'rejected', 'needs_edit'))
);
--> statement-breakpoint
CREATE INDEX `submissions_building_idx` ON `submissions` (`building_id`);--> statement-breakpoint
CREATE INDEX `submissions_status_created_idx` ON `submissions` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`records_read` integer DEFAULT 0 NOT NULL,
	`records_upserted` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `sync_runs_source_started_idx` ON `sync_runs` (`source`,`started_at`);
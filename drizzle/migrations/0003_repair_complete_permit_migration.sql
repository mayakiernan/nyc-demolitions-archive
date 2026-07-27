ALTER TABLE `buildings` ADD `permit_type` text;
--> statement-breakpoint
ALTER TABLE `buildings` ADD `permit_subtype` text;
--> statement-breakpoint
ALTER TABLE `buildings` ADD `work_type` text;
--> statement-breakpoint
DROP INDEX `buildings_job_document_unique`;
--> statement-breakpoint
CREATE INDEX `buildings_job_document_idx` ON `buildings` (`job_id`,`job_doc_id`);

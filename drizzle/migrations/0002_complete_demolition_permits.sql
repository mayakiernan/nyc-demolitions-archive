ALTER TABLE `buildings` ADD `permit_sequence` text;
ALTER TABLE `buildings` ADD `permit_type` text;
ALTER TABLE `buildings` ADD `permit_subtype` text;
ALTER TABLE `buildings` ADD `work_type` text;
DROP INDEX `buildings_job_document_unique`;
CREATE INDEX `buildings_job_document_idx` ON `buildings` (`job_id`,`job_doc_id`);

/*
  Warnings:

  - The primary key for the `collections` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `comments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `default_questions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `documents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `original_file_name` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `sip_id` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `uuid` on the `documents` table. All the data in the column will be lost.
  - The primary key for the `documents_in_collections` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `groups` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `metadata_suggestions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `explanation` on the `metadata_suggestions` table. All the data in the column will be lost.
  - The primary key for the `oral_histories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `oral_histories` table. All the data in the column will be lost.
  - The primary key for the `refresh_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `research_requests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sips` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `sips` table. All the data in the column will be lost.
  - The primary key for the `users_in_groups` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `document_quality` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `iris` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sip_comments` table. If the table is not empty, all the data it contains will be lost.
  - The required column `id` was added to the `sips` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE `comments` DROP FOREIGN KEY `comments_document_id_fkey`;

-- DropForeignKey
ALTER TABLE `document_quality` DROP FOREIGN KEY `document_quality_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `document_quality` DROP FOREIGN KEY `document_quality_document_id_fkey`;

-- DropForeignKey
ALTER TABLE `document_quality` DROP FOREIGN KEY `document_quality_updated_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `documents` DROP FOREIGN KEY `documents_sip_id_fkey`;

-- DropForeignKey
ALTER TABLE `documents_in_collections` DROP FOREIGN KEY `documents_in_collections_collection_id_fkey`;

-- DropForeignKey
ALTER TABLE `documents_in_collections` DROP FOREIGN KEY `documents_in_collections_document_id_fkey`;

-- DropForeignKey
ALTER TABLE `iris` DROP FOREIGN KEY `iris_document_id_fkey`;

-- DropForeignKey
ALTER TABLE `metadata_suggestions` DROP FOREIGN KEY `metadata_suggestions_document_id_fkey`;

-- DropForeignKey
ALTER TABLE `research_requests` DROP FOREIGN KEY `research_requests_document_id_fkey`;

-- DropForeignKey
ALTER TABLE `sip_comments` DROP FOREIGN KEY `sip_comments_sip_id_fkey`;

-- DropForeignKey
ALTER TABLE `sip_comments` DROP FOREIGN KEY `sip_comments_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `users_in_groups` DROP FOREIGN KEY `users_in_groups_group_id_fkey`;

-- DropIndex
DROP INDEX `documents_sip_id_idx` ON `documents`;

-- DropIndex
DROP INDEX `documents_uuid_idx` ON `documents`;

-- DropIndex
DROP INDEX `documents_uuid_key` ON `documents`;

-- DropIndex
DROP INDEX `oral_histories_uuid_idx` ON `oral_histories`;

-- DropIndex
DROP INDEX `oral_histories_uuid_key` ON `oral_histories`;

-- AlterTable
ALTER TABLE `collections` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `comments` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `document_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `default_questions` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `documents` DROP PRIMARY KEY,
    DROP COLUMN `original_file_name`,
    DROP COLUMN `sip_id`,
    DROP COLUMN `uuid`,
    ADD COLUMN `ai_modified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `ai_modified_fields` JSON NOT NULL,
    ADD COLUMN `error_page_numbers` JSON NOT NULL,
    ADD COLUMN `error_types` JSON NOT NULL,
    ADD COLUMN `has_errors` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `iris` JSON NOT NULL,
    ADD COLUMN `plugins_enabled` JSON NOT NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `group_to_share` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `documents_in_collections` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `document_id` VARCHAR(191) NOT NULL,
    MODIFY `collection_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `groups` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `metadata_suggestions` DROP PRIMARY KEY,
    DROP COLUMN `explanation`,
    ADD COLUMN `rejectionExplanation` TEXT NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `document_id` VARCHAR(191) NOT NULL,
    MODIFY `state` ENUM('PENDING', 'APPROVED', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `oral_histories` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `group_to_share` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `refresh_tokens` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `research_requests` DROP PRIMARY KEY,
    ADD COLUMN `approved_by_id` VARCHAR(191) NULL,
    ADD COLUMN `rejectionExplanation` TEXT NULL,
    ADD COLUMN `research_end_date` DATETIME(3) NULL,
    ADD COLUMN `research_start_date` DATETIME(3) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `document_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `sips` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    ADD COLUMN `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `users` ADD COLUMN `password_reset_expires` DATETIME(3) NULL,
    ADD COLUMN `password_reset_token` TEXT NULL;

-- AlterTable
ALTER TABLE `users_in_groups` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `group_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- DropTable
DROP TABLE `document_quality`;

-- DropTable
DROP TABLE `iris`;

-- DropTable
DROP TABLE `sip_comments`;

-- CreateTable
CREATE TABLE `sip_documents` (
    `sip_id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `sip_documents_sip_id_idx`(`sip_id`),
    INDEX `sip_documents_document_id_idx`(`document_id`),
    PRIMARY KEY (`sip_id`, `document_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sip_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `external_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `stage` ENUM('QUEUED', 'VALIDATING', 'PREPARING', 'GENERATING', 'PACKAGING', 'FINALIZING', 'COMPLETE', 'ERROR') NOT NULL DEFAULT 'QUEUED',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `document_ids` JSON NOT NULL,
    `archive_id` VARCHAR(191) NULL,
    `metadata` JSON NOT NULL,
    `result` JSON NULL,
    `error` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,

    UNIQUE INDEX `sip_jobs_external_id_key`(`external_id`),
    INDEX `sip_jobs_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `research_requests_document_id_requested_by_id_created_at_idx` ON `research_requests`(`document_id`, `requested_by_id`, `created_at`);

-- AddForeignKey
ALTER TABLE `documents_in_collections` ADD CONSTRAINT `documents_in_collections_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents_in_collections` ADD CONSTRAINT `documents_in_collections_collection_id_fkey` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_in_groups` ADD CONSTRAINT `users_in_groups_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sip_documents` ADD CONSTRAINT `sip_documents_sip_id_fkey` FOREIGN KEY (`sip_id`) REFERENCES `sips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sip_documents` ADD CONSTRAINT `sip_documents_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metadata_suggestions` ADD CONSTRAINT `metadata_suggestions_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `research_requests` ADD CONSTRAINT `research_requests_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sip_jobs` ADD CONSTRAINT `sip_jobs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

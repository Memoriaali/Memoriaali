-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `hashed_password` TEXT NOT NULL,
    `salt` TEXT NOT NULL,
    `role` ENUM('ADMIN', 'MODERATOR', 'USER', 'EXPERT') NOT NULL DEFAULT 'USER',
    `account_type` ENUM('PRIVATE', 'COMPANY') NOT NULL DEFAULT 'PRIVATE',
    `is_activated` BOOLEAN NOT NULL DEFAULT false,
    `verification_code` TEXT NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `first_name` TEXT NULL,
    `last_name` TEXT NULL,
    `street_address` TEXT NULL,
    `postal_code` TEXT NULL,
    `post_office` TEXT NULL,
    `telephone` TEXT NULL,
    `profession` TEXT NULL,
    `company_name` TEXT NULL,
    `company_email` TEXT NULL,
    `company_telephone` TEXT NULL,
    `company_contact_person` TEXT NULL,
    `organization` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,
    `updated_by_id` VARCHAR(191) NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_username_idx`(`username`),
    INDEX `users_organization_idx`(`organization`(100)),
    INDEX `users_created_by_id_idx`(`created_by_id`),
    INDEX `users_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `file_name` TEXT NOT NULL,
    `original_file_name` TEXT NULL,
    `ocr_text` TEXT NULL,
    `mime_type` TEXT NULL,
    `uuid` VARCHAR(36) NOT NULL,
    `sip_id` VARCHAR(36) NULL,
    `document_privacy` ENUM('PUBLIC', 'PRIVATE', 'GROUP', 'RESEARCH_ONLY') NOT NULL DEFAULT 'PUBLIC',
    `share_to_group` BOOLEAN NULL,
    `group_to_share` INTEGER NULL,
    `metadata` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `documents_uuid_key`(`uuid`),
    INDEX `documents_user_id_idx`(`user_id`),
    INDEX `documents_sip_id_idx`(`sip_id`),
    INDEX `documents_uuid_idx`(`uuid`),
    INDEX `documents_document_privacy_idx`(`document_privacy`),
    INDEX `documents_created_at_idx`(`created_at`),
    INDEX `documents_created_by_id_idx`(`created_by_id`),
    INDEX `documents_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_quality` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `has_errors` BOOLEAN NOT NULL DEFAULT false,
    `error_types` JSON NOT NULL,
    `error_page_numbers` JSON NOT NULL,
    `ai_modified` BOOLEAN NOT NULL DEFAULT false,
    `ai_modified_fields` JSON NOT NULL,
    `plugins_enabled` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `document_quality_document_id_key`(`document_id`),
    INDEX `document_quality_has_errors_idx`(`has_errors`),
    INDEX `document_quality_ai_modified_idx`(`ai_modified`),
    INDEX `document_quality_created_by_id_idx`(`created_by_id`),
    INDEX `document_quality_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `collection_name` TEXT NOT NULL,
    `collection_description` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `collections_collection_name_idx`(`collection_name`(100)),
    INDEX `collections_created_by_id_idx`(`created_by_id`),
    INDEX `collections_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `group_name` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `groups_group_name_idx`(`group_name`(100)),
    INDEX `groups_created_by_id_idx`(`created_by_id`),
    INDEX `groups_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents_in_collections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `collection_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `documents_in_collections_document_id_idx`(`document_id`),
    INDEX `documents_in_collections_collection_id_idx`(`collection_id`),
    INDEX `documents_in_collections_created_by_id_idx`(`created_by_id`),
    INDEX `documents_in_collections_updated_by_id_idx`(`updated_by_id`),
    UNIQUE INDEX `documents_in_collections_document_id_collection_id_key`(`document_id`, `collection_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users_in_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `group_id` INTEGER NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `metadata` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `users_in_groups_group_id_idx`(`group_id`),
    INDEX `users_in_groups_user_id_idx`(`user_id`),
    INDEX `users_in_groups_created_by_id_idx`(`created_by_id`),
    INDEX `users_in_groups_updated_by_id_idx`(`updated_by_id`),
    UNIQUE INDEX `users_in_groups_group_id_user_id_key`(`group_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `comment` TEXT NOT NULL,
    `state` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `comments_document_id_idx`(`document_id`),
    INDEX `comments_user_id_idx`(`user_id`),
    INDEX `comments_state_idx`(`state`),
    INDEX `comments_created_by_id_idx`(`created_by_id`),
    INDEX `comments_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oral_histories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `file_name` TEXT NOT NULL,
    `uuid` VARCHAR(36) NOT NULL,
    `person` TEXT NOT NULL,
    `reporter` TEXT NOT NULL,
    `event` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `language` TEXT NOT NULL,
    `group_to_share` INTEGER NULL,
    `share_to_group` BOOLEAN NULL,
    `questions` JSON NOT NULL,
    `keywords` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `oral_histories_uuid_key`(`uuid`),
    INDEX `oral_histories_user_id_idx`(`user_id`),
    INDEX `oral_histories_uuid_idx`(`uuid`),
    INDEX `oral_histories_created_by_id_idx`(`created_by_id`),
    INDEX `oral_histories_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sips` (
    `uuid` VARCHAR(36) NOT NULL,
    `file_name` TEXT NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `sips_creator_id_idx`(`creator_id`),
    INDEX `sips_created_by_id_idx`(`created_by_id`),
    INDEX `sips_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sip_comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sip_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `comment` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `sip_comments_sip_id_idx`(`sip_id`),
    INDEX `sip_comments_user_id_idx`(`user_id`),
    INDEX `sip_comments_created_by_id_idx`(`created_by_id`),
    INDEX `sip_comments_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metadata_suggestions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `suggested_by_id` VARCHAR(191) NOT NULL,
    `approved_by_id` VARCHAR(191) NULL,
    `state` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `field_to_change` TEXT NOT NULL,
    `changed_value` TEXT NOT NULL,
    `explanation` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `metadata_suggestions_document_id_idx`(`document_id`),
    INDEX `metadata_suggestions_suggested_by_id_idx`(`suggested_by_id`),
    INDEX `metadata_suggestions_state_idx`(`state`),
    INDEX `metadata_suggestions_created_by_id_idx`(`created_by_id`),
    INDEX `metadata_suggestions_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `research_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `requested_by_id` VARCHAR(191) NOT NULL,
    `state` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `purpose` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `research_requests_document_id_idx`(`document_id`),
    INDEX `research_requests_requested_by_id_idx`(`requested_by_id`),
    INDEX `research_requests_state_idx`(`state`),
    INDEX `research_requests_created_by_id_idx`(`created_by_id`),
    INDEX `research_requests_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `default_questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` TEXT NOT NULL,
    `sort_index` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `default_questions_sort_index_idx`(`sort_index`),
    INDEX `default_questions_created_by_id_idx`(`created_by_id`),
    INDEX `default_questions_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iris` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `iri_type` ENUM('PERSON', 'PLACE', 'EVENT', 'CONCEPT', 'ORGANIZATION') NOT NULL,
    `iri` TEXT NOT NULL,
    `label` TEXT NOT NULL,
    `document_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `updated_by_id` VARCHAR(191) NOT NULL,

    INDEX `iris_document_id_idx`(`document_id`),
    INDEX `iris_iri_type_idx`(`iri_type`),
    INDEX `iris_created_by_id_idx`(`created_by_id`),
    INDEX `iris_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `token` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `refresh_tokens_user_id_idx`(`user_id`),
    INDEX `refresh_tokens_token_idx`(`token`(100)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_sip_id_fkey` FOREIGN KEY (`sip_id`) REFERENCES `sips`(`uuid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_quality` ADD CONSTRAINT `document_quality_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_quality` ADD CONSTRAINT `document_quality_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_quality` ADD CONSTRAINT `document_quality_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collections` ADD CONSTRAINT `collections_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collections` ADD CONSTRAINT `collections_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents_in_collections` ADD CONSTRAINT `documents_in_collections_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents_in_collections` ADD CONSTRAINT `documents_in_collections_collection_id_fkey` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_in_groups` ADD CONSTRAINT `users_in_groups_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_in_groups` ADD CONSTRAINT `users_in_groups_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oral_histories` ADD CONSTRAINT `oral_histories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sips` ADD CONSTRAINT `sips_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sip_comments` ADD CONSTRAINT `sip_comments_sip_id_fkey` FOREIGN KEY (`sip_id`) REFERENCES `sips`(`uuid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sip_comments` ADD CONSTRAINT `sip_comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metadata_suggestions` ADD CONSTRAINT `metadata_suggestions_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metadata_suggestions` ADD CONSTRAINT `metadata_suggestions_suggested_by_id_fkey` FOREIGN KEY (`suggested_by_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metadata_suggestions` ADD CONSTRAINT `metadata_suggestions_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metadata_suggestions` ADD CONSTRAINT `metadata_suggestions_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `research_requests` ADD CONSTRAINT `research_requests_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `research_requests` ADD CONSTRAINT `research_requests_requested_by_id_fkey` FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `research_requests` ADD CONSTRAINT `research_requests_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `research_requests` ADD CONSTRAINT `research_requests_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `default_questions` ADD CONSTRAINT `default_questions_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `default_questions` ADD CONSTRAINT `default_questions_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iris` ADD CONSTRAINT `iris_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

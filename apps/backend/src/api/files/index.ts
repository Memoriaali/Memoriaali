/**
 * FILES API MODULE
 * ================
 *
 * This module provides file download functionality for the Memoriaali backend system.
 * It allows authenticated users to download files associated with documents,
 * with comprehensive access control based on document privacy settings.
 *
 * Features:
 * - Secure file downloads with privacy validation
 * - Role-based access control
 * - File streaming for large files
 * - Comprehensive error handling
 * - Swagger API documentation
 *
 * Security:
 * - Authentication required for all endpoints
 * - Document privacy validation
 * - File access control based on user permissions
 * - Secure file delivery with proper headers
 */

export { FilesController } from './files.controller.js';
export { createFilesRoutes } from './files.routes.js';
export { FilesService } from './files.service.js';

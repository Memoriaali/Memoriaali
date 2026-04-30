/**
 * DocumentPathResolver
 *
 * Resolves storage-relative paths for documents under UPLOAD_DIR.
 * Current strategy: `${UPLOAD_DOCUMENTS_SUBDIR || 'documents'}/${documentId}`.
 *
 * Preconditions: documentIds are valid UUID strings
 * Postconditions: returns array of relative paths (no leading slash)
 * Invariants: paths are OS-agnostic forward-slash joined
 */
export const resolveRelativePaths = (documentIds: string[]): string[] => {
  const subdir = process.env.UPLOAD_DOCUMENTS_SUBDIR ?? 'documents';
  return documentIds.map((id) => `${subdir}/${id}`);
};

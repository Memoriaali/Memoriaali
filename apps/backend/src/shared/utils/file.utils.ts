const units = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Format file size for human-readable output
 */
export const formatFileSize = (size: number): string => {
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

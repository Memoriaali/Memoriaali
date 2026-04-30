export type FlawDetectionConfig = {
  api: string;
  emptyPages: boolean;
  foldedCorner: boolean;
  postIt: boolean;
};

export const isFlawDetectionEnabled = (config?: FlawDetectionConfig | null): boolean => {
  if (!config) return false;

  return Object.values(config).some(Boolean);
};

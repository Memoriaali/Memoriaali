export type MetadataDetectionConfig = {
  api: string;
  annif: boolean;
  gpe: boolean;
  date: boolean;
  name: boolean;
  act: boolean;
  y_field: boolean;
  diar: boolean;
  product: boolean;
  event: boolean;
  norp: boolean;
};

export const isMetadataDetectionEnabled = (config?: MetadataDetectionConfig | null): boolean => {
  if (!config) return false;

  return Object.values(config).some(Boolean);
};

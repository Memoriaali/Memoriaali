import { isMetadataDetectionEnabled } from '@/lib/variant/metadataDetection';
import { useFeatureConfig } from './useVariant';

export const useMetadataDetectionEnabled = (): boolean => {
  const feature = useFeatureConfig('metadataDetection');
  return isMetadataDetectionEnabled(feature?.config);
};

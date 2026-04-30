import { isFlawDetectionEnabled } from '@/lib/variant/flawDetection';
import { useFeatureConfig } from './useVariant';

export const useFlawDetectionEnabled = (): boolean => {
  const feature = useFeatureConfig('flawDetection');
  return isFlawDetectionEnabled(feature?.config);
};

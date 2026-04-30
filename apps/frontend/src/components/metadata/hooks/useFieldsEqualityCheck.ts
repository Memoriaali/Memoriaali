import NewEventEmitter from '@/components/eventEmitter/EventEmitter';
import { useEffect, useState } from 'react';
import { Control, useWatch } from 'react-hook-form';
import type { FormValues } from '../MetadataForm';

export const useFieldsEqualityCheck = (
  control: Control<FormValues>,
  fieldPaths: Array<`forms.${string}.${string}`>,
  originalValues: Record<string, unknown>,
  source: string,
): Record<string, boolean> => {
  const [equalityMap, setEqualityMap] = useState<Record<string, boolean>>({});

  const watchedValues = useWatch({ control, name: fieldPaths });

  useEffect(() => {
    const normalize = (val: unknown): string =>
      Array.isArray(val) ? val.join(', ') : String(val ?? '');

    const next: Record<string, boolean> = {};

    fieldPaths.forEach((path, i) => {
      const fieldKey = path.split('.').pop() ?? path;
      const currentValue = watchedValues?.[i];
      const originalValue = originalValues[fieldKey];

      const hasOriginal = normalize(originalValue) !== '';
      const isSame = normalize(currentValue) === normalize(originalValue);

      next[fieldKey] = !(source === 'MetadataFormGridTab' && hasOriginal && isSame);
    });

    // Shallow compare to avoid needless state updates
    const same =
      Object.keys(next).length === Object.keys(equalityMap).length &&
      Object.keys(next).every((k) => equalityMap[k] === next[k]);

    if (!same) {
      setEqualityMap(next);
      NewEventEmitter.emit('isAiField', next);
    }
    // With fix A in place, these deps are stable.
  }, [watchedValues, fieldPaths, originalValues, source, equalityMap]);

  return equalityMap;
};

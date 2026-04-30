import { useEffect, useState } from 'react';

import type { AiMetadata, FormData } from '../MetadataForm';

export function useMetadataFieldValue(
  aiMetadata: AiMetadata[],
  sharedMetadata: { forms: { [id: string]: FormData } },
  index: string,
  source: string,
  fieldName: string,
  aiIndex: number,
) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const filteredInfo =
      aiMetadata?.filter((i: AiMetadata) => i.data?.[0]?.[14]?.includes(index)) ?? [];
    let aiValue =
      filteredInfo.length > 0 && filteredInfo[0]?.data?.[0]?.[3] !== '[]'
        ? filteredInfo[0]?.data?.[0]?.[aiIndex]
        : '';

    if (typeof aiValue === 'string') {
      aiValue = aiValue.replace(/\[|\]/g, '');
    }

    const sharedValue =
      sharedMetadata.forms?.[0]?.[fieldName] !== undefined
        ? String(sharedMetadata.forms?.[0]?.[fieldName])
        : '';

    if (source === 'EditFileModal') {
      if (sharedValue) {
        setValue(sharedValue);
      } else if (aiValue) {
        setValue(aiValue);
      } else {
        setValue('');
      }
    } else {
      if (aiValue && sharedValue && source === 'MetadataFormGridTab') {
        setValue(`${sharedValue}, ${aiValue}`);
      } else if (!aiValue && sharedValue && source === 'MetadataFormGridTab') {
        setValue(sharedValue);
      } else if (aiValue && !sharedValue && source === 'MetadataFormGridTab') {
        setValue(aiValue);
      } else {
        setValue('');
      }
    }
  }, [aiMetadata, sharedMetadata, index, source, aiIndex, fieldName]);

  return value;
}

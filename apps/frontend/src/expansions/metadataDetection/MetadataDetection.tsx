import type { UploadedFile } from '../../components/addFile/AddFileModal';

interface MetadataResponse {
  columns: [];
  data: [];
  index: [];
}

interface ErrorResponse {
  error: true;
  message: string;
}

export const MetadataDetection = async (
  uploadedFiles: UploadedFile[],
  detectionFields: {
    annif: boolean;
    gpe?: boolean;
    date?: boolean;
    name?: boolean;
    act?: boolean;
    y_field?: boolean;
    diar?: boolean;
    product?: boolean;
    event?: boolean;
    norp?: boolean;
  },
  api: string | undefined,
): Promise<(MetadataResponse | ErrorResponse)[]> => {
  const annifFlag = detectionFields.annif ? 1 : 0;
  const gpeFlag = detectionFields.gpe ? 1 : 0;
  const dateFlag = detectionFields.date ? 1 : 0;
  const nameFlag = detectionFields.name ? 1 : 0;
  const actFlag = detectionFields.act ? 1 : 0;
  const yFieldFlag = detectionFields.y_field ? 1 : 0;
  const diarFlag = detectionFields.diar ? 1 : 0;
  const productFlag = detectionFields.product ? 1 : 0;
  const eventFlag = detectionFields.event ? 1 : 0;
  const norpFlag = detectionFields.norp ? 1 : 0;

  const results: (MetadataResponse | ErrorResponse)[] = await Promise.all(
    uploadedFiles.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file.file);

      try {
        const res = await fetch(
          `${api}/?annif=${annifFlag}&name=${nameFlag}&act=${actFlag}&sos=0&y_field=${yFieldFlag}&diar=${diarFlag}&date=${dateFlag}&lang=0&loc=0&gpe=${gpeFlag}&product=${productFlag}&event=${eventFlag}&norp=${norpFlag}&te=1&id=${file.id}`,
          {
            method: 'POST',
            body: formData,
          },
        );

        const responseText = await res.text();
        const response: MetadataResponse = JSON.parse(responseText);
        return response;
      } catch (error: unknown) {
        console.error('Metadata detection failed:', error);
        if (error instanceof Error) {
          return { error: true, message: error.message };
        } else {
          return { error: true, message: 'Unknown error occurred' };
        }
      }
    }),
  );

  return results;
};

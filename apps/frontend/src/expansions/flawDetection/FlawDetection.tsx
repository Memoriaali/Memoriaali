interface FlawResult {
  [key: string]: unknown;
}

export const FlawDetection = async (
  file: File,
  id: string,
  postIt: boolean,
  corner: boolean,
  empty: boolean,
  flawApi: string | undefined,
): Promise<FlawResult> => {
  const emptyFlag = empty ? 1 : 0;
  const postItFlag = postIt ? 1 : 0;
  const cornerFlag = corner ? 1 : 0;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch(
      `${flawApi}/detect?postit=${postItFlag}&corner=${cornerFlag}&empty=${emptyFlag}&writing_type=0&id=${id}`,
      {
        method: 'POST',
        body: formData,
      },
    );

    const responseText = await res.text();
    const response = JSON.parse(responseText);

    return response;
  } catch (error) {
    console.error('Flaw detection failed:', error);
    throw error;
  }
};

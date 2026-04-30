'use client';
import { useDocuments } from '@/hooks/useDocuments';
import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import PreviewModal from './PreviewModal';

interface GetDocumentByIdForPreviewProps {
  documentId: string;
}

const GetDocumentByIdForPreview: React.FC<GetDocumentByIdForPreviewProps> = ({ documentId }) => {
  const t = useTranslations('PreviewModal');
  const { getDocumentImage, getOneDocumentById } = useDocuments();

  const [document, setDocument] = useState<DocumentType>({} as DocumentType);

  // State for opening and closing preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Functions to handle opening and closing preview modal
  const handleClosePreviewModal = () => setShowPreviewModal(false);
  const handleShowPreviewModal = () => setShowPreviewModal(true);

  // getting the image url for the file
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);

  // State for handling errors
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Fetch document data and image when component mounts
  const fetchDocument = async () => {
    setLoading(true);
    try {
      const result = await getOneDocumentById(documentId);
      const doc = result.data?.data as DocumentType;
      setDocument(doc);

      setImageSrc(await getDocumentImage(documentId));
    } catch {
      setSubmitError(t('unExpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          fetchDocument();
          handleShowPreviewModal();
        }}
      >
        {t('preview')}
      </Button>
      {submitError && <Alert variant='danger'>{submitError}</Alert>}

      {showPreviewModal && (
        <PreviewModal
          showPreviewModal={showPreviewModal}
          handleClosePreviewModal={handleClosePreviewModal}
          document={document}
          imageSrc={imageSrc}
          loading={loading}
        />
      )}
    </>
  );
};

export default GetDocumentByIdForPreview;

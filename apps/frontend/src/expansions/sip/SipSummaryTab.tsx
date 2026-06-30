import { useSip } from '@/hooks/useSip';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import styles from './SelectedDocumentsTab.module.css';

interface SipSummaryProps {
  handleClose: () => void;
  setKey: (key: string) => void;
  selectedDocuments: string[];
  sipMetadata: SipMetadataFormValues;
  setSelectedDocuments: React.Dispatch<React.SetStateAction<string[]>>;
  setSipError: React.Dispatch<React.SetStateAction<string | null>>;
}

interface SipMetadataFormValues {
  title: string;
  description: string;
  creator: string;
  subject: string;
}

const SipSummary = ({
  handleClose,
  setKey,
  selectedDocuments,
  sipMetadata,
  setSelectedDocuments,
  setSipError,
}: SipSummaryProps) => {
  const t = useTranslations('SipPackageCreation');
  const { createNewSipPackage } = useSip();

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: SipMetadataFormValues) => {
    setIsLoading(true);

    try {
      await createNewSipPackage({
        documentIds: selectedDocuments,
        metadata: {
          title: data.title,
          description: data.description,
          creator: data.creator,
          subject: data.subject,
        },
        packageMode: 'single',
        includePreservationMetadata: true,
        metadataFormat: 'dc',
      });

      setSelectedDocuments([]);
      setKey('finishSipCreation');
    } catch (error) {
      setSipError(t('unexpectedError'));
      setKey('finishSipCreation');
      console.error('Error creating SIP package:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal.Header
        className={`${styles.modalBg} ${styles.modalHeader} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.modalTitle}>{t('sipPackageSummary')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleClose}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>
      <Modal.Body className={`${styles.modalBody} ${styles.modalBg}`}>
        <p>
          {t('title')}: {sipMetadata.title}
        </p>
        <p>
          {t('description')}: {sipMetadata.description}
        </p>
        <p>
          {t('creator')}: {sipMetadata.creator}
        </p>
        <p>
          {t('subject')}: {sipMetadata.subject}
        </p>
        <br />
        <p>
          {t('selectedDocuments')}: {selectedDocuments.length}
        </p>
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='secondary' onClick={handleClose}>
          {t('cancel')}
        </Button>
        <Button variant='primary' onClick={() => onSubmit(sipMetadata)} disabled={isLoading}>
          {isLoading ? t('loading') : t('next')}
        </Button>
      </Modal.Footer>
    </>
  );
};

export default SipSummary;

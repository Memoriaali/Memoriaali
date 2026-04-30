'use client';
import { useMetadatasuggestions } from '@/hooks/useMetadatasuggestions';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import styles from './PendingMetadataSuggestions.module.css';

interface RejectionExplanationProps {
  showRejectionExplanationModal: boolean;
  handleCloseRejectionExplanationModal: () => void;
  suggestionId: string;
  getPendingSuggestions: () => Promise<void>;
  handleShowMessage: (text: string) => void;
  setSubmitError: (error: string | null) => void;
}

const RejectionExplanationModal: React.FC<RejectionExplanationProps> = ({
  showRejectionExplanationModal,
  handleCloseRejectionExplanationModal,
  suggestionId,
  getPendingSuggestions,
  handleShowMessage,
  setSubmitError,
}) => {
  const t = useTranslations('Moderating');
  const { rejectUsersSuggestion } = useMetadatasuggestions();
  const router = useRouter();

  const [rejectionExplanation, setRejectionExplanation] = useState<string>('');

  const handleExplanationChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setRejectionExplanation(event.target.value);
  };

  const rejectSuggestion = useCallback(
    async (suggestionId: string) => {
      try {
        await rejectUsersSuggestion(suggestionId, rejectionExplanation);
        setRejectionExplanation('');
        getPendingSuggestions();
        handleShowMessage(t('suggestionRejectSuccess'));
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'statusCode' in error) {
          const { statusCode } = error as { statusCode: number };
          if (statusCode === 401) {
            router.push('/login?error=sessionExpired');
            return;
          } else if (statusCode === 403) {
            setSubmitError(t('accessDenied'));
          } else if (statusCode === 404 || statusCode === 400) {
            setSubmitError(t('suggestionNotFound'));
          } else {
            setSubmitError(t('unexpectedError'));
          }
        } else {
          setSubmitError(t('unexpectedError'));
        }
      }
    },
    [
      rejectUsersSuggestion,
      rejectionExplanation,
      getPendingSuggestions,
      handleShowMessage,
      t,
      router,
      setSubmitError,
    ],
  );

  return (
    <Modal
      show={showRejectionExplanationModal}
      onHide={handleCloseRejectionExplanationModal}
      size='lg'
      centered
    >
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>
          {t('rejectionExplanationModalTitle')}
        </Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseRejectionExplanationModal}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>
        <Form.Group controlId='explanation'>
          <Form.Label>{t('rejectionExplanation')}</Form.Label>
          <Form.Control as='textarea' rows={3} onChange={handleExplanationChange} />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='primary' onClick={() => rejectSuggestion(suggestionId)}>
          {t('rejectSuggestion')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RejectionExplanationModal;

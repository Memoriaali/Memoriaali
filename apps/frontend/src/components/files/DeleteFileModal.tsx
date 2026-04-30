import { useDocuments } from '@/hooks/useDocuments';
import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import NewEventEmitter from '../eventEmitter/EventEmitter';
import styles from './DeleteFileModal.module.css';

interface DeleteFileModalProps {
  showDeleteFileModal: boolean;
  handleCloseDeleteFileModal: () => void;
  document: DocumentType;
  handleShowMessage: (_message: string) => void;
}

const DeleteFileModal = ({
  showDeleteFileModal,
  handleCloseDeleteFileModal,
  document,
  handleShowMessage,
}: DeleteFileModalProps) => {
  const t = useTranslations('Files');
  const { deleteFromDocuments } = useDocuments();

  // State for handling submission errors
  const [submitError, setSubmitError] = useState<string | null>(null);

  const deleteDocument = useCallback(async () => {
    try {
      const result = await deleteFromDocuments(document.id);

      if (result.data?.message === 'Document deleted successfully') {
        handleCloseDeleteFileModal();
        NewEventEmitter.emit('documentAdded');
        handleShowMessage(t('deleteSuccess'));
      }
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message;

        if (message === 'Insufficient permissions. Required roles: MODERATOR, ADMIN') {
          setSubmitError(t('noPermissionDelete'));
        } else if (message === 'Submission not found') {
          setSubmitError(t('fileNotFound'));
        } else {
          setSubmitError(t('unexpectedError'));
        }
      }
    }
  }, [deleteFromDocuments, document.id, handleCloseDeleteFileModal, handleShowMessage, t]);

  return (
    <Modal show={showDeleteFileModal} onHide={handleCloseDeleteFileModal} size='lg' centered>
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('deleteMaterial')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseDeleteFileModal}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>
        {submitError && <Alert variant='danger'>{submitError}</Alert>}
        <p className={styles.deleteFileText}>
          {t('deleteFileConfirmation')} <br />
          {t('deleteFileWarning')}
        </p>
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='secondary' onClick={handleCloseDeleteFileModal}>
          {t('cancel')}
        </Button>
        <Button variant='danger' onClick={deleteDocument}>
          {t('deleteMaterial')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteFileModal;

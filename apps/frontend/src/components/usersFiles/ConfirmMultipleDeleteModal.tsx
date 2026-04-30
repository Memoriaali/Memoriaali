import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Button, Modal } from 'react-bootstrap';
import styles from './confirmMultipleDeleteModal.module.css';

interface DeleteConfirmationModalProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmMultipleDeleteModal: React.FC<DeleteConfirmationModalProps> = ({
  show,
  onConfirm,
  onCancel,
}) => {
  const t = useTranslations('UsersFiles');
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('areYouSure')}</Modal.Title>
        <Button
          variant='link'
          onClick={onCancel}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>
      <Modal.Body className={styles.modalBg}>
        <p className='justify-center'>
          {t('deleteFileConfirmation')} <br />
          {t('deleteFileWarning')}
        </p>
      </Modal.Body>
      <Modal.Footer className={styles.modalBg}>
        <Button variant='secondary' onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button variant='danger' onClick={onConfirm}>
          {t('deleteMaterial')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmMultipleDeleteModal;

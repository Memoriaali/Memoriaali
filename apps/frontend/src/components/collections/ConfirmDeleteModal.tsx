import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Button, Modal } from 'react-bootstrap';
import styles from './ConfirmDeleteModal.module.css';

interface ConfirmationModalProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isError?: boolean;
  description?: React.ReactNode;
}

const ConfirmDeleteModal: React.FC<ConfirmationModalProps> = ({
  show,
  onConfirm,
  onCancel,
  isError,
  description,
}) => {
  const t = useTranslations('Collections');
  return (
    <Modal show={show} onHide={onCancel} size='lg' centered className={`${styles.modal}`}>
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('confirmDelete')}</Modal.Title>
        <Button
          variant='link'
          onClick={onCancel}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>{description}</Modal.Body>
      <Modal.Footer className={styles.modalBg}>
        {isError ? (
          <Button variant='primary' onClick={onCancel}>
            {t('ok')}
          </Button>
        ) : (
          <>
            <Button variant='outline-secondary' onClick={onCancel}>
              {t('no')}
            </Button>

            <Button variant='primary' onClick={onConfirm}>
              {t('yes')}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmDeleteModal;

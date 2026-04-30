import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Button, Modal } from 'react-bootstrap';
import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ show, onConfirm, onCancel }) => {
  const t = useTranslations('RecordOralHistory');
  return (
    <Modal
      show={show}
      onHide={onCancel}
      size='lg'
      centered
      className={styles.recordConfirmationModal}
    >
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('confirmCloseWindow')}</Modal.Title>
        <Button variant='link' onClick={onCancel} className={styles.customClose}>
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>{t('loseDataWarning')}</Modal.Body>
      <Modal.Footer className={styles.modalBg}>
        <Button variant='outline-secondary' onClick={onCancel}>
          {t('no')}
        </Button>
        <Button variant='primary' onClick={onConfirm}>
          {t('yes')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmationModal;

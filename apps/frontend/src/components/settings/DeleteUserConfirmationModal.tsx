import { User } from '@/lib/api/generated/types.gen';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import styles from './DeleteUserConfirmationModal.module.css';

interface ConfirmationModalProps {
  user: User;
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  alertMessage?: string;
}

const DeleteUserConfirmationModal: React.FC<ConfirmationModalProps> = ({
  user,
  show,
  onConfirm,
  onCancel,
  alertMessage,
}) => {
  const t = useTranslations('Settings');

  const showDeleteFailedAlert =
    alertMessage === t('cannotDeleteOwnAccount') || alertMessage === t('unexpectedError');

  return (
    <Modal show={show} onHide={onCancel} size='lg' centered className={`${styles.modal}`}>
      <Modal.Header
        className={`${styles.confirmationModalBg} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.confirmationModalTitle}>
          {t('deleteUserModalTitle')}
        </Modal.Title>
        <Button
          variant='link'
          onClick={onCancel}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.confirmationModalBg}>
        <p>{t('deleteUserModalAlertHeading')}</p>
        <p>
          {t('username')}: <b className={styles.userToDelete}>{user?.username}</b>
        </p>
        <p>{t('deleteUserModalAlertText')}</p>
        {showDeleteFailedAlert && (
          <Alert variant='danger' role='alert'>
            {alertMessage}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer className={styles.confirmationModalBg}>
        <Button variant='outline-secondary' onClick={onCancel}>
          {t('deleteUserModalCancelButton')}
        </Button>
        <Button variant='outline-danger' onClick={onConfirm}>
          {t('deleteUserModalConfirmButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteUserConfirmationModal;

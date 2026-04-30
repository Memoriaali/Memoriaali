import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { Question } from '../../expansions/oralHistory/helperQuestions/QuestionsList';
import styles from './DeleteDefaultQuestionConfirmationModal.module.css';

interface ConfirmationModalProps {
  question: Question;
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  alertMessage?: string;
}

const DeleteDefaultQuestionConfirmationModal: React.FC<ConfirmationModalProps> = ({
  question,
  show,
  onConfirm,
  onCancel,
  alertMessage,
}) => {
  const t = useTranslations('Settings');

  const showDeleteFailedAlert = alertMessage === t('unexpectedError');

  return (
    <Modal
      show={show}
      onHide={onCancel}
      size='lg'
      centered
      className={styles.deleteDefaultQuestionsModal}
    >
      <Modal.Header
        className={`${styles.defaultQuestionConfirmationModalBg} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.defaultQuestionConfirmationModalTitle}>
          {t('deleteDefaultQuestionModalTitle')}
        </Modal.Title>
        <Button variant='link' onClick={onCancel} className={styles.customClose}>
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.defaultQuestionConfirmationModalBg}>
        <p>{t('deleteDefaultQuestionModalAlertHeading')}</p>
        <p>
          {t('question')}: <b className={styles.defaultQuestionToDelete}>{question?.text}</b>
        </p>
        {showDeleteFailedAlert && (
          <Alert variant='danger' role='alert'>
            {alertMessage}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer className={styles.defaultQuestionConfirmationModalBg}>
        <Button variant='outline-secondary' onClick={onCancel}>
          {t('deleteDefaultQuestionModalCancelButton')}
        </Button>
        <Button variant='outline-danger' onClick={onConfirm}>
          {t('deleteDefaultQuestionModalConfirmButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteDefaultQuestionConfirmationModal;

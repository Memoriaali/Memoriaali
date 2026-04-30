import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { Button, Modal } from 'react-bootstrap';
import QuestionsList from '../../expansions/oralHistory/helperQuestions/QuestionsList';
import styles from './EditDefaultQuestionsModal.module.css';

interface EditDefaultQuestionsModalProps {
  showEditDefaultQuestionsModal: boolean;
  handleCloseEditDefaultQuestionsModal: () => void;
  handleShowMessage: (text: string) => void;
}

const EditDefaultQuestionsModal = ({
  showEditDefaultQuestionsModal,
  handleCloseEditDefaultQuestionsModal,
  handleShowMessage,
}: EditDefaultQuestionsModalProps) => {
  const t = useTranslations('Settings');

  return (
    <Modal
      show={showEditDefaultQuestionsModal}
      onHide={handleCloseEditDefaultQuestionsModal}
      size='lg'
      centered
      className={styles.editDefaultQuestionsModal}
    >
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('manageDefaultQuestions')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseEditDefaultQuestionsModal}
          className={styles.customClose}
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>
        <p className={styles.EditDefaultQuestionsText}>{t('manageDefaultQuestionsDescription')}</p>

        <QuestionsList fullwidth isAdminSettings handleShowMessage={handleShowMessage} />
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='primary' onClick={() => handleCloseEditDefaultQuestionsModal()}>
          {t('closeWindow')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditDefaultQuestionsModal;

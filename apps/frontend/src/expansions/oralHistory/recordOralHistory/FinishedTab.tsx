import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { Button, Modal } from 'react-bootstrap';
import styles from './FinishedTab.module.css';

interface FinishedTabProps {
  handleClose: () => void;
}

const FinishedTab = ({ handleClose }: FinishedTabProps) => {
  const t = useTranslations('RecordOralHistory');

  return (
    <>
      <Modal.Header
        className={`${styles.modalBg} ${styles.modalHeader} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.modalTitle}>{t('finished')}</Modal.Title>
        <Button variant='link' onClick={handleClose} className={styles.customClose}>
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>
      <Modal.Body className={`${styles.modalBody} ${styles.modalBg}`}>
        {t('thankYou')}
        <br />
        {t('successMessage')}
      </Modal.Body>
      <Modal.Footer className={styles.modalBg}>
        <Button variant='primary' onClick={() => handleClose()}>
          {t('close')}
        </Button>
      </Modal.Footer>
    </>
  );
};

export default FinishedTab;

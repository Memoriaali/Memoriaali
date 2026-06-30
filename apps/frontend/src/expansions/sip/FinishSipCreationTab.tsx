import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { Button, Modal } from 'react-bootstrap';
import styles from './FinishSipCreationTab.module.css';

interface FinishSipCreationProps {
  handleClose: () => void;
  setKey: (key: string) => void;
  selectedDocuments: string[];
  sipError: string | null;
}

const FinishSipCreation = ({
  handleClose,
  setKey,
  selectedDocuments,
  sipError,
}: FinishSipCreationProps) => {
  const t = useTranslations('SipPackageCreation');

  return (
    <>
      <Modal.Header
        className={`${styles.modalBg} ${styles.modalHeader} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.modalTitle}>
          {sipError ? t('error') : t('finished')}
        </Modal.Title>
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
        {sipError ? <p>{sipError}</p> : <p>{t('sipPackageSuccess')}</p>}
        <br />
      </Modal.Body>
      <Modal.Footer className={styles.modalBg}>
        <Button variant='primary' onClick={() => handleClose()}>
          {t('close')}
        </Button>
      </Modal.Footer>
    </>
  );
};

export default FinishSipCreation;

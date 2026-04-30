import { faGear } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import styles from './FlawDetectionSettingsButton.module.css';
import FlawDetectionSettingsModal from './FlawDetectionSettingsModal';

const FlawDetectionSettingsButton: React.FC = () => {
  const t = useTranslations('FlawDetection');

  // State for opening and closing flaw detection settings modal
  const [showFlawDetectionSettingsModal, setShowFlawDetectionSettingsModal] = useState(false);

  // Functions to handle opening and closing flaw detection settings modal
  const handleCloseFlawDetectionSettingsModal = () => setShowFlawDetectionSettingsModal(false);
  const handleShowFlawDetectionSettingsModal = () => setShowFlawDetectionSettingsModal(true);

  return (
    <>
      <Button onClick={handleShowFlawDetectionSettingsModal}>
        <FontAwesomeIcon icon={faGear} /> {t('flawDetectionSettings')}
      </Button>

      <FlawDetectionSettingsModal
        handleCloseFlawDetectionSettingsModal={handleCloseFlawDetectionSettingsModal}
        showFlawDetectionSettingsModal={showFlawDetectionSettingsModal}
      />

      {showFlawDetectionSettingsModal && <div className={styles.overlay} />}
    </>
  );
};

export default FlawDetectionSettingsButton;

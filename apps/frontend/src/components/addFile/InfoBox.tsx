import { useFlawDetectionEnabled } from '@/hooks/useFlawDetectionEnabled';
import { useMetadataDetectionEnabled } from '@/hooks/useMetadataDetectionEnabled';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';

export default function InfoBox() {
  const t = useTranslations('AddFiles');
  const [show, setShow] = useState(false);

  // Check if AI tools are enabled by admin
  const flawDetectionEnabledByAdmin = useFlawDetectionEnabled();
  const metadataDetectionEnabledByAdmin = useMetadataDetectionEnabled();

  const checkPreference = () => {
    const hideReminders = localStorage.getItem('hideReminders');
    setShow(hideReminders !== 'true');
  };

  useEffect(() => {
    checkPreference();

    // Listen for changes from other components
    const handleStorageChange = () => checkPreference();
    window.addEventListener('storage', handleStorageChange);

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleClose = () => setShow(false);

  const handleDontShowAgain = () => {
    localStorage.setItem('hideReminders', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      {(flawDetectionEnabledByAdmin || metadataDetectionEnabledByAdmin) && (
        <Alert variant='warning' onClose={handleClose} dismissible className='mb-3 mt-3'>
          <Alert.Heading>{t('infoMessageHeader')}</Alert.Heading>

          {flawDetectionEnabledByAdmin && metadataDetectionEnabledByAdmin && (
            <p>{t('infoMessage')}</p>
          )}
          {flawDetectionEnabledByAdmin && <p>{t('flawDetectionInfo')}</p>}
          {metadataDetectionEnabledByAdmin && <p>{t('metadataDetectionInfo')}</p>}

          <div className='d-flex justify-content-end'>
            <Button variant='primary' onClick={handleDontShowAgain}>
              {t('doNotShowAgain')}
            </Button>
          </div>
        </Alert>
      )}
    </>
  );
}

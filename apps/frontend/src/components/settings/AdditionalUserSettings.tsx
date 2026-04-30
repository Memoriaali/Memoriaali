'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Card, Form } from 'react-bootstrap';
import styles from './additionalUserSettings.module.css';

const AdditionalUserSettings: React.FC = () => {
  const t = useTranslations('Settings');
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  useEffect(() => {
    const hideReminders = localStorage.getItem('hideReminders');
    if (hideReminders === 'true') {
      setRemindersEnabled(false);
    }
  }, []);

  const handleToggle = () => {
    const newValue = !remindersEnabled;
    setRemindersEnabled(newValue);
    localStorage.setItem('hideReminders', newValue ? 'false' : 'true');
  };

  return (
    <Card className={styles.additionalUserSettingsCard}>
      <Card.Body>
        <h4>{t('additionalUserSettingsTitle')}</h4>
        <hr />
        <Form.Check
          type='switch'
          id='reminder-switch'
          label={t('enableNotifications')}
          checked={remindersEnabled}
          onChange={handleToggle}
        />
      </Card.Body>
    </Card>
  );
};

export default AdditionalUserSettings;

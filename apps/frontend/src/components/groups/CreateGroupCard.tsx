'use client';
import { useGroups } from '@/hooks/useGroups';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Alert, Button, Card, Form, InputGroup } from 'react-bootstrap';
import styles from './GroupSettings.module.css';

interface CreateGroupCardProps {
  handleShowMessage: (message: string) => void;
  getListedGroups: () => Promise<void>;
}

const CreateGroupCard = ({ handleShowMessage, getListedGroups }: CreateGroupCardProps) => {
  const t = useTranslations('Groups');
  const router = useRouter();

  const { createNewGroup } = useGroups();

  // State for new group name
  const [groupName, setGroupName] = React.useState<string>('');

  // Handler for group name input change
  const handleGroupNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGroupName(e.target.value);
  };

  // State for handling submission errors
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handler for creating a new group
  const handleCreateNewGroup = async () => {
    const groupData = {
      groupName,
    };

    try {
      setSubmitError(null);
      await createNewGroup(groupData);
      setGroupName('');
      handleShowMessage(t('groupCreatedSuccessfully'));
      getListedGroups().catch(console.error);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };

        if (statusCode === 400) {
          setSubmitError(t('invalidRequestData'));
        } else if (statusCode === 401) {
          router.push('/login?error=sessionExpired');
          return;
        } else if (statusCode === 403) {
          setSubmitError(t('insufficientPermissions'));
        } else if (statusCode === 409) {
          setSubmitError(t('groupNameExistsError'));
        } else {
          setSubmitError(t('unexpectedError'));
        }
      }
    }
  };

  return (
    <Card className={styles.settingsCard}>
      <Card.Body>
        {submitError && <Alert variant='danger'>{submitError}</Alert>}
        <h4>{t('createNewGroup')}:</h4>
        <InputGroup>
          <Form.Control
            placeholder={t('enterGroupName')}
            aria-label={t('enterGroupName')}
            onChange={handleGroupNameChange}
            value={groupName}
          />
          <Button variant='primary' onClick={() => handleCreateNewGroup().catch(console.error)}>
            {t('createNewGroup')}
          </Button>
        </InputGroup>
      </Card.Body>
    </Card>
  );
};

export default CreateGroupCard;

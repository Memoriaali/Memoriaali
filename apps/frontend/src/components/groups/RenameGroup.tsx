import { useGroups } from '@/hooks/useGroups';
import { Group } from '@/lib/api/generated';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, InputGroup } from 'react-bootstrap';
import styles from './GroupSettings.module.css';

interface RenameGroupProps {
  group: Group;
  handleShowMessage: (message: string) => void;
  getListedGroups: () => Promise<void>;
}

const RenameGroup: React.FC<RenameGroupProps> = ({ group, handleShowMessage, getListedGroups }) => {
  const t = useTranslations('Groups');
  const router = useRouter();
  const [renameValue, setRenameValue] = useState(group.groupName);
  const { updateCurrentGroup } = useGroups();

  useEffect(() => {
    setRenameValue(group.groupName);
  }, [group]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const renameGroup = useCallback(async () => {
    try {
      setSubmitError(null);
      await updateCurrentGroup(group.id, { groupName: renameValue });
      handleShowMessage(t('groupRenamedSuccessfully'));
      await getListedGroups();
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 400) {
          setSubmitError(t('invalidRequestData'));
        } else if (statusCode === 401) {
          router.push('/login?error=sessionExpired');
          return;
        } else if (statusCode === 403) {
          setSubmitError(t('insufficientPermissions'));
        } else if (statusCode === 404) {
          setSubmitError(t('groupNotFoundError'));
        } else if (statusCode === 409) {
          setSubmitError(t('groupNameExistsError'));
        } else {
          setSubmitError(t('unexpectedError'));
        }
      }
    }
  }, [getListedGroups, group.id, handleShowMessage, renameValue, router, t, updateCurrentGroup]);

  return (
    <>
      <br />
      <h5>{t('renameGroup')}</h5>
      {submitError && <Alert variant='danger'>{submitError}</Alert>}

      <Form.Label htmlFor='rename' className={styles.inputLabel}>
        {t('giveGroupNewName')}:
      </Form.Label>

      <InputGroup className={styles.inputMargin}>
        <Form.Control
          id='rename'
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder={t('renameGroup')}
        />
        <Button variant='primary' onClick={renameGroup}>
          {t('rename')}
        </Button>
      </InputGroup>

      <br />
      <hr />
    </>
  );
};

export default RenameGroup;

import { useGroups } from '@/hooks/useGroups';
import { Group } from '@/lib/api/generated';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import styles from './GroupSettings.module.css';

interface DeleteGroupProps {
  group: Group;
  handleShowMessage: (message: string) => void;
  getListedGroups: () => Promise<void>;
}

const DeleteGroup: React.FC<DeleteGroupProps> = ({ group, handleShowMessage, getListedGroups }) => {
  const t = useTranslations('Groups');
  const { deleteCurrentGroup } = useGroups();
  const router = useRouter();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);

  const deleteGroup = useCallback(async () => {
    try {
      setSubmitError(null);
      await deleteCurrentGroup(group.id);
      handleShowMessage(t('groupDeletedSuccessfully'));
      await getListedGroups();
      setShowConfirmDeleteModal(false);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 401) {
          router.push('/login?error=sessionExpired');
          return;
        } else if (statusCode === 403) {
          setSubmitError(t('insufficientPermissions'));
        } else if (statusCode === 404) {
          setSubmitError(t('groupNotFoundError'));
        } else if (statusCode === 409) {
          setSubmitError(t('groupHasMembersError'));
        } else {
          setSubmitError(t('unexpectedError'));
        }
      }
    }
  }, [deleteCurrentGroup, getListedGroups, group.id, handleShowMessage, router, t]);

  return (
    <>
      <br />
      <h5>{t('deleteSelectedGroup')}</h5>
      <Button
        className={styles.btnButton}
        onClick={() => setShowConfirmDeleteModal(true)}
        variant='primary'
      >
        {t('deleteSelectedGroup')}
      </Button>

      <br />
      <hr />

      <Modal show={showConfirmDeleteModal} onHide={() => setShowConfirmDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('confirmDeleteTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {submitError && <Alert variant='danger'>{submitError}</Alert>}
          {t('confirmDeleteMessage', { groupName: group.groupName })}
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowConfirmDeleteModal(false)}>
            {t('cancel')}
          </Button>
          <Button variant='danger' onClick={deleteGroup}>
            {t('confirmDelete')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default DeleteGroup;

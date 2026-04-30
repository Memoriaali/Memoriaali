'use client';
import { useFeatureConfig } from '@/hooks/useVariant';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import styles from './AdminSettings.module.css';
import CreateUserModal from './CreateUserModal';
import EditDefaultQuestionsModal from './EditDefaultQuestionsModal';
import ManageUsersModal from './ManageUsersModal';

const AdminSettings: React.FC<{ handleShowMessage: (text: string) => void }> = ({
  handleShowMessage,
}) => {
  const t = useTranslations('Settings');

  // This comes from variants and checks if the oral history is enabled by admins
  const feature = useFeatureConfig('oralHistory');
  const oralHistoryEnabled = feature?.config?.enabled;

  // State for opening and closing create user modal
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Functions to handle opening and closing create user modal
  const handleCloseCreateUserModal = () => setShowCreateUserModal(false);
  const handleShowCreateUserModal = () => setShowCreateUserModal(true);

  // State for opening and closing manage users modal
  const [showManageUsersModal, setShowManageUsersModal] = useState(false);

  // Functions to handle opening and closing manage users modal
  const handleCloseManageUsersModal = () => setShowManageUsersModal(false);
  const handleShowManageUsersModal = () => setShowManageUsersModal(true);

  // State for opening and closing edit default questions modal
  const [showEditDefaultQuestionsModal, setShowEditDefaultQuestionsModal] = useState(false);

  // Functions to handle opening and closing edit default questions modal
  const handleCloseEditDefaultQuestionsModal = () => setShowEditDefaultQuestionsModal(false);
  const handleShowEditDefaultQuestionsModal = () => setShowEditDefaultQuestionsModal(true);

  return (
    <>
      <Card className={styles.adminSettingsCard}>
        <Card.Body>
          <h4>{t('adminSettingsTitle')}</h4>

          <hr />

          <p className={styles.adminSettingsHeader}>{t('createNewUser')}</p>
          <p>{t('createUserForAnother')}</p>
          <Button
            className={styles.adminSettingsButton}
            title={t('createUser')}
            onClick={handleShowCreateUserModal}
          >
            {t('createUser')}
          </Button>

          <hr />

          <p className={styles.adminSettingsHeader}>{t('manageUsernamesTitle')}</p>
          <p>{t('manageUsernamesDescription')}</p>
          <Button
            className={styles.adminSettingsButton}
            title={t('viewUsers')}
            onClick={handleShowManageUsersModal}
          >
            {t('viewUsers')}
          </Button>

          {oralHistoryEnabled && (
            <>
              <hr />

              <p className={styles.adminSettingsHeader}>{t('manageDefaultQuestions')}</p>
              <p>{t('manageDefaultQuestionsDescription')}</p>
              <Button
                className={styles.adminSettingsButton}
                title={t('editDefaultQuestions')}
                onClick={handleShowEditDefaultQuestionsModal}
              >
                {t('editDefaultQuestions')}
              </Button>
            </>
          )}
        </Card.Body>
      </Card>

      <CreateUserModal
        showCreateUserModal={showCreateUserModal}
        handleCloseCreateUserModal={handleCloseCreateUserModal}
        handleShowMessage={handleShowMessage}
      />
      <ManageUsersModal
        showManageUsersModal={showManageUsersModal}
        handleCloseManageUsersModal={handleCloseManageUsersModal}
        handleShowMessage={handleShowMessage}
      />
      <EditDefaultQuestionsModal
        showEditDefaultQuestionsModal={showEditDefaultQuestionsModal}
        handleCloseEditDefaultQuestionsModal={handleCloseEditDefaultQuestionsModal}
        handleShowMessage={handleShowMessage}
      />
    </>
  );
};

export default AdminSettings;

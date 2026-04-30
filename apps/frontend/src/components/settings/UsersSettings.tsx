'use client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useVariant';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button, Card, Col, Row, ToastContainer } from 'react-bootstrap';
import ToastMessage from '../toasts/ToastMessage';
import ChangePasswordModal from './ChangePasswordModal';
import EditUsersInfoModal from './EditUsersInfoModal';
import styles from './UsersSettings.module.css';

interface ToastData {
  id: number;
  time: Date;
  text: string;
}

const UsersSettings: React.FC = () => {
  const t = useTranslations('Settings');
  const { user, isAuthenticated, fetchMe } = useAuth();
  const organization = useOrganization();

  //Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);
  //const [toastText, setToastText] = useState<string>('');

  const handleShowMessage = (text: string) => {
    const newToast = { id: Date.now(), time: new Date(), text };
    setToasts((prevToasts) => [...prevToasts, newToast]);
  };

  const handleCloseMessage = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  // State for opening and closing edit users info modal
  const [showEditUsersInfoModal, setShowEditUsersInfoModal] = useState(false);

  // Functions to handle opening and closing edit users info modal
  const handleCloseEditUsersInfoModal = () => setShowEditUsersInfoModal(false);
  const handleShowEditUsersInfoModal = () => setShowEditUsersInfoModal(true);

  // State for opening and closing change password modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Functions to handle opening and closing change password modal
  const handleCloseChangePasswordModal = () => {
    setShowChangePasswordModal(false);
  };
  const handleShowChangePasswordModal = () => {
    setShowChangePasswordModal(true);
  };

  // Fetch user information when component mounts or when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchMe().catch(console.error);
    }
  }, [isAuthenticated, fetchMe]);

  // Check user account type
  const isPrivate = Array.isArray(user?.accountType) && user!.accountType!.includes('PRIVATE');

  return (
    <>
      <Card className={styles.usersSettingsCard}>
        <Card.Body>
          <h4>{t('personalInfo')}</h4>

          <Row>
            <Col xs={12} sm={6} md={6}>
              <p className={styles.settingsInfoHeader}>{t('username')}</p>
              <p>{user?.username}</p>

              <p className={styles.settingsInfoHeader}>{t('email')}</p>
              <p>{user?.email}</p>

              <p className={styles.settingsInfoHeader}>{t('name')}</p>
              <p>
                {user?.firstName} {user?.lastName}
              </p>
            </Col>
            <Col xs={12} sm={6} md={6}>
              <p className={styles.settingsInfoHeader}>{t('address')}</p>
              <p>
                {user?.streetAddress} {user?.postalCode} {user?.postOffice}
              </p>

              <p className={styles.settingsInfoHeader}>{t('telephone')}</p>
              <p>{user?.telephone}</p>

              <p className={styles.settingsInfoHeader}>{t('profession')}</p>
              <p>{user?.profession}</p>
            </Col>
          </Row>
          {isPrivate && (
            <>
              <h4>{t('companyInfo')}</h4>
              <Row>
                <Col xs={12} sm={6} md={6}>
                  <p className={styles.settingsInfoHeader}>{t('companyName')}</p>
                  <p>{user?.companyName}</p>

                  <p className={styles.settingsInfoHeader}>{t('companyEmail')}</p>
                  <p>{user?.companyEmail}</p>
                </Col>
                <Col xs={12} sm={6} md={6}>
                  <p className={styles.settingsInfoHeader}>{t('companyTelephone')}</p>
                  <p>{user?.companyTelephone}</p>

                  <p className={styles.settingsInfoHeader}>{t('companyContactPerson')}</p>
                  <p>{user?.companyContactPerson}</p>
                </Col>
              </Row>
            </>
          )}

          <Button
            title={t('editPersonalInfo')}
            className={styles.settingsInfoButton}
            onClick={handleShowEditUsersInfoModal}
          >
            {t('editPersonalInfo')}
          </Button>

          <Button
            title={t('changePassword')}
            className={styles.settingsInfoButton}
            onClick={handleShowChangePasswordModal}
          >
            {t('changePassword')}
          </Button>
          <p>
            {t('accountDeletionInfo', {
              email: organization?.contact.email ?? '',
            })}
          </p>
        </Card.Body>
      </Card>

      <EditUsersInfoModal
        showEditUsersInfoModal={showEditUsersInfoModal}
        handleCloseEditUsersInfoModal={handleCloseEditUsersInfoModal}
        onUpdateSuccess={handleShowMessage}
        onUpdateError={handleShowMessage}
      />
      <ChangePasswordModal
        showChangePasswordModal={showChangePasswordModal}
        handleCloseChangePasswordModal={handleCloseChangePasswordModal}
        onUpdateSuccess={handleShowMessage}
        onUpdateError={handleShowMessage}
      />

      <ToastContainer
        className='p-3'
        position='bottom-start'
        style={{
          zIndex: 1065,
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
        }}
      >
        {toasts.map((toast) => (
          <ToastMessage
            key={toast.id}
            id={toast.id}
            time={toast.time}
            toastText={toast.text}
            onClose={handleCloseMessage}
          />
        ))}
      </ToastContainer>
    </>
  );
};

export default UsersSettings;

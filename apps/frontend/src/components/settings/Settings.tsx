'use client';

import sideNavStyles from '@/components/sideNav/SideNavPageContent.module.css';
import { useAuth } from '@/hooks/useAuth';
import { useFlawDetectionEnabled } from '@/hooks/useFlawDetectionEnabled';
import { useMetadataDetectionEnabled } from '@/hooks/useMetadataDetectionEnabled';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Container, ToastContainer } from 'react-bootstrap';
import ContainerSideNav from '../sideNav/Container-SideNav';
import ContentHeader from '../sideNav/ContentHeader';
import ToastMessage from '../toasts/ToastMessage';
import AdditionalUserSettings from './AdditionalUserSettings';
import AdminSettings from './AdminSettings';
import UsersSettings from './UsersSettings';

interface ToastData {
  id: number;
  time: Date;
  text: string;
}

const Settings: React.FC = () => {
  const t = useTranslations('Settings');
  const { user } = useAuth();
  const isPrivileged = user?.role === 'ADMIN';

  // Check if AI tools are enabled by admin
  const flawDetectionEnabledByAdmin = useFlawDetectionEnabled();
  const metadataDetectionEnabledByAdmin = useMetadataDetectionEnabled();

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

  return (
    <>
      <ContainerSideNav>
        <Container className={sideNavStyles.sidenavPageContent}>
          <ContentHeader headerText={t('settings')} />

          <UsersSettings />

          {(flawDetectionEnabledByAdmin || metadataDetectionEnabledByAdmin) && (
            <AdditionalUserSettings />
          )}

          {isPrivileged && <AdminSettings handleShowMessage={handleShowMessage} />}
        </Container>
      </ContainerSideNav>

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

export default Settings;

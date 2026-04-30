'use client';
import sideNavStyles from '@/components/sideNav/SideNavPageContent.module.css';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import { Group } from '@/lib/api/generated';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { Container, ToastContainer } from 'react-bootstrap';
import ContainerSideNav from '../sideNav/Container-SideNav';
import ContentHeader from '../sideNav/ContentHeader';
import ToastMessage from '../toasts/ToastMessage';
import CreateGroupCard from './CreateGroupCard';
import ManageGroupsCard from './ManageGroupsCard';

interface ToastData {
  id: number;
  time: Date;
  text: string;
}

const GroupSettingsPage: React.FC = () => {
  const t = useTranslations('Groups');
  const router = useRouter();
  const { user } = useAuth();
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  //Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const handleShowMessage = (text: string) => {
    const newToast = { id: Date.now(), time: new Date(), text };
    setToasts((prevToasts) => [...prevToasts, newToast]);
  };

  const handleCloseMessage = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  //Get all groups
  const { getAllGroups } = useGroups();

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [getError, setGetError] = useState<string | null>(null);

  const getListedGroups = useCallback(async () => {
    try {
      setGetError(null);
      const result = await getAllGroups();
      setGroups(result ?? []);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 401) {
          router.push('/login?error=sessionExpired');
          return;
        } else if (statusCode === 403) {
          setGetError(t('insufficientPermissions'));
        } else {
          setGetError(t('unexpectedError'));
        }
      }
    }
  }, [getAllGroups, router, t]);

  useEffect(() => {
    getListedGroups().catch(console.error);
  }, [getListedGroups]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <ContainerSideNav>
      <Container className={sideNavStyles.sidenavPageContent}>
        {isPrivileged && (
          <>
            <ContentHeader headerText={t('groupManagement')} />

            <CreateGroupCard
              handleShowMessage={handleShowMessage}
              getListedGroups={getListedGroups}
            />

            <ManageGroupsCard
              handleShowMessage={handleShowMessage}
              getError={getError}
              selectedGroupId={selectedGroupId}
              setSelectedGroupId={setSelectedGroupId}
              groups={groups}
              selectedGroup={selectedGroup}
              getListedGroups={getListedGroups}
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
        )}
      </Container>
    </ContainerSideNav>
  );
};

export default GroupSettingsPage;

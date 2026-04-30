'use client';
import sideNavStyles from '@/components/sideNav/SideNavPageContent.module.css';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import { Group } from '@memoriaali/api-types';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Container, Form, ToastContainer } from 'react-bootstrap';
import ContainerSideNav from '../sideNav/Container-SideNav';
import ContentHeader from '../sideNav/ContentHeader';
import ToastMessage from '../toasts/ToastMessage';
import styles from './GroupsFiles.module.css';
import GroupsFilesGrid from './GroupsFilesGrid';

interface ToastData {
  id: number;
  time: Date;
  text: string;
}

const GroupsFiles: React.FC = () => {
  const t = useTranslations('Groups');

  // Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const handleShowMessage = (text: string) => {
    const newToast = { id: Date.now(), time: new Date(), text };
    setToasts((prevToasts) => [...prevToasts, newToast]);
  };
  const handleCloseMessage = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const { getAllGroupsForUser } = useGroups();
  const router = useRouter();
  const { user } = useAuth();

  // State for handling getGroup errors
  const [submitError, setSubmitError] = useState<string | null>(null);

  // State for users groups
  const [usersGroups, setUsersGroups] = useState<Group[]>([]);

  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const getGroupsForUser = useCallback(async () => {
    try {
      if (!user) {
        setSubmitError(t('userNotFound'));
        return;
      }

      setSubmitError((prev) => (prev !== null ? null : prev));

      const response = await getAllGroupsForUser(user.id);
      setUsersGroups(
        (response ?? []).map((group) => ({
          ...group,
          createdAt: new Date(group.createdAt),
          updatedAt: new Date(group.updatedAt),
        })),
      );
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };

        if (statusCode === 401) {
          Promise.resolve().then(() => router.push('/login?error=sessionExpired'));
          return;
        }

        const msg =
          statusCode === 400
            ? t('invalidRequestData')
            : statusCode === 403
              ? t('insufficientPermissions')
              : statusCode === 404
                ? t('userNotFound')
                : t('unexpectedError');

        if (isMountedRef.current) setSubmitError(msg);
      } else {
        if (isMountedRef.current) setSubmitError(t('unexpectedError'));
      }
    }
  }, [getAllGroupsForUser, router, t, user]);

  useEffect(() => {
    getGroupsForUser().catch(console.error);
  }, [getGroupsForUser]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  return (
    <>
      <ContainerSideNav>
        <Container className={sideNavStyles.sidenavPageContent}>
          <ContentHeader headerText={t('myGroupFiles')} />

          {submitError && <Alert variant='danger'>{submitError}</Alert>}
          <Form.Label htmlFor='chooseGroup' className={styles.inputLabel}>
            {t('selectGroup')}:
          </Form.Label>
          <Form.Select
            id='chooseGroup'
            aria-label={t('selectGroup')}
            className={styles.inputMargin}
            value={selectedGroupId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSelectedGroupId(e.target.value)
            }
          >
            <option value=''>{t('selectGroupPlaceholder')}</option>
            {usersGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.groupName}
              </option>
            ))}
          </Form.Select>

          <GroupsFilesGrid groupId={selectedGroupId} handleShowMessage={handleShowMessage} />
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

export default GroupsFiles;

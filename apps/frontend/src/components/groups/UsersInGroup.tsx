import { useGroups } from '@/hooks/useGroups';
import { useUsers } from '@/hooks/useUsers';
import { Group, UsersInGroups } from '@/lib/api/generated';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { User } from '@memoriaali/api-types';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Table } from 'react-bootstrap';
import styles from './GroupSettings.module.css';

interface UsersInGroupProps {
  group: Group;
  handleShowMessage: (message: string) => void;
  getAllMembersInGroup: () => Promise<void>;
  userInGroupError: string | null;
  usersInGroup: UsersInGroups[];
}

const UsersInGroup: React.FC<UsersInGroupProps> = ({
  group,
  handleShowMessage,
  getAllMembersInGroup,
  userInGroupError,
  usersInGroup,
}) => {
  const t = useTranslations('Groups');
  const { deleteUserFromGroup } = useGroups();
  const { getUserByUserId } = useUsers();
  const router = useRouter();

  const [userDetails, setUserDetails] = useState<Record<string, User>>({});

  // Fetch user info when usersInGroup changes
  useEffect(() => {
    const fetchUsers = async () => {
      const details: Record<string, User> = {};
      for (const u of usersInGroup) {
        try {
          const info = await getUserByUserId(u.userId);
          details[u.userId] = {
            username: info?.username,
            email: info?.email,
          } as User;
        } catch (error) {
          if (typeof error === 'object' && error !== null && 'statusCode' in error) {
            const { statusCode } = error as { statusCode: number };
            if (statusCode === 401) {
              router.push('/login?error=sessionExpired');
              return;
            } else if (statusCode === 403) {
              setDeleteUserFromGroupError(t('insufficientPermissions'));
            } else if (statusCode === 404) {
              setDeleteUserFromGroupError(t('userNotFound'));
            } else {
              setDeleteUserFromGroupError(t('unexpectedError'));
            }
          }
        }
      }
      setUserDetails(details);
    };

    if (usersInGroup.length > 0) {
      fetchUsers();
    }
  }, [usersInGroup, getUserByUserId, router, t]);

  const [deleteUserFromGroupError, setDeleteUserFromGroupError] = useState<string | null>(null);

  const deleteThisUserFromGroup = useCallback(
    async (userId: string) => {
      try {
        await deleteUserFromGroup(group.id, userId);
        handleShowMessage(t('userRemovedFromGroupSuccessfully'));
        getAllMembersInGroup().catch(console.error);
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'statusCode' in error) {
          const { statusCode } = error as { statusCode: number };
          if (statusCode === 401) {
            router.push('/login?error=sessionExpired');
            return;
          } else if (statusCode === 403) {
            setDeleteUserFromGroupError(t('insufficientPermissions'));
          } else if (statusCode === 409) {
            setDeleteUserFromGroupError(t('userNotInGroupError'));
          } else {
            setDeleteUserFromGroupError(t('unexpectedError'));
          }
        }
      }
    },
    [deleteUserFromGroup, getAllMembersInGroup, group.id, handleShowMessage, router, t],
  );

  return (
    <>
      <br />

      <h5>{t('currentGroupMembers')}:</h5>

      {userInGroupError && <Alert variant='danger'>{userInGroupError}</Alert>}

      {deleteUserFromGroupError && <Alert variant='danger'>{deleteUserFromGroupError}</Alert>}
      <Table striped bordered hover responsive variant='light'>
        <thead>
          <tr>
            <th>{t('username')}</th>
            <th>{t('email')}</th>
            <th>{t('removeUser')}</th>
          </tr>
        </thead>
        <tbody>
          {usersInGroup.map((user) => {
            const info = userDetails[user.userId];
            return (
              <tr key={user.userId}>
                <td className={styles.settingsTd}>{info?.username || 'Loading...'}</td>
                <td className={styles.settingsTd}>{info?.email || 'Loading...'}</td>
                <td className={styles.settingsTd}>
                  <FontAwesomeIcon
                    icon={faTrash}
                    onClick={() => deleteThisUserFromGroup(user.userId).catch(console.error)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
};

export default UsersInGroup;

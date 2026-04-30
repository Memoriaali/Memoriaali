import { useGroups } from '@/hooks/useGroups';
import { useUsers } from '@/hooks/useUsers';
import { Group, User, UsersInGroups } from '@/lib/api/generated/types.gen';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, InputGroup, Table } from 'react-bootstrap';
import styles from './GroupSettings.module.css';
import UsersInGroup from './UsersInGroup';

interface AddMembersToGroupProps {
  group: Group;
  handleShowMessage: (message: string) => void;
}

const AddMembersToGroup: React.FC<AddMembersToGroupProps> = ({ group, handleShowMessage }) => {
  const t = useTranslations('Groups');
  const { searchFromUsers } = useUsers();
  const { addNewMemberToGroup, getMembersInGroup } = useGroups();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  const [userError, setUserError] = useState<string | null>(null);
  const searchForMembers = useCallback(async () => {
    try {
      const result = await searchFromUsers(searchTerm);
      // console.log(result);
      setUsers(result ?? []);
      // TODO: pagination for user search
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 400) {
          setUserError(t('invalidUserRequestData'));
        } else if (statusCode === 401) {
          router.push('/login?error=sessionExpired');
          return;
        } else if (statusCode === 403) {
          setUserError(t('insufficientPermissions'));
        } else {
          setUserError(t('unexpectedError'));
        }
      }
    }
  }, [router, searchFromUsers, searchTerm, t]);

  // TODO: Fix UsersInGroups type to match the actual data stucture
  const [usersInGroup, setUsersInGroup] = useState<UsersInGroups[]>([]);

  const [userInGroupError, setUserInGroupError] = useState<string | null>(null);

  const getAllMembersInGroup = useCallback(async () => {
    try {
      const result = await getMembersInGroup(group.id);
      setUsersInGroup(result ?? []);
      // TODO: pagination for members in group
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        if (statusCode === 400) {
          setUserInGroupError(t('invalidUserRequestData'));
        } else if (statusCode === 401) {
          router.push('/login?error=sessionExpired');
          return;
        } else if (statusCode === 403) {
          setUserInGroupError(t('insufficientPermissions'));
        } else if (statusCode === 404) {
          setUserInGroupError(t('groupNotFoundError'));
        } else {
          setUserInGroupError(t('unexpectedError'));
        }
      }
    }
  }, [getMembersInGroup, group.id, router, t]);

  useEffect(() => {
    if (group.id) {
      getAllMembersInGroup().catch(console.error);
    }
  }, [getAllMembersInGroup, group.id]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const addMemberToGroup = useCallback(
    async (userId: string) => {
      try {
        await addNewMemberToGroup(group.id, userId);
        handleShowMessage(t('userAddedToGroupSuccessfully'));
        getAllMembersInGroup().catch(console.error);
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
            setSubmitError(t('groupOrUserNotFoundError'));
          } else if (statusCode === 409) {
            setSubmitError(t('userAlreadyInGroupError'));
          } else {
            setSubmitError(t('unexpectedError'));
          }
        }
      }
    },
    [addNewMemberToGroup, getAllMembersInGroup, group.id, handleShowMessage, router, t],
  );

  return (
    <>
      <br />
      <h5>{t('addNewMember')}</h5>
      <Form.Label htmlFor='newMember' className={styles.inputLabel}>
        {t('searchUsers')}:
      </Form.Label>

      {userError && <Alert variant='danger'>{userError}</Alert>}
      <InputGroup className={styles.inputMargin}>
        <Form.Control
          id='newMember'
          placeholder={t('enterMemberUsernameOrEmail')}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button variant='primary' onClick={() => searchForMembers().catch(console.error)}>
          {t('searchUsers')}
        </Button>
      </InputGroup>

      {users.length > 0 ? (
        <>
          {submitError && <Alert variant='danger'>{submitError}</Alert>}
          <Table striped bordered hover responsive variant='dark'>
            <thead>
              <tr>
                <th>{t('username')}</th>
                <th>{t('email')}</th>
                <th>{t('addUserToGroup')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className={styles.settingsTd}>{user.username}</td>
                  <td className={styles.settingsTd}>{user.email}</td>
                  <td className={styles.settingsTd}>
                    <Button
                      variant='primary'
                      onClick={() => addMemberToGroup(user.id).catch(console.error)}
                    >
                      {t('addUserToGroup')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : (
        <p>{t('noUsersFound')}</p>
      )}

      <br />
      <hr />

      <UsersInGroup
        group={group}
        handleShowMessage={handleShowMessage}
        getAllMembersInGroup={getAllMembersInGroup}
        userInGroupError={userInGroupError}
        usersInGroup={usersInGroup}
      />
    </>
  );
};

export default AddMembersToGroup;

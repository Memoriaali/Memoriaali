import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { Pagination, User, UserRole } from '@/lib/api/generated/types.gen';
import { faMagnifyingGlass, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Form, FormGroup, InputGroup, Modal, Row, Spinner, Table } from 'react-bootstrap';
import PagePagination from '../pagination/Pagination';
import DeleteUserConfirmationModal from './DeleteUserConfirmationModal';
import styles from './ManageUsersModal.module.css';

interface ManageUsersModalProps {
  showManageUsersModal: boolean;
  handleCloseManageUsersModal: () => void;
  handleShowMessage: (text: string) => void;
}

const ManageUsersModal = ({
  showManageUsersModal,
  handleCloseManageUsersModal,
  handleShowMessage,
}: ManageUsersModalProps) => {
  const t = useTranslations('Settings');

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { getUsers, updateUserRole, deleteUserByUserId } = useUsers();
  const { user, isAuthenticated, fetchMe } = useAuth();

  const pageFromUrl = Number(searchParams.get('page')) || 1;
  const [page, setPage] = useState<number>(pageFromUrl);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>(undefined);
  const [pagination, setPagination] = useState<Pagination>();
  const [savingRoleUserId, setSavingRoleUserId] = useState<string | null>(null);
  const [errorByUserId, setErrorByUserId] = useState<Record<string, string>>({});
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [alertMessage, setAlertMessage] = useState<string>('');

  const ALL_ROLES = ['ADMIN', 'MODERATOR', 'USER', 'EXPERT'] as const;
  type Role = (typeof ALL_ROLES)[number];

  const DEBOUNCE_MS = 400;
  const PAGE_SIZE = 10;

  const loadUsers = useCallback(async () => {
    try {
      const res = await getUsers(page, PAGE_SIZE, debouncedSearchTerm || undefined, selectedRole);
      const safeTotalPages = res.totalPages && res.totalPages > 0 ? res.totalPages : 1;

      setUsers(res.users ?? []);
      setPagination({
        page: res.page ?? 1,
        limit: PAGE_SIZE,
        total: res.total ?? 0,
        pages: safeTotalPages,
        hasNext: res.hasNext ?? false,
        hasPrev: res.hasPrev ?? false,
      });
    } catch (error) {
      console.error(error);
    }
  }, [page, PAGE_SIZE, debouncedSearchTerm, selectedRole, getUsers]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe().catch(console.error);
    }
  }, [isAuthenticated, fetchMe]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value.trim();
      setSearchTerm(value);
    }
  };

  const handleSearch = async (value?: string) => {
    const newValue = (value ?? searchTerm).trim();
    setSearchTerm(newValue);
    setDebouncedSearchTerm(newValue);

    const params = new URLSearchParams(searchParams.toString());
    const current = Number(params.get('page')) || 1;

    if (current !== 1) {
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
    } else {
      loadUsers();
    }
  };

  const handleRoleToggle = (role: UserRole, checked: boolean) => {
    setSelectedRole(checked ? role : undefined);
  };

  const getRoleOptionsFor = (userRole: UserRole) => {
    const otherRoles = ALL_ROLES.filter((role) => role !== userRole);
    return [userRole, ...otherRoles];
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    if (user && user.id === userId) {
      setErrorByUserId((error) => ({
        ...error,
        [userId]: t('cannotChangeOwnRoleError'),
      }));
      return;
    }

    const start = Date.now();

    const prevUsers = users;
    const prevUser = users.find((user) => user.id === userId);
    if (!prevUser || prevUser.role === newRole) return;

    const newUsers = users.map((user) => (user.id === userId ? { ...user, role: newRole } : user));
    setUsers(newUsers);
    setSavingRoleUserId(userId);
    setErrorByUserId((error) => ({ ...error, [userId]: '' }));

    try {
      await updateUserRole(userId, newRole);

      const elapsed = Date.now() - start; //small delay for UI
      const minVisible = 1000; // ms
      const wait = Math.max(0, minVisible - elapsed);
      setTimeout(() => setSavingRoleUserId(null), wait);
      setTimeout(() => handleShowMessage(t('userRoleUpdated')), wait);
    } catch (error) {
      setUsers(prevUsers);
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };
        const { code } = error as unknown as { code: string };

        setSavingRoleUserId(null);

        if (statusCode === 403 && code === 'USER_NOT_ACTIVATED') {
          setErrorByUserId((e) => ({
            ...e,
            [userId]: t('userNotActivatedError'),
          }));
        } else {
          setErrorByUserId((e) => ({
            ...e,
            [userId]: t('unexpectedError'),
          }));
        }
      } else {
        setErrorByUserId((e) => ({
          ...e,
          [userId]: t('unexpectedError'),
        }));
      }
    }
  };

  const roleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return t('admin');
      case 'MODERATOR':
        return t('moderator');
      case 'USER':
        return t('user');
      case 'EXPERT':
        return t('expert');
    }
  };

  const handleShowConfirmationModal = (user: User) => {
    setUserToDelete(user);
    setShowConfirmationModal(true);
  };

  const handleCancelClose = () => {
    setShowConfirmationModal(false);
    setAlertMessage('');
  };

  const handleConfirmClose = async (user: User) => {
    try {
      const userId = user.id;

      await deleteUserByUserId(userId);
      handleShowMessage(t('userDeleted'));
      try {
        const res = await getUsers();
        setUsers(res.users ?? []);
        setShowConfirmationModal(false);
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };

        if (statusCode === 400) {
          setAlertMessage(t('cannotDeleteOwnAccount'));
        } else {
          setAlertMessage(t('unexpectedError'));
        }
      } else {
        setAlertMessage(t('unexpectedError'));
      }
    }
  };

  useEffect(() => {
    if (!showManageUsersModal) {
      setUsers([]);
      setSearchTerm('');
      setDebouncedSearchTerm('');
      setSelectedRole(undefined);
      setPagination(undefined);
      setSavingRoleUserId(null);
      setErrorByUserId({});
      setUserToDelete(null);
      setAlertMessage('');
      setPage(1);

      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');

      if ([...params.keys()].length === 0) {
        router.replace(pathname);
      } else {
        router.replace(`${pathname}?${params.toString()}`);
      }
    }
  }, [pathname, router, searchParams, showManageUsersModal]);

  useEffect(() => {
    const urlPage = Number(searchParams.get('page')) || 1;

    if (urlPage !== page) {
      setPage(urlPage);
    }
  }, [searchParams, page]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    if (!showManageUsersModal) return;

    const params = new URLSearchParams(window.location.search);
    const current = Number(params.get('page')) || 1;

    if (current !== 1) {
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [debouncedSearchTerm, selectedRole, showManageUsersModal, router, pathname]);

  useEffect(() => {
    if (!showManageUsersModal) return;
    loadUsers();
  }, [page, showManageUsersModal, loadUsers]);

  return (
    <Modal show={showManageUsersModal} onHide={handleCloseManageUsersModal} size='lg' centered>
      <Modal.Header className={`${styles.modalBg} d-flex justify-content-center position-relative`}>
        <Modal.Title className={styles.modalTitle}>{t('manageUsernamesTitle')}</Modal.Title>
        <Button
          variant='link'
          onClick={handleCloseManageUsersModal}
          className={styles.customClose}
          aria-label='close modal'
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>
        <p className={styles.manageUsersText}>{t('manageUsernamesDescription')}</p>

        <Form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <InputGroup className='mb-3'>
            <Form.Control
              placeholder={t('searchUsersInputAdminSettings')}
              aria-label='UserSearch'
              aria-describedby='search'
              value={searchTerm}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
            />
            <Button variant='primary' id='search' type='submit'>
              <FontAwesomeIcon icon={faMagnifyingGlass} /> {t('searchButtonAdminSettings')}
            </Button>
          </InputGroup>
          <Form.Label className={styles.filterTitle}>
            <h6>{t('filterTitle')}</h6>
          </Form.Label>
          <Row className='g-3'>
            <FormGroup className='d-flex flex-column flex-lg-row gap-3'>
              <Form.Label className={styles.filterLabel}>{t('roleFilter')}</Form.Label>
              {ALL_ROLES.map((role: Role) => (
                <Form.Check
                  key={role}
                  type='switch'
                  id={role}
                  value={role}
                  label={roleLabel(role)}
                  className='d-block'
                  checked={selectedRole === role}
                  onChange={(e) => handleRoleToggle(role, e.currentTarget.checked)}
                />
              ))}
            </FormGroup>
          </Row>
        </Form>

        {users.length > 0 ? (
          <Table striped bordered hover responsive variant='dark'>
            <thead>
              <tr>
                <th>{t('username')}</th>
                <th>{t('email')}</th>
                <th>{t('editPrivileges')}</th>
                <th>{t('deleteUser')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const currentRole = user.role ?? user.roles?.[0] ?? 'USER';
                const options = getRoleOptionsFor(currentRole);
                const isSaving = savingRoleUserId === user.id;
                const errorText = errorByUserId[user.id];

                return (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <Form.Select
                        aria-label={t('changePrivileges')}
                        value={currentRole}
                        disabled={isSaving}
                        onChange={(e) => handleChangeRole(user.id, e.target.value as UserRole)}
                      >
                        {options.map((role: Role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </Form.Select>
                      {isSaving && (
                        <div className={`${styles.savingInfo} d-flex align-items-center gap-2`}>
                          <Spinner animation='border' size='sm' />
                          <small>{t('saving')}</small>
                        </div>
                      )}
                      {errorText && (
                        <small className='text-danger' role='alert'>
                          {errorText}
                        </small>
                      )}
                    </td>
                    <td className={styles.tdCenter}>
                      <FontAwesomeIcon
                        className={`${styles.trash}`}
                        icon={faTrash}
                        role='button'
                        title={t('deleteUser')}
                        tabIndex={0}
                        onClick={() => handleShowConfirmationModal(user)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleShowConfirmationModal(user);
                          }
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <p>{t('noUsers')}</p>
        )}

        {userToDelete && (
          <DeleteUserConfirmationModal
            user={userToDelete}
            show={showConfirmationModal}
            onConfirm={() => handleConfirmClose(userToDelete)}
            onCancel={handleCancelClose}
            alertMessage={alertMessage}
          />
        )}
        {showConfirmationModal && <div className={styles.overlay} />}

        {pagination && <PagePagination pagination={pagination} />}
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='primary' onClick={() => handleCloseManageUsersModal()}>
          {t('closeWindow')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ManageUsersModal;

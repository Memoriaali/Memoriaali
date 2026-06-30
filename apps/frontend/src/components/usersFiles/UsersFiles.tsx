'use client';
import AddFileModal from '@/components/addFile/AddFileModal';
import ConfirmationModal from '@/components/addFile/ConfirmationModal';
import NewEventEmitter from '@/components/eventEmitter/EventEmitter';
import PagePagination from '@/components/pagination/Pagination';
import ContainerSideNav from '@/components/sideNav/Container-SideNav';
import ContentHeader from '@/components/sideNav/ContentHeader';
import sideNavStyles from '@/components/sideNav/SideNavPageContent.module.css';
import UsersFilesGrid, { CardData } from '@/components/usersFiles/UsersFilesGrid';
import { useDocuments } from '@/hooks/useDocuments';
import { useFeatureConfig } from '@/hooks/useVariant';
import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import {
  faFileCirclePlus,
  faMicrophone,
  faSquareCheck,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Col, Container, Row, ToastContainer } from 'react-bootstrap';
import RecordOralHistoryModal from '../../expansions/oralHistory/recordOralHistory/RecordOralHistoryModal';
import ToastMessage from '../toasts/ToastMessage';
import ConfirmMultipleDeleteModal from './ConfirmMultipleDeleteModal';
import styles from './page.module.css';

interface ToastData {
  id: number;
  time: Date;
  text: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const UsersFiles: React.FC = () => {
  const t = useTranslations('UsersFiles');
  const pathname = usePathname();
  const router = useRouter();

  // Extract query parameters
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);

  // This comes from variants and checks if the oral history is enabled by admins
  const feature = useFeatureConfig('oralHistory');
  const oralHistoryEnabled = feature?.config?.enabled;

  // Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const handleShowMessage = (text: string) => {
    const newToast = { id: Date.now(), time: new Date(), text };
    setToasts((prevToasts) => [...prevToasts, newToast]);
  };
  const handleCloseMessage = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const { getUsersDocuments } = useDocuments();
  const { deleteFromDocuments } = useDocuments();

  // State for Add File Modal
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [key, setKey] = useState('addFile');

  // State for Oral History Modal
  const [showRecordOralHistoryModal, setShowRecordOralHistoryModal] = useState(false);

  // State for Confirmation Modal (Add File and Oral History)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const handleConfirmClose = () => {
    NewEventEmitter.emit('resetData');
    setShowConfirmationModal(false);
    setShowAddFileModal(false);
    setShowRecordOralHistoryModal(false);
  };
  const handleCancelClose = () => {
    setShowConfirmationModal(false);
  };

  const handleClose = () => {
    if (key !== 'finished') {
      setShowConfirmationModal(true);
    } else {
      setShowAddFileModal(false);
      setShowRecordOralHistoryModal(false);
      NewEventEmitter.emit('resetData');
    }
  };
  const handleShow = () => {
    setKey('addFile');
    setShowAddFileModal(true);
  };

  const handleShowOralHistory = () => {
    setKey('recordingSettings');
    setShowRecordOralHistoryModal(true);
  };

  // Format documents
  const formatDocument = (doc: DocumentType): DocumentType => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      exactDate: doc.metadata?.exactDate
        ? new Date(doc.metadata.exactDate).toLocaleDateString('fi-FI')
        : undefined,
    },
  });

  const [usersDocuments, setUsersDocuments] = useState<DocumentType[]>([]);
  const [checkedCards, setCheckedCards] = useState<{ [key: string]: boolean }>({});
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const getDocumentsForUser = useCallback(async () => {
    try {
      const result = await getUsersDocuments(page);
      if (result) {
        const docs = result.data?.data?.documents ?? [];

        const pagination = {
          total: result.data?.data?.pagination?.total ?? 0,
          page: result.data?.data?.pagination?.page ?? 1,
          limit: result.data?.data?.pagination?.limit ?? 20,
          pages: result.data?.data?.pagination?.pages ?? 0,
          hasNext: result.data?.data?.pagination?.hasNext ?? false,
          hasPrev: result.data?.data?.pagination?.hasPrev ?? false,
        };
        setPagination(pagination);

        const formattedDocs = docs.map(formatDocument);
        setUsersDocuments(formattedDocs);

        const initialCheckedState = formattedDocs.reduce(
          (acc: Record<string, boolean>, doc: DocumentType) => ({ ...acc, [doc.id]: false }),
          {} as Record<string, boolean>,
        );
        setCheckedCards(initialCheckedState);
      }
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        const message = error.message;
        if (message === 'Document is private or you lack required permissions') {
          handleShowMessage(t('noPermissionDocument'));
        } else if (message === 'Authentication required' || message === 'No access token found') {
          router.push('/login?error=sessionExpired');
        } else {
          handleShowMessage(t('unexpectedError'));
        }
      }
    }
  }, [getUsersDocuments, page, router, t]);

  useEffect(() => {
    getDocumentsForUser().catch(console.error);
    const handleDocumentAdded = () => {
      getDocumentsForUser().catch(console.error);
    };
    NewEventEmitter.on('documentAdded', handleDocumentAdded);
    return () => {
      NewEventEmitter.off('documentAdded', handleDocumentAdded);
    };
  }, [getDocumentsForUser]);

  const cardData: CardData[] = usersDocuments.map((doc) => ({
    id: doc.id,
    doc,
  }));

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setCheckedCards((prev) => ({ ...prev, [id]: checked }));
  };

  const toggleCheckAllCheckboxes = () => {
    const allChecked = Object.values(checkedCards).every((checked) => checked);
    const newCheckedState = cardData.reduce(
      (acc, card) => ({ ...acc, [card.id]: !allChecked }),
      {},
    );
    setCheckedCards(newCheckedState);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const handleShowDeleteModal = () => {
    setShowDeleteModal(true);
  };
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };
  const handleConfirmDelete = async () => {
    try {
      const selectedIds = Object.keys(checkedCards).filter((id) => checkedCards[id]);
      if (selectedIds.length === 0) {
        handleShowMessage(t('noFilesSelected'));
        setShowDeleteModal(false);
        return;
      }
      await Promise.all(selectedIds.map((id) => deleteFromDocuments(id)));
      handleShowMessage(`${selectedIds.length} ${t('filesDeleted')}`);
      getDocumentsForUser().catch(console.error);
    } catch {
      handleShowMessage(t('failedToDelete'));
    } finally {
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <ContainerSideNav>
        <Container className={sideNavStyles.sidenavPageContent}>
          <ContentHeader headerText={t('myFiles')} />
          <Row>
            <Col xs={6} sm={6} md={3} className={styles.navColumn}>
              <Button variant='primary' onClick={handleShow} className={styles.navButtons}>
                {t('addNewFile')} <FontAwesomeIcon icon={faFileCirclePlus} />
              </Button>
            </Col>
            {oralHistoryEnabled && (
              <Col xs={6} sm={6} md={3} className={styles.navColumn}>
                <Button
                  variant='primary'
                  onClick={handleShowOralHistory}
                  className={styles.navButtons}
                >
                  {t('recordOralHistory')} <FontAwesomeIcon icon={faMicrophone} />
                </Button>
              </Col>
            )}
            <Col xs={6} sm={6} md={3} className={styles.navColumn}>
              <Button
                variant='primary'
                className={styles.navButtons}
                onClick={toggleCheckAllCheckboxes}
              >
                {Object.values(checkedCards).every((checked) => checked)
                  ? t('removeSelections')
                  : t('selectAll')}{' '}
                <FontAwesomeIcon icon={faSquareCheck} />
              </Button>
            </Col>
            <Col xs={6} sm={6} md={3} className={styles.navColumn}>
              <Button
                variant='primary'
                onClick={handleShowDeleteModal}
                className={styles.navButtons}
              >
                {t('deleteSelectedFiles')} <FontAwesomeIcon icon={faTrash} />
              </Button>
            </Col>
            <Col xs={6} sm={6} md={3} className={styles.navColumn} />
          </Row>
          {usersDocuments.length > 0 ? (
            <>
              <PagePagination pagination={pagination} />
              <UsersFilesGrid
                checkedCards={checkedCards}
                onCheckboxChange={handleCheckboxChange}
                cardData={cardData}
                pathName={pathname}
                handleShowMessage={handleShowMessage}
              />

              <PagePagination pagination={pagination} />
            </>
          ) : (
            <p className={styles.text}>{t('noDocuments')}</p>
          )}
          <AddFileModal
            handleClose={handleClose}
            showAddFileModal={showAddFileModal}
            setKey={setKey}
            keyForModal={key}
          />
          <RecordOralHistoryModal
            handleClose={handleClose}
            showRecordOralHistoryModal={showRecordOralHistoryModal}
            setKey={setKey}
            keyForModal={key}
            handleShowMessage={handleShowMessage}
          />
          <ConfirmationModal
            show={showConfirmationModal}
            onConfirm={handleConfirmClose}
            onCancel={handleCancelClose}
          />
          {showConfirmationModal && <div className={styles.addFileModalOverlay} />}

          <ConfirmMultipleDeleteModal
            show={showDeleteModal}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />
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

export default UsersFiles;

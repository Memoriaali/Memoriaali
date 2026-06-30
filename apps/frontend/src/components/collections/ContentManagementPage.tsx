'use client';

import sideNavStyles from '@/components/sideNav/SideNavPageContent.module.css';
import { useAuth } from '@/hooks/useAuth';
import { useCollections } from '@/hooks/useCollections';
import { useDocuments } from '@/hooks/useDocuments';
import { useFeatureConfig } from '@/hooks/useVariant';
import { Collection, Document as DocumentType } from '@/lib/api/generated/types.gen';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/dist/client/components/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
    Button,
    Card,
    CardBody,
    Container,
    Form,
    FormGroup,
    Table,
    ToastContainer,
} from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import CreateSipModal from '../../expansions/sip/CreateSipModal';
import CreateSipView from '../../expansions/sip/CreateSipView';
import styles from '../collections/ContentManagementPage.module.css';
import NewEventEmitter from '../eventEmitter/EventEmitter';
import PagePagination from '../pagination/Pagination';
import ContainerSideNav from '../sideNav/Container-SideNav';
import ContentHeader from '../sideNav/ContentHeader';
import ToastMessage from '../toasts/ToastMessage';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import EditCollectionInformation from './EditCollectionInformation';

interface CollectionData {
  collectionName: string;
  collectionDescription: string;
}

interface DocumentInCollection {
  id?: string;
  fileName?: string;
  metadata?: {
    header: string;
    subjectIndexing?: string[];
  };
}

interface ToastData {
  id: number;
  time: Date;
  text: string;
}

const ContentManagementPage: React.FC = () => {
  const feature = useFeatureConfig('sip');
  const sipEnabled = feature?.config?.enabled;

  const t = useTranslations('Collections');
  const { getDocuments } = useDocuments();
  const {
    listUserCollections,
    createNewCollection,
    addNewDocumentToCollection,
    listCollectionDocuments,
    deleteDocumentFromCollection,
    updateCollections,
    deleteSelectedCollection,
  } = useCollections();

  const { user } = useAuth();

  const [publicDocuments, setPublicDocuments] = useState<DocumentType[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection>();
  const [collectionDocuments, setCollectionDocuments] = useState<DocumentInCollection[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [key, setKey] = useState('selectedDocuments');
  const [showCreateSipModal, setShowCreateSipModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentInCollection | null>();
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const handleShowMessage = (text: string) => {
    const newToast = { id: Date.now(), time: new Date(), text };
    setToasts((prevToasts) => [...prevToasts, newToast]);
  };

  const handleCloseMessage = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const filteredDocuments = publicDocuments.filter(
    (doc) => !collectionDocuments.map((d) => d.id).includes(doc.id),
  );

  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);

  const limit = 5;

  const pagination = {
    total: filteredDocuments.length,
    page,
    limit,
    pages: Math.ceil(filteredDocuments.length / limit),
    hasPrev: page > 1,
    hasNext: page < Math.ceil(filteredDocuments.length / limit),
  };

  const paginatedDocuments = filteredDocuments.slice((page - 1) * limit, page * limit);

  // -----------------------------------------------------------------------------
  // Collection document management
  // Fetching documents in a collection and handling document additions/removals
  // -----------------------------------------------------------------------------

  // Selecting a collection and fetching its documents

  const fetchDocumentsInCollection = useCallback(
    async (collectionId: string) => {
      try {
        const result = await listCollectionDocuments({ collectionId });
        setCollectionDocuments(
          result.data?.documents?.map((doc) => ({
            id: doc.id,
            fileName: doc.fileName,
            metadata: doc.metadata
              ? {
                  header: doc.metadata.header as string,
                  subjectIndexing: doc.metadata.subjectIndexing as string[],
                }
              : undefined,
          })) ?? [],
        );
      } catch (error) {
        console.error('Error fetching collection details:', error);
      }
    },
    [listCollectionDocuments],
  );

  // Deleting and adding documents to collection

  const deleteDocuments = useCallback(
    async (collectionId: string, documentId: string) => {
      try {
        await deleteDocumentFromCollection({
          collectionId,
          documentId,
        });
        setCollectionDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
        fetchDocumentsInCollection(collectionId);
      } catch (error) {
        console.error('Error deleting documents from collection:', error);
      }
    },
    [deleteDocumentFromCollection, fetchDocumentsInCollection],
  );

  const addDocuments = useCallback(
    async (collectionId: string, documentIds: string[]) => {
      try {
        for (const documentId of documentIds) {
          await addNewDocumentToCollection({
            collectionId,
            documentId,
          });
        }

        fetchDocumentsInCollection(collectionId);
        setSelectedDocuments([]);
      } catch (error) {
        console.error('Error adding documents to collection:', error);
      }
    },
    [addNewDocumentToCollection, fetchDocumentsInCollection],
  );

  // -----------------------------------------------------------------------------
  // Collection management
  // Handling collection selection, creation, deletion and information updates
  // -----------------------------------------------------------------------------

  const selectCollection = useCallback(
    async (collectionId: string) => {
      try {
        setSelectedCollection(collections.find((col) => col.id === collectionId));
        setSelectedDocuments([]);
        fetchDocumentsInCollection(collectionId);
      } catch (error) {
        console.error('Error fetching collection details:', error);
      }
    },
    [collections, fetchDocumentsInCollection],
  );

  // Fetching collections and user's documents

  const fetchCollections = useCallback(async () => {
    try {
      const result = await listUserCollections();
      setCollections(result.data ?? []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  }, [listUserCollections]);

  const deleteCollection = useCallback(
    async (collectionId: string) => {
      try {
        setCollectionDocuments([]);
        await deleteSelectedCollection({ id: collectionId });
        setSelectedCollection(undefined);
        handleShowMessage(t('collectionDeletedMessage'));
        fetchCollections();
      } catch (error) {
        console.error('Error deleting collection:', error);
      }
    },
    [deleteSelectedCollection, fetchCollections, t],
  );

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<CollectionData>();

  // Creating a new collection and updating collection information

  const onSubmit: SubmitHandler<CollectionData> = async (data: CollectionData) => {
    try {
      const newCollection = await createNewCollection(data);
      fetchCollections();
      setSelectedCollection(newCollection);
      fetchDocumentsInCollection(newCollection.id!);
      reset();
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const updateCollectionInformation = useCallback(
    async (data: { id: string; collectionName: string; collectionDescription: string }) => {
      try {
        const updated = await updateCollections(
          { id: data.id },
          {
            collectionName: data.collectionName,
            collectionDescription: data.collectionDescription,
          },
        );
        fetchCollections();
        setSelectedCollection(updated.data ?? undefined);
      } catch (error) {
        console.error('Error updating collection:', error);
      }
    },
    [updateCollections, fetchCollections],
  );

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Helper function to format document metadata for display purposes

  const formatDocument = (doc: DocumentType): DocumentType => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      exactDate: doc.metadata?.exactDate
        ? new Date(doc.metadata.exactDate).toLocaleDateString('fi-FI')
        : undefined,
    },
  });

  const getPublicDocuments = useCallback(async () => {
    try {
      const result = await getDocuments({
        page: 1,
        limit: 20,
      });
      if (result) {
        const docs = result.data?.data?.documents ?? [];

        const formattedDocs = docs.map(formatDocument);
        setPublicDocuments(formattedDocs);
      }
    } catch (error) {
      console.error(error);
    }
  }, [getDocuments]);

  // Fetching public documents on component mount

  useEffect(() => {
    getPublicDocuments();
  }, [getPublicDocuments]);

  const handleClose = () => {
    setShowCreateSipModal(false);
    NewEventEmitter.emit('resetData');
    setKey('selectedDocuments');
  };
  const handleShow = () => {
    if (!selectedDocuments.length) {
      handleShowMessage(t('chooseFiles'));
      return;
    }
    setKey('selectedDocuments');
    setShowCreateSipModal(true);
  };

  return (
    <ContainerSideNav>
      <Container className={sideNavStyles.sidenavPageContent}>
        <ContentHeader headerText={t('contentManagement')} />

        <Card className={styles.card}>
          <CardBody>
            <h4>{t('createNewCollection')}</h4>

            <Form onSubmit={handleSubmit(onSubmit)}>
              <FormGroup className={styles.formGroup}>
                <Form.Label className={styles.formLabel}>{t('enterCollectionName')}</Form.Label>
                <Form.Control
                  placeholder={t('enterCollectionName')}
                  {...register('collectionName', { required: t('nameRequired') })}
                />
                {errors.collectionName && (
                  <div className={styles.errorText}>{errors.collectionName.message}</div>
                )}
              </FormGroup>

              <FormGroup className={styles.formGroup}>
                <Form.Label className={styles.formLabel}>{t('describeCollection')}</Form.Label>
                <Form.Control
                  as='textarea'
                  placeholder={t('describeCollectionPlaceholder')}
                  {...register('collectionDescription', { required: t('descriptionRequired') })}
                />
                {errors.collectionDescription && (
                  <div className={styles.errorText}>{errors.collectionDescription.message}</div>
                )}
              </FormGroup>

              <Button type='submit'>{t('createNewCollection')}</Button>
            </Form>
          </CardBody>
        </Card>

        <Card className={styles.card}>
          <CardBody>
            <h4>{t('manageCollections')}</h4>
            <Form.Label htmlFor='chooseCollection' className={styles.inputLabel}>
              {t('selectCollection')}
            </Form.Label>
            <Form.Select
              id='chooseCollection'
              aria-label={t('selectCollection')}
              className={styles.inputMargin}
              onChange={(e) => selectCollection(e.target.value)}
            >
              <option>{t('selectCollectionPlaceholder')}</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.collectionName}
                </option>
              ))}
            </Form.Select>

            {selectedCollection && (
              <>
                <EditCollectionInformation
                  selectedCollection={selectedCollection}
                  collectionDocuments={collectionDocuments}
                  deleteCollection={deleteCollection}
                  updateCollectionInformation={updateCollectionInformation}
                  handleShow={handleShow}
                  fetchDocumentsInCollection={fetchDocumentsInCollection}
                />
                <h4>{t('manageCollectionFiles')}</h4>
                <Table striped bordered hover responsive variant='light'>
                  <thead>
                    <tr>
                      <th>{t('file')}</th>
                      <th>{t('keywords')}</th>
                      <th>{t('removeFromCollection')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectionDocuments.length === 0 && (
                      <tr>
                        <td colSpan={3} className={styles.noDocuments}>
                          {t('noDocuments')}
                        </td>
                      </tr>
                    )}
                    {collectionDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td className={styles.settingsTd}>{doc.metadata?.header}</td>
                        <td className={styles.settingsTd}>
                          {doc.metadata?.subjectIndexing?.join(', ')}
                        </td>
                        <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                          <FontAwesomeIcon
                            icon={faTrash}
                            onClick={() => {
                              setShowConfirmDeleteModal(true);
                              setDocumentToDelete(doc);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <h4>{t('addFilesToCollection')}</h4>
                <Button
                  className={styles.btnButton}
                  onClick={() => addDocuments(selectedCollection!.id, selectedDocuments)}
                >
                  {t('addSelectedFiles')}
                </Button>

                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>{t('select')}</th>
                      <th>{t('file')}</th>
                      <th>{t('keywords')}</th>
                      <th>{t('addToCollection')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                          <Form.Check
                            type='checkbox'
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;

                              setSelectedDocuments((prev) =>
                                checked
                                  ? [...prev, doc.id]
                                  : prev.filter((existingId) => existingId !== doc.id),
                              );
                            }}
                          />
                        </td>
                        <td className='mb-3'>{doc.metadata.header}</td>
                        <td>{doc.metadata.subjectIndexing?.join(', ')}</td>
                        <td className={`${styles.settingsTd} ${styles.settingsTdCenter}`}>
                          <Button onClick={() => addDocuments(selectedCollection!.id, [doc.id])}>
                            {t('addToCollection')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <PagePagination pagination={pagination} />
              </>
            )}
          </CardBody>
        </Card>
        {user?.role === 'ADMIN' && (
          <>
            {sipEnabled && (
              <CreateSipView
                publicDocuments={publicDocuments}
                selectedDocuments={selectedDocuments}
                setSelectedDocuments={setSelectedDocuments}
                handleShow={handleShow}
              />
            )}
          </>
        )}

        {sipEnabled && (
          <CreateSipModal
            handleClose={() => handleClose()}
            showCreateSipModal={showCreateSipModal}
            setKey={setKey}
            keyForModal={key}
            selectedDocuments={selectedDocuments}
            setSelectedDocuments={setSelectedDocuments}
          />
        )}

        <ConfirmDeleteModal
          show={showConfirmDeleteModal}
          description={
            <p>
              {t('confirmDeleteDocumentDescription')}{' '}
              <strong>{documentToDelete?.metadata?.header}</strong>?
            </p>
          }
          onCancel={() => {
            setShowConfirmDeleteModal(false);
            setDocumentToDelete(null);
          }}
          onConfirm={() => {
            if (!documentToDelete) return;

            deleteDocuments(selectedCollection!.id, documentToDelete.id!);

            setShowConfirmDeleteModal(false);
            setDocumentToDelete(null);
          }}
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
      </Container>
    </ContainerSideNav>
  );
};

export default ContentManagementPage;

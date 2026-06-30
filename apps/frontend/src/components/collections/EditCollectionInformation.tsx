'use client';

import { Collection } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Form, FormGroup } from 'react-bootstrap';
import Button from 'react-bootstrap/esm/Button';
import { useForm } from 'react-hook-form';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import styles from './EditCollectionInformation.module.css';

interface EditCollectionInformationProps {
  selectedCollection?: Collection;
  deleteCollection: (id: string) => void;
  updateCollectionInformation: (data: {
    id: string;
    collectionName: string;
    collectionDescription: string;
  }) => void;

  handleShow: () => void;
  fetchDocumentsInCollection: (collectionId: string) => void;
  collectionDocuments: DocumentInCollection[];
}

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

const EditCollectionInformation: React.FC<EditCollectionInformationProps> = ({
  selectedCollection,
  deleteCollection,
  updateCollectionInformation,
  collectionDocuments,
}) => {
  const t = useTranslations('Collections');
  const [editMode, setEditMode] = useState(false);
  const [showDeleteCollectionModal, setShowDeleteCollectionModal] = useState(false);
  const [hasDocuments, setHasDocuments] = useState(false);

  const { handleSubmit, register, reset } = useForm<CollectionData>();

  useEffect(() => {
    if (selectedCollection) {
      reset({
        collectionName: selectedCollection.collectionName,
        collectionDescription: selectedCollection.collectionDescription,
      });
    }
  }, [selectedCollection, reset]);

  const onSubmit = (data: CollectionData) => {
    try {
      updateCollectionInformation({
        id: selectedCollection?.id || '',
        collectionName: data.collectionName,
        collectionDescription: data.collectionDescription,
      });
      setEditMode(false);
    } catch (error) {
      console.error('Error updating collection:', error);
    }
  };

  return (
    <>
      {editMode ? (
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Form.Label className={styles.formLabel}>{t('enterCollectionName')}</Form.Label>
            <Form.Control
              placeholder={t('enterCollectionName')}
              className={styles.formControl}
              {...register('collectionName', { required: true })}
            />
          </FormGroup>

          <FormGroup>
            <Form.Label className={styles.formLabel}>{t('describeCollection')}</Form.Label>
            <Form.Control
              as='textarea'
              placeholder={t('describeCollectionPlaceholder')}
              className={styles.formControl}
              {...register('collectionDescription', { required: true })}
            />
          </FormGroup>

          <Button type='submit' onClick={() => setEditMode(false)} className={styles.btnButton}>
            {t('cancel')}
          </Button>
          <Button type='submit' className={styles.btnButton}>
            {t('saveChanges')}
          </Button>
          <Button
            className={styles.btnButton}
            style={{ marginLeft: '10px' }}
            onClick={() => deleteCollection(selectedCollection!.id)}
          >
            {t('deleteSelectedCollection')}
          </Button>
        </Form>
      ) : (
        <>
          <h3>{selectedCollection?.collectionName}</h3>
          <p>{selectedCollection?.collectionDescription}</p>
          <Button type='submit' onClick={() => setEditMode(true)} className={styles.btnButton}>
            {t('editCollection')}
          </Button>
          <Button
            className={styles.btnButton}
            style={{ marginLeft: '10px' }}
            onClick={() => {
              setHasDocuments(collectionDocuments.length > 0);
              setShowDeleteCollectionModal(true);
            }}
          >
            {t('deleteSelectedCollection')}
          </Button>
        </>
      )}

      <ConfirmDeleteModal
        show={showDeleteCollectionModal}
        onConfirm={() => deleteCollection(selectedCollection!.id)}
        onCancel={() => setShowDeleteCollectionModal(false)}
        isError={hasDocuments}
        description={
          hasDocuments ? (
            <p>{t('deleteErrorDescription')}</p>
          ) : (
            <p>
              {t('confirmDeleteDescription')} <strong>{selectedCollection?.collectionName}</strong>?
            </p>
          )
        }
      />
    </>
  );
};

export default EditCollectionInformation;

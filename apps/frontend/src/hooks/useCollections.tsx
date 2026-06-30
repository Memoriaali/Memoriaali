'use client';
import {
  addDocumentToCollection,
  AddDocumentToCollectionData,
  createCollection,
  CreateCollectionData,
  deleteCollection,
  DeleteCollectionData,
  getCollectionById,
  GetCollectionByIdData,
  listCollections,
  listDocumentsInCollection,
  ListDocumentsInCollectionData,
  removeDocumentFromCollection,
  RemoveDocumentFromCollectionData,
  updateCollection,
  UpdateCollectionData,
} from '@/lib/api';
import { useCallback } from 'react';

export const useCollections = () => {
  const fetchCollectionById = useCallback(
    async (fetchCollectionByIdData: GetCollectionByIdData['path']) => {
      try {
        const result = await getCollectionById({
          path: fetchCollectionByIdData,
        });
        return result;
      } catch (error) {
        console.error('Error fetching collection by ID:', error);
        throw new Error('Failed to fetch collection');
      }
    },
    [],
  );

  const deleteSelectedCollection = useCallback(
    async (deleteSelectedCollectionData: DeleteCollectionData['path']) => {
      try {
        const result = await deleteCollection({
          path: deleteSelectedCollectionData,
        });
        return result.data;
      } catch (error) {
        console.error('Error deleting collection:', error);
        throw new Error('Failed to delete collection');
      }
    },
    [],
  );

  const updateCollections = useCallback(
    async (path: UpdateCollectionData['path'], body: UpdateCollectionData['body']) => {
      try {
        const result = await updateCollection({ path, body });
        const response = result.data;
        if (!response) {
          throw new Error('No response from server');
        }
        return response;
      } catch (error) {
        console.error('Error updating collection:', error);
        throw new Error('Failed to update collection');
      }
    },
    [],
  );

  const deleteDocumentFromCollection = useCallback(
    async (deleteDocumentFromCollectionData: RemoveDocumentFromCollectionData['body']) => {
      try {
        const result = await removeDocumentFromCollection({
          body: deleteDocumentFromCollectionData,
        });
        const response = result.data;
        if (!response) {
          throw new Error('No response from server');
        }
        return response;
      } catch (error) {
        console.error('Error deleting document from collection:', error);
        throw new Error('Failed to delete document from collection');
      }
    },
    [],
  );

  const addNewDocumentToCollection = useCallback(
    async (addDocumentToCollectionData: AddDocumentToCollectionData['body']) => {
      try {
        const result = await addDocumentToCollection({
          body: addDocumentToCollectionData,
        });
        const response = result.data;
        if (!response) {
          throw new Error('No response from server');
        }
        return response;
      } catch (error) {
        console.error('Error adding document to collection:', error);
        throw new Error('Failed to add document to collection');
      }
    },
    [],
  );

  const createNewCollection = useCallback(async (collectionData: CreateCollectionData['body']) => {
    try {
      const result = await createCollection({
        body: collectionData,
      });
      const response = result.data?.data;
      if (!response) {
        throw new Error('No response from server');
      }
      return response;
    } catch (error) {
      console.error('Error creating collection:', error);
      throw new Error('Failed to create collection');
    }
  }, []);

  const listCollectionDocuments = useCallback(
    async (listCollectionDocumentsData: ListDocumentsInCollectionData['path']) => {
      try {
        const result = await listDocumentsInCollection({
          path: listCollectionDocumentsData,
        });
        const response = result;
        if (!response) {
          throw new Error('No response from server');
        }
        return response;
      } catch (error) {
        console.error('Error listing documents:', error);
        throw new Error('Failed to list documents');
      }
    },
    [],
  );

  const listUserCollections = useCallback(async () => {
    try {
      const result = await listCollections();
      const response = result.data?.data;
      if (!response) {
        throw new Error('No response from server');
      }
      return response;
    } catch (error) {
      console.error('Error listing collections:', error);
      throw new Error('Failed to list collections');
    }
  }, []);

  return {
    fetchCollectionById,
    listUserCollections,
    createNewCollection,
    addNewDocumentToCollection,
    listCollectionDocuments,
    deleteDocumentFromCollection,
    updateCollections,
    deleteSelectedCollection,
  };
};

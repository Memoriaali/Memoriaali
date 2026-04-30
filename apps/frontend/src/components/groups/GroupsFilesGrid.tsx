'use client';

import { useDocuments } from '@/hooks/useDocuments';
import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import FilesCardImageLeft from '../files/FilesCardImageLeft';
import PagePagination from '../pagination/Pagination';

interface GroupsFilesGridProps {
  groupId: string;
  handleShowMessage: (message: string) => void;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const GroupsFilesGrid: React.FC<GroupsFilesGridProps> = ({ groupId, handleShowMessage }) => {
  const t = useTranslations('Groups');
  const router = useRouter();

  const { getGroupDocuments } = useDocuments();

  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });

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

  const [groupDocuments, setGroupDocuments] = useState<DocumentType[]>([]);

  const getDocumentsForUser = useCallback(async () => {
    try {
      if (groupId !== '') {
        const result = await getGroupDocuments(groupId);
        if (result) {
          const docs = result.data?.data?.documents ?? [];

          const pagination = {
            total: result.data?.data?.pagination?.total ?? 0,
            page: result.data?.data?.pagination?.page ?? 1,
            limit: result.data?.data?.pagination?.limit ?? 10,
            pages: result.data?.data?.pagination?.pages ?? 0,
            hasNext: result.data?.data?.pagination?.hasNext ?? false,
            hasPrev: result.data?.data?.pagination?.hasPrev ?? false,
          };
          setPagination(pagination);

          const formattedDocs = docs.map(formatDocument);
          setGroupDocuments(formattedDocs);
        }
      }
    } catch (error) {
      console.error(error);
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };

        if (statusCode === 400) {
          handleShowMessage(t('invalidRequestData'));
        } else if (statusCode === 401) {
          router.push('/login?error=sessionExpired');
          return;
        } else if (statusCode === 403) {
          handleShowMessage(t('insufficientPermissions'));
        } else if (statusCode === 409) {
          handleShowMessage(t('groupNameExistsError'));
        } else {
          handleShowMessage(t('unexpectedError'));
        }
      }
    }
  }, [getGroupDocuments, groupId, handleShowMessage, router, t]);

  useEffect(() => {
    getDocumentsForUser().catch(console.error);
  }, [getDocumentsForUser]);

  return (
    <div>
      <PagePagination pagination={pagination} />
      {groupDocuments.length === 0 ? (
        <p>{t('noResults')}</p>
      ) : (
        groupDocuments.map((document) => {
          return <FilesCardImageLeft key={document.id} id={document.id} document={document} />;
        })
      )}

      <PagePagination pagination={pagination} />
    </div>
  );
};

export default GroupsFilesGrid;

'use client';

import sideNavStyles from '@/components/sideNav/SideNavPageContent.module.css';
import { useCollections } from '@/hooks/useCollections';
import { Collection, Document as DocumentType } from '@/lib/api/generated/types.gen';
import { useTranslations } from 'next-intl';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import FilesCard from '../files/FilesCard';
import PagePagination from '../pagination/Pagination';
import ContainerSideNav from '../sideNav/Container-SideNav';
import ContentHeader from '../sideNav/ContentHeader';

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface DocumentInCollection {
  id?: string;
  fileName?: string;
  metadata?: {
    header: string;
    exactDate?: string;
    description?: string;
    subjectIndexing?: string[];
    type?: string;
    events?: string;
    locations?: string[];
    author?: string;
    estimatedDate?: string;
    language?: string;
    personNames?: string[];
    organizations?: string[];
    businessIdentityCode?: string;
    journalNumber?: string[];
    products?: string;
    nationalityReligiousPolitical?: string[];
    other?: string;
  };
}

const CollectionsPage: React.FC = () => {
  const t = useTranslations('Collections');
  const params = useParams();
  const id = params.id;
  const pathname = usePathname();

  const { fetchCollectionById } = useCollections();

  const [collection, setCollection] = useState<Collection>();

  useEffect(() => {
    if (!id) return;

    const fetchCollection = async () => {
      const res = await fetchCollectionById({ id: id as string });
      setCollection(res.data?.data);
    };

    fetchCollection();
  }, [id, fetchCollectionById]);

  const { listCollectionDocuments } = useCollections();
  const [collectionDocuments, setCollectionDocuments] = useState<DocumentInCollection[]>([]);

  // TODO : Backend doesn't return the document mimetype
  // Add the mimetype to the document object so that document image will be visible in the collection page
  const fetchDocumentsInCollection = useCallback(
    async (collectionId: string) => {
      try {
        const result = await listCollectionDocuments({ collectionId });
        setCollectionDocuments(
          result.data?.documents?.map((doc) => ({
            id: doc.id,
            fileName: doc.fileName,
            documentPrivacy: doc.documentPrivacy,
            userId: doc.userId,
            mimeType: doc. mimeType,
            metadata: doc.metadata
              ? {
                  header: doc.metadata.header as string,
                  exactDate: doc.metadata.exactDate as string,
                  description: doc.metadata.description as string,
                  subjectIndexing: doc.metadata.subjectIndexing as string[],
                  type: doc.metadata.type as string,
                  events: doc.metadata.events as string,
                  locations: doc.metadata.locations as string[],
                  author: doc.metadata.author as string,
                  estimatedDate: doc.metadata.estimatedDate as string,
                  language: doc.metadata.language as string,
                  personNames: doc.metadata.personNames as string[],
                  organizations: doc.metadata.organizations as string[],
                  businessIdentityCode: doc.metadata.businessIdentityCode as string,
                  journalNumber: doc.metadata.journalNumber as string[],
                  products: doc.metadata.products as string,
                  nationalityReligiousPolitical: doc.metadata
                    .nationalityReligiousPolitical as string[],
                  other: doc.metadata.other as string,
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

  useEffect(() => {
    fetchDocumentsInCollection(id as string);
  }, [id, fetchDocumentsInCollection]);

  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);

  const limit = 10;
  const pagination: Pagination = {
    total: collectionDocuments.length,
    page,
    limit,
    pages: Math.ceil(collectionDocuments.length / limit),
    hasPrev: page > 1,
    hasNext: page < Math.ceil(collectionDocuments.length / limit),
  };

  const paginatedDocuments = collectionDocuments.slice((page - 1) * limit, page * limit);

  if (!collection) {
    return (
      <ContainerSideNav>
        <Container className={sideNavStyles.sidenavPageContent}>
          <div>{t('loading')}</div>
        </Container>
      </ContainerSideNav>
    );
  }

  return (
    <ContainerSideNav>
      <Container className={sideNavStyles.sidenavPageContent}>
        <ContentHeader headerText={collection.collectionName} />
        <p>{collection.collectionDescription}</p>
        <PagePagination pagination={pagination} />
        <Row>
          {paginatedDocuments.map((doc) => (
            <Col xs={6} sm={6} md={4} lg={3} key={doc.id} className='mb-3'>
              <div>
                <FilesCard
                  id={doc.id as string}
                  doc={doc as DocumentType}
                  isChecked={false}
                  onCheckboxChange={() => {}}
                  pathName={pathname}
                  handleShowMessage={(message) => console.log(message)}
                />
              </div>
            </Col>
          ))}
        </Row>
        <PagePagination pagination={pagination} />
      </Container>
    </ContainerSideNav>
  );
};

export default CollectionsPage;

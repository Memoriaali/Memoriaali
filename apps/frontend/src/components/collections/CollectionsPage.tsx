'use client';
import sideNavStyles from '@/components/sideNav/SideNavPageContent.module.css';
import { useCollections } from '@/hooks/useCollections';
import { Collection } from '@/lib/api';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Container, ListGroup, ListGroupItem } from 'react-bootstrap';
import ContainerSideNav from '../sideNav/Container-SideNav';
import ContentHeader from '../sideNav/ContentHeader';
import styles from './CollectionsPage.module.css';

const CollectionsPage: React.FC = () => {
  const t = useTranslations('Collections');

  const { listUserCollections } = useCollections();
  const [collections, setCollections] = useState<Collection[]>([]);

  const fetchCollections = useCallback(async () => {
    try {
      const result = await listUserCollections();
      setCollections(result.data ?? []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  }, [listUserCollections]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return (
    <ContainerSideNav>
      <Container className={sideNavStyles.sidenavPageContent}>
        <ContentHeader headerText={t('memoriaaliCollections')} />

        <ListGroup as='ol'>
          {collections.map((collection) => {
            return (
              <Link
                key={collection.id}
                href={`collection/${collection.id}`}
                className={styles.collectionsLink}
              >
                <ListGroupItem
                  as='li'
                  className={`d-flex justify-content-between align-items-start ${styles.listItem}`}
                >
                  <div className='ms-2 me-auto'>
                    <div className='fw-bold'>{collection.collectionName}</div>
                    {collection.collectionDescription}
                  </div>
                  <Badge bg='primary' pill>
                    {collection._count?.documents}
                  </Badge>
                </ListGroupItem>
              </Link>
            );
          })}
        </ListGroup>
      </Container>
    </ContainerSideNav>
  );
};

export default CollectionsPage;

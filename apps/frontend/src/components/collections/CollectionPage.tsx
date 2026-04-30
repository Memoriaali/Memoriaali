'use client';

import sideNavStyles from '@/components/sideNav/SideNavPageContent.module.css';
import { useTranslations } from 'next-intl';
import { Col, Container, Row } from 'react-bootstrap';
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

const CollectionsPage: React.FC = () => {
  const t = useTranslations('Collections');

  const pagination: Pagination = {
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  };

  return (
    <ContainerSideNav>
      <Container className={sideNavStyles.sidenavPageContent}>
        <ContentHeader headerText={t('collectionName')} />
        <PagePagination pagination={pagination} />
        <Row>
          <Col xs={6} sm={6} md={4} lg={3}>
            {/*<FilesCard id="1" isChecked={false} onCheckboxChange={() => {}} />*/}
          </Col>
        </Row>
        <PagePagination pagination={pagination} />
      </Container>
    </ContainerSideNav>
  );
};

export default CollectionsPage;

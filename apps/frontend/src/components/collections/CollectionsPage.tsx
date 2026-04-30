import sideNavStyles from '@/components/sideNav/SideNavPageContent.module.css';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Badge, Container, ListGroup, ListGroupItem } from 'react-bootstrap';
import ContainerSideNav from '../sideNav/Container-SideNav';
import ContentHeader from '../sideNav/ContentHeader';
import styles from './CollectionsPage.module.css';

const CollectionsPage: React.FC = () => {
  const t = useTranslations('Collections');

  return (
    <ContainerSideNav>
      <Container className={sideNavStyles.sidenavPageContent}>
        <ContentHeader headerText={t('memoriaaliCollections')} />
        <ListGroup as='ol'>
          <Link href={`collection/1`} className={styles.collectionsLink}>
            <ListGroupItem
              as='li'
              className={`d-flex justify-content-between align-items-start ${styles.listItem}`}
            >
              <div className='ms-2 me-auto'>
                <div className='fw-bold'>{t('collection1Title')}</div>
                {t('collection1Description')}
              </div>
              <Badge bg='primary' pill>
                300
              </Badge>
            </ListGroupItem>
          </Link>

          <Link href='/collection/2' className={styles.collectionsLink}>
            <ListGroupItem
              as='li'
              className={`d-flex justify-content-between align-items-start ${styles.listItem}`}
            >
              <div className='ms-2 me-auto'>
                <div className='fw-bold'>{t('collection2Title')}</div>
                {t('collection2Description')}
              </div>
              <Badge bg='primary' pill>
                39
              </Badge>
            </ListGroupItem>
          </Link>

          <Link href='/collection/3' className={styles.collectionsLink}>
            <ListGroupItem
              as='li'
              className={`d-flex justify-content-between align-items-start ${styles.listItem}`}
            >
              <div className='ms-2 me-auto'>
                <div className='fw-bold'>{t('collection3Title')}</div>
                {t('collection3Description')}
              </div>
              <Badge bg='primary' pill>
                14
              </Badge>
            </ListGroupItem>
          </Link>
        </ListGroup>
      </Container>
    </ContainerSideNav>
  );
};

export default CollectionsPage;

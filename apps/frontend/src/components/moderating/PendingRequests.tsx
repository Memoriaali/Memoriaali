'use client';
import sideNavStyles from '@/components/sideNav/SideNavPageContent.module.css';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import { Container } from 'react-bootstrap';
import ContainerSideNav from '../sideNav/Container-SideNav';
import ContentHeader from '../sideNav/ContentHeader';
import PendingComments from './PendingComments';
import PendingMetadataSuggestions from './PendingMetadataSuggestions';

const PendingRequests: React.FC = () => {
  const t = useTranslations('Moderating');
  const { user } = useAuth();
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return (
    <ContainerSideNav>
      <Container className={sideNavStyles.sidenavPageContent}>
        {isPrivileged && (
          <>
            <ContentHeader headerText={t('approvalPending')} />

            <PendingComments />

            <PendingMetadataSuggestions />
          </>
        )}
      </Container>
    </ContainerSideNav>
  );
};

export default PendingRequests;

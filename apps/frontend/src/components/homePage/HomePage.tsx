'use client';

import CardGrid from '@/components/homePage/CardGrid';
import CardImageRight from '@/components/homePage/CardImageRight';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import { Container } from 'react-bootstrap';
//import placeholderImage from '../../image/homepage/placeholder-image.jpg';
import homepage1 from '../../image/homepage/homepage1.jpg';
import homepage2 from '../../image/homepage/homepage2.jpg';
import homepage3 from '../../image/homepage/homepage3.jpg';

export default function HomePage() {
  // const { locale } = useParams();
  const t = useTranslations('HomePage');

  const { isAuthenticated } = useAuth();

  return (
    <Container>
      <CardImageRight
        title={t('memorialTitle')}
        text={t('memorialText')}
        image={homepage1.src}
        buttonText={t('memorialButtonText')}
        buttonPath={isAuthenticated ? undefined : `/login`}
      />
      <CardGrid />
      <CardImageRight
        title={t('savingTitle')}
        text={t('savingText')}
        image={homepage2.src}
        buttonText={t('savingButtonText')}
        //buttonPath={isAuthenticated ? '/usersfiles' : '/login'}
        buttonPath='/usersfiles'
      />
      <CardImageRight
        title={t('browsingTitle')}
        text={t('browsingText')}
        image={homepage3.src}
        buttonText={t('browsingButtonText')}
        buttonPath={`/search`}
      />
    </Container>
  );
}

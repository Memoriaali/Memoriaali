'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Dropdown, DropdownButton } from 'react-bootstrap';
import styles from './NavBar.module.css';

const locales = ['en', 'fi'];

export default function LanguageSwitcher() {
  const t = useTranslations('NavBar');
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    const segments = pathname?.split('/') ?? [];
    const currentLocale = segments[1] ?? ''; // fallback to empty string

    const pathWithoutLocale = locales.includes(currentLocale)
      ? `/${segments.slice(2).join('/')}`
      : pathname;

    router.replace(`/${newLocale}${pathWithoutLocale}`);
  };

  return (
    <DropdownButton
      title={t('changeLanguage')}
      id='navbarScrollingDropdown'
      className={styles.languageSwitcher}
      variant='primary'
    >
      <Dropdown.Item onClick={() => handleLanguageChange('fi')}>Suomeksi</Dropdown.Item>
      <Dropdown.Item onClick={() => handleLanguageChange('en')}>In English</Dropdown.Item>
    </DropdownButton>
  );
}

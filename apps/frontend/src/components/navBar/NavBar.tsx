'use client';

import { useAuth } from '@/hooks/useAuth';
import { faMagnifyingGlass, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Container, Dropdown, Image, Nav } from 'react-bootstrap';
import Navbar from 'react-bootstrap/Navbar';
import brandLogo from '../../image/logos/brandlogo.png';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './NavBar.module.css';

const NavBar = () => {
  const { locale } = useParams();
  const router = useRouter();
  const t = useTranslations('NavBar');

  const { isAuthenticated, user, logout } = useAuth();
  const [navbarInputValue, setNavbarInputValue] = useState('');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Navigate to search page - update the URL with the search query
    // This will trigger the search page to fetch and display results based on the query
    router.push(`/${locale}/search?search=${navbarInputValue}`);
  };

  return (
    <>
      <Navbar expand='lg' className={styles.topNavigation}>
        <Container fluid>
          <Navbar.Brand className={styles.brandContainer}>
            <Link href={`/${locale}/`} className={styles.brandLink}>
              <Image
                src={brandLogo.src}
                className={`d-inline-block align-top brandLogo ${styles.brandLogo}`}
                alt='logoipsum'
                width='110'
              />

              <span className={styles.brandText}>Memoriaali</span>
            </Link>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls='navbarScroll' />
          <Navbar.Collapse>
            <Nav className='mx-auto' navbarScroll>
              <form onSubmit={handleSearch} className={styles.searchGroup}>
                <div className={styles.inputGroupLoose}>
                  <input
                    type='text'
                    placeholder={t('searchButton')}
                    className={`form-control ${styles.formControl} ${styles.formControlUnderlined} bg-secondary`}
                    value={navbarInputValue}
                    onChange={(e) => setNavbarInputValue(e.target.value)}
                  />
                  <button type='submit' className='btn btn-primary shadow-sm' aria-label='search'>
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </form>
            </Nav>

            <Nav>
              <LanguageSwitcher />

              {isAuthenticated ? (
                <>
                  <Link href={`/${locale}/usersfiles`} className={styles.desktopLink}>
                    <Button variant='primary'>
                      <FontAwesomeIcon icon={faUser} /> {t('myDesktop')}
                    </Button>
                  </Link>
                  <Dropdown>
                    <Dropdown.Toggle variant='primary' id='dropdown-basic'>
                      <FontAwesomeIcon icon={faUser} /> {user?.username}
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                      <Dropdown.Item onClick={logout}>{t('logoutTitle')}</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </>
              ) : (
                <Link href={`/${locale}/login`}>
                  <Button variant='primary'>
                    <FontAwesomeIcon icon={faUser} /> {t('loginTitle')}
                  </Button>
                </Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container fluid className={`bg-primary ${styles.navbarDivider}`} />
    </>
  );
};

export default NavBar;

'use client';

import { faAngleRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import styles from './Container-SideNav.module.css';
import SideNav from './SideNav';

const ContainerSideNav: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useTranslations('SideNav');

  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle screen resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setSidebarVisible(!mobile); // Sidebar visible by default on larger screens
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle disabling/enabling scrolling based on sidebar state
  useEffect(() => {
    if (sidebarVisible && isMobile) {
      document.body.classList.add('bodyNoScroll');
    } else {
      document.body.classList.remove('bodyNoScroll');
    }
  }, [sidebarVisible, isMobile]);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  return (
    <div className={styles.sidenavWrapper}>
      {/* Sidebar */}
      <SideNav sidebarVisible={sidebarVisible} toggleSidebar={toggleSidebar} />

      {/* Main Content */}
      <div className={`${styles.mainContent} ${sidebarVisible ? 'with-sidebar' : 'no-sidebar'}`}>
        {/* Mobile Toggle Button */}
        {isMobile && !sidebarVisible && (
          <Button
            aria-label={t('openMenu')}
            onClick={toggleSidebar}
            className={styles.mobileToggleBtn}
          >
            <FontAwesomeIcon icon={faAngleRight} />
          </Button>
        )}
        {children}
      </div>
    </div>
  );
};

export default ContainerSideNav;

'use client';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureConfig } from '@/hooks/useVariant';
import {
  faAngleLeft,
  faArrowDown,
  faArrowUp,
  faCircleCheck,
  faFile,
  faFileCirclePlus,
  faGear,
  faMicrophone,
  faPhotoFilm,
  faUsers,
  faUsersGear,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useState } from 'react';
import { Button, Nav, Navbar, ToastContainer } from 'react-bootstrap';
import RecordOralHistoryModal from '../../expansions/oralHistory/recordOralHistory/RecordOralHistoryModal';
import AddFileModal from '../addFile/AddFileModal';
import ConfirmationModal from '../addFile/ConfirmationModal';
import NewEventEmitter from '../eventEmitter/EventEmitter';
import ToastMessage from '../toasts/ToastMessage';
import containerStyles from './Container-SideNav.module.css';
import styles from './SideNav.module.css';

// Define the prop types for SideNav2
interface SideNavProps {
  sidebarVisible: boolean; // Whether the sidebar is visible or not
  toggleSidebar: () => void; // Function to toggle the sidebar visibility
}

interface ToastData {
  id: number;
  time: Date;
  text: string;
}

//TODO: router awareness for active links

const SideNav: React.FC<SideNavProps> = ({ sidebarVisible, toggleSidebar }) => {
  const { locale } = useParams();
  const t = useTranslations('SideNav');

  // This comes from variants and checks if the oral history is enabled by admins
  const feature = useFeatureConfig('oralHistory');
  const oralHistoryEnabled = feature?.config?.enabled;
  const { user } = useAuth();
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  // State for showing dropdown for groups
  const [showGroupDropdown, setShowGroupDropdown] = useState(true);

  // Function for changing group dropdown state
  const handleShowGroupDropdown = () => {
    setShowGroupDropdown((prevCheck) => !prevCheck);
  };

  // State for showing dropdown for collections
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(true);

  // Function for changing collections dropdown state
  const handleShowCollectionDropdown = () => {
    setShowCollectionDropdown((prevCheck) => !prevCheck);
  };

  // State for opening and closing add file modal
  const [showAddFileModal, setShowAddFileModal] = useState(false);

  // State for Oral History Modal
  const [showRecordOralHistoryModal, setShowRecordOralHistoryModal] = useState(false);

  // Key to changing between tabs in add file and oralhistory modal
  const [key, setKey] = useState('addFile');

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const handleShowMessage = (text: string) => {
    const newToast = { id: Date.now(), time: new Date(), text };
    setToasts((prevToasts) => [...prevToasts, newToast]);
  };
  const handleCloseMessage = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const handleConfirmClose = () => {
    NewEventEmitter.emit('resetData');
    setShowConfirmationModal(false);
    setShowAddFileModal(false);
    setShowRecordOralHistoryModal(false);
  };
  const handleCancelClose = () => {
    setShowConfirmationModal(false);
  };

  const handleClose = () => {
    if (key !== 'finished') {
      setShowConfirmationModal(true);
    } else {
      setShowAddFileModal(false);
      setShowRecordOralHistoryModal(false);
      NewEventEmitter.emit('resetData');
    }
  };

  const handleShow = () => {
    setKey('addFile');
    setShowAddFileModal(true);
  };

  const handleShowOralHistory = () => {
    setKey('recordingSettings');
    setShowRecordOralHistoryModal(true);
  };

  return (
    <>
      {/* Sidebar */}
      <div className={`${containerStyles.sidebar} ${sidebarVisible ? 'open' : 'closed'}`}>
        <Button aria-label='Close Menu' onClick={toggleSidebar} className={styles.closeBtn}>
          <FontAwesomeIcon icon={faAngleLeft} />
        </Button>

        {/* Sidebar Content */}
        <Navbar className='d-flex flex-column'>
          <Nav className='flex-column'>
            <Link href={`/${locale}/usersfiles`} className={styles.navLink}>
              <FontAwesomeIcon icon={faPhotoFilm} /> {t('myDesktop')}
            </Link>

            <Nav.Link onClick={handleShow} className={styles.navLink}>
              <FontAwesomeIcon icon={faFileCirclePlus} /> {t('addFile')}
            </Nav.Link>

            {oralHistoryEnabled && (
              <Nav.Link onClick={handleShowOralHistory} className={styles.navLink}>
                <FontAwesomeIcon icon={faMicrophone} /> {t('recordOralHistory')}
              </Nav.Link>
            )}

            {/*
            <Nav.Link className={styles.navLink} onClick={handleShowCollectionDropdown}>
              <FontAwesomeIcon icon={faFolderOpen} /> {t('browseCollections')} &ensp;
              {showCollectionDropdown === true && <FontAwesomeIcon icon={faArrowDown} />}
              {showCollectionDropdown === false && <FontAwesomeIcon icon={faArrowUp} />}
            </Nav.Link>
            <div style={{ display: showCollectionDropdown ? 'none' : 'block' }}>
              <Link href={`/${locale}/collections`} className={styles.navLinkIndent}>
                <FontAwesomeIcon icon={faBorderAll} /> {t('collections')}
              </Link>
            </div>

            <div style={{ display: showCollectionDropdown ? 'none' : 'block' }}>
              <Link href={`/${locale}/collectionsettings`} className={styles.navLinkIndent}>
                <FontAwesomeIcon icon={faWrench} /> {t('collectionTools')}
              </Link>
            </div>
            */}

            <Nav.Link className={styles.navLink} onClick={handleShowGroupDropdown}>
              <FontAwesomeIcon icon={faUsers} /> {t('groups')} &ensp;
              {showGroupDropdown === true && <FontAwesomeIcon icon={faArrowDown} />}
              {showGroupDropdown === false && <FontAwesomeIcon icon={faArrowUp} />}
            </Nav.Link>

            <div style={{ display: showGroupDropdown ? 'none' : 'block' }}>
              <Link href={`/${locale}/groupsfiles`} className={styles.navLinkIndent}>
                <FontAwesomeIcon icon={faFile} /> {t('myGroupFiles')}
              </Link>
            </div>
            {isPrivileged && (
              <div style={{ display: showGroupDropdown ? 'none' : 'block' }}>
                <Nav.Link
                  href={`/${locale}/groupssettings`}
                  className={styles.navLinkIndent}
                  hidden={showGroupDropdown}
                >
                  <FontAwesomeIcon icon={faUsersGear} /> {t('groupManagement')}
                </Nav.Link>
              </div>
            )}

            {isPrivileged && (
              <Link href={`/${locale}/pendingrequests`} className={styles.navLink}>
                <FontAwesomeIcon icon={faCircleCheck} /> {t('pendingApprovals')}
              </Link>
            )}

            <Link href={`/${locale}/settings`} className={styles.navLink}>
              <FontAwesomeIcon icon={faGear} /> {t('settings')}
            </Link>
          </Nav>
        </Navbar>
      </div>

      <AddFileModal
        handleClose={handleClose}
        showAddFileModal={showAddFileModal}
        setKey={setKey}
        keyForModal={key}
      />

      <RecordOralHistoryModal
        handleClose={handleClose}
        showRecordOralHistoryModal={showRecordOralHistoryModal}
        setKey={setKey}
        keyForModal={key}
        handleShowMessage={handleShowMessage}
      />

      <ConfirmationModal
        show={showConfirmationModal}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />
      {showConfirmationModal && <div className={styles.addFileModalOverlay} />}

      <ToastContainer
        className='p-3'
        position='bottom-start'
        style={{
          zIndex: 1065,
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
        }}
      >
        {toasts.map((toast) => (
          <ToastMessage
            key={toast.id}
            id={toast.id}
            time={toast.time}
            toastText={toast.text}
            onClose={handleCloseMessage}
          />
        ))}
      </ToastContainer>
    </>
  );
};

export default SideNav;

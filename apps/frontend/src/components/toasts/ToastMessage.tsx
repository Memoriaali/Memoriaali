import React, { useEffect, useState } from 'react';
import { Toast } from 'react-bootstrap';
import styles from './ToastMessage.module.css';

interface ToastMessageProps {
  id: number;
  time: Date;
  toastText: string;
  onClose: (_id: number) => void;
}

const ToastMessage: React.FC<ToastMessageProps> = ({ id, time, toastText, onClose }) => {
  const [timeAgo, setTimeAgo] = useState<string>('Hetki sitten');

  useEffect(() => {
    const updateTimeAgo = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - time.getTime()) / 60000); // Difference in minutes
      setTimeAgo(diff === 0 ? 'Hetki sitten' : `${diff} minuutti${diff > 1 ? 'a' : ''} sitten`);
    };

    updateTimeAgo(); // Initial call
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [time]);

  return (
    <Toast onClose={() => onClose(id)}>
      <Toast.Header className={styles.toastHeaderCustom}>
        <strong className='me-auto'>Memoriaali</strong>
        <small>{timeAgo}</small>
      </Toast.Header>
      <Toast.Body className={styles.toastBodyCustom}>{toastText}</Toast.Body>
    </Toast>
  );
};

export default ToastMessage;

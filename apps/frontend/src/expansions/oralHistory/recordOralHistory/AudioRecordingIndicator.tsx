import { faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import styles from './AudioRecordingIndicator.module.css';

interface AudioRecordingIndicatorProps {
  recordingInProcess: boolean;
  recordingPaused: boolean;
}

const AudioRecordingIndicator = ({
  recordingInProcess,
  recordingPaused,
}: AudioRecordingIndicatorProps) => {
  const t = useTranslations('RecordOralHistory');

  return (
    <div className={styles.audioIndicator}>
      <FontAwesomeIcon icon={faMicrophone} size='3x' />

      {recordingPaused ? (
        <p>{t('recordingPaused')}</p>
      ) : recordingInProcess ? (
        <>
          <p>{t('recordingInProcess')}</p>
          <div className={styles.audioPulse} />
        </>
      ) : (
        <p />
      )}
    </div>
  );
};

export default AudioRecordingIndicator;

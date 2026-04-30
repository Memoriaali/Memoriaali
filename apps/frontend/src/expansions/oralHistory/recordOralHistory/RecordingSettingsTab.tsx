import useMediaRecorder from '@/utils/useMediaRecorder';
import { faArrowDown, faArrowUp, faMicrophone, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Col, Container, Form, Modal, Row } from 'react-bootstrap';
import NewEventEmitter from '../../../components/eventEmitter/EventEmitter';
import QuestionsList, { Question } from '../helperQuestions/QuestionsList';
import styles from './RecordingSettingsTab.module.css';

interface RecordingSettingsTabProps {
  handleClose: () => void;
  setKey: (key: string) => void;
  audioInputDeviceId?: string;
  videoInputDeviceId?: string;
}

const RecordingSettingsTab = ({
  handleClose,
  setKey,
  audioInputDeviceId,
  videoInputDeviceId,
}: RecordingSettingsTabProps) => {
  const t = useTranslations('RecordOralHistory');

  const [openQuestions, setOpenQuestions] = useState<boolean>(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

  const [hasVideoRecordingPermission, setVideoRecordingPermission] = useState<boolean>(false);
  const [audioGranted, setAudioGranted] = useState<boolean>(false);
  const [, setVideoGranted] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | undefined>(undefined);
  const [videoError, setVideoError] = useState<string | undefined>(undefined);
  const [uiMessage, setUiMessage] = useState<string | undefined>(undefined);
  const [videoRequestInFlight, setVideoRequestInFlight] = useState(false);
  const [cameraPermanentlyBlocked, setCameraPermanentlyBlocked] = useState(false);
  const [audioPermanentlyBlocked, setAudioPermanentlyBlocked] = useState(false);
  const [mediaArmed, setMediaArmed] = useState<boolean>(false);
  const [formState, setFormState] = useState<{
    visible: boolean;
    buttonText: string;
  }>();

  type MediaKind = 'audio' | 'video';
  const explainMediaError = useCallback(
    (error: unknown, kind: MediaKind) => {
      const name = (error as { name?: string } | null | undefined)?.name ?? 'Error';

      if (name === 'NotAllowedError' || name === 'SecurityError') {
        return kind === 'audio' ? t('micDenied') : t('camDenied');
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        return kind === 'audio' ? t('micNotFound') : t('camNotFound');
      }
      if (name === 'NotReadableError') {
        return t('deviceNotReadable');
      }
      return t('unknown');
    },
    [t],
  );

  const checkMicrophonePermissionState = useCallback(async () => {
    try {
      // Chrome, Edge, Firefox
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return status.state; // 'granted' | 'prompt' | 'denied'
    } catch {
      // Safari does not support permissions API, so assume that not permanently blocked
      return 'prompt';
    }
  }, []);

  const testMicrophoneAccessAndDevice = useCallback(async (): Promise<boolean> => {
    setAudioError(undefined);
    setAudioPermanentlyBlocked(false);

    const permissionState = await checkMicrophonePermissionState();

    if (permissionState === 'denied') {
      setAudioPermanentlyBlocked(true);
      setAudioGranted(false);
      setAudioError(t('micDenied'));
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setAudioGranted(true);
      return true;
    } catch (error) {
      setAudioGranted(false);
      setAudioError(explainMediaError(error, 'audio'));
      return false;
    }
  }, [checkMicrophonePermissionState, explainMediaError, t]);

  const checkCameraPermissionState = useCallback(async () => {
    try {
      // Chrome, Edge, Firefox
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return status.state; // 'granted' | 'prompt' | 'denied'
    } catch {
      // Safari does not support permissions API, so assume that not permanently blocked
      return 'prompt';
    }
  }, []);

  const testCameraAccessAndDevice = useCallback(async (): Promise<boolean> => {
    setVideoError(undefined);
    setCameraPermanentlyBlocked(false);

    const permissionState = await checkCameraPermissionState();

    if (permissionState === 'denied') {
      setCameraPermanentlyBlocked(true);
      setVideoGranted(false);
      setVideoError(t('camDenied'));
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoInputDeviceId ? { deviceId: videoInputDeviceId } : true,
      });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      setVideoGranted(false);
      setVideoError(explainMediaError(error, 'video'));
      return false;
    }
  }, [checkCameraPermissionState, explainMediaError, t, videoInputDeviceId]);

  const handleEnableMic = useCallback(async () => {
    setUiMessage(undefined);
    const microphoneAllowed = await testMicrophoneAccessAndDevice();
    if (!microphoneAllowed) return;
  }, [testMicrophoneAccessAndDevice]);

  const handleNextClick = async () => {
    if (!audioGranted) {
      setUiMessage(t('micRequired'));
      return;
    }

    NewEventEmitter.emit('mediaSettings', {
      hasVideo: hasVideoRecordingPermission,
    });

    if (openQuestions) {
      const latestQuestions = loadQuestionsFromLocalStorage();
      setAllQuestions(latestQuestions);
      NewEventEmitter.emit('showQuestions', {
        showQuestions: true,
        questions: latestQuestions,
      });
    }

    setKey('recording');
  };

  interface LiveStreamPreviewProps {
    liveStream: MediaStream | null;
    streamVideo: boolean;
  }

  const LiveStreamPreview = memo(({ liveStream, streamVideo }: LiveStreamPreviewProps) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
      const mediaElement = streamVideo ? videoRef.current : audioRef.current;
      if (!mediaElement) return;

      if (liveStream) {
        (mediaElement as HTMLMediaElement).srcObject = liveStream;
        if (streamVideo) {
          (mediaElement as HTMLVideoElement).play().catch(() => {});
        }
      } else {
        (mediaElement as HTMLMediaElement).srcObject = null;
      }

      return () => {
        if (mediaElement) (mediaElement as HTMLMediaElement).srcObject = null;
      };
    }, [liveStream, streamVideo]);

    if (streamVideo) {
      return <video ref={videoRef} width='100%' height='auto' autoPlay muted playsInline />;
    }

    return <audio ref={audioRef} autoPlay />;
  });

  LiveStreamPreview.displayName = 'LiveStreamPreview';

  const mediaStreamConstraints = useMemo(() => {
    return {
      audio: mediaArmed
        ? {
            deviceId: audioInputDeviceId,
          }
        : false,
      video:
        mediaArmed && hasVideoRecordingPermission
          ? {
              deviceId: videoInputDeviceId,
            }
          : false,
    };
  }, [mediaArmed, audioInputDeviceId, hasVideoRecordingPermission, videoInputDeviceId]);

  const constraints = useMemo(
    () => ({
      blobOptions: { type: 'video/webm; codecs=vp9,opus' } as BlobPropertyBag,
      mediaStreamConstraints,
    }),
    [mediaStreamConstraints],
  );

  const { liveStream, getMediaStream, clearMediaStream, clearMediaBlob } =
    useMediaRecorder(constraints);

  const loadQuestionsFromLocalStorage = (): Question[] => {
    try {
      const raw = localStorage.getItem('allQuestions');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Question[]) : [];
    } catch {
      return [];
    }
  };

  const handleShowQuestions = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.currentTarget.checked;

    if (checked) {
      const localStorageQuestions = loadQuestionsFromLocalStorage();

      if (localStorageQuestions.length > 0) {
        setAllQuestions(localStorageQuestions);
        setOpenQuestions(checked);
      } else {
        setOpenQuestions(false);
      }
    } else {
      setOpenQuestions(false);
    }
  }, []);

  const handleToggleVideoPermission = useCallback(
    async (checked: boolean) => {
      setUiMessage(undefined);

      if (checked) {
        if (videoRequestInFlight) return;
        setVideoRequestInFlight(true);
        const cameraAllowed = await testCameraAccessAndDevice();
        setVideoRequestInFlight(false);

        if (!cameraAllowed) {
          setVideoRecordingPermission(false);
          setVideoGranted(false);
          return;
        }

        setMediaArmed(true);
        setVideoRecordingPermission(true);
        try {
          await getMediaStream();
          setVideoGranted(true);
        } catch {
          setVideoRecordingPermission(false);
          setVideoGranted(false);
          setVideoError(t('camFailedContinueAudio'));
        }
      } else {
        setVideoRecordingPermission(false);
        setVideoGranted(false);
        await clearMediaStream();
        await clearMediaBlob();
        setCameraPermanentlyBlocked(false);
        setVideoError(undefined);

        NewEventEmitter.emit('previewStreamCleared');
      }
    },
    [
      videoRequestInFlight,
      testCameraAccessAndDevice,
      getMediaStream,
      t,
      clearMediaStream,
      clearMediaBlob,
    ],
  );

  useEffect(() => {
    const startMedia = async () => {
      await getMediaStream();
    };
    if (hasVideoRecordingPermission) {
      startMedia();
    } else {
      clearMediaStream();
      clearMediaBlob();
    }
  }, [clearMediaBlob, clearMediaStream, hasVideoRecordingPermission, getMediaStream]);

  useEffect(() => {
    if (!liveStream) return;

    const onAudioEnded = () => {
      setAudioGranted(false);
      setAudioError(t('micUnavailable'));
      setUiMessage(t('micMissingRetry'));
    };

    const onVideoEnded = () => {
      setVideoGranted(false);
      setVideoRecordingPermission(false);
      setVideoError(t('camUnavailableContinueAudio'));
    };

    const audioTracks = liveStream.getAudioTracks();
    const videoTracks = liveStream.getVideoTracks();

    audioTracks.forEach((track) => (track.onended = onAudioEnded));
    videoTracks.forEach((track) => (track.onended = onVideoEnded));

    return () => {
      audioTracks.forEach((track) => (track.onended = null));
      videoTracks.forEach((track) => (track.onended = null));
    };
  }, [liveStream, t]);

  useEffect(() => {
    if (hasVideoRecordingPermission && liveStream) {
      NewEventEmitter.emit('previewStream', { stream: liveStream });
    }
    if (!hasVideoRecordingPermission || !liveStream) {
      NewEventEmitter.emit('previewStreamCleared');
    }
  }, [hasVideoRecordingPermission, liveStream]);

  const toggleFormVisibility = () => {
    setFormState((prevState) => ({
      ...prevState,
      visible: !prevState?.visible,
      buttonText: prevState?.visible ? t('editInfo') : t('hideInfo'),
    }));
  };

  useEffect(() => {
    NewEventEmitter.emit('showQuestions', {
      showQuestions: openQuestions,
      questions: openQuestions ? allQuestions : [],
    });
  }, [openQuestions, allQuestions]);

  return (
    <>
      <Modal.Header
        className={`${styles.modalBg} ${styles.modalHeader} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.modalTitle}>{t('recordOralHistory')}</Modal.Title>
        <Button variant='link' onClick={handleClose} className={styles.customClose}>
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>
        <p className={styles.modalText}>{t('recordOralHistoryDescription')}</p>

        {uiMessage && (
          <div className='alert alert-warning' role='alert' aria-live='assertive'>
            {uiMessage}
          </div>
        )}

        {audioError && (
          <div className='alert alert-danger' role='alert' aria-live='assertive'>
            {audioError}
            <div className='mt-2'>
              <Button
                variant='primary'
                size='sm'
                className='m-1'
                disabled={audioPermanentlyBlocked}
                onClick={handleEnableMic}
              >
                {t('retry')}
              </Button>
              <Button
                variant='primary'
                size='sm'
                className='m-1'
                onClick={() => setUiMessage(t('browserSettingsInfo'))}
              >
                {t('browserSettings')}
              </Button>
            </div>
          </div>
        )}

        {videoError && (
          <div className='alert alert-warning' role='alert' aria-live='polite'>
            {videoError}
            <div className='mt-2'>
              <Button
                variant='primary'
                size='sm'
                className='m-1'
                disabled={videoRequestInFlight || cameraPermanentlyBlocked}
                onClick={() => handleToggleVideoPermission(true)}
              >
                {t('retry')}
              </Button>
              <Button
                variant='primary'
                size='sm'
                className='m-1'
                onClick={() => handleToggleVideoPermission(false)}
              >
                {t('continueWithoutVideo')}
              </Button>
            </div>
          </div>
        )}

        {!audioGranted && (
          <div className='mb-3'>
            <Button onClick={handleEnableMic}>
              {t('enableMicrophone')}
              <FontAwesomeIcon className='ms-2' icon={faMicrophone} />
            </Button>
          </div>
        )}

        <Form.Check
          key='useVideo'
          type='switch'
          id='videoRecordPermission'
          label={t('useVideo')}
          checked={hasVideoRecordingPermission}
          onChange={(e) => handleToggleVideoPermission(e.currentTarget.checked)}
        />
        <Form.Check
          key='showHelperQuestions'
          type='switch'
          id='showQuestions'
          label={t('showHelperQuestions')}
          onChange={handleShowQuestions}
          checked={openQuestions}
        />

        {hasVideoRecordingPermission && (
          <Container className={styles.recordingContainer}>
            <LiveStreamPreview liveStream={liveStream} streamVideo={hasVideoRecordingPermission} />
          </Container>
        )}

        <br />
        <hr />

        <Container className={styles.cardStyle}>
          <Row className={styles.cardTextCenter}>
            <Col xs={6} sm={6} md={6}>
              <h5>{t('helperQuestions')}</h5>
            </Col>
            <Col xs={6} sm={6} md={6}>
              <Button
                variant='primary'
                className={styles.showButton}
                onClick={() => toggleFormVisibility()}
              >
                {formState?.buttonText ?? t('editInfo')}
                <FontAwesomeIcon
                  className='ms-2'
                  icon={
                    (formState?.buttonText ?? t('editInfo')) === t('editInfo')
                      ? faArrowDown
                      : faArrowUp
                  }
                />
              </Button>
            </Col>
          </Row>
        </Container>

        <div hidden={!formState?.visible}>
          <p>{t('manageHelperQuestionsDescription')}</p>
          <hr />
          <QuestionsList />
        </div>
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='secondary' onClick={handleClose}>
          {t('cancel')}
        </Button>
        <Button variant='primary' onClick={handleNextClick} disabled={!audioGranted}>
          {t('next')}
        </Button>
      </Modal.Footer>
    </>
  );
};

export default RecordingSettingsTab;

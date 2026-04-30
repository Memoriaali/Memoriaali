'use client';

import { CountdownTimer } from '@/utils/CountdownTimer';
import useMediaRecorder from '@/utils/useMediaRecorder';
import { faMicrophone, faPause, faStopCircle, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Col, Container, Modal, Row } from 'react-bootstrap';
import NewEventEmitter from '../../../components/eventEmitter/EventEmitter';
import PresentationQuestionItem from '../helperQuestions/PresentationQuestionItem';
import { Question } from '../helperQuestions/QuestionsList';
import AudioRecordingIndicator from './AudioRecordingIndicator';
import CountDownTimer from './CountDownView';
import styles from './RecordingTab.module.css';

interface RecordingTabProps {
  setKey: (_key: string) => void;
  handleClose: () => void;
  videoInputDeviceId?: string;
  audioInputDeviceId?: string;
}

interface LiveStreamPreviewProps {
  liveStream: MediaStream | null;
  streamVideo: boolean;
}

export const LiveStreamPreview = memo(({ liveStream, streamVideo }: LiveStreamPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const mediaElement = streamVideo ? videoRef.current : audioRef.current;
    if (!mediaElement) return;

    (mediaElement as HTMLMediaElement).srcObject = liveStream ?? null;

    if (liveStream && streamVideo) {
      mediaElement.play().catch(() => {});
    }

    return () => {
      (mediaElement as HTMLMediaElement).srcObject = null;
    };
  }, [liveStream, streamVideo]);

  if (streamVideo) {
    return <video ref={videoRef} width='100%' height='auto' autoPlay muted playsInline />;
  }
  return <audio ref={audioRef} autoPlay />;
});

LiveStreamPreview.displayName = 'LiveStreamPreview';

const blobOptions = {
  type: 'video/webm; codecs=vp9,opus',
};

const MAXIMUM_RECORDING_TIME_IN_MINUTES = 60; // Maximum allowed recording time

const RecordingTab = ({
  audioInputDeviceId,
  videoInputDeviceId,
  setKey,
  handleClose,
}: RecordingTabProps) => {
  const t = useTranslations('RecordOralHistory');

  const [hasVideoRecordingPermission, setVideoRecordingPermission] = useState<boolean>(false);
  const [kind, setKind] = useState<'video' | 'audio'>('audio');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [recordingInProcess, setRecordingInProcess] = useState<boolean>(false);
  const [recordingPaused, setRecordingPaused] = useState<boolean>(false);
  const [pendingNavigationAfterStop, setPendingNavigationAfterStop] = useState<boolean>(false);
  const [sharedPreviewStream, setSharedPreviewStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const onPreview = ({ stream }: { stream: MediaStream }) => {
      setSharedPreviewStream(stream);
      setVideoRecordingPermission(true);
      setKind('video');
    };
    const onCleared = () => {
      setSharedPreviewStream(null);
    };

    NewEventEmitter.on('previewStream', onPreview);
    NewEventEmitter.on('previewStreamCleared', onCleared);

    return () => {
      NewEventEmitter.off('previewStream', onPreview);
      NewEventEmitter.off('previewStreamCleared', onCleared);
    };
  }, []);

  const timerRef = useRef<CountdownTimer | null>(null);

  if (!timerRef.current) {
    timerRef.current = new CountdownTimer(MAXIMUM_RECORDING_TIME_IN_MINUTES);
  }

  const timer = timerRef.current!;

  const mediaStreamConstraints = useMemo(() => {
    return {
      audio: {
        deviceId: audioInputDeviceId,
      },
      video:
        hasVideoRecordingPermission && kind === 'video'
          ? {
              deviceId: videoInputDeviceId,
            }
          : false,
    };
  }, [audioInputDeviceId, hasVideoRecordingPermission, kind, videoInputDeviceId]);

  const constraints = useMemo(
    () => ({
      blobOptions,
      mediaStreamConstraints,
    }),
    [mediaStreamConstraints],
  );

  const {
    liveStream,
    mediaBlob,
    pauseRecording,
    resumeRecording,
    stopRecording,
    getMediaStream,
    startRecording,
    clearMediaStream,
    clearMediaBlob,
  } = useMediaRecorder(constraints);

  const startRecordingProcess = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      alert(t('micRequired'));
      return;
    }

    await getMediaStream();
    setRecordingInProcess(true);
    startRecording();
    timer.start();
  }, [getMediaStream, startRecording, timer, t]);

  const pauseToRecording = useCallback(() => {
    if (recordingPaused) {
      timer.resume();
    } else {
      timer.pause();
    }
    setRecordingPaused(!recordingPaused);
  }, [recordingPaused, timer]);

  const stopRecordingAndSave = useCallback(() => {
    stopRecording();
    timer.stop();
    setPendingNavigationAfterStop(true);
  }, [stopRecording, timer]);

  useEffect(() => {
    timer.addMaxRecordingTimeReachedListener(stopRecordingAndSave);

    return () => timer.removeMaxRecordingTimeReachedListener(stopRecordingAndSave);
  }, [stopRecordingAndSave, timer]);

  useEffect(() => {
    clearMediaStream();
  }, [clearMediaStream]);

  useEffect(() => {
    if (recordingPaused) {
      pauseRecording();
    } else {
      resumeRecording();
    }
  }, [pauseRecording, recordingPaused, resumeRecording]);

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
    const handler = ({ hasVideo }: { hasVideo: boolean }) => {
      setKind(hasVideo ? 'video' : 'audio');
      setVideoRecordingPermission(hasVideo);
    };

    NewEventEmitter.on('mediaSettings', handler);
    return () => {
      NewEventEmitter.off('mediaSettings', handler);
    };
  }, []);

  useEffect(() => {
    const ensurePreview = async () => {
      if (!sharedPreviewStream && hasVideoRecordingPermission && kind === 'video') {
        try {
          await getMediaStream();
        } catch (error) {
          console.error('Failed to acquire preview stream:', error);
        }
      }
    };
    void ensurePreview();
  }, [sharedPreviewStream, hasVideoRecordingPermission, kind, getMediaStream]);

  useEffect(() => {
    if (pendingNavigationAfterStop && mediaBlob) {
      const hasVideoSelected = kind === 'video';

      NewEventEmitter.emit('recordingReady', {
        blob: mediaBlob,
        hasVideo: hasVideoSelected,
      });
      setPendingNavigationAfterStop(false);
      setKey('oralHistoryForm');
    }
  }, [pendingNavigationAfterStop, mediaBlob, hasVideoRecordingPermission, setKey, kind]);

  useEffect(() => {
    const handler = ({
      showQuestions,
      questions,
    }: {
      showQuestions: boolean;
      questions: Question[];
    }) => {
      setQuestions(showQuestions ? questions : []);
    };

    NewEventEmitter.on('showQuestions', handler);
    return () => {
      NewEventEmitter.off('showQuestions', handler);
    };
  }, []);

  const showPreviousOnClick = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      setCurrentQuestionIndex(0);
    }
  }, [currentQuestionIndex]);

  const showNextOnClick = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setCurrentQuestionIndex(questions.length - 1);
    }
  }, [questions, currentQuestionIndex]);

  const hasAnyQuestions = (questions?.length ?? 0) > 0;

  const hasCurrentQuestion =
    hasAnyQuestions && currentQuestionIndex >= 0 && currentQuestionIndex < questions.length;

  const currentQuestion = hasCurrentQuestion ? questions[currentQuestionIndex] : undefined;

  const hasStream = Boolean(sharedPreviewStream || liveStream);
  const hasPreviewVideo = hasVideoRecordingPermission && kind === 'video' && hasStream;

  const hasPreviewAudio = kind === 'audio' && hasStream;

  const showAudioIndicator = kind === 'audio' && recordingInProcess;
  const showAudioPreview = kind === 'audio' && hasStream && !recordingInProcess;

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
        <p>{t('stopContinue')}</p>

        {!recordingInProcess && (
          <Button variant='primary' onClick={startRecordingProcess}>
            {t('startRecording')}
            <FontAwesomeIcon className='ms-2' icon={faMicrophone} />
          </Button>
        )}

        {recordingInProcess && (
          <Row>
            <Col className={styles.recordInfo}>
              <div className={styles.redRecordAnimation} hidden={recordingPaused} />
              <p className={styles.timeLabel}>{t('timeLeft')}</p>
              <CountDownTimer timer={timer} />
            </Col>
          </Row>
        )}

        {hasCurrentQuestion && (
          <Container fluid className={styles.splitContainer}>
            <Row className='g-3 align-items-stretch'>
              {/* Left: video / audio / placeholder */}
              <Col xs={12} md={6}>
                <div className={styles.recordingContainer}>
                  {hasPreviewVideo ? (
                    <LiveStreamPreview
                      liveStream={(sharedPreviewStream || liveStream)!}
                      streamVideo
                    />
                  ) : showAudioIndicator ? (
                    <AudioRecordingIndicator
                      recordingInProcess={recordingInProcess}
                      recordingPaused={recordingPaused}
                    />
                  ) : showAudioPreview ? (
                    <LiveStreamPreview
                      liveStream={(sharedPreviewStream || liveStream)!}
                      streamVideo={false}
                    />
                  ) : (
                    <div className={styles.previewPlaceholder} />
                  )}
                </div>
              </Col>

              {/* Right: questions */}
              <Col xs={12} md={6}>
                <div className={styles.questionsPane}>
                  <PresentationQuestionItem
                    question={currentQuestion!}
                    questionsInTotal={questions.length}
                    questionNo={currentQuestion!.sortIndex}
                    showPrevious={showPreviousOnClick}
                    showNext={showNextOnClick}
                  />
                </div>
              </Col>
            </Row>
          </Container>
        )}

        {/* Video, no questions */}
        {!hasAnyQuestions && hasPreviewVideo && (
          <Container className={`${styles.recordingContainer} ${styles.previewSolo}`}>
            <LiveStreamPreview liveStream={(sharedPreviewStream || liveStream)!} streamVideo />
          </Container>
        )}

        {/* Audio, no questions */}
        {!hasAnyQuestions && hasPreviewAudio && (
          <Container className={styles.recordingContainer}>
            {recordingInProcess ? (
              <AudioRecordingIndicator
                recordingInProcess={recordingInProcess}
                recordingPaused={recordingPaused}
              />
            ) : (
              <LiveStreamPreview
                liveStream={(sharedPreviewStream || liveStream)!}
                streamVideo={false}
              />
            )}
          </Container>
        )}

        {recordingInProcess && (
          <Container className='mt-2'>
            <Row className={`g-2 justify-content-center ${styles.controlsRow}`}>
              <Col xs={12} sm='auto'>
                <Button className={styles.controlBtn} variant='primary' onClick={pauseToRecording}>
                  {recordingPaused ? t('continueRecording') : t('pause')}
                  <FontAwesomeIcon
                    className='ms-2'
                    icon={recordingPaused ? faMicrophone : faPause}
                  />
                </Button>
              </Col>
              <Col xs={12} sm='auto'>
                <Button
                  className={styles.controlBtn}
                  variant='primary'
                  onClick={stopRecordingAndSave}
                >
                  {t('stopAndSave')}
                  <FontAwesomeIcon className='ms-2' icon={faStopCircle} />
                </Button>
              </Col>
            </Row>
          </Container>
        )}
      </Modal.Body>
      <Modal.Footer className={styles.modalBg}>
        <Button
          variant='secondary'
          disabled={recordingInProcess}
          onClick={() => setKey('recordingSettings')}
        >
          {t('previous')}
        </Button>
        <Button variant='primary' disabled>
          {t('next')}
        </Button>
      </Modal.Footer>
    </>
  );
};

export default RecordingTab;

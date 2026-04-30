import { useDocuments } from '@/hooks/useDocuments';
import { useOralHistories } from '@/hooks/useOralHistories';
import { faFile, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Container, Modal, Row } from 'react-bootstrap';
import { SubmitHandler, useForm } from 'react-hook-form';
import NewEventEmitter from '../../../components/eventEmitter/EventEmitter';
import { Question } from '../helperQuestions/QuestionsList';
import { default as OralHistoryForm, type FormValues } from './OralHistoryForm';
import styles from './OralHistoryFormTab.module.css';

interface OralHistoryFormTabProps {
  handleClose: () => void;
  setKey: (_key: string) => void;
  handleShowMessage: (message: string) => void;
}

const OralHistoryFormTab = ({
  setKey,
  handleClose,
  handleShowMessage,
}: OralHistoryFormTabProps) => {
  const t = useTranslations('RecordOralHistory');

  const { postOralHistory } = useOralHistories();
  const { uploadFile } = useDocuments();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>();

  const [blob, setBlob] = useState<Blob | null>(null);
  const [kind, setKind] = useState<'video' | 'audio'>('audio');
  const [url, setUrl] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const urlRef = useRef<string | null>(null);

  const recording = {
    id: 'recording',
    file: new File([], 'recording'),
    filetype: kind === 'video' ? 'video/webm' : 'audio/webm',
    src: url ?? '',
  };

  const Player = ({ url, kind }: { url: string | null; kind: 'video' | 'audio' }) => {
    if (!url) {
      return null;
    }
    if (kind === 'video') {
      return <video src={url} width='100%' height='auto' controls playsInline />;
    } else {
      return <audio src={url} controls />;
    }
  };

  useEffect(() => {
    const handler = ({ blob, hasVideo }: { blob: Blob; hasVideo: boolean }) => {
      setBlob(blob);
      setKind(hasVideo ? 'video' : 'audio');
    };

    NewEventEmitter.on('recordingReady', handler);
    return () => {
      NewEventEmitter.off('recordingReady', handler);
    };
  }, []);

  useEffect(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }

    if (!blob) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    urlRef.current = objectUrl;
    setUrl(objectUrl);

    return () => {};
  }, [blob]);

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

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsUploading(true);

    const fileName = `oralhistory_${Date.now()}_${crypto.randomUUID()}.webm`;

    try {
      if (blob) {
        const targetMime =
          kind === 'audio'
            ? blob.type.includes('mp4')
              ? 'audio/mp4'
              : 'audio/webm'
            : blob.type.includes('mp4')
              ? 'video/mp4'
              : 'video/webm';

        const correctedBlob =
          blob.type && blob.type.startsWith(kind) ? blob : new Blob([blob], { type: targetMime });

        const file = new File([correctedBlob], fileName, { type: targetMime });

        // Upload file to server
        const uploadResponse = await uploadFile(file);
        const uploadedFile = uploadResponse?.uploadedFiles?.[0];
        const serverFileName = uploadedFile?.filename;

        if (!serverFileName) {
          handleShowMessage(t('unexpectedError'));
          setIsUploading(false);
          return;
        }

        const id = recording.id;

        const keywords =
          typeof data.forms[id]?.subjectIndexing === 'string'
            ? data.forms[id].subjectIndexing
                .split(',')
                .map((k) => k.trim())
                .filter(Boolean)
            : Array.isArray(data.forms[id]?.subjectIndexing)
              ? data.forms[id].subjectIndexing
              : [];

        // Prepare oral history data
        const oralHistoryData: {
          fileName: string;
          person: string;
          reporter: string;
          event: string;
          description: string;
          language: string;
          questions: Question[];
          keywords: string[] | undefined;
        } = {
          fileName: serverFileName ?? '',
          description: data?.forms[id]?.description ?? '',
          event: data?.forms[id]?.event ?? '',
          language: data?.forms[id]?.language ?? '',
          keywords,
          questions,
          person: data?.forms[id]?.person ?? '',
          reporter: data?.forms[id]?.reporter ?? '', //TODO: should this be optional?
        };

        const res = await postOralHistory(oralHistoryData);

        if (!res) {
          handleShowMessage(t('unexpectedError'));
          return;
        }

        handleShowMessage(t('savedSuccessfully'));

        NewEventEmitter.emit('oralHistoryAdded');
        setKey('finished');
      }
    } catch (err) {
      console.error('Error creating oral history:', err);
      handleShowMessage(t('unexpectedError'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Modal.Header
        className={`${styles.modalBg} ${styles.modalHeader} d-flex justify-content-center position-relative`}
      >
        <Modal.Title className={styles.modalTitle}>{t('playRecording')}</Modal.Title>
        <Button variant='link' onClick={handleClose} className={styles.customClose}>
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Modal.Header>

      <Modal.Body className={styles.modalBg}>
        <Card className={styles.cardStyle}>
          <Row className={styles.cardTextCenter}>
            {t('reminiscence')}
            {`: ${new Intl.DateTimeFormat('fi-FI', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }).format(new Date())}`}
          </Row>
          <Container className={`${styles.recordingContainer} ${styles.previewSolo}`}>
            <Player url={url} kind={kind} />
          </Container>
        </Card>

        <p>{t('giveInfo')}</p>

        {
          <OralHistoryForm
            index={'recording'}
            register={register}
            errors={errors}
            setValue={setValue}
          />
        }
      </Modal.Body>

      <Modal.Footer className={styles.modalBg}>
        <Button variant='outline-danger' onClick={handleClose}>
          {t('exitWithoutSaving')}
          <FontAwesomeIcon icon={faTrash} className='ms-2' />
        </Button>

        <Button variant='primary' disabled={isUploading} onClick={handleSubmit(onSubmit)}>
          {isUploading ? (
            t('uploading')
          ) : (
            <>
              {t('save')}
              <FontAwesomeIcon icon={faFile} className='ms-2' />
            </>
          )}
        </Button>
      </Modal.Footer>
    </>
  );
};

export default OralHistoryFormTab;

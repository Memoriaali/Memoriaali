import NewEventEmitter from '@/components/eventEmitter/EventEmitter';
import { useFeatureConfig } from '@/hooks/useVariant';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';

interface MetadataDetectionSettingsModalProps {
  showMetadataDetectionSettingsModal: boolean;
  handleCloseMetadataDetectionSettingsModal: () => void;
}

/* ------------------------------------------------------------------ */
/* 1) Strongly-typed field definition (single source of truth)         */
/* ------------------------------------------------------------------ */

const FIELD_KEYS = [
  'annif',
  'gpe',
  'date',
  'name',
  'act',
  'y_field',
  'diar',
  'product',
  'event',
  'norp',
] as const;

type FieldKey = (typeof FIELD_KEYS)[number];
type DetectionState = Record<FieldKey, boolean>;

/* Default user preference (before admin rules are applied) */
const DEFAULT_STATE: DetectionState = FIELD_KEYS.reduce((acc, key) => {
  acc[key] = true;
  return acc;
}, {} as DetectionState);

/* ------------------------------------------------------------------ */
/* 2) Component                                                        */
/* ------------------------------------------------------------------ */

const MetadataDetectionSettingsModal = ({
  showMetadataDetectionSettingsModal,
  handleCloseMetadataDetectionSettingsModal,
}: MetadataDetectionSettingsModalProps) => {
  const t = useTranslations('MetadataDetection');

  /* ------------------------------------------------------------------ */
  /* Admin feature configuration                                        */
  /* ------------------------------------------------------------------ */

  const feature = useFeatureConfig('metadataDetection');

  /**
   * adminEnabled determines whether a field exists at all.
   * If admin disables a field → it is forced to false and hidden.
   */
  const adminEnabled = useMemo<Record<FieldKey, boolean>>(() => {
    const cfg = feature?.config;
    return {
      annif: cfg?.annif !== false,
      gpe: cfg?.gpe !== false,
      date: cfg?.date !== false,
      name: cfg?.name !== false,
      act: cfg?.act !== false,
      y_field: cfg?.y_field !== false,
      diar: cfg?.diar !== false,
      product: cfg?.product !== false,
      event: cfg?.event !== false,
      norp: cfg?.norp !== false,
    };
  }, [feature?.config]);

  /* ------------------------------------------------------------------ */
  /* Local UI state                                                     */
  /* ------------------------------------------------------------------ */

  const [detectionFields, setDetectionFields] = useState<DetectionState>(DEFAULT_STATE);

  /* ------------------------------------------------------------------ */
  /* 3) Enforce admin rules → disabled fields are ALWAYS false           */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    setDetectionFields((prev) =>
      FIELD_KEYS.reduce((acc, field) => {
        acc[field] = adminEnabled[field] ? prev[field] : false;
        return acc;
      }, {} as DetectionState),
    );
  }, [adminEnabled]);

  /* ------------------------------------------------------------------ */
  /* 4) Emit ONE canonical snapshot upstream                             */
  /* ------------------------------------------------------------------ */

  const emitSnapshot = useCallback((state: DetectionState) => {
    /**
     * This is the ONLY event upstream should rely on.
     * No partial state, no guessing, no defaults.
     */
    NewEventEmitter.emit('metadataSelectionSnapshot', state);
  }, []);

  /* Emit snapshot whenever effective state changes */
  useEffect(() => {
    emitSnapshot(detectionFields);
  }, [detectionFields, emitSnapshot]);

  /* Also emit when modal opens (helps sync consumers) */
  useEffect(() => {
    if (showMetadataDetectionSettingsModal) {
      emitSnapshot(detectionFields);
    }
  }, [showMetadataDetectionSettingsModal, detectionFields, emitSnapshot]);

  /* ------------------------------------------------------------------ */
  /* 5) User interaction (guarded by admin config)                      */
  /* ------------------------------------------------------------------ */

  const changeField = useCallback(
    (field: FieldKey) => (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!adminEnabled[field]) return;

      const value = event.target.checked;
      setDetectionFields((prev) => ({ ...prev, [field]: value }));
    },
    [adminEnabled],
  );

  /* ------------------------------------------------------------------ */
  /* 6) Render only admin-enabled fields                                */
  /* ------------------------------------------------------------------ */

  const visibleFields = FIELD_KEYS.filter((field) => adminEnabled[field]);

  return (
    <Modal
      show={showMetadataDetectionSettingsModal}
      onHide={handleCloseMetadataDetectionSettingsModal}
      size='lg'
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title className='ms-auto'>{t('metadataDetectionSettings')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {visibleFields.map((field) => (
          <Form.Check type='switch' id={field} key={field}>
            <Form.Check.Input checked={detectionFields[field]} onChange={changeField(field)} />
            <Form.Check.Label>{t(field)}</Form.Check.Label>
          </Form.Check>
        ))}
      </Modal.Body>

      <Modal.Footer>
        <Button variant='primary' onClick={handleCloseMetadataDetectionSettingsModal}>
          {t('close')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MetadataDetectionSettingsModal;

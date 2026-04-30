import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import { Group } from '@memoriaali/api-types';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Container, Form } from 'react-bootstrap';
import {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import NewEventEmitter from '../eventEmitter/EventEmitter';
import styles from './MetadataForm.module.css';
import SubjectSelector from './SubjectSelector';
import { useMetadataFieldValue } from './hooks/calculateValues';
import { useFieldsEqualityCheck } from './hooks/useFieldsEqualityCheck';

export type AiMetadata = {
  data: string[][];
} & Record<string, string | number | string[]>;

export interface FormData {
  header: string;
  subjectIndexing: string[];
  events: string;
  locations: string;
  description: string;
  author: string;
  exactDate: string;
  estimatedDate: string;
  type: string;
  language: string;
  personNames: string;
  organizations: string;
  businessIdentityCode: string;
  journalNumber: string;
  products: string;
  nationalityReligiousPolitical: string;
  other: string;
  public: boolean;
  group: boolean;
  restricted: boolean;
  groupSelect?: string;
  [key: string]: string | boolean | string[] | undefined;
}

export type FormValues = {
  forms: {
    [id: string]: FormData;
  };
};

interface MetadataFormProps {
  index: string;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  sharedMetadata: { forms: { [id: string]: FormData } };
  setValue: UseFormSetValue<FormValues>;
  watch?: UseFormWatch<FormValues>;
  source: string;
  control: Control<FormValues>;
  aiModifiedFields?: unknown;
}

const MetadataForm = ({
  index,
  register,
  errors,
  sharedMetadata,
  setValue,
  control,
  source,
}: MetadataFormProps) => {
  const t = useTranslations('Metadata');

  const { getAllGroupsForUser } = useGroups();
  const router = useRouter();
  const { user } = useAuth();

  // Is metadata field disabled before starting
  // Check .env file
  const disabled_header = process.env.REACT_APP_HEADER_DISABLED === 'true';
  const disabled_subjectIndexing = process.env.REACT_APP_SUBJECTINDEXING_DISABLED === 'true';
  const disabled_events = process.env.REACT_APP_EVENTS_DISABLED === 'true';
  const disabled_locations = process.env.REACT_APP_LOCATIONS_DISABLED === 'true';
  const disabled_description = process.env.REACT_APP_DESCRIPTION_DISABLED === 'true';
  const disabled_author = process.env.REACT_APP_AUTHOR_DISABLED === 'true';
  const disabled_exactDate = process.env.REACT_APP_EXACTDATE_DISABLED === 'true';
  const disabled_estimatedDate = process.env.REACT_APP_ESTIMATEDDATE_DISABLED === 'true';
  const disabled_type = process.env.REACT_APP_TYPE_DISABLED === 'true';
  const disabled_language = process.env.REACT_APP_LANGUAGE_DISABLED === 'true';
  const disabled_personNames = process.env.REACT_APP_PERSONNAMES_DISABLED === 'true';
  const disabled_organizations = process.env.REACT_APP_ORGANIZATIONS_DISABLED === 'true';
  const disabled_businessIdentityCode =
    process.env.REACT_APP_BUSINESSIDENTITYCODE_DISABLED === 'true';
  const disabled_journalNumber = process.env.REACT_APP_JOURNALNUMBER_DISABLED === 'true';
  const disabled_products = process.env.REACT_APP_PRODUCTS_DISABLED === 'true';
  const disabled_nationalityReligiousPolitical =
    process.env.REACT_APP_NATIONALITYRELIGIOUSPOLITICAL_DISABLED === 'true';
  const disabled_other = process.env.REACT_APP_OTHER_DISABLED === 'true';
  const disabled_publicity = process.env.REACT_APP_PUBLICITY_DISABLED === 'true';

  // Is metadata field required before starting
  // Check .env file
  const required_header = process.env.REACT_APP_HEADER_REQUIRED === 'true';
  const required_subjectIndexing = process.env.REACT_APP_SUBJECTINDEXING_REQUIRED === 'true';
  const required_events = process.env.REACT_APP_EVENTS_REQUIRED === 'true';
  const required_locations = process.env.REACT_APP_LOCATIONS_REQUIRED === 'true';
  const required_description = process.env.REACT_APP_DESCRIPTION_REQUIRED === 'true';
  const required_author = process.env.REACT_APP_AUTHOR_REQUIRED === 'true';
  const required_exactDate = process.env.REACT_APP_EXACTDATE_REQUIRED === 'true';
  const required_estimatedDate = process.env.REACT_APP_ESTIMATEDDATE_REQUIRED === 'true';
  const required_other = process.env.REACT_APP_OTHER_REQUIRED === 'true';
  const required_personNames = process.env.REACT_APP_PERSONNAMES_REQUIRED === 'true';
  const required_organizations = process.env.REACT_APP_ORGANIZATIONS_REQUIRED === 'true';
  const required_businessIdentityCode =
    process.env.REACT_APP_BUSINESSIDENTITYCODE_REQUIRED === 'true';
  const required_journalNumber = process.env.REACT_APP_JOURNALNUMBER_REQUIRED === 'true';
  const required_products = process.env.REACT_APP_PRODUCTS_REQUIRED === 'true';
  const required_nationalityReligiousPolitical =
    process.env.REACT_APP_NATIONALITYRELIGIOUSPOLITICAL_REQUIRED === 'true';
  const required_publicity = process.env.REACT_APP_PUBLICITY_REQUIRED === 'true';

  // State declarations (moved before useEffect to avoid no-use-before-define error)
  const [publicChecked, setPublicChecked] = useState(
    sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0
      ? sharedMetadata.forms?.[0]?.public
      : false,
  );
  const [groupChecked, setGroupChecked] = useState(
    sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0
      ? sharedMetadata.forms?.[0]?.group
      : false,
  );
  const [restrictedChecked, setRestrictedChecked] = useState(
    sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0
      ? sharedMetadata.forms?.[0]?.restricted
      : false,
  );

  const [aiMetadata, setAiMetadata] = useState<AiMetadata[]>([]);

  useEffect(() => {
    const handleMetadata = (response: AiMetadata[]) => {
      setAiMetadata(response);
    };

    NewEventEmitter.on('metadataReceived', handleMetadata);

    return () => {
      NewEventEmitter.off('metadataReceived', handleMetadata);
    };
  }, []);

  const subjectIndexingValue = useMetadataFieldValue(
    aiMetadata,
    sharedMetadata,
    index,
    source,
    'subjectIndexing',
    3,
  );
  const eventValue = useMetadataFieldValue(aiMetadata, sharedMetadata, index, source, 'events', 12);
  const locationValue = useMetadataFieldValue(
    aiMetadata,
    sharedMetadata,
    index,
    source,
    'locations',
    10,
  );
  const estimatedDateValue = useMetadataFieldValue(
    aiMetadata,
    sharedMetadata,
    index,
    source,
    'estimatedDate',
    5,
  );
  const personNamesValue = useMetadataFieldValue(
    aiMetadata,
    sharedMetadata,
    index,
    source,
    'personNames',
    2,
  );
  const organizationsValue = useMetadataFieldValue(
    aiMetadata,
    sharedMetadata,
    index,
    source,
    'organizations',
    1,
  );
  const businessIdentityCodeValue = useMetadataFieldValue(
    aiMetadata,
    sharedMetadata,
    index,
    source,
    'businessIdentityCode',
    6,
  );
  const journalNumberValue = useMetadataFieldValue(
    aiMetadata,
    sharedMetadata,
    index,
    source,
    'journalNumber',
    7,
  );
  const productsValue = useMetadataFieldValue(
    aiMetadata,
    sharedMetadata,
    index,
    source,
    'products',
    11,
  );
  const nationalityReligiousPoliticalValue = useMetadataFieldValue(
    aiMetadata,
    sharedMetadata,
    index,
    source,
    'nationalityReligiousPolitical',
    13,
  );

  useEffect(() => {
    if (sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0) {
      setValue(`forms.${index}.header`, sharedMetadata.forms?.[0]?.header ?? '');
      setValue(
        `forms.${index}.subjectIndexing`,
        subjectIndexingValue
          ? subjectIndexingValue
              .split(',')
              .map((label) => label.trim())
              .filter(Boolean)
          : [],
      );
      setValue(`forms.${index}.events`, eventValue ?? '');
      setValue(`forms.${index}.locations`, locationValue ?? '');
      setValue(`forms.${index}.description`, sharedMetadata.forms?.[0]?.description ?? '');
      setValue(`forms.${index}.author`, sharedMetadata.forms?.[0]?.author ?? '');
      setValue(`forms.${index}.exactDate`, sharedMetadata.forms?.[0]?.exactDate ?? '');
      setValue(`forms.${index}.estimatedDate`, estimatedDateValue ?? '');
      setValue(`forms.${index}.language`, sharedMetadata.forms?.[0]?.language ?? '');
      setValue(`forms.${index}.type`, sharedMetadata.forms?.[0]?.type ?? '');
      setValue(`forms.${index}.personNames`, personNamesValue ?? '');
      setValue(`forms.${index}.organizations`, organizationsValue ?? '');
      setValue(`forms.${index}.businessIdentityCode`, businessIdentityCodeValue ?? '');
      setValue(`forms.${index}.journalNumber`, journalNumberValue ?? '');
      setValue(`forms.${index}.products`, productsValue ?? '');
      setValue(
        `forms.${index}.nationalityReligiousPolitical`,
        nationalityReligiousPoliticalValue ?? '',
      );
      setValue(`forms.${index}.other`, sharedMetadata.forms?.[0]?.other ?? '');
      setValue(`forms.${index}.public`, sharedMetadata.forms?.[0]?.public ?? false);
      setValue(`forms.${index}.group`, sharedMetadata.forms?.[0]?.group ?? false);
      setValue(`forms.${index}.groupSelect`, sharedMetadata.forms?.[0]?.groupSelect ?? '');
      setValue(`forms.${index}.restricted`, sharedMetadata.forms?.[0]?.restricted ?? false);

      setPublicChecked(sharedMetadata.forms?.[0]?.public);
      setGroupChecked(sharedMetadata.forms?.[0]?.group);
      setRestrictedChecked(sharedMetadata.forms?.[0]?.restricted);
    }
  }, [
    sharedMetadata,
    index,
    setValue,
    subjectIndexingValue,
    eventValue,
    locationValue,
    estimatedDateValue,
    personNamesValue,
    organizationsValue,
    businessIdentityCodeValue,
    journalNumberValue,
    productsValue,
    nationalityReligiousPoliticalValue,
  ]);

  const handlePublicChange = () => {
    setPublicChecked(!publicChecked);
    if (!publicChecked) {
      setRestrictedChecked(false);
    }
  };

  // State for handling getGroup errors
  const [submitError, setSubmitError] = useState<string | null>(null);

  // State for users groups
  const [usersGroups, setUsersGroups] = useState<Group[]>([]);

  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const getGroupsForUser = useCallback(async () => {
    try {
      if (!user) {
        setSubmitError(t('userNotFound'));
        return;
      }

      setSubmitError((prev) => (prev !== null ? null : prev));

      const response = await getAllGroupsForUser(user.id);
      setUsersGroups(
        (response ?? []).map((group) => ({
          ...group,
          createdAt: new Date(group.createdAt),
          updatedAt: new Date(group.updatedAt),
        })),
      );
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const { statusCode } = error as { statusCode: number };

        if (statusCode === 401) {
          Promise.resolve().then(() => router.push('/login?error=sessionExpired'));
          return;
        }

        const msg =
          statusCode === 400
            ? t('invalidRequestData')
            : statusCode === 403
              ? t('insufficientPermissions')
              : statusCode === 404
                ? t('userNotFound')
                : t('unexpectedError');

        if (isMountedRef.current) setSubmitError(msg);
      } else {
        if (isMountedRef.current) setSubmitError(t('unexpectedError'));
      }
    }
  }, [getAllGroupsForUser, router, t, user]);

  useEffect(() => {
    getGroupsForUser().catch(console.error);
  }, [getGroupsForUser]);

  const handleGroupChange = () => {
    setGroupChecked((prev) => {
      const next = !prev;
      if (next) {
        setRestrictedChecked(false);
        //void getGroupsForUser();
      }

      return next;
    });
  };

  const handleRestrictedChange = () => {
    setRestrictedChecked(!restrictedChecked);
    if (!restrictedChecked) {
      setPublicChecked(false);
      setGroupChecked(false);
    }
  };

  //useFieldsEqualityCheck
  const fieldKeys = [
    'subjectIndexing',
    'events',
    'locations',
    'estimatedDate',
    'personNames',
    'organizations',
    'businessIdentityCode',
    'journalNumber',
    'products',
    'nationalityReligiousPolitical',
  ];

  // 1) Stable fieldPaths: only depends on `index`
  const fieldPaths = useMemo(
    () => fieldKeys.map((key) => `forms.${index}.${key}` as `forms.${string}.${keyof FormData}`),
    [index],
  );

  // 2) Stable originalValues: depends on the actual value sources
  const originalValues = useMemo<Record<string, unknown>>(
    () => ({
      subjectIndexing: subjectIndexingValue
        ? subjectIndexingValue
            .split(',')
            .map((label) => label.trim())
            .filter(Boolean)
        : [],
      events: eventValue,
      locations: locationValue,
      estimatedDate: estimatedDateValue,
      personNames: personNamesValue,
      organizations: organizationsValue,
      businessIdentityCode: businessIdentityCodeValue,
      journalNumber: journalNumberValue,
      products: productsValue,
      nationalityReligiousPolitical: nationalityReligiousPoliticalValue,
    }),
    [
      subjectIndexingValue,
      eventValue,
      locationValue,
      estimatedDateValue,
      personNamesValue,
      organizationsValue,
      businessIdentityCodeValue,
      journalNumberValue,
      productsValue,
      nationalityReligiousPoliticalValue,
    ],
  );

  // Pass the memoized values to the hook
  const equalityMap = useFieldsEqualityCheck(control, fieldPaths, originalValues, source);

  const defaultSubjects = subjectIndexingValue
    ? subjectIndexingValue
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean)
    : [];

  return (
    <Container>
      <Form>
        <Form.Group hidden={disabled_header}>
          <Form.Label className={styles.formLabel}>
            {required_header && '* '} {t('headerLabel')}
          </Form.Label>
          <Form.Control
            placeholder={t('headerPlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.header`, {
              required: required_header,
            })}
            defaultValue={
              sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0
                ? sharedMetadata.forms?.[0]?.header
                : ''
            }
          />
          {errors?.forms?.[index]?.header && (
            <span className={styles.validationErrorText}>{t('headerError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_subjectIndexing}>
          <Form.Label className={styles.formLabel}>
            {required_subjectIndexing && '* '} {t('subjectIndexingLabel')}{' '}
            <span hidden={equalityMap.subjectIndexing}>
              <Badge bg='primary'>AI</Badge>
            </span>
          </Form.Label>
          <SubjectSelector
            control={control}
            name={`forms.${index}.subjectIndexing`}
            defaultValue={defaultSubjects}
            required={required_subjectIndexing}
            errors={errors}
            index={index}
          />
        </Form.Group>

        <Form.Group hidden={disabled_events}>
          <Form.Label className={styles.formLabel}>
            {required_events && '* '} {t('eventsLabel')}
            <span hidden={equalityMap.events} className={styles.aiTag}>
              <Badge bg='primary'>AI</Badge>
            </span>
          </Form.Label>
          <Form.Control
            placeholder={t('eventsPlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.events`, {
              required: required_events,
            })}
            defaultValue={eventValue ?? sharedMetadata.forms?.[0]?.events ?? ''}
          />
          {errors?.forms?.[index]?.events && (
            <span className={styles.validationErrorText}>{t('eventsError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_locations}>
          <Form.Label className={styles.formLabel}>
            {required_locations && '* '} {t('locationsLabel')}
            <span hidden={equalityMap.locations} className={styles.aiTag}>
              <Badge bg='primary'>AI</Badge>
            </span>
          </Form.Label>
          <Form.Control
            placeholder={t('locationsPlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.locations`, {
              required: required_locations,
            })}
            defaultValue={locationValue}
          />
          {errors?.forms?.[index]?.locations && (
            <span className={styles.validationErrorText}>{t('locationsError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_description}>
          <Form.Label className={styles.formLabel}>
            {required_description && '* '} {t('descriptionLabel')}
          </Form.Label>
          <Form.Control
            placeholder={t('descriptionPlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.description`, {
              required: required_description,
            })}
            defaultValue={
              sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0
                ? sharedMetadata.forms?.[0]?.description
                : ''
            }
          />
          {errors?.forms?.[index]?.description && (
            <span className={styles.validationErrorText}>{t('descriptionError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_author}>
          <Form.Label className={styles.formLabel}>
            {required_author && '* '} {t('authorLabel')}
          </Form.Label>
          <Form.Control
            placeholder={t('authorPlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.author`, {
              required: required_author,
            })}
            defaultValue={
              sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0
                ? sharedMetadata.forms?.[0]?.author
                : ''
            }
          />
          {errors?.forms?.[index]?.author && (
            <span className={styles.validationErrorText}>{t('authorError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_exactDate}>
          <Form.Label className={styles.formLabel}>
            {required_exactDate && '* '} {t('exactDateLabel')}
          </Form.Label>
          <Form.Control
            placeholder={t('exactDatePlaceholder')}
            className={styles.formControl}
            type='date'
            {...register(`forms.${index}.exactDate`, {
              required: required_exactDate,
            })}
            defaultValue={
              sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0
                ? sharedMetadata.forms?.[0]?.exactDate
                : ''
            }
          />
          {errors?.forms?.[index]?.exactDate && (
            <span className={styles.validationErrorText}>{t('exactDateError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_estimatedDate}>
          <Form.Label className={styles.formLabel}>
            {required_estimatedDate && '* '} {t('estimatedDateLabel')}
            <span hidden={equalityMap.estimatedDate} className={styles.aiTag}>
              <Badge bg='primary'>AI</Badge>
            </span>
          </Form.Label>
          <Form.Control
            placeholder={t('estimatedDatePlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.estimatedDate`, {
              required: required_estimatedDate,
            })}
            defaultValue={estimatedDateValue}
          />
          {errors?.forms?.[index]?.estimatedDate && (
            <span className={styles.validationErrorText}>{t('estimatedDateError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_type}>
          <Form.Label className={styles.formLabel}>{t('typeLabel')}</Form.Label>
          <Form.Select
            aria-label={t('typeAriaLabel')}
            className={styles.formControl}
            {...register(`forms.${index}.type`)}
            defaultValue={
              sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0
                ? sharedMetadata.forms?.[0]?.type
                : ''
            }
          >
            <option value='photo'>{t('typePhoto')}</option>
            <option value='video'>{t('typeVideo')}</option>
            <option value='document'>{t('typeDocument')}</option>
            <option value='object'>{t('typeObject')}</option>
            <option value='book'>{t('typeBook')}</option>
            <option value='memoir'>{t('typeMemoir')}</option>
            <option value='letter'>{t('typeLetter')}</option>
            <option value='recording'>{t('typeRecording')}</option>
            <option value='postcard'>{t('typePostcard')}</option>
            <option value='text'>{t('typeText')}</option>
            <option value='article'>{t('typeArticle')}</option>
            <option value='map'>{t('typeMap')}</option>
            <option value='drawing'>{t('typeDrawing')}</option>
            <option value='other'>{t('typeOther')}</option>
          </Form.Select>
        </Form.Group>

        <Form.Group hidden={disabled_language}>
          <Form.Label className={styles.formLabel}>{t('languageLabel')}</Form.Label>
          <Form.Select
            aria-label={t('languageAriaLabel')}
            className={styles.formControl}
            {...register(`forms.${index}.language`)}
            defaultValue={
              sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0
                ? sharedMetadata.forms?.[0]?.language
                : ''
            }
          >
            <option value='fi'>{t('languageFinnish')}</option>
            <option value='en'>{t('languageEnglish')}</option>
            <option value='sv'>{t('languageSwedish')}</option>
          </Form.Select>
        </Form.Group>

        <Form.Group hidden={disabled_personNames}>
          <Form.Label className={styles.formLabel}>
            {required_personNames && '* '} {t('personNamesLabel')}
            <span hidden={equalityMap.personNames} className={styles.aiTag}>
              <Badge bg='primary'>AI</Badge>
            </span>
          </Form.Label>
          <Form.Control
            placeholder={t('personNamesPlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.personNames`, {
              required: required_personNames,
            })}
            defaultValue={personNamesValue}
          />
          {errors?.forms?.[index]?.personNames && (
            <span className={styles.validationErrorText}>{t('personNamesError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_organizations}>
          <Form.Label className={styles.formLabel}>
            {required_organizations && '* '} {t('organizationsLabel')}
            <span hidden={equalityMap.organizations} className={styles.aiTag}>
              <Badge bg='primary'>AI</Badge>
            </span>
          </Form.Label>
          <Form.Control
            placeholder={t('organizationsPlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.organizations`, {
              required: required_organizations,
            })}
            defaultValue={organizationsValue}
          />
          {errors?.forms?.[index]?.organizations && (
            <span className={styles.validationErrorText}>{t('organizationsError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_businessIdentityCode}>
          <Form.Label className={styles.formLabel}>
            {required_businessIdentityCode && '* '} {t('businessIdentityCodeLabel')}
            <span hidden={equalityMap.businessIdentityCode} className={styles.aiTag}>
              <Badge bg='primary'>AI</Badge>
            </span>
          </Form.Label>
          <Form.Control
            placeholder={t('businessIdentityCodePlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.businessIdentityCode`, {
              required: required_businessIdentityCode,
            })}
            defaultValue={businessIdentityCodeValue}
          />
          {errors?.forms?.[index]?.businessIdentityCode && (
            <span className={styles.validationErrorText}>{t('businessIdentityCodeError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_journalNumber}>
          <Form.Label className={styles.formLabel}>
            {required_journalNumber && '* '} {t('journalNumberLabel')}
            <span hidden={equalityMap.journalNumber} className={styles.aiTag}>
              <Badge bg='primary'>AI</Badge>
            </span>
          </Form.Label>
          <Form.Control
            placeholder={t('journalNumberPlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.journalNumber`, {
              required: required_journalNumber,
            })}
            defaultValue={journalNumberValue}
          />
          {errors?.forms?.[index]?.journalNumber && (
            <span className={styles.validationErrorText}>{t('journalNumberError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_products}>
          <Form.Label className={styles.formLabel}>
            {required_products && '* '} {t('productsLabel')}
            <span hidden={equalityMap.products} className={styles.aiTag}>
              <Badge bg='primary'>AI</Badge>
            </span>
          </Form.Label>
          <Form.Control
            placeholder={t('productsPlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.products`, {
              required: required_products,
            })}
            defaultValue={productsValue}
          />
          {errors?.forms?.[index]?.products && (
            <span className={styles.validationErrorText}>{t('productsError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_nationalityReligiousPolitical}>
          <Form.Label className={styles.formLabel}>
            {required_nationalityReligiousPolitical && '* '}{' '}
            {t('nationalityReligiousPoliticalLabel')}
            <span hidden={equalityMap.nationalityReligiousPolitical} className={styles.aiTag}>
              <Badge bg='primary'>AI</Badge>
            </span>
          </Form.Label>
          <Form.Control
            placeholder={t('nationalityReligiousPoliticalPlaceholder')}
            className={styles.formControl}
            {...register(`forms.${index}.nationalityReligiousPolitical`, {
              required: required_nationalityReligiousPolitical,
            })}
            defaultValue={nationalityReligiousPoliticalValue}
          />
          {errors?.forms?.[index]?.nationalityReligiousPolitical && (
            <span className={styles.validationErrorText}>
              {t('nationalityReligiousPoliticalError')}
            </span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_other}>
          <Form.Label className={styles.formLabel}>
            {required_other && '* '} {t('otherLabel')}
          </Form.Label>
          <Form.Control
            placeholder={t('otherPlaceholder')}
            className={styles.formControl}
            as='textarea'
            rows={3}
            {...register(`forms.${index}.other`, {
              required: required_other,
            })}
            defaultValue={
              sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0
                ? sharedMetadata.forms?.[0]?.other
                : ''
            }
          />
          {errors?.forms?.[index]?.other && (
            <span className={styles.validationErrorText}>{t('otherError')}</span>
          )}
        </Form.Group>

        <Form.Group hidden={disabled_publicity}>
          <Form.Label className={styles.formLabel}>
            {required_publicity && '* '} {t('publicityLabel')}
          </Form.Label>

          {/* Public Switch */}
          <Form.Check
            type='switch'
            label={t('publicLabel')}
            id={`forms.${index}.public`}
            {...register(`forms.${index}.public`, {
              validate: () =>
                (publicChecked ?? false) ||
                (groupChecked ?? false) ||
                (restrictedChecked ?? false) ||
                'Vähintään yhden tulee olla valittu',
            })}
            checked={publicChecked ?? false}
            onChange={handlePublicChange}
            disabled={(restrictedChecked ?? false) || (groupChecked ?? false)}
          />

          {/* Group Switch */}
          <Form.Check
            type='switch'
            label={t('groupLabel')}
            id={`forms.${index}.group`}
            {...register(`forms.${index}.group`)}
            checked={groupChecked ?? false}
            onChange={handleGroupChange}
            disabled={(restrictedChecked ?? false) || (publicChecked ?? false)}
          />

          {/* Group Select Dropdown */}
          {groupChecked && (
            <>
              {submitError && <Alert variant='danger'>{submitError}</Alert>}
              <Form.Group controlId='groupSelect' className='metadataForm-groupSelect'>
                <Form.Select
                  {...register(`forms.${index}.groupSelect`)}
                  defaultValue={
                    sharedMetadata.forms && Object.keys(sharedMetadata.forms).length > 0
                      ? sharedMetadata.forms?.[0]?.groupSelect
                      : ''
                  }
                >
                  {usersGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.groupName}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </>
          )}

          {/* Restricted Switch */}
          <Form.Check
            type='switch'
            label={t('restrictedLabel')}
            id={`forms.${index}.restricted`}
            {...register(`forms.${index}.restricted`)}
            checked={restrictedChecked ?? false}
            onChange={handleRestrictedChange}
            disabled={(publicChecked ?? false) || (groupChecked ?? false)}
          />

          {/* Error Message */}
          {errors.forms?.[index]?.public && (
            <span className={styles.validationErrorText}>{t('publicityError')}</span>
          )}
        </Form.Group>
      </Form>
    </Container>
  );
};

export default MetadataForm;

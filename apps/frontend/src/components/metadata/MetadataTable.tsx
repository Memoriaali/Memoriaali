// ./MetadataTable.tsx
import { useTranslations } from 'next-intl';
import { Table } from 'react-bootstrap';

import { Document as DocumentType } from '@/lib/api/generated/types.gen';

import { DocType, typeLabelKeys } from '../search/searchTypes';
import styles from './MetadataTable.module.css';

import { MetadataSuggestionsProvider } from '../metadataSuggestions/MetadataSuggestionsProvider';
import MetadataValueWithSuggestions from '../metadataSuggestions/MetadataValueWithSuggestions';

interface MetadataTableProps {
  document: DocumentType;
}

const MetadataTable = ({ document }: MetadataTableProps) => {
  const t = useTranslations('Metadata');

  // Is metadata field disabled before starting (from .env)
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

  return (
    <MetadataSuggestionsProvider documentId={document.id}>
      <>
        <h4 hidden={disabled_header}>
          <MetadataValueWithSuggestions field='header' baseValue={document.metadata.header} />
        </h4>

        <Table className={`${styles.metadataTable} ${styles.tableBorderless}`}>
          <tbody className={styles.metadataTableBody}>
            <tr hidden={disabled_subjectIndexing}>
              <th className={styles.metadataTableHeader}>{t('subjectIndexingLabel')}</th>
              <td>
                <MetadataValueWithSuggestions
                  field='subjectIndexing'
                  baseValue={document.metadata.subjectIndexing?.join(', ')}
                />
              </td>
            </tr>

            <tr hidden={disabled_events}>
              <th className={styles.metadataTableHeader}>{t('eventsLabel')}</th>
              <td>
                <MetadataValueWithSuggestions field='events' baseValue={document.metadata.events} />
              </td>
            </tr>

            <tr hidden={disabled_locations}>
              <th className={styles.metadataTableHeader}>{t('locationsLabel')}</th>
              <td className={styles.metadataTableHeader}>
                <MetadataValueWithSuggestions
                  field='locations'
                  baseValue={document.metadata.locations}
                />
              </td>
            </tr>

            <tr hidden={disabled_description}>
              <th className={styles.metadataTableHeader}>{t('descriptionLabel')}</th>
              <td>
                <MetadataValueWithSuggestions
                  field='description'
                  baseValue={document.metadata.description}
                />
              </td>
            </tr>

            <tr hidden={disabled_author}>
              <th className={styles.metadataTableHeader}>{t('authorLabel')}</th>
              <td>
                <MetadataValueWithSuggestions field='author' baseValue={document.metadata.author} />
              </td>
            </tr>

            <tr hidden={disabled_exactDate}>
              <th className={styles.metadataTableHeader}>{t('exactDateLabel')}</th>
              <td>
                <MetadataValueWithSuggestions
                  field='exactDate'
                  baseValue={document.metadata.exactDate}
                />
              </td>
            </tr>

            <tr hidden={disabled_estimatedDate}>
              <th className={styles.metadataTableHeader}>{t('estimatedDateLabel')}</th>
              <td>
                <MetadataValueWithSuggestions
                  field='estimatedDate'
                  baseValue={document.metadata.estimatedDate}
                />
              </td>
            </tr>

            <tr hidden={disabled_type}>
              <th className={styles.metadataTableHeader}>{t('typeLabel')}</th>
              <td>
                <MetadataValueWithSuggestions
                  field='type'
                  baseValue={t(
                    typeLabelKeys[document.metadata.type as DocType] ?? typeLabelKeys['other'],
                  )}
                />
              </td>
            </tr>

            <tr hidden={disabled_language}>
              <th className={styles.metadataTableHeader}>{t('languageLabel')}</th>
              <td>
                <MetadataValueWithSuggestions
                  field='language'
                  baseValue={document.metadata.language}
                />
              </td>
            </tr>

            <tr hidden={disabled_personNames}>
              <th className={styles.metadataTableHeader}>{t('personNamesLabel')}</th>
              <td>
                <MetadataValueWithSuggestions
                  field='personNames'
                  baseValue={document.metadata.personNames}
                />
              </td>
            </tr>

            <tr hidden={disabled_organizations}>
              <th className={styles.metadataTableHeader}>{t('organizationsLabel')}</th>
              <td>
                <MetadataValueWithSuggestions
                  field='organizations'
                  baseValue={document.metadata.organizations}
                />
              </td>
            </tr>

            <tr hidden={disabled_businessIdentityCode}>
              <th className={styles.metadataTableHeader}>{t('businessIdentityCodeLabel')}</th>
              <td>
                <MetadataValueWithSuggestions
                  field='businessIdentityCode'
                  baseValue={document.metadata.businessIdentityCode}
                />
              </td>
            </tr>

            <tr hidden={disabled_journalNumber}>
              <th className={styles.metadataTableHeader}>{t('journalNumberLabel')}</th>
              <td>
                <MetadataValueWithSuggestions
                  field='journalNumber'
                  baseValue={document.metadata.journalNumber}
                />
              </td>
            </tr>

            <tr hidden={disabled_products}>
              <th className={styles.metadataTableHeader}>{t('productsLabel')}</th>
              <td>
                <MetadataValueWithSuggestions
                  field='products'
                  baseValue={document.metadata.products}
                />
              </td>
            </tr>

            <tr hidden={disabled_nationalityReligiousPolitical}>
              <th className={styles.metadataTableHeader}>
                {t('nationalityReligiousPoliticalLabel')}
              </th>
              <td>
                <MetadataValueWithSuggestions
                  field='nationalityReligiousPolitical'
                  baseValue={document.metadata.nationalityReligiousPolitical}
                />
              </td>
            </tr>

            <tr hidden={disabled_other}>
              <th className={styles.metadataTableHeader}>{t('otherLabel')}</th>
              <td>
                <MetadataValueWithSuggestions field='other' baseValue={document.metadata.other} />
              </td>
            </tr>
          </tbody>
        </Table>
      </>
    </MetadataSuggestionsProvider>
  );
};

export default MetadataTable;

// ./MetadataTableLite.tsx
import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';
import { Table } from 'react-bootstrap';
import styles from './MetadataTable.module.css';

import { MetadataSuggestionsProvider } from '../metadataSuggestions/MetadataSuggestionsProvider';
import MetadataValueWithSuggestions from '../metadataSuggestions/MetadataValueWithSuggestions';

interface MetadataTableProps {
  document?: DocumentType;
}

const MetadataTableLite: React.FC<MetadataTableProps> = ({ document }) => {
  const t = useTranslations('Metadata');

  // Is metadata field disabled before starting - from .env
  const disabled_header = process.env.REACT_APP_HEADER_DISABLED === 'true';
  const disabled_subjectIndexing = process.env.REACT_APP_SUBJECTINDEXING_DISABLED === 'true';
  const disabled_exactDate = process.env.REACT_APP_EXACTDATE_DISABLED === 'true';
  const disabled_type = process.env.REACT_APP_TYPE_DISABLED === 'true';
  const disabled_language = process.env.REACT_APP_LANGUAGE_DISABLED === 'true';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) setIsVisible(true);
      },
      { root: null, rootMargin: '200px', threshold: 0.01 }, // pre-load before fully visible
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!document) return null;

  return (
    <div ref={containerRef}>
      <MetadataSuggestionsProvider documentId={document.id} enabled={isVisible}>
        <>
          <h4 hidden={disabled_header} className={styles.header}>
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

              <tr hidden={disabled_exactDate}>
                <th className={styles.metadataTableHeader}>{t('exactDateLabel')}</th>
                <td>
                  <MetadataValueWithSuggestions
                    field='exactDate'
                    baseValue={document.metadata.exactDate}
                  />
                </td>
              </tr>

              <tr hidden={disabled_type}>
                <th className={styles.metadataTableHeader}>{t('typeLabel')}</th>
                <td>
                  <MetadataValueWithSuggestions field='type' baseValue={document.metadata.type} />
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
            </tbody>
          </Table>
        </>
      </MetadataSuggestionsProvider>
    </div>
  );
};

export default MetadataTableLite;

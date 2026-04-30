import { faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

import styles from '../metadata/MetadataTable.module.css';
import {
  normalizeFieldKey,
  SuggestableField,
  useMetadataSuggestionsContext,
} from './MetadataSuggestionsProvider';

type Props = {
  field: SuggestableField;
  baseValue: React.ReactNode;
  as?: 'div' | 'span';
};

const MetadataValueWithSuggestions: React.FC<Props> = ({ field, baseValue, as = 'span' }) => {
  const t = useTranslations('Metadata');
  const { suggestionsByField } = useMetadataSuggestionsContext();

  const suggestions = suggestionsByField.get(normalizeFieldKey(field)) ?? [];

  // Decide element tags for the current mode
  const Root = as; // container for everything
  const Block = as; // base value container
  const Rows = as; // suggestions container
  const RowItem = as; // individual suggestion row

  if (suggestions.length === 0) {
    // Render only the base value (inline or block depending on `as`)
    return as === 'div' ? (
      <div className={styles.baseValue}>{baseValue}</div>
    ) : (
      <span className={styles.baseValue}>{baseValue}</span>
    );
  }

  const tooltipLabel = t('suggestionTooltip');

  return (
    <Root className={styles.valueWithSuggestionList}>
      <Block className={styles.baseValue}>{baseValue}</Block>

      <Rows className={styles.suggestionRows} role='list'>
        {suggestions.map((s) => {
          const tooltipId = `md-suggestion-${field}-${s.id}`;
          return (
            <RowItem className={styles.suggestionRow} role='listitem' key={s.id}>
              <OverlayTrigger
                placement='top'
                overlay={<Tooltip id={tooltipId}>{tooltipLabel}</Tooltip>}
                trigger={['hover', 'focus']}
                delay={{ show: 150, hide: 50 }}
                popperConfig={{
                  strategy: 'fixed',
                  modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
                }}
                transition={false}
              >
                <span className={styles.suggestionTrigger} tabIndex={0}>
                  <FontAwesomeIcon
                    icon={faUser}
                    className={styles.suggestionIcon}
                    aria-hidden='true'
                  />
                  <span className={styles.suggestionText}>{s.changedValue}</span>
                </span>
              </OverlayTrigger>
            </RowItem>
          );
        })}
      </Rows>
    </Root>
  );
};

export default MetadataValueWithSuggestions;

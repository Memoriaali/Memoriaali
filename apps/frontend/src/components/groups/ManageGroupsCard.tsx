'use client';
import { Group } from '@/lib/api/generated';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Alert, Card, Form } from 'react-bootstrap';
import AddMembersToGroup from './AddMembersToGroup';
import DeleteGroup from './DeleteGroup';
import styles from './GroupSettings.module.css';
import RenameGroup from './RenameGroup';

interface ManageGroupsCardProps {
  handleShowMessage: (message: string) => void;
  getError: string | null;
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string | null) => void;
  groups: Group[];
  selectedGroup: Group | undefined;
  getListedGroups: () => Promise<void>;
}

const ManageGroupsCard: React.FC<ManageGroupsCardProps> = ({
  handleShowMessage,
  getError,
  selectedGroupId,
  setSelectedGroupId,
  groups,
  selectedGroup,
  getListedGroups,
}) => {
  const t = useTranslations('Groups');

  return (
    <Card className={styles.settingsCard}>
      <Card.Body>
        <h4>{t('manageGroups')}:</h4>

        {getError && <Alert variant='danger'>{getError}</Alert>}

        <Form.Label htmlFor='chooseGroup' className={styles.inputLabel}>
          {t('selectGroup')}:
        </Form.Label>

        <Form.Select
          id='chooseGroup'
          className={styles.inputMargin}
          value={selectedGroupId ?? ''}
          onChange={(e) => setSelectedGroupId(e.target.value || null)}
        >
          <option value=''>{t('selectGroupPlaceholder')}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.groupName}
            </option>
          ))}
        </Form.Select>

        {selectedGroup && (
          <>
            <DeleteGroup
              group={selectedGroup}
              handleShowMessage={handleShowMessage}
              getListedGroups={getListedGroups}
            />
            <RenameGroup
              group={selectedGroup}
              handleShowMessage={handleShowMessage}
              getListedGroups={getListedGroups}
            />
            <AddMembersToGroup group={selectedGroup} handleShowMessage={handleShowMessage} />
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default ManageGroupsCard;

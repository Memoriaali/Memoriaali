'use client';

import { useDefaultQuestions } from '@/hooks/useDefaultQuestions';
import { reorder } from '@/utils/questionUtils';
import { faCirclePlus, faFile, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { ChangeEvent, KeyboardEventHandler, useCallback, useEffect, useState } from 'react';
import { Button, Container, FormControl, Modal, Row, Table } from 'react-bootstrap';
import DeleteDefaultQuestionConfirmationModal from '../../../components/settings/DeleteDefaultQuestionConfirmationModal';
import DraggableQuestionItem from './DraggableQuestionItem';
import styles from './QuestionsList.module.css';

export interface Question {
  id: string;
  text: string;
  sortIndex: number;
}

interface QuestionCardsProps {
  fullwidth?: boolean;
  isAdminSettings?: boolean;
  handleShowMessage?: (text: string) => void;
}

const QuestionsList = ({
  fullwidth,
  isAdminSettings = false,
  handleShowMessage,
}: QuestionCardsProps) => {
  const t = useTranslations('HelperQuestions');

  const {
    createDefaultQuestion,
    fetchDefaultQuestions,
    updateDefaultQuestionById,
    deleteDefaultQuestionById,
  } = useDefaultQuestions();

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [defaultQuestions, setDefaultQuestions] = useState<Question[]>([]);
  const [showAddNew, setShowAddNew] = useState<boolean>(false);
  const [newQuestion, setNewQuestion] = useState<Question>();
  const [updatedQuestionText, setUpdatedQuestionText] = useState<string>();
  const [editQuestionId, setEditQuestionId] = useState<string>();
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [confirmationModalOpen, setConfirmationModalOpen] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const isEditing =
    !!editQuestionId && allQuestions.some((question) => question.id === editQuestionId);

  const openConfirmationModal = useCallback(() => {
    setConfirmationModalOpen(true);
  }, []);

  const closeConfirmationModal = useCallback(() => {
    setConfirmationModalOpen(false);
  }, []);

  const setAddModeOnClickHandler = useCallback(() => {
    setShowAddNew(true);
  }, []);

  const cancelAddModeClickHandler = useCallback(() => {
    setNewQuestion(undefined);
    setShowAddNew(false);
  }, []);

  const emptyQuestionsOnClick = useCallback(() => {
    localStorage.removeItem('allQuestions');
    setAllQuestions(defaultQuestions);
    closeConfirmationModal();
  }, [closeConfirmationModal, defaultQuestions]);

  /* Get default questions */

  const getDefaultQuestions = useCallback(async (): Promise<Question[] | undefined> => {
    try {
      const fetchedDefaultQuestions = await fetchDefaultQuestions();

      if (!fetchedDefaultQuestions) {
        handleShowMessage?.(t('unexpectedError'));
        return;
      }

      setDefaultQuestions(fetchedDefaultQuestions);

      if (isAdminSettings) {
        setAllQuestions(fetchedDefaultQuestions);
      }
      return fetchedDefaultQuestions;
    } catch (error) {
      console.error(error);
      handleShowMessage?.(t('unexpectedError'));
      return;
    }
  }, [fetchDefaultQuestions, handleShowMessage, isAdminSettings, t]);

  useEffect(() => {
    let isEffectCancelled = false;

    const init = async () => {
      const fetched = await getDefaultQuestions();
      if (isEffectCancelled) return;

      // Not admin: decide allQuestions source (localStorage or defaults)
      if (!isAdminSettings) {
        let stored: Question[] = [];
        try {
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem('allQuestions');
            stored = raw ? JSON.parse(raw) : [];
          }
        } catch {
          stored = [];
        }

        if (isEffectCancelled) return;

        setAllQuestions(stored.length > 0 ? stored : (fetched ?? []));
      }
      setHasInitialized(true);
    };

    void init();
    return () => {
      isEffectCancelled = true;
    };
  }, [getDefaultQuestions, isAdminSettings]);

  /* New question */

  const newQuestionOnChangeHandler = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setNewQuestion({
        id: event.target.value,
        text: event.target.value,
        sortIndex: allQuestions?.length + 1,
      });
    },
    [allQuestions],
  );

  const saveQuestionOnClickHandler = useCallback(async (): Promise<void> => {
    if (!newQuestion || newQuestion.text.length < 1) {
      return;
    }
    if (isAdminSettings) {
      const prevDefaults = defaultQuestions;
      setDefaultQuestions([...defaultQuestions, newQuestion]);

      try {
        const res = await createDefaultQuestion(newQuestion.text, newQuestion.sortIndex);

        if (!res) {
          setDefaultQuestions(prevDefaults);
          handleShowMessage?.(t('unexpectedError'));
          return;
        }

        const refreshed = await fetchDefaultQuestions();
        if (!refreshed) {
          setDefaultQuestions(prevDefaults);
          handleShowMessage?.(t('unexpectedError'));
          return;
        }

        setAllQuestions(refreshed ?? []);
        setDefaultQuestions(refreshed ?? []);
      } catch {
        setDefaultQuestions(prevDefaults);
        handleShowMessage?.(t('unexpectedError'));
        return;
      }
    } else {
      setAllQuestions([...allQuestions, newQuestion]);
    }
    setNewQuestion(undefined);
    setShowAddNew(false);
  }, [
    allQuestions,
    createDefaultQuestion,
    defaultQuestions,
    fetchDefaultQuestions,
    handleShowMessage,
    isAdminSettings,
    newQuestion,
    t,
  ]);

  useEffect(() => {
    if (!isAdminSettings && hasInitialized) {
      try {
        localStorage.setItem('allQuestions', JSON.stringify(allQuestions));
      } catch (error) {
        console.error(error);
      }
    }
  }, [allQuestions, isAdminSettings, hasInitialized]);

  // Enable saving new question by pressing enter-key
  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveQuestionOnClickHandler();
      }
    },
    [saveQuestionOnClickHandler],
  );

  /* Editing question */

  const setEditModeOnClick = useCallback(
    (id: string) => (): void => {
      setUpdatedQuestionText(undefined);
      setEditQuestionId(id);
    },
    [],
  );

  const updateEditedOnChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    setUpdatedQuestionText(event.currentTarget.value);
  }, []);

  const saveEditedQuestionOnClick = useCallback(async (): Promise<void> => {
    if (!updatedQuestionText || !editQuestionId) {
      setEditQuestionId(undefined);
      return;
    }

    const target = allQuestions.find((question) => question.id === editQuestionId);
    if (!target) {
      setEditQuestionId(undefined);
      return;
    }

    const newArr = allQuestions.map((question) =>
      question.id === editQuestionId ? { ...question, text: updatedQuestionText } : question,
    );

    if (isAdminSettings) {
      const prevDefaults = defaultQuestions;
      try {
        setDefaultQuestions(newArr);
        const res = await updateDefaultQuestionById(
          target.id,
          updatedQuestionText,
          target.sortIndex,
        );
        if (!res) {
          setDefaultQuestions(prevDefaults);
          handleShowMessage?.(t('unexpectedError'));
          setEditQuestionId(undefined);
          return;
        }

        setAllQuestions(newArr);
        setEditQuestionId(undefined);
        return;
      } catch {
        setDefaultQuestions(prevDefaults);
        handleShowMessage?.(t('unexpectedError'));
        setEditQuestionId(undefined);
        return;
      }
    }
    setAllQuestions(newArr);
    setEditQuestionId(undefined);
  }, [
    allQuestions,
    defaultQuestions,
    editQuestionId,
    handleShowMessage,
    isAdminSettings,
    t,
    updateDefaultQuestionById,
    updatedQuestionText,
  ]);

  /* Sorting questions*/
  // TODO: API endpoint for default questions sorting to get stable version
  // Now there is a risk for conflicts in database (409) or
  // "Too many requests" (429) error

  type UpdateFunction = typeof updateDefaultQuestionById;

  const findFreeSortIndex = (used: Set<number>, min = 1, max = 9999): number | null => {
    for (let index = max; index >= min; index--) {
      if (!used.has(index)) return index;
    }
    return null;
  };

  // Updates change by utilizing free sortIndex
  const persistReorderUsingFreeSlot = async (
    listBefore: Question[],
    sourceIndex: number,
    destIndex: number,
    updateDefaultQuestionById: UpdateFunction,
  ): Promise<void> => {
    if (sourceIndex === destIndex) return;

    const moved = listBefore[sourceIndex] as Question;
    const used = new Set(listBefore.map((question) => question.sortIndex));
    const temp = findFreeSortIndex(used, 1, 9999);

    if (temp == null) {
      throw new Error('No free sortIndex value between 1..9999');
    }
    try {
      // Move temporaly to free sortIndex
      const res = await updateDefaultQuestionById(moved.id, moved.text, temp);
      if (!res) throw new Error('Something went wrong when trying to update sortIndexes');

      //Move to right direction using free spot
      if (destIndex < sourceIndex) {
        // Move up: [dest .. source-1] moves +1
        for (let i = sourceIndex - 1; i >= destIndex; i--) {
          const question = listBefore[i] as Question;
          const res = await updateDefaultQuestionById(question.id, question.text, i + 2);
          if (!res) throw new Error('Something went wrong when trying to update sortIndexes');
        }
      } else {
        // Move down: [source+1 .. dest] moves -1
        for (let i = sourceIndex + 1; i <= destIndex; i++) {
          const question = listBefore[i] as Question;
          const res = await updateDefaultQuestionById(question.id, question.text, i);
          if (!res) throw new Error('Something went wrong when trying to update sortIndexes');
        }
      }
      //Bring question to final spot
      const lastRes = await updateDefaultQuestionById(moved.id, moved.text, destIndex + 1);
      if (!lastRes) throw new Error('Something went wrong when trying to update sortIndexes');
    } catch (error) {
      throw error;
    }
  };

  const onDragEnd = async ({ destination, source }: DropResult) => {
    // dragging outside of the container
    if (!destination) {
      return;
    }

    if (destination.index === source.index) return;

    const allQuestionsBeforeSorting = allQuestions;

    const sortedQuestions: Question[] = reorder(
      allQuestionsBeforeSorting,
      source.index,
      destination.index,
    );

    setAllQuestions(sortedQuestions);

    if (isAdminSettings) {
      setDefaultQuestions(sortedQuestions);

      try {
        await persistReorderUsingFreeSlot(
          allQuestionsBeforeSorting,
          source.index,
          destination.index,
          updateDefaultQuestionById,
        );
      } catch (error) {
        console.error('Error when saving reordered questions', error);
        setAllQuestions(allQuestionsBeforeSorting);
        setDefaultQuestions(allQuestionsBeforeSorting);
        handleShowMessage?.(t('unexpectedError'));
      }
    }
  };

  /* Admin settings question deletion */
  const confirmDelete = async () => {
    if (!questionToDelete) return;

    const originalQuestions = allQuestions;

    const questionsAfterDeletion = originalQuestions
      .filter((question) => question.id !== questionToDelete.id)
      .map((question, index) => ({ ...question, sortIndex: index + 1 }));

    setAllQuestions(questionsAfterDeletion);
    setDefaultQuestions(questionsAfterDeletion);

    try {
      const res = await deleteDefaultQuestionById(questionToDelete.id);
      if (!res) throw new Error('Something went wrong when trying to delete default question');

      // Moving questions sortIndexes 1 down that had larger sortIndex than in deleted question
      const deleted = originalQuestions.find((question) => question.id === questionToDelete.id);
      if (deleted) {
        const affectedQuestions = originalQuestions
          .filter(
            (question) =>
              question.id !== questionToDelete.id && question.sortIndex > deleted.sortIndex,
          )
          .sort((a, b) => a.sortIndex - b.sortIndex);

        for (const question of affectedQuestions) {
          const res = await updateDefaultQuestionById(
            question.id,
            question.text,
            question.sortIndex - 1,
          );
          if (!res)
            throw new Error(
              'Something went wrong when trying to update affected questions on default question deletion',
            );
        }
      }

      const refreshed = await fetchDefaultQuestions();
      if (!refreshed)
        throw new Error(
          'Something went wrong when trying fetch default questions on delete default question',
        );

      setAllQuestions(refreshed ?? []);
      setDefaultQuestions(refreshed ?? []);
      setDeleteError('');
      handleShowMessage?.(t('defaultQuestionDeleted'));
      setQuestionToDelete(null);
    } catch (error) {
      console.error(error);
      setAllQuestions(originalQuestions);
      setDefaultQuestions(originalQuestions);
      setDeleteError(t('unexpectedError'));
    }
  };

  /* LocalStorage question deletion */
  const isBrowser = (): boolean =>
    typeof window !== 'undefined' && typeof localStorage !== 'undefined';

  useEffect(() => {
    if (!isAdminSettings && questionToDelete) {
      const loadQuestionsFromLocalStorage = (): Question[] => {
        if (!isBrowser()) return [];

        try {
          const raw = localStorage.getItem('allQuestions');
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? (parsed as Question[]) : [];
        } catch {
          return [];
        }
      };

      const saveQuestionsToLocalStorage = (questions: Question[]) => {
        if (!isBrowser()) return;

        try {
          localStorage.setItem('allQuestions', JSON.stringify(questions));
        } catch (error) {
          console.error(error);
        }
      };

      const deleteQuestionFromLocalStorage = (id: string): Question[] => {
        const questions = loadQuestionsFromLocalStorage();
        const questionsAfterDeletion = questions.filter((question) => question.id !== id);
        saveQuestionsToLocalStorage(questionsAfterDeletion);
        return questionsAfterDeletion;
      };

      try {
        const newQuestions = deleteQuestionFromLocalStorage(questionToDelete.id);
        setAllQuestions(newQuestions);
        setDeleteError('');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Deletion failed (localStorage)';
        setDeleteError(message);
      } finally {
        setQuestionToDelete(null);
      }
    }
  }, [isAdminSettings, questionToDelete]);

  return (
    <>
      <Container>
        {showAddNew && (
          <FormControl
            onChange={newQuestionOnChangeHandler}
            onKeyDown={handleKeyDown}
            type='input'
            placeholder={t('addNewQuestion')}
            name='addNewQuestion'
          />
        )}

        {!showAddNew ? (
          <Row className={styles.row}>
            <Button className={styles.button} onClick={setAddModeOnClickHandler}>
              {t('addQuestion')}
              <FontAwesomeIcon className='ms-2' icon={faCirclePlus} />
            </Button>
            {!fullwidth && (
              <Button onClick={openConfirmationModal} className='primary'>
                {t('restoreDefaults')}
              </Button>
            )}
          </Row>
        ) : (
          <Row className={styles.row}>
            <Button className={styles.button} onClick={saveQuestionOnClickHandler}>
              {t('saveQuestion')}
              <FontAwesomeIcon className='ms-2' icon={faFile} />
            </Button>
            <Button onClick={cancelAddModeClickHandler}>{t('cancelQuestion')}</Button>
          </Row>
        )}
      </Container>

      <br />
      <br />

      {allQuestions.length === 0 ? (
        <p>{t('noQuestions')}</p>
      ) : (
        <>
          <Table striped bordered hover variant='light'>
            <colgroup>
              <col style={{ width: '56px' }} />
              <col />
              <col style={{ width: '56px' }} />
              <col style={{ width: '56px' }} />
            </colgroup>
            <thead>
              <tr>
                <th className={styles.headingCell}>#</th>
                <th className={styles.headingCell}>{t('question')}</th>
                <th className={styles.headingCell}>{isEditing ? t('save') : t('edit')}</th>
                <th className={styles.headingCell}>{t('delete')}</th>
              </tr>
            </thead>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable
                droppableId='droppable-list'
                renderClone={(provided, snapshot, rubric) => {
                  const item = allQuestions[rubric.source.index];

                  return (
                    <table>
                      <tbody>
                        <tr
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <td>{rubric.source.index + 1}.</td>
                          <td>
                            <span>{item?.text}</span>
                          </td>
                          <td />
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  );
                }}
              >
                {(provided) => (
                  <tbody ref={provided.innerRef} {...provided.droppableProps}>
                    {allQuestions.map((question, index) => (
                      <DraggableQuestionItem
                        key={question.id}
                        question={question}
                        index={index}
                        editQuestionId={editQuestionId}
                        updatedQuestionText={updatedQuestionText}
                        setEditModeOnClick={setEditModeOnClick}
                        updateEditedOnChange={updateEditedOnChange}
                        saveEditedQuestionOnClick={saveEditedQuestionOnClick}
                        onRequestDelete={setQuestionToDelete}
                      />
                    ))}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </DragDropContext>
          </Table>
          <br />
          <br />
        </>
      )}

      {isAdminSettings && questionToDelete && (
        <>
          <DeleteDefaultQuestionConfirmationModal
            question={questionToDelete}
            show
            alertMessage={deleteError}
            onCancel={() => {
              setQuestionToDelete(null);
              setDeleteError('');
            }}
            onConfirm={confirmDelete}
          />
          <div className={styles.defaultQuestionOverlay} />
        </>
      )}

      <Modal
        show={confirmationModalOpen}
        onHide={closeConfirmationModal}
        size='lg'
        centered
        className={`${styles.restoreModal}`}
      >
        <Modal.Header
          className={`${styles.modalBg} d-flex justify-content-center position-relative`}
        >
          <Modal.Title className={styles.modalTitle}>{t('restoreDefaultQuestions')}</Modal.Title>
          <Button variant='link' onClick={closeConfirmationModal} className={styles.customClose}>
            <FontAwesomeIcon icon={faXmark} />
          </Button>
        </Modal.Header>

        <Modal.Body className={styles.modalBg}>
          <Container>
            <p>{t('areYouSure')}</p>
            <Row>
              <Button className={styles.button} onClick={emptyQuestionsOnClick}>
                {t('yesRestore')}
              </Button>
              <Button onClick={closeConfirmationModal}>{t('cancel')}</Button>
            </Row>
          </Container>
        </Modal.Body>
      </Modal>

      {confirmationModalOpen && <div className={styles.defaultQuestionOverlay} />}
    </>
  );
};

export default QuestionsList;

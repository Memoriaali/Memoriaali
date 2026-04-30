import { faFile, faGripLines, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Draggable } from '@hello-pangea/dnd';
import { ChangeEvent, KeyboardEventHandler, MouseEventHandler, useCallback } from 'react';
import styles from './DraggableQuestionItem.module.css';
import { Question } from './QuestionsList';

interface DraggableQuestionItemProps {
  question: Question;
  index: number;
  editQuestionId?: string;
  updatedQuestionText?: string;
  setEditModeOnClick: (id: string) => MouseEventHandler<SVGSVGElement> | undefined;
  updateEditedOnChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  saveEditedQuestionOnClick: () => void;
  onRequestDelete: (question: Question) => void;
}

const DraggableQuestionItem = ({
  question,
  index,
  editQuestionId,
  updatedQuestionText,
  setEditModeOnClick,
  updateEditedOnChange,
  saveEditedQuestionOnClick,
  onRequestDelete,
}: DraggableQuestionItemProps) => {
  /* Enable updating by pressing enter-key */
  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveEditedQuestionOnClick();
      }
    },
    [saveEditedQuestionOnClick],
  );

  return (
    <Draggable draggableId={question?.id} index={index}>
      {(provided, snapshot) => {
        return (
          <tr
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={snapshot.isDragging ? styles.dragging : undefined}
          >
            <td {...provided.dragHandleProps} className={styles.dragHandle}>
              {index + 1}.
            </td>
            {editQuestionId === question.id ? (
              <td {...provided.dragHandleProps}>
                <textarea
                  onChange={updateEditedOnChange}
                  onKeyDown={handleKeyDown}
                  className={styles.textareaResponsive}
                  name='editQuestionTextarea'
                  rows={5}
                  cols={50}
                  value={updatedQuestionText ?? question.text}
                />
              </td>
            ) : (
              <td
                {...provided.dragHandleProps}
                className={`${styles.dragHandle} ${styles.iconCell}`}
              >
                <span className={styles.textWrapper}>{question?.text}</span>

                <span className={styles.iconWrapper}>
                  <FontAwesomeIcon icon={faGripLines} className={styles.grip} />
                </span>
              </td>
            )}

            {editQuestionId === question.id ? (
              <td className='text-center'>
                <FontAwesomeIcon
                  className={styles.iconStyle}
                  icon={faFile}
                  role='button'
                  style={{
                    marginRight: '6px',
                  }}
                  onClick={saveEditedQuestionOnClick}
                />
              </td>
            ) : (
              <td className='text-center'>
                <FontAwesomeIcon
                  className={styles.iconStyle}
                  icon={faPen}
                  role='button'
                  style={{
                    marginRight: '6px',
                  }}
                  onClick={setEditModeOnClick(question.id)}
                />
              </td>
            )}

            <td className='text-center'>
              <FontAwesomeIcon
                className={`${styles.iconStyle}`}
                icon={faTrash}
                role='button'
                tabIndex={0}
                onClick={() => onRequestDelete(question)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRequestDelete(question);
                  }
                }}
              />
            </td>
          </tr>
        );
      }}
    </Draggable>
  );
};

export default DraggableQuestionItem;

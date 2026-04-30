import { useAuth } from '@/hooks/useAuth';
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Card } from 'react-bootstrap';
import styles from './CommentCard.module.css';
import DeleteCommentModal from './DeleteCommentModal';
import EditCommentModal from './EditCommentModal';

interface CommentsProps {
  handleShowMessage: (message: string) => void;
  comment: {
    id: string;
    documentId: string;
    comment: string;
    createdAt: string;
    state: 'APPROVED' | 'PENDING' | 'REJECTED';
    user: {
      id: string;
      username: string;
    };
  };
  getComments: () => Promise<void>;
}

const CommentCard = ({ handleShowMessage, comment, getComments }: CommentsProps) => {
  const { user } = useAuth();
  const t = useTranslations('Comments');

  // State for opening and closing edit comment
  const [showEditCommentModal, setShowEditCommentModal] = useState(false);

  // Functions to handle opening and closing edit comment
  const handleCloseEditCommentModal = () => setShowEditCommentModal(false);
  const handleShowEditCommentModal = () => setShowEditCommentModal(true);

  // State for opening and closing delete comment
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);

  // Functions to handle opening and closing edit comment
  const handleCloseDeleteCommentModal = () => setShowDeleteCommentModal(false);
  const handleShowDeleteCommentModal = () => setShowDeleteCommentModal(true);

  const formattedCreatedAt = new Intl.DateTimeFormat('fi-FI', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Helsinki',
  }).format(new Date(comment.createdAt));

  const isOwner = user?.id === comment.user.id;
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const isPending = comment.state === 'PENDING';

  return (
    <>
      <Card
        className={`${styles.commentCard} ${styles[comment.state.toLowerCase()]}`}
        key={comment.id}
      >
        {(isOwner || isPrivileged) && (
          <span className={`${styles.stateBadge} ${styles[comment.state.toLowerCase()]}`}>
            {t(comment.state)}
          </span>
        )}

        <Card.Body>
          <h5>{comment.user.username}</h5>

          <p className={styles.cardTime}>
            {formattedCreatedAt}

            {((isOwner && isPending) || isPrivileged) && (
              <>
                <FontAwesomeIcon
                  icon={faPen}
                  className={styles.cardIcon}
                  onClick={handleShowEditCommentModal}
                />
                <FontAwesomeIcon
                  icon={faTrash}
                  className={styles.cardIcon}
                  onClick={handleShowDeleteCommentModal}
                />
              </>
            )}
          </p>

          <Card.Text>{comment.comment}</Card.Text>
        </Card.Body>
      </Card>

      {showEditCommentModal && <div className={styles.overlay} />}
      {showDeleteCommentModal && <div className={styles.overlay} />}

      <EditCommentModal
        showEditCommentModal={showEditCommentModal}
        handleCloseEditCommentModal={handleCloseEditCommentModal}
        handleShowMessage={handleShowMessage}
        comment={comment}
        user={user}
        getComments={getComments}
      />
      <DeleteCommentModal
        showDeleteCommentModal={showDeleteCommentModal}
        handleCloseDeleteCommentModal={handleCloseDeleteCommentModal}
        handleShowMessage={handleShowMessage}
        comment={comment}
        getComments={getComments}
      />
    </>
  );
};

export default CommentCard;

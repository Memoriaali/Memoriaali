import styles from './ContentHeader.module.css';

interface ContentHeaderProps {
  headerText: string;
}

const UsersFiles = ({ headerText }: ContentHeaderProps) => {
  return <h2 className={styles.contentHeader}>{headerText}</h2>;
};

export default UsersFiles;

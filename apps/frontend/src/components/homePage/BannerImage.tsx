import { Image as RBImage } from 'react-bootstrap';
import bannerImage from '../../image/homepage/banner.jpg';

import styles from './BannerImage.module.css';

const BannerImage: React.FC = () => {
  return <RBImage src={bannerImage.src} className={styles.bannerImage} alt='banner image' fluid />;
};

export default BannerImage;

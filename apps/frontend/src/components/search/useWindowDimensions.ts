'use client';
import { useEffect, useState } from 'react';

interface WindowDimensions {
  width: number;
  height: number;
}

export default function useWindowDimensions(): WindowDimensions {
  const [windowDimensions, setWindowDimensions] = useState<WindowDimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function getWindowDimensions() {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }

    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    // Set initial dimensions after mount
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}

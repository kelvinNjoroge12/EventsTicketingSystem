import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const useScrollTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant'  // instant for route changes; smooth is only for in-page anchors
    });
  }, [pathname]);

  return null;
};

export default useScrollTop;

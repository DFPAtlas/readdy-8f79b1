import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets the window scroll position to the top whenever the route (pathname)
 * changes. React Router does not do this by default, which caused pages such
 * as /pricing to open at the previous page's scroll offset. Hash-only changes
 * (e.g. in-page anchors like #features) are intentionally ignored so smooth
 * anchor scrolling keeps working.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
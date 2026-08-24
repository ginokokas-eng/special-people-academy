import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop - Scrolls to top on route changes, respects hash links
 * Place inside BrowserRouter to access location
 */
export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // If the URL has a hash, try to scroll to that element. The fragment is
      // not always a selector (e.g. the /sso callback carries key=value pairs
      // in the fragment), so guard against querySelector throwing.
      let element: Element | null = null;
      try {
        element = document.querySelector(hash);
      } catch {
        element = null;
      }
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      // Otherwise scroll to top
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);


  return null;
};


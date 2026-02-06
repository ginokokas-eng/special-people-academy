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
      // If URL has a hash, scroll to that element
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Otherwise scroll to top
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
};


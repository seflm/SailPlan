import { useState, useEffect } from 'react';

/**
 * Hook pro detekci media query
 * @param {string} query - CSS media query string (např. '(max-width: 768px)')
 * @returns {boolean} - true pokud media query odpovídá
 */
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event) => {
      setMatches(event.matches);
    };

    // Nastavit počáteční hodnotu
    setMatches(mediaQueryList.matches);

    // Přidat listener
    mediaQueryList.addEventListener('change', handleChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;


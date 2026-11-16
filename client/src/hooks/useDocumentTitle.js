import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · Nexora` : 'Nexora — IT Operations Suite';
    return () => {
      document.title = previous;
    };
  }, [title]);
}

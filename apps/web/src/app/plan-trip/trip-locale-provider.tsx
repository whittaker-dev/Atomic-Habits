'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import i18n from '@/i18n/client';

export function TripLocaleProvider({ children }: { children: React.ReactNode }) {
  const entryLang = useRef(i18n.language);
  const [ready, setReady] = useState(i18n.language === 'vi');

  useLayoutEffect(() => {
    entryLang.current = i18n.language;

    if (i18n.language === 'vi') {
      setReady(true);
      return () => {
        void i18n.changeLanguage(entryLang.current);
      };
    }

    void i18n.changeLanguage('vi').then(() => setReady(true));

    return () => {
      void i18n.changeLanguage(entryLang.current);
    };
  }, []);

  if (!ready) {
    return <div className="min-h-screen bg-canvas" aria-hidden />;
  }

  return <>{children}</>;
}

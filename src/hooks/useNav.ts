import { createContext, useContext } from 'react';
import type { Screen } from '../types/memorial';

export interface Nav {
  screen: Screen;
  go: (s: Screen) => void;
  /** Перейти на главный экран и прокрутить к якорю */
  goHome: (anchor?: 'top' | 'pages') => void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav вне NavContext');
  return ctx;
}

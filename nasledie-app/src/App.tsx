import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { NavContext, type Nav } from './hooks/useNav';
import { toastOptions } from './hooks/useToast';
import { Editor } from './screens/Editor';
import { Hero } from './screens/Hero';
import { MemorialsList } from './screens/MemorialsList';
import { QRStudio } from './screens/QRStudio';
import { Settings } from './screens/Settings';
import { Viewer } from './screens/Viewer';
import type { Screen } from './types/memorial';

function screenKey(s: Screen): string {
  return 'id' in s ? `${s.name}:${s.id ?? 'new'}` : s.name;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const pendingAnchor = useRef<'top' | 'pages' | null>(null);

  const go = useCallback((s: Screen) => {
    pendingAnchor.current = 'top';
    setScreen(s);
  }, []);

  const goHome = useCallback(
    (anchor: 'top' | 'pages' = 'top') => {
      if (screen.name === 'home') {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      pendingAnchor.current = anchor;
      setScreen({ name: 'home' });
    },
    [screen.name],
  );

  const nav = useMemo<Nav>(() => ({ screen, go, goHome }), [screen, go, goHome]);

  // прокрутка после смены экрана (когда новый экран смонтирован)
  const onEntered = () => {
    const a = pendingAnchor.current;
    pendingAnchor.current = null;
    if (a === 'pages') document.getElementById('pages')?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (pendingAnchor.current) window.scrollTo({ top: 0 });
  }, [screen]);

  return (
    <NavContext.Provider value={nav}>
      <Navbar />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={screenKey(screen)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          onAnimationComplete={onEntered}
        >
          <ErrorBoundary>
            {screen.name === 'home' && (
              <>
                <Hero />
                <MemorialsList />
                <footer className="border-t border-line/60 py-10 text-center text-sm text-muted">
                  © {new Date().getFullYear()} <span className="font-serif text-gold-light">Наследие</span> · Память не умирает
                </footer>
              </>
            )}
            {screen.name === 'editor' && <Editor id={screen.id} />}
            {screen.name === 'viewer' && <Viewer id={screen.id} from={screen.from} />}
            {screen.name === 'qr' && <QRStudio id={screen.id} />}
            {screen.name === 'settings' && <Settings />}
          </ErrorBoundary>
        </motion.main>
      </AnimatePresence>
      <Toaster position="bottom-center" toastOptions={toastOptions} containerStyle={{ bottom: 90 }} />
    </NavContext.Provider>
  );
}

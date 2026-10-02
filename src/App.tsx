import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { NavContext, type Nav } from './hooks/useNav';
import { toastOptions } from './hooks/useToast';
import { SLOGAN_TEXT } from './lib/brand';
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

/** #/m/<id> — прямая ссылка на страницу памяти (её кодирует QR) */
const PAGE_HASH = /^#\/m\/([^/?#]+)/;

/** Сайт открыли по QR или прямой ссылкой — показываем страницу памяти посетителю */
function screenFromHash(): Screen {
  const m = PAGE_HASH.exec(location.hash);
  return m ? { name: 'viewer', id: decodeURIComponent(m[1]), visitor: true } : { name: 'home' };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(screenFromHash);
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

  // в адресной строке — ссылка на открытую страницу памяти, её можно скопировать и отправить
  useEffect(() => {
    const hash = screen.name === 'viewer' ? `#/m/${encodeURIComponent(screen.id)}` : '';
    if (location.hash === hash || (!hash && !PAGE_HASH.test(location.hash))) return;
    try {
      history.replaceState(history.state, '', hash || location.pathname + location.search);
    } catch {
      // песочница (iframe предпросмотра) может запрещать менять адрес
    }
  }, [screen]);

  // ссылку вставили в адресную строку уже открытого сайта: посетитель так и остаётся посетителем,
  // а в работе с сайтом служебные кнопки остаются на месте
  useEffect(() => {
    const onHash = () => {
      const next = screenFromHash();
      setScreen((cur) => {
        if (next.name === 'viewer')
          return screenKey(cur) === screenKey(next) ? cur : { ...next, visitor: cur.name === 'viewer' && !!cur.visitor };
        return cur.name === 'viewer' ? next : cur;
      });
      pendingAnchor.current = 'top';
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

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
                  © {new Date().getFullYear()} <span className="font-serif text-gold-light">Наследие</span> · {SLOGAN_TEXT}
                </footer>
              </>
            )}
            {screen.name === 'editor' && <Editor id={screen.id} />}
            {screen.name === 'viewer' && <Viewer id={screen.id} from={screen.from} visitor={screen.visitor} />}
            {screen.name === 'qr' && <QRStudio id={screen.id} />}
            {screen.name === 'settings' && <Settings />}
          </ErrorBoundary>
        </motion.main>
      </AnimatePresence>
      <Toaster position="bottom-center" toastOptions={toastOptions} containerStyle={{ bottom: 90 }} />
    </NavContext.Provider>
  );
}

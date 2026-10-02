import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, Menu, Plus, QrCode, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNav } from '../hooks/useNav';
import { Button } from './Button';

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="group flex items-center gap-2.5" aria-label="Наследие — на главную">
      <svg viewBox="0 0 64 64" className="h-9 w-9 transition-transform duration-500 group-hover:rotate-[8deg]">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E6C893" />
            <stop offset="1" stopColor="#B8925A" />
          </linearGradient>
        </defs>
        <path d="M20 52V22a12 12 0 0 1 24 0v30z" fill="none" stroke="url(#lg)" strokeWidth="3.5" />
        <path d="M32 18v14M26 24h12M14 52h36" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <span className="font-serif text-[26px] font-bold leading-none tracking-wide text-gold-gradient sm:text-[32px]">Наследие</span>
    </button>
  );
}

export function Navbar() {
  const { screen, go, goHome } = useNav();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [screen]);

  // посетителю по QR — только логотип, без меню сайта
  const visitor = screen.name === 'viewer' && !!screen.visitor;

  const links = [
    { label: 'Мои страницы', icon: LayoutGrid, active: screen.name === 'home', onClick: () => goHome('pages') },
    { label: 'QR-студия', icon: QrCode, active: screen.name === 'qr', onClick: () => go({ name: 'qr', id: null }) },
    { label: 'Настройки', icon: Settings, active: screen.name === 'settings', onClick: () => go({ name: 'settings' }) },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || screen.name !== 'home' ? 'glass border-x-0 border-t-0 shadow-deep' : 'border-b border-transparent'
      }`}
    >
      <nav className="container-page flex h-16 items-center justify-between sm:h-20">
        <Logo onClick={() => goHome('top')} />

        {!visitor && (
          <>
            <div className="hidden items-center gap-1 md:flex">
              {links.map((l) => (
                <button
                  key={l.label}
                  onClick={l.onClick}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[15px] transition ${
                    l.active ? 'text-gold-light' : 'text-muted hover:text-white'
                  }`}
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </button>
              ))}
              <Button variant="gold" size="sm" icon={Plus} className="ml-3" onClick={() => go({ name: 'editor', id: null })}>
                Создать
              </Button>
            </div>

            <button className="rounded-lg p-2 text-white md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Меню">
              {open ? <X /> : <Menu />}
            </button>
          </>
        )}
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line/60 md:hidden"
          >
            <div className="container-page flex flex-col gap-1 py-4">
              {links.map((l) => (
                <button
                  key={l.label}
                  onClick={l.onClick}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left ${l.active ? 'bg-white/5 text-gold-light' : 'text-white'}`}
                >
                  <l.icon className="h-5 w-5" /> {l.label}
                </button>
              ))}
              <Button variant="gold" icon={Plus} className="mt-2" onClick={() => go({ name: 'editor', id: null })}>
                Создать страницу
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

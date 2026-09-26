import Link from 'next/link';
import { cafe } from '@/lib/content';

const navLinks = [
  { href: '#kitchen', label: 'Меню' },
  { href: '#bar', label: 'Бар' },
  { href: '#lunch', label: 'Обеды' },
  { href: '#delivery', label: 'Доставка' },
  { href: '#contacts', label: 'Контакты' },
  { href: '#booking', label: 'Бронь столика' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
        <Link href="#top" className="font-display text-2xl font-bold tracking-tight">
          {cafe.name}
        </Link>

        <nav className="hidden gap-8 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-teal">
              {link.label}
            </a>
          ))}
        </nav>

        <a href={cafe.phoneHref} className="btn-outline hidden sm:inline-flex">
          {cafe.phone}
        </a>
      </div>
    </header>
  );
}

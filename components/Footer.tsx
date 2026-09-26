import { cafe } from '@/lib/content';

export function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-cream-dark/40 py-10 text-center">
      <p className="mx-auto max-w-xl font-display text-lg italic text-ink-soft">
        «{cafe.name}» — место, где тесто становится вкусом, а зайти на обед — доброй семейной
        традицией.
      </p>
      <p className="mt-4 text-xs text-ink-soft/70">
        © {new Date().getFullYear()} {cafe.name}, {cafe.city}
      </p>
    </footer>
  );
}

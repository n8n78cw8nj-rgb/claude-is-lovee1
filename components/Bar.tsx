import { barHighlights } from '@/lib/content';

export function Bar() {
  return (
    <section id="bar" className="section pt-0">
      <div className="text-center">
        <p className="eyebrow">Барная карта</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Найдётся, чем запить</h2>
        <p className="mx-auto mt-4 max-w-2xl text-ink-soft">
          Полную барную карту с ценами смотрите в зале — здесь только то, что стоит попробовать.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {barHighlights.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border-t-[3px] border-t-gold bg-cream-light p-5"
          >
            <h4 className="font-display text-lg font-bold">{item.title}</h4>
            <p className="mt-1 text-sm text-ink-soft">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

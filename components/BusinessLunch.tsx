import { lunchIncludes } from '@/lib/content';

export function BusinessLunch() {
  return (
    <section id="lunch" className="bg-ink py-16 text-cream sm:py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/60">
              По-домашнему
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">🥗 Комплексные обеды</h2>
            <p className="mt-4 text-cream/80">
              Загляните к нам в обеденный перерыв! Мы приготовили сытные сбалансированные сеты по
              отличной цене — идеальный выбор для сотрудников офисов и всех, кто ценит своё время и
              качественную еду.
            </p>
          </div>

          <ul className="space-y-3">
            {lunchIncludes.map((item) => (
              <li key={item} className="flex items-start gap-3 text-cream/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brick" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

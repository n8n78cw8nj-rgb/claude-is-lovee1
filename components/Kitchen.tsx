import Image from 'next/image';
import { khinkaliTypes, menuItems } from '@/lib/content';

export function Kitchen() {
  return (
    <section id="kitchen" className="section">
      <div className="text-center">
        <p className="eyebrow">Наша кухня</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          Лепка вручную и щедрость по-домашнему
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-ink-soft">
          Мы не экономим на начинке и не торопим процессы в ущерб вкусу. Главное для нас — чтобы вы
          ушли сытыми, довольными и обязательно вернулись.
        </p>
      </div>

      <div className="mt-14">
        <h3 className="text-center text-2xl font-bold">🥟 Хинкали — наша главная гордость</h3>
        <p className="mx-auto mt-3 max-w-xl text-center text-ink-soft">
          Каждый хинкаль мы лепим вручную, сохраняя традиционную форму и баланс специй.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {khinkaliTypes.map((item) => (
            <div key={item.title} className="rounded-2xl border border-ink/10 bg-cream-light p-6">
              <h4 className="font-display text-xl font-bold">{item.title}</h4>
              <p className="mt-2 text-sm text-ink-soft">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <h3 className="text-center text-2xl font-bold">И не только хинкали</h3>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {menuItems.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-5 rounded-2xl border border-ink/10 bg-cream-light p-5"
            >
              {item.image && (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                  <Image src={item.image} alt={item.title} fill className="object-cover" />
                </div>
              )}
              <div>
                <h4 className="font-display text-lg font-bold">{item.title}</h4>
                <p className="mt-1 text-sm text-ink-soft">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

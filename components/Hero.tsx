import { cafe } from '@/lib/content';

export function Hero() {
  return (
    <section id="top" className="section pb-12 pt-16 text-center sm:pt-24">
      <p className="eyebrow">Семейное кафе в {cafe.city}е</p>

      <h1 className="mx-auto mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
        {cafe.name}
      </h1>

      <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
        Вкус, который объединяет. Тесто, которое говорит за себя.
      </p>

      <p className="mx-auto mt-6 max-w-2xl text-base text-ink-soft">
        Добро пожаловать в «{cafe.name}» — уютное кафе в самом сердце {cafe.city}а, где готовят с
        душой, а порции подают по-настоящему щедрые. Здесь не бывает быстрых «перекусов на ходу» —
        каждый визит превращается в душевный семейный обед или ужин.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a href="#kitchen" className="btn-primary">
          Посмотреть меню
        </a>
        <a href={cafe.phoneHref} className="btn-outline">
          Заказать доставку
        </a>
      </div>
    </section>
  );
}

import { cafe } from '@/lib/content';

export function Contacts() {
  const mapSrc = `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(cafe.address)}`;

  return (
    <section id="contacts" className="section">
      <div className="text-center">
        <p className="eyebrow">Контакты и режим работы</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Ждём вас в гости</h2>
      </div>

      <div className="mt-12 grid gap-10 sm:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-ink/10">
          <iframe
            src={mapSrc}
            title="Карта — ПРОTESTO"
            className="h-80 w-full sm:h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="eyebrow">Адрес</h3>
            <p className="mt-1 text-lg">📍 {cafe.address}</p>
          </div>

          <div>
            <h3 className="eyebrow">Телефон / Заказ</h3>
            <a href={cafe.phoneHref} className="mt-1 block text-lg hover:text-teal">
              📞 {cafe.phone}
            </a>
          </div>

          <div>
            <h3 className="eyebrow">Мы ВКонтакте</h3>
            <a
              href={cafe.vkHref}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-lg hover:text-teal"
            >
              🌐 {cafe.vkHandle}
            </a>
          </div>

          <div>
            <h3 className="eyebrow">Режим работы</h3>
            <ul className="mt-1 space-y-1 text-lg">
              {cafe.hours.map((row) => (
                <li key={row.days}>
                  🕒 {row.days}: {row.time}
                </li>
              ))}
            </ul>
          </div>

          <p className="border-t border-ink/10 pt-6 text-sm text-ink-soft">
            👋 Владелец кафе — {cafe.owner}: лично следит за качеством каждого блюда, соблюдением
            рецептур и всегда рад заглянуть к гостям, чтобы узнать их впечатления.
          </p>
        </div>
      </div>
    </section>
  );
}

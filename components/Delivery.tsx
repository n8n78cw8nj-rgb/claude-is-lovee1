import Image from 'next/image';
import { cafe } from '@/lib/content';

export function Delivery() {
  return (
    <section id="delivery" className="section">
      <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
        <div className="relative order-2 aspect-[4/3] overflow-hidden rounded-2xl sm:order-1">
          <Image
            src="/images/dostavka.webp"
            alt="Салаты, упакованные для доставки"
            fill
            className="object-cover"
            sizes="(min-width: 640px) 50vw, 100vw"
          />
        </div>

        <div className="order-1 sm:order-2">
          <p className="eyebrow">🚗 Быстрая доставка</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">По всему {cafe.city}у</h2>
          <p className="mt-4 text-ink-soft">
            Оставайтесь дома или продолжайте работу — мы привезём горячую еду прямо к вашей двери.
            Доставляем аккуратно и быстро в термосумках: ваши хинкали, хачапури и обеды приедут
            такими же свежими, будто их только что подали к вашему столику.
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            <span className="font-semibold text-ink">Зона доставки:</span>{' '}
            {cafe.deliveryAreas.join(', ')}
          </p>
          <a href={cafe.phoneHref} className="btn-primary mt-6 inline-flex">
            Оформить доставку онлайн
          </a>
        </div>
      </div>
    </section>
  );
}

import Image from 'next/image';

const interiorPhotos = [
  { src: '/images/bar-counter.webp', alt: 'Барная стойка и меню на доске в кафе «ПРОTESTO»' },
  { src: '/images/cozy-corner.webp', alt: 'Уютный уголок с декором и диванчиками' },
  { src: '/images/entrance-hall.webp', alt: 'Вход и зал кафе' },
];

export function Atmosphere() {
  return (
    <section className="section pt-0">
      <div className="text-center">
        <p className="eyebrow">Атмосфера</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Уютно, как дома</h2>
        <p className="mx-auto mt-4 max-w-2xl text-ink-soft">
          Тёплый свет, дерево и зелёные стены — место, где хочется задержаться подольше.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {interiorPhotos.map((photo) => (
          <div key={photo.src} className="relative aspect-[4/5] overflow-hidden rounded-2xl">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover"
              sizes="(min-width: 640px) 33vw, 100vw"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

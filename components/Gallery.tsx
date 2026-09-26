import Image from 'next/image';
import { galleryImages } from '@/lib/content';

export function Gallery() {
  return (
    <section className="section pt-0">
      <div className="grid gap-4 sm:grid-cols-3">
        {galleryImages.map((image) => (
          <div key={image.src} className="relative aspect-[4/5] overflow-hidden rounded-2xl">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
              sizes="(min-width: 640px) 33vw, 100vw"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

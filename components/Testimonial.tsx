import { testimonial } from '@/lib/content';

export function Testimonial() {
  return (
    <section className="section py-14 sm:py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-gold/30 bg-cream-light px-8 py-10 text-center">
        <p className="font-display text-2xl italic leading-snug sm:text-3xl">
          «{testimonial.quote}»
        </p>
        <p className="mt-5 eyebrow">{testimonial.source}</p>
      </div>
    </section>
  );
}

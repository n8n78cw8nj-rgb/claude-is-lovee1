import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Kitchen } from '@/components/Kitchen';
import { Gallery } from '@/components/Gallery';
import { Testimonial } from '@/components/Testimonial';
import { BusinessLunch } from '@/components/BusinessLunch';
import { Delivery } from '@/components/Delivery';
import { Contacts } from '@/components/Contacts';
import { BookingForm } from '@/components/BookingForm';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Kitchen />
        <Gallery />
        <Testimonial />
        <BusinessLunch />
        <Delivery />
        <Contacts />
        <BookingForm />
      </main>
      <Footer />
    </>
  );
}

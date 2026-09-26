import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Atmosphere } from '@/components/Atmosphere';
import { Kitchen } from '@/components/Kitchen';
import { Bar } from '@/components/Bar';
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
        <Atmosphere />
        <Kitchen />
        <Bar />
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

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingSchema, type BookingInput } from '@/lib/booking-schema';
import { submitBooking } from '@/lib/booking-actions';

const inputClass =
  'w-full rounded-xl border border-ink/15 bg-cream-light px-4 py-3 text-ink placeholder:text-ink-soft/60 focus:border-teal focus:outline-none';

export function BookingForm() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { guests: 2 },
  });

  async function onSubmit(data: BookingInput) {
    const result = await submitBooking(data);
    if (result.ok) {
      setStatus('success');
      reset();
    } else {
      setStatus('error');
    }
  }

  return (
    <section id="booking" className="section">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow">Столик ждёт</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Забронировать столик</h2>
        <p className="mt-4 text-ink-soft">
          Оставьте заявку — мы перезвоним и подтвердим бронь. Для срочных вопросов звоните по
          телефону в контактах.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto mt-10 grid max-w-xl gap-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <input
            {...register('name')}
            placeholder="Ваше имя"
            className={inputClass}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="mt-1 text-sm text-red-700">{errors.name.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <input
            {...register('phone')}
            type="tel"
            placeholder="Телефон"
            className={inputClass}
            aria-invalid={!!errors.phone}
          />
          {errors.phone && <p className="mt-1 text-sm text-red-700">{errors.phone.message}</p>}
        </div>

        <div>
          <input
            {...register('date')}
            type="date"
            className={inputClass}
            aria-invalid={!!errors.date}
          />
          {errors.date && <p className="mt-1 text-sm text-red-700">{errors.date.message}</p>}
        </div>

        <div>
          <input
            {...register('time')}
            type="time"
            className={inputClass}
            aria-invalid={!!errors.time}
          />
          {errors.time && <p className="mt-1 text-sm text-red-700">{errors.time.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <input
            {...register('guests')}
            type="number"
            min={1}
            max={20}
            placeholder="Количество гостей"
            className={inputClass}
            aria-invalid={!!errors.guests}
          />
          {errors.guests && <p className="mt-1 text-sm text-red-700">{errors.guests.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <textarea
            {...register('comment')}
            placeholder="Комментарий (необязательно)"
            rows={3}
            className={inputClass}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary sm:col-span-2">
          {isSubmitting ? 'Отправляем…' : 'Отправить заявку'}
        </button>

        {status === 'success' && (
          <p className="text-center text-sm text-forest sm:col-span-2">
            Заявка отправлена! Мы скоро свяжемся с вами.
          </p>
        )}
        {status === 'error' && (
          <p className="text-center text-sm text-red-700 sm:col-span-2">
            Не получилось отправить заявку. Позвоните нам напрямую — контакты ниже.
          </p>
        )}
      </form>
    </section>
  );
}

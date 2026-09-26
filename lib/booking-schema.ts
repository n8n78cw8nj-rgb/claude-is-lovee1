import { z } from 'zod';

export const bookingSchema = z.object({
  name: z.string().trim().min(2, 'Введите имя').max(80),
  phone: z.string().trim().min(10, 'Введите телефон целиком').max(20),
  date: z.string().min(1, 'Выберите дату'),
  time: z.string().min(1, 'Выберите время'),
  guests: z.coerce.number().int().min(1, 'Минимум 1 гость').max(20, 'Максимум 20 гостей'),
  comment: z.string().max(500).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

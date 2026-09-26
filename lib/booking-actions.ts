'use server';

import 'server-only';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { bookingSchema, type BookingInput } from '@/lib/booking-schema';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'bookings.json');

export type BookingResult = { ok: true } | { ok: false; error: string };

export async function submitBooking(input: BookingInput): Promise<BookingResult> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Проверьте данные формы' };
  }

  await mkdir(DATA_DIR, { recursive: true });

  let bookings: unknown[] = [];
  try {
    bookings = JSON.parse(await readFile(DATA_FILE, 'utf-8'));
  } catch {
    bookings = [];
  }

  bookings.push({ id: randomUUID(), createdAt: new Date().toISOString(), ...parsed.data });
  await writeFile(DATA_FILE, JSON.stringify(bookings, null, 2), 'utf-8');

  return { ok: true };
}

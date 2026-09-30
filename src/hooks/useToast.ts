import toast from 'react-hot-toast';
import { StorageFullError } from '../lib/storage';
import { MediaError } from '../lib/media';

export const toastOptions = {
  duration: 3500,
  style: {
    background: '#1A1F2E',
    color: '#fff',
    border: '1px solid #3A4050',
    borderRadius: '14px',
    fontFamily: 'Inter, system-ui, sans-serif',
    boxShadow: '0 20px 60px -15px rgba(0,0,0,0.7)',
  },
  success: { iconTheme: { primary: '#4CAF50', secondary: '#1A1F2E' } },
  error: { iconTheme: { primary: '#E05252', secondary: '#1A1F2E' }, duration: 6000 },
};

export function notifyError(e: unknown, fallback = 'Что-то пошло не так') {
  if (e instanceof StorageFullError) {
    toast.error('Хранилище браузера заполнено. Откройте «Настройки» → «Экспорт всех данных», сохраните ZIP и освободите место.', {
      duration: 10000,
    });
  } else if (e instanceof MediaError) {
    toast.error(e.message);
  } else {
    console.error(e);
    toast.error(e instanceof Error && e.message ? `${fallback}: ${e.message}` : fallback);
  }
}

export function useToast() {
  return {
    success: (msg: string) => toast.success(msg),
    error: notifyError,
    info: (msg: string) => toast(msg),
    loading: (msg: string) => toast.loading(msg),
    dismiss: (id?: string) => toast.dismiss(id),
    update: (id: string, msg: string) => toast.loading(msg, { id }),
  };
}

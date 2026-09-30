export interface TimelineEvent {
  year: string;
  title: string;
  text: string;
}

export interface Word {
  text: string;
  author: string;
  relation: string;
}

export interface Contacts {
  email: string;
  phone: string;
  /** Показывать контакты посетителям страницы */
  visible: boolean;
}

export interface Memorial {
  id: string;
  fullName: string;
  birthDate: string;
  deathDate: string;
  birthPlace: string;
  deathPlace: string;
  epitaph: string;
  biography: string;
  portraitId: string | null;
  timeline: TimelineEvent[];
  galleryIds: string[];
  videoIds: string[];
  animatedVideoId: string | null;
  audioIds: string[];
  words: Word[];
  contacts: Contacts;
  /** Символ на QR-карточке: крест, звезда или без символа */
  symbol: 'cross' | 'star' | 'none';
  qrUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type MediaKind = 'image' | 'video' | 'audio';

/** Запись в IndexedDB: исходный файл + миниатюра */
export interface MediaRecord {
  id: string;
  kind: MediaKind;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
  thumb: Blob | null;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: string;
}

export type MediaMeta = Omit<MediaRecord, 'blob' | 'thumb'>;

export type Screen =
  | { name: 'home' }
  | { name: 'editor'; id: string | null }
  | { name: 'viewer'; id: string; from?: 'home' | 'editor' }
  | { name: 'qr'; id: string | null }
  | { name: 'settings' };

export interface AppSettings {
  /** Базовый адрес публикации. QR ведёт на `${baseUrl}${id}` */
  baseUrl: string;
  siteLabel: string;
}

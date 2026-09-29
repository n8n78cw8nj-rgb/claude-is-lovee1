import { motion } from 'framer-motion';
import {
  AudioLines,
  BookHeart,
  Database,
  Download,
  Eraser,
  HardDrive,
  Image,
  Info,
  Link2,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Wand2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ConfirmModal, Modal } from '../components/Modal';
import { useMemorials } from '../hooks/useMemorials';
import { useStats } from '../hooks/useStorage';
import { notifyError } from '../hooks/useToast';
import { exportAll } from '../lib/export';
import { importZip } from '../lib/import';
import { buildQrUrl, clearAll, collectGarbage, getSettings, saveMemorials, saveSettings } from '../lib/storage';
import { formatBytes } from '../lib/utils';
import { exportWithToast, useDemoSeeder } from './MemorialsList';

const VERSION = '1.0.0';

function Panel({ icon: Icon, title, children, delay = 0 }: { icon: typeof Info; title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="card p-5 sm:p-6"
    >
      <h3 className="mb-4 flex items-center gap-3 text-xl font-bold">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Icon className="h-5 w-5" />
        </span>
        {title}
      </h3>
      {children}
    </motion.section>
  );
}

export function Settings() {
  const { memorials } = useMemorials();
  const [refresh, setRefresh] = useState(0);
  const stats = useStats(refresh);
  const demo = useDemoSeeder();

  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [pageId, setPageId] = useState('');
  const [settings, setSettings] = useState(getSettings);
  const fileRef = useRef<HTMLInputElement>(null);

  const usagePct = stats?.usage != null && stats.quota ? Math.min(100, (stats.usage / stats.quota) * 100) : null;

  const onExportAll = async () => {
    setExporting(true);
    const t = toast.loading('Готовим резервную копию…');
    try {
      await exportAll((p, label) => toast.loading(`${label} — ${p}%`, { id: t }));
      toast.success('Резервная копия скачана', { id: t });
    } catch (e) {
      toast.dismiss(t);
      notifyError(e, 'Ошибка экспорта');
    } finally {
      setExporting(false);
    }
  };

  const onImport = async (mode: 'replace' | 'copy') => {
    if (!importFile) return;
    setImporting(true);
    const t = toast.loading('Импорт…');
    try {
      const r = await importZip(importFile, mode, (p, label) => toast.loading(`${label} — ${p}%`, { id: t }));
      toast.success(`Импортировано страниц: ${r.memorials}, медиа: ${r.media}${r.replaced ? `, обновлено: ${r.replaced}` : ''}`, { id: t });
      setRefresh((x) => x + 1);
    } catch (e) {
      toast.dismiss(t);
      notifyError(e, 'Ошибка импорта');
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  };

  const onSaveSettings = () => {
    saveSettings(settings);
    toast.success('Настройки сохранены');
  };

  const regenerateUrls = () => {
    saveSettings(settings);
    saveMemorials(memorials.map((m) => ({ ...m, qrUrl: buildQrUrl(m.id, settings) })));
    toast.success('Ссылки QR обновлены для всех страниц');
  };

  const tiles = [
    { icon: BookHeart, label: 'Страниц', value: stats?.pages },
    { icon: Image, label: 'Фото', value: stats?.photos },
    { icon: Video, label: 'Видео', value: stats?.videos },
    { icon: Sparkles, label: 'Оживлений', value: stats?.animated },
    { icon: AudioLines, label: 'Аудио', value: stats?.audio },
    { icon: HardDrive, label: 'Объём медиа', value: stats ? formatBytes(stats.bytes) : undefined },
  ];

  return (
    <div className="container-page pb-20 pt-24 sm:pt-28">
      <h1 className="text-4xl font-bold sm:text-5xl">Настройки</h1>
      <p className="mt-3 text-muted">Все данные хранятся только в этом браузере. Регулярно делайте резервную копию в ZIP.</p>

      {/* статистика */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-5"
          >
            <t.icon className="h-5 w-5 text-gold" />
            <div className="mt-3 font-serif text-3xl font-bold">{t.value ?? '…'}</div>
            <div className="text-sm text-muted">{t.label}</div>
          </motion.div>
        ))}
      </div>

      {usagePct !== null && (
        <div className="card mt-3 p-5">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Хранилище браузера</span>
            <span>
              {formatBytes(stats!.usage!)} из {formatBytes(stats!.quota!)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-field">
            <div
              className={`h-full rounded-full ${usagePct > 85 ? 'bg-danger' : 'bg-gradient-to-r from-gold to-gold-light'}`}
              style={{ width: `${Math.max(1, usagePct)}%` }}
            />
          </div>
          {usagePct > 85 && (
            <p className="mt-2 text-sm text-danger">Место почти закончилось. Экспортируйте данные в ZIP и удалите ненужные страницы.</p>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel icon={Download} title="Экспорт">
          <p className="mb-4 text-sm text-muted">Полная резервная копия: все страницы, фото, видео и аудио в одном ZIP.</p>
          <Button variant="gold" icon={Download} loading={exporting} disabled={!memorials.length} onClick={onExportAll}>
            Экспорт всех данных
          </Button>
          <div className="mt-6 border-t border-line/60 pt-5">
            <p className="mb-3 text-sm text-muted">Одна страница: готовый HTML (открывается на любом компьютере) + медиа + QR.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select className="field" value={pageId} onChange={(e) => setPageId(e.target.value)}>
                <option value="">Выберите страницу…</option>
                {memorials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
              <Button
                icon={Download}
                disabled={!pageId}
                onClick={() => {
                  const m = memorials.find((x) => x.id === pageId);
                  if (m) void exportWithToast(m);
                }}
              >
                ZIP
              </Button>
            </div>
          </div>
        </Panel>

        <Panel icon={Upload} title="Импорт" delay={0.05}>
          <p className="mb-4 text-sm text-muted">Восстановление из ZIP, созданного «Наследием» (резервная копия или одна страница).</p>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              setImportFile(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          <Button variant="gold" icon={Upload} loading={importing} onClick={() => fileRef.current?.click()}>
            Импорт из ZIP
          </Button>
        </Panel>

        <Panel icon={Link2} title="Адрес QR-кодов" delay={0.1}>
          <p className="mb-4 text-sm text-muted">
            QR ведёт на <code className="text-gold-light">адрес + id страницы</code>. Укажите домен, где будут опубликованы страницы.
          </p>
          <div className="grid gap-3">
            <Input label="Базовый адрес" value={settings.baseUrl} onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })} />
            <Input label="Подпись на табличке" value={settings.siteLabel} onChange={(e) => setSettings({ ...settings, siteLabel: e.target.value })} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="gold" size="sm" onClick={onSaveSettings}>
              Сохранить
            </Button>
            <Button size="sm" disabled={!memorials.length} onClick={regenerateUrls}>
              Применить ко всем страницам
            </Button>
          </div>
        </Panel>

        <Panel icon={Database} title="Данные" delay={0.15}>
          <div className="grid gap-3">
            <Button icon={Wand2} loading={demo.busy} onClick={async () => { await demo.run(); setRefresh((x) => x + 1); }}>
              Добавить 10 демо-страниц
            </Button>
            <Button
              icon={Eraser}
              onClick={async () => {
                const n = await collectGarbage();
                toast.success(n ? `Удалено неиспользуемых файлов: ${n}` : 'Лишних файлов нет');
                setRefresh((x) => x + 1);
              }}
            >
              Очистить неиспользуемые файлы{stats?.orphans ? ` (${stats.orphans})` : ''}
            </Button>
            <Button variant="danger" icon={Trash2} disabled={!memorials.length && !stats?.bytes} onClick={() => setConfirmClear(true)}>
              Очистить всё
            </Button>
          </div>
        </Panel>

        <Panel icon={Info} title="О программе" delay={0.2}>
          <div className="space-y-2 text-sm text-muted">
            <p>
              <span className="font-serif text-lg text-gold-light">Наследие</span> · версия {VERSION}
            </p>
            <p>Цифровая экосистема сохранения памяти. Работает без сервера и интернета после первой загрузки.</p>
            <p>Метаданные — LocalStorage, медиа — IndexedDB. QR — уровень коррекции H.</p>
            <p>
              Оживление фото:{' '}
              <a className="text-gold-light hover:underline" href="https://klingai.com" target="_blank" rel="noreferrer">Kling AI</a>,{' '}
              <a className="text-gold-light hover:underline" href="https://www.d-id.com" target="_blank" rel="noreferrer">D-ID</a>,{' '}
              <a className="text-gold-light hover:underline" href="https://www.heygen.com" target="_blank" rel="noreferrer">HeyGen</a>
            </p>
          </div>
        </Panel>
      </div>

      <Modal
        open={!!importFile}
        onClose={() => !importing && setImportFile(null)}
        title="Импорт из ZIP"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => onImport('copy')} disabled={importing}>
              Добавить как копии
            </Button>
            <Button variant="gold" loading={importing} onClick={() => onImport('replace')}>
              Восстановить
            </Button>
          </>
        }
      >
        <p className="text-muted">
          Файл: <b className="text-white">{importFile?.name}</b> ({formatBytes(importFile?.size ?? 0)})
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          <li>
            <b className="text-white">Восстановить</b> — страницы с тем же id будут перезаписаны версией из архива.
          </li>
          <li>
            <b className="text-white">Добавить как копии</b> — все страницы из архива добавятся как новые.
          </li>
        </ul>
      </Modal>

      <ConfirmModal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        loading={clearing}
        title="Удалить все данные?"
        confirmLabel="Удалить всё"
        text={
          <>
            Будут удалены <b className="text-white">все {memorials.length} страниц</b> и все медиафайлы из этого браузера. Действие нельзя
            отменить — сначала сделайте «Экспорт всех данных».
          </>
        }
        onConfirm={async () => {
          setClearing(true);
          try {
            await clearAll();
            toast.success('Все данные удалены');
            setRefresh((x) => x + 1);
          } catch (e) {
            notifyError(e);
          } finally {
            setClearing(false);
            setConfirmClear(false);
          }
        }}
      />
    </div>
  );
}

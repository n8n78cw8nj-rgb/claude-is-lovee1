import { motion } from 'framer-motion';
import { Check, Copy, CreditCard, FileDown, ImageDown, Moon, Plus, Printer, RectangleVertical, Square, Sun } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/Button';
import { Input, Toggle } from '../components/Input';
import { PRINT_FORMATS, QRCard, type PrintFormat, type PrintTheme } from '../components/QRCard';
import { QRSticker, QRTablet } from '../components/QRTablet';
import { useMemorials } from '../hooks/useMemorials';
import { useNav } from '../hooks/useNav';
import { notifyError } from '../hooks/useToast';
import { downloadPdf, printElement, sheetGrid } from '../lib/print';
import { qrDataUrl, qrSvg } from '../lib/qr';
import { buildQrUrl, getSettings } from '../lib/storage';
import { downloadBlob, slugify } from '../lib/utils';

const MM = 96 / 25.4;

const FORMATS: { key: PrintFormat; icon: typeof CreditCard; title: string }[] = [
  { key: 'card', icon: CreditCard, title: 'QR-карточка' },
  { key: 'tablet', icon: RectangleVertical, title: 'Табличка A6' },
  { key: 'sticker', icon: Square, title: 'Наклейка' },
];

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; label: React.ReactNode }[] }) {
  return (
    <div className="flex rounded-xl bg-field/60 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${value === o.v ? 'text-bg' : 'text-muted hover:text-white'}`}
        >
          {value === o.v && <motion.span layoutId={`seg-${options.map((x) => x.v).join()}`} className="absolute inset-0 rounded-lg bg-gold" />}
          <span className="relative flex items-center gap-2">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function QRStudio({ id }: { id: string | null }) {
  const { memorials, get, save } = useMemorials();
  const { go } = useNav();
  const [selected, setSelected] = useState<string | null>(id ?? memorials[0]?.id ?? null);
  const m = get(selected);

  const [format, setFormat] = useState<PrintFormat>('card');
  const [theme, setTheme] = useState<PrintTheme>('light');
  const [mode, setMode] = useState<'single' | 'sheet'>('single');
  const [header, setHeader] = useState('Наследие · страница памяти');
  const [siteLabel, setSiteLabel] = useState(getSettings().siteLabel);
  const [slogan, setSlogan] = useState(true);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'print' | 'pdf' | null>(null);
  const [copied, setCopied] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const qrUrl = m?.qrUrl ?? '';
  useEffect(() => setUrlDraft(qrUrl), [qrUrl]);

  useEffect(() => {
    let alive = true;
    if (qrUrl) qrDataUrl(qrUrl, 1200).then((u) => alive && setQr(u));
    return () => {
      alive = false;
    };
  }, [qrUrl]);

  const size = PRINT_FORMATS[format];

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => {
      const availW = el.clientWidth - 32;
      const availH = Math.min(window.innerHeight * 0.62, 640);
      setScale(Math.min(availW / (size.w * MM), availH / (size.h * MM), 2.6));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [size.w, size.h, m]);

  if (!m) {
    return (
      <div className="container-page pb-20 pt-32 text-center">
        <h1 className="text-5xl font-bold">QR-студия</h1>
        <p className="mt-4 text-muted">Сначала создайте страницу памяти — затем здесь можно будет напечатать QR.</p>
        <Button variant="gold" size="lg" icon={Plus} className="mt-8" onClick={() => go({ name: 'editor', id: null })}>
          Создать страницу
        </Button>
      </div>
    );
  }

  const props = { memorial: m, qr: qr ?? '', theme, header, siteLabel, slogan };
  const layout = { w: size.w, h: size.h, mode };
  const fileBase = `${slugify(m.fullName)}-${format}`;
  const grid = sheetGrid(size.w, size.h);

  const doPrint = async () => {
    if (!printRef.current) return;
    setBusy('print');
    try {
      await printElement(printRef.current, layout);
    } catch (e) {
      notifyError(e, 'Ошибка печати');
    } finally {
      setBusy(null);
    }
  };

  const doPdf = async () => {
    if (!printRef.current) return;
    setBusy('pdf');
    const t = toast.loading('Готовим PDF…');
    try {
      await downloadPdf(printRef.current, layout, `${fileBase}${mode === 'sheet' ? '-a4' : ''}.pdf`);
      toast.success('PDF скачан', { id: t });
    } catch (e) {
      toast.dismiss(t);
      notifyError(e, 'Ошибка PDF');
    } finally {
      setBusy(null);
    }
  };

  const saveUrl = () => {
    const url = urlDraft.trim() || buildQrUrl(m.id);
    save({ ...m, qrUrl: url });
    toast.success('Ссылка QR обновлена');
  };

  return (
    <div className="container-page pb-20 pt-24 sm:pt-28">
      <h1 className="text-4xl font-bold sm:text-5xl">QR-студия</h1>
      <p className="mt-3 text-muted">Карточки и таблички с QR-кодом, уровень коррекции H (30%) — читается даже при повреждениях на улице.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* -------- настройки -------- */}
        <div className="card h-fit space-y-6 p-5 sm:p-6">
          <div>
            <label className="label">Страница памяти</label>
            <select className="field" value={m.id} onChange={(e) => setSelected(e.target.value)}>
              {memorials.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="label">Формат</div>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition ${
                    format === f.key ? 'border-gold bg-gold/10 text-gold-light' : 'border-line text-muted hover:border-gold/50 hover:text-white'
                  }`}
                >
                  <f.icon className="h-5 w-5" />
                  {f.title}
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted">{size.label}</div>
          </div>

          <div>
            <div className="label">Оформление</div>
            <Segmented
              value={theme}
              onChange={setTheme}
              options={[
                { v: 'light', label: <><Sun className="h-4 w-4" /> Светлое</> },
                { v: 'dark', label: <><Moon className="h-4 w-4" /> Тёмное</> },
              ]}
            />
          </div>

          <div>
            <div className="label">Раскладка печати</div>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { v: 'single', label: 'По размеру' },
                { v: 'sheet', label: `A4 × ${grid.count}` },
              ]}
            />
            <div className="mt-2 text-xs text-muted">
              {mode === 'single' ? 'Страница печати = размер изделия (для типографии и термопринтера)' : `Лист A4, ${grid.cols}×${grid.rows} с линиями реза`}
            </div>
          </div>

          <Toggle checked={slogan} onChange={setSlogan} label="Слоган «Память не умирает. Жизнь человека — в одном касании.»" />

          {format === 'card' && <Input label="Верхняя строка (храм, логотип)" value={header} onChange={(e) => setHeader(e.target.value)} />}
          {format === 'tablet' && <Input label="Адрес сайта на табличке" value={siteLabel} onChange={(e) => setSiteLabel(e.target.value)} />}

          <div>
            <label className="label">Ссылка в QR</label>
            <div className="flex gap-2">
              <input className="field font-mono text-sm" value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} />
              <button
                className="shrink-0 rounded-xl bg-field px-3 text-muted hover:text-white"
                aria-label="Скопировать"
                onClick={async () => {
                  await navigator.clipboard?.writeText(m.qrUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            {urlDraft !== m.qrUrl && (
              <Button size="sm" variant="gold" className="mt-2" onClick={saveUrl}>
                Сохранить ссылку
              </Button>
            )}
          </div>

          <div className="grid gap-2 border-t border-line/60 pt-5">
            <Button variant="gold" size="lg" icon={Printer} loading={busy === 'print'} disabled={!qr} onClick={doPrint}>
              Печать
            </Button>
            <Button size="lg" icon={FileDown} loading={busy === 'pdf'} disabled={!qr} onClick={doPdf}>
              Скачать PDF
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="subtle" icon={ImageDown} onClick={async () => downloadBlob(await (await fetch(await qrDataUrl(m.qrUrl, 2048))).blob(), `${slugify(m.fullName)}-qr.png`)}>
                QR PNG
              </Button>
              <Button size="sm" variant="subtle" icon={ImageDown} onClick={async () => downloadBlob(new Blob([await qrSvg(m.qrUrl)], { type: 'image/svg+xml' }), `${slugify(m.fullName)}-qr.svg`)}>
                QR SVG
              </Button>
            </div>
          </div>
        </div>

        {/* -------- превью -------- */}
        <div ref={boxRef} className="card relative flex min-h-[420px] items-center justify-center overflow-hidden p-4 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(184,146,90,0.12),transparent_60%)]" />
          <motion.div
            key={`${format}-${theme}`}
            initial={{ opacity: 0, rotateX: 12, y: 20 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ width: size.w * MM * scale, height: size.h * MM * scale, perspective: 1000 }}
            className="relative"
          >
            <div
              style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${size.w}mm`, height: `${size.h}mm` }}
              className="shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
            >
              {format === 'card' && <QRCard ref={printRef} {...props} />}
              {format === 'tablet' && <QRTablet ref={printRef} {...props} />}
              {format === 'sticker' && <QRSticker ref={printRef} {...props} />}
            </div>
          </motion.div>
          <div className="absolute bottom-3 left-0 right-0 text-center text-xs text-muted">Превью · при печати {String(size.w).replace('.', ',')} × {size.h} мм</div>
        </div>
      </div>
    </div>
  );
}

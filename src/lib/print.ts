/**
 * Печать и PDF для QR-карточек.
 * Элемент-шаблон (размеры в мм) клонируется в #print-root; для печати выставляется @page нужного размера.
 */

export interface Layout {
  /** размер одного изделия, мм */
  w: number;
  h: number;
  /** 'single' — страница = размер изделия; 'sheet' — раскладка на A4 с отступами для резки */
  mode: 'single' | 'sheet';
}

const A4 = { w: 210, h: 297 };
const GAP = 4; // мм между изделиями на листе

export function sheetGrid(w: number, h: number) {
  const cols = Math.max(1, Math.floor((A4.w - 10 + GAP) / (w + GAP)));
  const rows = Math.max(1, Math.floor((A4.h - 10 + GAP) / (h + GAP)));
  return { cols, rows, count: cols * rows };
}

function buildPages(source: HTMLElement, layout: Layout): { pages: HTMLElement[]; pageW: number; pageH: number } {
  if (layout.mode === 'single') {
    const page = document.createElement('div');
    page.className = 'print-page';
    page.style.cssText = `width:${layout.w}mm;height:${layout.h}mm;`;
    page.appendChild(source.cloneNode(true));
    return { pages: [page], pageW: layout.w, pageH: layout.h };
  }
  const { cols, rows } = sheetGrid(layout.w, layout.h);
  const page = document.createElement('div');
  page.className = 'print-page';
  page.style.cssText = `width:${A4.w}mm;height:${A4.h}mm;background:#fff;display:flex;align-items:center;justify-content:center;`;
  const grid = document.createElement('div');
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},${layout.w}mm);grid-auto-rows:${layout.h}mm;gap:${GAP}mm;`;
  for (let i = 0; i < cols * rows; i++) {
    const cell = document.createElement('div');
    cell.style.cssText = `outline:0.1mm dashed #bbb;outline-offset:${GAP / 2 - 0.1}mm;`;
    cell.appendChild(source.cloneNode(true));
    grid.appendChild(cell);
  }
  page.appendChild(grid);
  return { pages: [page], pageW: A4.w, pageH: A4.h };
}

async function waitForImages(root: HTMLElement) {
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(
    imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => ((img.onload = r), (img.onerror = r))))),
  );
  await document.fonts?.ready;
}

export async function printElement(source: HTMLElement, layout: Layout): Promise<void> {
  const root = document.getElementById('print-root')!;
  root.innerHTML = '';
  const { pages, pageW, pageH } = buildPages(source, layout);
  pages.forEach((p) => root.appendChild(p));

  const style = document.createElement('style');
  style.id = 'print-page-size';
  style.textContent = `@page { size: ${pageW}mm ${pageH}mm; margin: 0; }`;
  document.head.appendChild(style);
  document.body.classList.add('printing');

  await waitForImages(root);

  const cleanup = () => {
    document.body.classList.remove('printing');
    style.remove();
    root.innerHTML = '';
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  // Safari иногда не присылает afterprint
  setTimeout(() => document.body.classList.contains('printing') && cleanup(), 60_000);
}

export async function downloadPdf(source: HTMLElement, layout: Layout, filename: string): Promise<void> {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);

  // Рендерим вне экрана без трансформаций масштаба превью
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;background:#fff;';
  const { pages, pageW, pageH } = buildPages(source, layout);
  pages.forEach((p) => holder.appendChild(p));
  document.body.appendChild(holder);

  try {
    await waitForImages(holder);
    const pdf = new jsPDF({
      unit: 'mm',
      format: [pageW, pageH],
      orientation: pageW > pageH ? 'landscape' : 'portrait',
      compress: true,
    });
    for (const [i, page] of pages.entries()) {
      // ~300 dpi для качественной печати в типографии
      const scale = Math.min(6, (300 / 25.4) * (pageW / page.getBoundingClientRect().width));
      const canvas = await html2canvas(page, { scale, backgroundColor: null, useCORS: true, logging: false });
      if (i > 0) pdf.addPage([pageW, pageH], pageW > pageH ? 'landscape' : 'portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
    }
    pdf.save(filename);
  } finally {
    holder.remove();
  }
}

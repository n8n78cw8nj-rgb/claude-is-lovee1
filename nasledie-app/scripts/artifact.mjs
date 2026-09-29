// Превращает однофайловую сборку (dist/index.html) во фрагмент для просмотрщика
// Claude Artifacts: без <html>/<head>/<body> (их добавляет сам просмотрщик),
// скрипт — после контейнера #root.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist/index.html', 'utf8');
// Порядок в dist/index.html: <head> … <link fonts> … <script type=module>JS</script> <style>CSS</style> </head>
// JS не может содержать «</script>», CSS — «</style>», поэтому режем по позициям, а не регулярками по всему файлу
const scriptStart = src.indexOf('<script type="module"');
const scriptEnd = src.indexOf('</script>', scriptStart) + '</script>'.length;
const styleStart = src.indexOf('<style', scriptEnd);
const styleEnd = src.indexOf('</style>', styleStart) + '</style>'.length;
if (scriptStart < 0 || styleStart < 0) throw new Error('Неожиданная структура dist/index.html — сначала npm run build:file');

const head = src.slice(0, scriptStart);
const fonts = [...head.matchAll(/<link[^>]+fonts\.googleapis\.com\/css2[^>]*>/g)].map((m) => m[0]);
const styles = [src.slice(styleStart, styleEnd)];
const scripts = [src.slice(scriptStart, scriptEnd).replace(' crossorigin', '')];

const out = [
  '<title>Наследие</title>',
  '<meta name="description" content="Наследие — цифровая экосистема сохранения памяти">',
  ...fonts,
  '<style>html,body{background:#0A0E1A;color-scheme:dark}</style>',
  ...styles,
  '<div id="root"></div>',
  '<div id="print-root"></div>',
  ...scripts,
].join('\n');

writeFileSync('dist/artifact.html', out);
console.log(`dist/artifact.html: ${(out.length / 1024 / 1024).toFixed(2)} MB`);

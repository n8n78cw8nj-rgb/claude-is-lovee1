import type { Memorial } from '../types/memorial';
import { canvasToBlob, storeBlob } from './media';
import { buildQrUrl, emptyMemorial, saveMemorials } from './storage';
import { initials } from './utils';

/**
 * 10 демонстрационных страниц. Портреты и фото — сгенерированные заглушки
 * (сепия-«снимки»), которые вы замените в редакторе на настоящие.
 */

type Seed = Omit<Memorial, 'id' | 'portraitId' | 'galleryIds' | 'videoIds' | 'animatedVideoId' | 'audioIds' | 'qrUrl' | 'createdAt' | 'updatedAt' | 'contacts' | 'symbol'> & {
  hue: number;
  symbol?: Memorial['symbol'];
  photos: string[];
};

const SEEDS: Seed[] = [
  {
    fullName: 'Иванов Иван Иванович',
    birthDate: '1923-05-15', deathDate: '1998-08-22', birthPlace: 'Свердловск', deathPlace: 'Москва',
    epitaph: 'Человек, который всегда шёл вперёд',
    biography: 'Ушёл на фронт добровольцем в восемнадцать лет. Прошёл путь от рядового до капитана, дошёл до Праги.\n\nПосле войны вернулся на Урал, восстанавливал завод, растил троих детей. Любил рыбалку, шахматы и песни Утёсова. Никогда не рассказывал о войне громко — только тихо, внукам, на кухне.',
    timeline: [
      { year: '1923', title: 'Рождение', text: 'Родился в рабочей семье в Свердловске' },
      { year: '1941', title: 'Фронт', text: 'Ушёл добровольцем, 3-й Украинский фронт' },
      { year: '1945', title: 'Победа', text: 'Встретил Победу в Праге. Орден Красной Звезды' },
      { year: '1950', title: 'Семья', text: 'Женился на Марии, с которой прожил 48 лет' },
      { year: '1983', title: 'Пенсия', text: 'Проводы с почётом после 35 лет на заводе' },
    ],
    words: [
      { text: 'Он всегда говорил: главное — не сдаваться и держать слово.', author: 'Анна', relation: 'внучка' },
      { text: 'Папа научил меня читать по газете «Правда» и ловить щуку.', author: 'Сергей', relation: 'сын' },
    ],
    hue: 32, symbol: 'star', photos: ['1943', '1945', '1962'],
  },
  {
    fullName: 'Петрова Анна Сергеевна',
    birthDate: '1931-09-01', deathDate: '2012-03-08', birthPlace: 'Вологда', deathPlace: 'Вологда',
    epitaph: 'Учить — значит любить',
    biography: 'Сорок два года проработала учительницей русского языка и литературы. Её ученики стали врачами, инженерами, учителями — и все помнили её строгий голос и тёплые руки.\n\nКаждое 1 сентября к её дому приходили выпускники с цветами — даже через тридцать лет.',
    timeline: [
      { year: '1931', title: 'Рождение', text: 'Родилась 1 сентября — будто знак' },
      { year: '1953', title: 'Первый урок', text: 'Окончила педагогический институт, школа № 8' },
      { year: '1978', title: 'Заслуженный учитель', text: 'Звание Заслуженного учителя РСФСР' },
      { year: '1995', title: 'Последний звонок', text: 'Выпустила свой последний, 14-й класс' },
    ],
    words: [
      { text: 'Анна Сергеевна научила нас не бояться собственных мыслей.', author: 'Олег Смирнов', relation: 'ученик' },
      { text: 'Мама проверяла тетради до полуночи и всё равно пекла пироги по воскресеньям.', author: 'Елена', relation: 'дочь' },
    ],
    hue: 18, symbol: 'cross', photos: ['1953', '1978', '1995'],
  },
  {
    fullName: 'Кузнецов Михаил Петрович',
    birthDate: '1940-02-11', deathDate: '2019-11-30', birthPlace: 'Казань', deathPlace: 'Санкт-Петербург',
    epitaph: 'Лечил не болезнь, а человека',
    biography: 'Хирург высшей категории, провёл более шести тысяч операций. Основал отделение сосудистой хирургии в городской больнице.\n\nВ свободное время писал акварели и играл на виолончели.',
    timeline: [
      { year: '1964', title: 'Диплом', text: 'Окончил Казанский медицинский институт с отличием' },
      { year: '1972', title: 'Ленинград', text: 'Переезд, работа в больнице им. Мечникова' },
      { year: '1988', title: 'Отделение', text: 'Основал отделение сосудистой хирургии' },
      { year: '2010', title: 'Наставник', text: 'Вырастил 40 хирургов' },
    ],
    words: [{ text: 'Он спас мне жизнь в 1994-м. Я помню его каждый день.', author: 'Виктор Н.', relation: 'пациент' }],
    hue: 205, photos: ['1964', '1988', '2005'],
  },
  {
    fullName: 'Смирнов Николай Андреевич',
    birthDate: '1935-07-19', deathDate: '2005-01-14', birthPlace: 'Магнитогорск', deathPlace: 'Магнитогорск',
    epitaph: 'Руки, которые строили страну',
    biography: 'Сталевар Магнитогорского металлургического комбината. Сорок лет у мартеновской печи.\n\nДом всегда был полон гостей, а по выходным он чинил соседям всё — от часов до мотоциклов.',
    timeline: [
      { year: '1953', title: 'Комбинат', text: 'Пришёл учеником сталевара' },
      { year: '1971', title: 'Орден', text: 'Орден Трудового Красного Знамени' },
      { year: '1995', title: 'Пенсия', text: 'Передал смену сыну' },
    ],
    words: [{ text: 'Дед говорил: «Сделай так, чтобы не стыдно было подписаться».', author: 'Дмитрий', relation: 'внук' }],
    hue: 12, photos: ['1953', '1971'],
  },
  {
    fullName: 'Волкова Мария Николаевна',
    birthDate: '1928-12-03', deathDate: '2016-06-20', birthPlace: 'деревня Липки, Тульская обл.', deathPlace: 'Тула',
    epitaph: 'Её любовь согревала четыре поколения',
    biography: 'Швея, мать пятерых детей, бабушка двенадцати внуков. Пережила оккупацию подростком.\n\nСшила свадебные платья для всех своих дочерей и внучек. Её пироги с капустой до сих пор пекут по её рецепту.',
    timeline: [
      { year: '1941', title: 'Война', text: 'Двенадцатилетней прятала раненых в погребе' },
      { year: '1948', title: 'Фабрика', text: 'Тульская швейная фабрика «Заря»' },
      { year: '2008', title: 'Юбилей', text: '80 лет — собрались 47 родственников' },
    ],
    words: [
      { text: 'Бабушка никогда не повышала голос. Ей и не нужно было.', author: 'Ольга', relation: 'внучка' },
      { text: 'Мама шила ночами, чтобы у нас было всё.', author: 'Татьяна', relation: 'дочь' },
    ],
    hue: 340, photos: ['1948', '1970', '2008'],
  },
  {
    fullName: 'Соколов Алексей Викторович',
    birthDate: '1932-04-12', deathDate: '2001-10-05', birthPlace: 'Оренбург', deathPlace: 'Жуковский',
    epitaph: 'Небо было его домом',
    biography: 'Лётчик-испытатель, заслуженный пилот. Поднял в небо двадцать три новых машины.\n\nДважды сажал горящий самолёт, спасая экипаж. Дома был самым мягким и смешным человеком.',
    timeline: [
      { year: '1954', title: 'Лётное училище', text: 'Оренбургское высшее лётное училище' },
      { year: '1966', title: 'Испытатель', text: 'Школа лётчиков-испытателей' },
      { year: '1979', title: 'Герой', text: 'Звание Героя Советского Союза' },
    ],
    words: [{ text: 'Папа учил: «Страх — это нормально. Паника — нет».', author: 'Игорь', relation: 'сын' }],
    hue: 215, symbol: 'star', photos: ['1954', '1966', '1979'],
  },
  {
    fullName: 'Лебедева Ольга Павловна',
    birthDate: '1947-03-21', deathDate: '2021-12-17', birthPlace: 'Ярославль', deathPlace: 'Ярославль',
    epitaph: 'Стихи остаются, когда уходят люди',
    biography: 'Поэтесса и библиотекарь. Автор шести сборников стихов, руководила литературной студией для детей.\n\nВ её квартире всегда пахло книгами и чаем с чабрецом.',
    timeline: [
      { year: '1970', title: 'Первая книга', text: 'Сборник «Волжские окна»' },
      { year: '1985', title: 'Студия', text: 'Открыла детскую литературную студию «Слово»' },
      { year: '2017', title: 'Премия', text: 'Областная литературная премия' },
    ],
    words: [{ text: 'Она верила, что каждый ребёнок — поэт, просто не все успевают это узнать.', author: 'Ирина', relation: 'ученица студии' }],
    hue: 280, photos: ['1970', '1985'],
  },
  {
    fullName: 'Морозов Василий Григорьевич',
    birthDate: '1926-08-08', deathDate: '2009-09-09', birthPlace: 'станица Вешенская', deathPlace: 'Ростов-на-Дону',
    epitaph: 'Кто сеет хлеб — тот сеет жизнь',
    biography: 'Агроном, председатель колхоза «Заветы Ильича». Вывел район в лидеры по урожайности зерновых.\n\nЗнал каждое поле по имени и каждого механизатора по отчеству.',
    timeline: [
      { year: '1950', title: 'Агроном', text: 'Окончил Донской сельхозинститут' },
      { year: '1962', title: 'Председатель', text: 'Избран председателем колхоза' },
      { year: '1976', title: 'Рекорд', text: 'Рекордный урожай — 52 центнера с гектара' },
    ],
    words: [{ text: 'Отец вставал в четыре утра всю жизнь. Даже на пенсии.', author: 'Николай', relation: 'сын' }],
    hue: 45, symbol: 'cross', photos: ['1950', '1976'],
  },
  {
    fullName: 'Новиков Сергей Александрович',
    birthDate: '1952-06-30', deathDate: '2023-02-02', birthPlace: 'Новосибирск', deathPlace: 'Новосибирск',
    epitaph: 'Музыка звучит, пока мы помним',
    biography: 'Джазовый пианист, преподаватель консерватории. Играл с лучшими оркестрами страны.\n\nКаждый Новый год играл для соседей по подъезду прямо на лестничной площадке.',
    timeline: [
      { year: '1975', title: 'Консерватория', text: 'Окончил с красным дипломом' },
      { year: '1989', title: 'Джаз', text: 'Основал квартет «Сибирский свинг»' },
      { year: '2012', title: 'Профессор', text: 'Профессор кафедры эстрадной музыки' },
    ],
    words: [{ text: 'Он играл так, что плакали даже те, кто не любил джаз.', author: 'Марина', relation: 'жена' }],
    hue: 190, symbol: 'none', photos: ['1975', '1989', '2012'],
  },
  {
    fullName: 'Фёдоров Павел Ильич',
    birthDate: '1938-01-25', deathDate: '2015-05-09', birthPlace: 'Нижний Тагил', deathPlace: 'Екатеринбург',
    epitaph: 'Мосты, которые он построил, соединяют людей',
    biography: 'Инженер-мостостроитель. По его проектам построено семнадцать мостов через уральские реки.\n\nУшёл в День Победы — в тот день, который всегда отмечал с отцом-фронтовиком.',
    timeline: [
      { year: '1961', title: 'Диплом', text: 'Уральский политехнический институт' },
      { year: '1974', title: 'Главный инженер', text: 'Уралмостострой' },
      { year: '1990', title: 'Мост через Исеть', text: 'Самый длинный из его мостов — 640 м' },
    ],
    words: [{ text: 'Дед показывал нам «свои» мосты из окна поезда и светился от гордости.', author: 'Кирилл', relation: 'внук' }],
    hue: 160, photos: ['1961', '1974', '1990'],
  },
];

/* ---------------- генерация изображений-заглушек ---------------- */

function sepiaCanvas(w: number, h: number, hue: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hue} 28% 62%)`);
  g.addColorStop(1, `hsl(${hue} 30% 26%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // зерно старой фотографии
  for (let i = 0; i < (w * h) / 60; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,245,225' : '20,12,5'},${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
  }
  return { c, ctx };
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10,6,2,0.65)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

async function portraitBlob(name: string, hue: number): Promise<Blob> {
  const W = 800;
  const { c, ctx } = sepiaCanvas(W, W, hue);
  ctx.fillStyle = `hsla(${hue} 25% 12% / 0.85)`;
  ctx.beginPath();
  ctx.ellipse(W / 2, W * 0.4, W * 0.16, W * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(W / 2, W * 1.02, W * 0.4, W * 0.38, 0, Math.PI, 0);
  ctx.fill();
  vignette(ctx, W, W);
  ctx.fillStyle = 'rgba(255,240,215,0.9)';
  ctx.font = `700 ${W * 0.09}px "PT Serif", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(initials(name), W / 2, W * 0.92);
  return canvasToBlob(c, 'image/jpeg', 0.85);
}

async function photoBlob(caption: string, hue: number, seed: number): Promise<Blob> {
  const W = 1200;
  const H = 800;
  const { c, ctx } = sepiaCanvas(W, H, hue + seed * 7);
  // горизонт, солнце, силуэты
  ctx.fillStyle = 'rgba(255,235,200,0.35)';
  ctx.beginPath();
  ctx.arc(W * (0.25 + seed * 0.2), H * 0.35, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `hsla(${hue} 25% 14% / 0.75)`;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.7);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, H * 0.66 + Math.sin(x / 90 + seed) * 22);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const x = W * (0.45 + i * 0.09);
    ctx.beginPath();
    ctx.arc(x, H * 0.52, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 26, H * 0.555, 52, 120);
  }
  vignette(ctx, W, H);
  ctx.fillStyle = 'rgba(255,240,215,0.85)';
  ctx.font = `italic 400 64px "PT Serif", Georgia, serif`;
  ctx.textAlign = 'right';
  ctx.fillText(caption, W - 48, H - 48);
  return canvasToBlob(c, 'image/jpeg', 0.82);
}

export async function seedDemo(onProgress?: (done: number, total: number) => void): Promise<number> {
  const created: Memorial[] = [];
  const now = Date.now();
  for (const [i, s] of SEEDS.entries()) {
    const { hue, photos, symbol, ...fields } = s;
    const base = emptyMemorial();
    const portraitId = await storeBlob(await portraitBlob(s.fullName, hue), 'image', 'portrait.jpg');
    const galleryIds: string[] = [];
    for (const [j, cap] of photos.entries()) {
      galleryIds.push(await storeBlob(await photoBlob(cap, hue, j), 'image', `photo-${cap}.jpg`));
    }
    const ts = new Date(now - i * 60_000).toISOString();
    created.push({
      ...base,
      ...fields,
      symbol: symbol ?? 'cross',
      portraitId,
      galleryIds,
      contacts: { email: 'family@example.ru', phone: '+7 900 000-00-00', visible: i % 3 === 0 },
      qrUrl: buildQrUrl(base.id),
      createdAt: ts,
      updatedAt: ts,
    });
    onProgress?.(i + 1, SEEDS.length);
  }
  saveMemorials(created);
  return created.length;
}

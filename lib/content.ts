import type { DishIconKey } from '@/components/icons/DishIcons';

type MenuEntry = {
  title: string;
  description: string;
  image?: string;
  icon?: DishIconKey;
};

export const cafe = {
  name: 'ПРОTESTO',
  city: 'Тутаев',
  address: 'г. Тутаев, просп. 50-летия Победы, 11',
  phone: '+7 (962) 200-49-99',
  phoneHref: 'tel:+79622004999',
  vkHandle: 'vk.ru/mesto_protesto',
  vkHref: 'https://vk.ru/mesto_protesto',
  owner: 'Идрис',
  hours: [
    { days: 'Понедельник — Пятница', time: '10:00 – 22:00' },
    { days: 'Суббота — Воскресенье', time: '11:00 – 22:00' },
  ],
  deliveryAreas: ['г. Тутаев', 'п. Фоминское', 'п. Чебаково', 'п. Микляиха'],
};

export const khinkaliTypes: MenuEntry[] = [
  {
    title: 'Классические',
    description: 'С пряным мясом и ароматным наваристым бульоном внутри.',
    image: '/images/khinkali-classic.webp',
  },
  {
    title: 'Жареные',
    description: 'С аппетитной хрустящей корочкой для любителей ярких вкусов.',
    image: '/images/khinkali-fried.webp',
  },
  {
    title: 'С сыром',
    description: 'Нежные, тягучие и сливочные.',
    image: '/images/khinkali-cheese.webp',
  },
];

export const menuItems: MenuEntry[] = [
  {
    title: 'Чебуреки',
    description: 'Тончайшее хрустящее тесто, сочное мясо и ни капли лишнего масла.',
    image: '/images/cheburek.webp',
  },
  {
    title: 'Хачапури',
    description: 'Пышные, румяные, с большим количеством тягучего сыра прямо из печи.',
    icon: 'khachapuri',
  },
  {
    title: 'Долма',
    description: 'Виноградные листья с начинкой и соусом на основе мацони — по семейному рецепту.',
    image: '/images/dolma.webp',
  },
  {
    title: 'Пельмени и вареники',
    description: 'Лепим и то, и другое: классические пельмени и вареники с картофелем или грибами.',
    image: '/images/pelmeni.webp',
  },
  {
    title: 'Бизнес-ланч',
    description: 'Суп, горячее второе и гарнир — комплексный обед по будням.',
    image: '/images/business-lunch-plate.webp',
  },
  {
    title: 'Мясо на гриле',
    description: 'Ароматные блюда для полноценного и сытного ужина.',
    image: '/images/grill-meat.webp',
  },
];

export const barHighlights = [
  {
    title: 'Грузинские лимонады',
    description: '«Мирдари»: груша, тархун, фейхоа, саперави и другие вкусы.',
  },
  {
    title: 'Коктейли',
    description: 'В том числе безалкогольные — мохито, тропический санрайз, пёрпл сода.',
  },
  {
    title: 'Кофе и чай',
    description: 'Эспрессо, латте, раф, айс бамбл кофе, горячий шоколад.',
  },
  {
    title: 'Домашние чизкейки',
    description: 'Нью-Йорк, кокос-миндаль, шоколадный микс, клубничный.',
  },
  {
    title: 'Разливное пиво',
    description: 'Spaten, Löwenbräu, Stella Artois и другие сорта.',
  },
];

export const testimonial = {
  quote: 'За свежими летними салатами — куда? Правильно, только в «ПРОTESTO». Очень вкусно!',
  source: 'Гостья кафе, из отзыва во ВКонтакте',
};

export const lunchIncludes = [
  'Первое горячее блюдо',
  'Сытное второе',
  'Свежий салат',
  'Приятный комплимент от кафе в подарок',
];

export const galleryImages = [
  { src: '/images/cheburek.webp', alt: 'Чебурек с хрустящей корочкой' },
  { src: '/images/dolma.webp', alt: 'Долма с соусом и свежими томатами' },
  { src: '/images/caesar-chicken.webp', alt: 'Салат «Цезарь» с курицей' },
  { src: '/images/zastolye.webp', alt: 'Комбо-набор: закуски и домашние лимонады' },
];

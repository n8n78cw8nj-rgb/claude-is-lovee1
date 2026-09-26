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

export const khinkaliTypes = [
  {
    title: 'Классические',
    description: 'С пряным мясом и ароматным наваристым бульоном внутри.',
    icon: 'khinkali',
  },
  {
    title: 'Жареные',
    description: 'С аппетитной хрустящей корочкой для любителей ярких вкусов.',
    icon: 'khinkali',
  },
  {
    title: 'С сыром',
    description: 'Нежные, тягучие и сливочные.',
    icon: 'khinkali',
  },
] as const;

export const menuItems = [
  {
    title: 'Чебуреки',
    description: 'Тончайшее хрустящее тесто, сочное мясо и ни капли лишнего масла.',
    icon: 'cheburek',
  },
  {
    title: 'Хачапури',
    description: 'Пышные, румяные, с большим количеством тягучего сыра прямо из печи.',
    image: '/images/khachapuri.webp',
  },
  {
    title: 'Долма',
    description: 'Виноградные листья с начинкой и соусом на основе мацони — по семейному рецепту.',
    image: '/images/dolma.webp',
  },
  {
    title: 'Пельмени и вареники',
    description: 'Лепим и то, и другое: классические пельмени и вареники с картофелем или грибами.',
    icon: 'pelmeni',
  },
  {
    title: 'Наваристые супы',
    description: 'От сытных мясных до лёгких овощных.',
    icon: 'soup',
  },
  {
    title: 'Мясо на гриле',
    description: 'Ароматные блюда для полноценного и сытного ужина.',
    icon: 'grill',
  },
] as const;

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
  { src: '/images/khachapuri.webp', alt: 'Хачапури с расплавленным сыром' },
  { src: '/images/zastolye.webp', alt: 'Закуски и домашние лимонады' },
  { src: '/images/dolma.webp', alt: 'Долма с соусом и свежими томатами' },
];

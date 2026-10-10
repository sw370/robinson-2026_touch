import { VocabularyItem } from '../types';

export const VOCABULARY_LIST: VocabularyItem[] = [
  {
    id: 'telescope',
    english: 'TELESCOPE',
    russian: 'подзорная труба',
    transcription: '/ˈtel.ɪ.skəʊp/',
    imageObject: 'telescope',
    description: 'Оптический прибор для наблюдения за далёкими кораблями и горизонтом моря.',
    hitbox: {
      x: 55,
      y: 31,
      width: 14,
      height: 24,
      labelPosition: 'top'
    }
  },
  {
    id: 'map',
    english: 'MAP',
    russian: 'карта',
    transcription: '/mæp/',
    imageObject: 'map',
    description: 'Старинная морская карта берегов и неизведанных островов океана.',
    hitbox: {
      x: 40,
      y: 52,
      width: 24,
      height: 15,
      labelPosition: 'top'
    }
  },
  {
    id: 'compass',
    english: 'COMPASS',
    russian: 'компас',
    transcription: '/ˈkʌm.pəs/',
    imageObject: 'compass',
    description: 'Магнитный прибор мореплавателя для определения сторон света.',
    hitbox: {
      x: 32,
      y: 53,
      width: 9.5,
      height: 14,
      labelPosition: 'left'
    }
  },
  {
    id: 'lantern',
    english: 'LANTERN',
    russian: 'фонарь',
    transcription: '/ˈlæn.tən/',
    imageObject: 'lantern',
    description: 'Масляный корабельный фонарь, освещающий тёмные своды пещеры.',
    hitbox: {
      x: 35.5,
      y: 36,
      width: 7.5,
      height: 22,
      labelPosition: 'top'
    }
  },
  {
    id: 'chest',
    english: 'CHEST',
    russian: 'сундук',
    transcription: '/tʃest/',
    imageObject: 'chest',
    description: 'Тяжёлый деревянный сундук с железной оковкой для припасов с разбитого корабля.',
    hitbox: {
      x: 62.5,
      y: 72,
      width: 25,
      height: 26,
      labelPosition: 'top'
    }
  },
  {
    id: 'rope',
    english: 'ROPE',
    russian: 'верёвка',
    transcription: '/rəʊp/',
    imageObject: 'rope',
    description: 'Прочный пеньковый корабельный канат для строительства и укрепления укрытия.',
    hitbox: {
      x: 37.5,
      y: 69,
      width: 8.5,
      height: 27,
      labelPosition: 'right'
    }
  },
  {
    id: 'rifle',
    english: 'RIFLE',
    russian: 'ружьё',
    transcription: '/ˈraɪ.fəl/',
    imageObject: 'rifle',
    description: 'Кремнёвый мушкет для охоты и защиты на необитаемом острове.',
    hitbox: {
      x: 26,
      y: 38,
      width: 12,
      height: 60,
      labelPosition: 'right'
    }
  }
];

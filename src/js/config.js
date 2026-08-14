/**
 * config.js
 * 게임 전역에서 사용하는 상수 정의 (난이도 설정, 심볼 풀, 저장소 키 등)
 */

/** @typedef {'easy'|'normal'|'hard'} DifficultyKey */

/**
 * 난이도별 보드 크기(행/열), 총 카드 수, 표시 라벨
 * @type {Object.<DifficultyKey, {rows:number, cols:number, cardCount:number, label:string}>}
 */
export const DIFFICULTY_CONFIG = {
  easy: { rows: 2, cols: 3, cardCount: 6, label: '쉬움' },
  normal: { rows: 4, cols: 4, cardCount: 16, label: '보통' },
  hard: { rows: 4, cols: 6, cardCount: 24, label: '어려움' },
};

/** 난이도를 선택하지 않았을 때 적용되는 기본값 */
export const DEFAULT_DIFFICULTY = 'normal';

/**
 * 카드 앞면에 표시할 도형/기호 풀. 색상이 아닌 모양으로 카드를 식별할 수 있도록 한다.
 * 최대 난이도(어려움=12쌍)까지 모두 커버하도록 12개 준비.
 */
export const SYMBOL_POOL = [
  { id: 0, glyph: '★', name: '별' },
  { id: 1, glyph: '●', name: '원' },
  { id: 2, glyph: '■', name: '사각형' },
  { id: 3, glyph: '▲', name: '삼각형' },
  { id: 4, glyph: '♦', name: '다이아몬드' },
  { id: 5, glyph: '♥', name: '하트' },
  { id: 6, glyph: '♣', name: '클로버' },
  { id: 7, glyph: '⬟', name: '오각형' },
  { id: 8, glyph: '⬢', name: '육각형' },
  { id: 9, glyph: '☀', name: '해' },
  { id: 10, glyph: '☾', name: '달' },
  { id: 11, glyph: '✚', name: '십자' },
];

/** localStorage에 난이도별 최고 기록을 저장할 때 사용하는 키 */
export const STORAGE_KEY = 'mensaPairGame.highScores.v1';

/** localStorage에 2인 모드 누적 승/무/패 전적을 저장할 때 사용하는 키 */
export const MATCH_RECORD_STORAGE_KEY = 'mensaPairGame.matchRecord.v1';

/** 짝이 맞지 않은 카드가 자동으로 다시 뒤집히기까지의 대기 시간(ms) */
export const MISMATCH_DELAY_MS = 1000;

/** @typedef {'animal'|'space'|'ocean'} ThemeKey */

/**
 * (v2) 테마별 표시 라벨/대표 아이콘/카드 심볼 풀.
 * 각 테마 12쌍(최대 난이도 어려움=12쌍)까지 커버.
 * @type {Object.<ThemeKey, {label:string, icon:string, symbolPool:Array<{id:number, glyph:string, name:string}>}>}
 */
export const THEME_CONFIG = {
  animal: {
    label: '동물 친구',
    icon: '🐶',
    symbolPool: [
      { id: 0, glyph: '🐶', name: '강아지' }, { id: 1, glyph: '🐱', name: '고양이' },
      { id: 2, glyph: '🐼', name: '판다' },   { id: 3, glyph: '🦁', name: '사자' },
      { id: 4, glyph: '🐰', name: '토끼' },   { id: 5, glyph: '🐻', name: '곰' },
      { id: 6, glyph: '🐸', name: '개구리' }, { id: 7, glyph: '🐵', name: '원숭이' },
      { id: 8, glyph: '🐷', name: '돼지' },   { id: 9, glyph: '🐔', name: '병아리' },
      { id: 10, glyph: '🦊', name: '여우' },  { id: 11, glyph: '🐨', name: '코알라' },
    ],
  },
  space: {
    label: '우주 탐험대',
    icon: '🚀',
    symbolPool: [
      { id: 0, glyph: '🚀', name: '로켓' },   { id: 1, glyph: '🪐', name: '토성' },
      { id: 2, glyph: '⭐', name: '별' },     { id: 3, glyph: '🌙', name: '달' },
      { id: 4, glyph: '☄️', name: '혜성' },   { id: 5, glyph: '👽', name: '외계인' },
      { id: 6, glyph: '🛸', name: 'UFO' },    { id: 7, glyph: '🌎', name: '지구' },
      { id: 8, glyph: '☀️', name: '태양' },   { id: 9, glyph: '🌟', name: '반짝별' },
      { id: 10, glyph: '🧑‍🚀', name: '우주비행사' }, { id: 11, glyph: '🛰️', name: '인공위성' },
    ],
  },
  ocean: {
    label: '바다 친구',
    icon: '🐠',
    symbolPool: [
      { id: 0, glyph: '🐠', name: '물고기' }, { id: 1, glyph: '🐬', name: '돌고래' },
      { id: 2, glyph: '🐙', name: '문어' },   { id: 3, glyph: '🦀', name: '게' },
      { id: 4, glyph: '🐳', name: '고래' },   { id: 5, glyph: '🐢', name: '거북이' },
      { id: 6, glyph: '🦈', name: '상어' },   { id: 7, glyph: '⭐', name: '불가사리' },
      { id: 8, glyph: '🦐', name: '새우' },   { id: 9, glyph: '🐡', name: '복어' },
      { id: 10, glyph: '🪸', name: '산호' },  { id: 11, glyph: '🐋', name: '흰수염고래' },
    ],
  },
};

/** 테마를 선택하지 않았을 때 적용되는 기본 테마 */
export const DEFAULT_THEME = 'animal';

/** @typedef {'single'|'twoPlayer'} ModeKey */

/**
 * (v2) 플레이 모드별 표시 라벨
 * @type {Object.<ModeKey, {label:string}>}
 */
export const MODE_CONFIG = {
  single: { label: '1인 플레이' },
  twoPlayer: { label: '2인 플레이' },
};

/** 플레이 모드를 선택하지 않았을 때 적용되는 기본값 */
export const DEFAULT_MODE = 'single';

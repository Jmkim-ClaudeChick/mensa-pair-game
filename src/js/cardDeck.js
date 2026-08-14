/**
 * cardDeck.js
 * 난이도에 맞는 카드 덱 생성 및 무작위 셔플(Fisher-Yates)
 */

import { DIFFICULTY_CONFIG, THEME_CONFIG, DEFAULT_THEME } from './config.js';

/**
 * @typedef {Object} CardData
 * @property {number} id          - 카드 고유 ID (0 ~ cardCount-1)
 * @property {number} pairId      - 짝 매칭 ID (동일 pairId 2장이 한 쌍)
 * @property {string} glyph       - 카드 앞면에 표시할 도형/기호 문자 (색상 비의존 식별자)
 * @property {string} name        - 도형 이름 (aria-label용, 예: "별")
 * @property {boolean} isFlipped  - 현재 앞면이 보이는 상태인지 여부
 * @property {boolean} isMatched  - 짝이 확정되어 고정된 상태인지 여부
 */

/**
 * 난이도에 맞는 카드 쌍을 테마의 symbolPool에서 필요한 만큼 선택 → 2장씩 복제 → 셔플
 * @param {'easy'|'normal'|'hard'} difficulty
 * @param {import('./config.js').ThemeKey} [theme]
 * @returns {CardData[]}
 */
export function createDeck(difficulty, theme = DEFAULT_THEME) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const pairCount = config.cardCount / 2;
  const themeConfig = THEME_CONFIG[theme] || THEME_CONFIG[DEFAULT_THEME];
  const selectedSymbols = themeConfig.symbolPool.slice(0, pairCount);

  /** @type {CardData[]} */
  const cards = [];
  let id = 0;

  selectedSymbols.forEach((symbol, pairId) => {
    for (let copy = 0; copy < 2; copy += 1) {
      cards.push({
        id: id,
        pairId,
        glyph: symbol.glyph,
        name: symbol.name,
        isFlipped: false,
        isMatched: false,
      });
      id += 1;
    }
  });

  return shuffleArray(cards);
}

/**
 * Fisher-Yates 셔플 (매번 무작위 배치 보장, in-place)
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

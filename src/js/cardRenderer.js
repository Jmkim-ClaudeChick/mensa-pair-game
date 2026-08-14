/**
 * cardRenderer.js
 * 카드 DOM 렌더링/갱신, 접근성(aria-*) 속성 부여
 */

import { DIFFICULTY_CONFIG } from './config.js';

/**
 * 전체 카드 그리드 렌더 (난이도 변경/새 게임 시)
 * @param {HTMLElement} container
 * @param {import('./gameState.js').GameState} state
 * @returns {void}
 */
export function renderBoard(container, state) {
  const config = DIFFICULTY_CONFIG[state.difficulty];
  container.style.setProperty('--cols', String(config.cols));
  container.innerHTML = '';

  const fragment = document.createDocumentFragment();
  state.cards.forEach((card) => {
    fragment.appendChild(createCardElement(card));
  });
  container.appendChild(fragment);
}

/**
 * 카드 하나에 대한 <button> 요소 생성
 * @param {import('./cardDeck.js').CardData} card
 * @returns {HTMLButtonElement}
 */
export function createCardElement(card) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'card';
  button.dataset.cardId = String(card.id);

  const inner = document.createElement('span');
  inner.className = 'card-inner';

  const back = document.createElement('span');
  back.className = 'card-face card-face--back';
  back.setAttribute('aria-hidden', 'true');

  const front = document.createElement('span');
  front.className = 'card-face card-face--front';
  front.setAttribute('aria-hidden', 'true');
  front.textContent = card.glyph;

  inner.appendChild(back);
  inner.appendChild(front);
  button.appendChild(inner);

  updateCardElement(button, card);
  return button;
}

/**
 * isFlipped/isMatched에 따라 class·aria 갱신
 * @param {HTMLButtonElement} cardEl
 * @param {import('./cardDeck.js').CardData} card
 * @returns {void}
 */
export function updateCardElement(cardEl, card) {
  const isRevealed = card.isFlipped || card.isMatched;

  cardEl.classList.toggle('is-flipped', isRevealed);
  cardEl.classList.toggle('is-matched', card.isMatched);
  cardEl.setAttribute('aria-disabled', String(card.isMatched));
  cardEl.setAttribute('aria-pressed', String(isRevealed));
  cardEl.setAttribute('aria-label', isRevealed ? `카드, ${card.name}` : '카드, 뒷면');
}

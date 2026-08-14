/**
 * difficultySelector.js
 * 난이도 선택 UI 렌더링 및 변경 이벤트 처리
 */

import { DIFFICULTY_CONFIG } from './config.js';

/**
 * 난이도 3개를 라디오 그룹(role="radiogroup")으로 렌더링, 현재 선택값 하이라이트
 * @param {HTMLElement} container
 * @param {'easy'|'normal'|'hard'} currentDifficulty
 * @param {(difficulty: 'easy'|'normal'|'hard') => void} onSelect
 * @returns {void}
 */
export function renderDifficultySelector(container, currentDifficulty, onSelect) {
  container.innerHTML = '';
  container.setAttribute('role', 'radiogroup');
  container.setAttribute('aria-label', '난이도 선택');

  Object.keys(DIFFICULTY_CONFIG).forEach((difficultyKey) => {
    const config = DIFFICULTY_CONFIG[difficultyKey];
    const isSelected = difficultyKey === currentDifficulty;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'difficulty-btn';
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(isSelected));
    button.textContent = `${config.label} (${config.cardCount}장)`;
    button.addEventListener('click', () => onSelect(difficultyKey));

    container.appendChild(button);
  });
}

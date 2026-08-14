/**
 * modeSelector.js
 * (v2) 1인/2인 모드 선택 UI 렌더링 및 변경 이벤트 처리
 */

import { MODE_CONFIG } from './config.js';

/**
 * 모드 2개(1인/2인)를 라디오 그룹으로 렌더링, 현재 선택값 하이라이트
 * @param {HTMLElement} container
 * @param {import('./config.js').ModeKey} currentMode
 * @param {(mode: import('./config.js').ModeKey) => void} onSelect
 * @returns {void}
 */
export function renderModeSelector(container, currentMode, onSelect) {
  container.innerHTML = '';
  container.setAttribute('role', 'radiogroup');
  container.setAttribute('aria-label', '플레이 모드 선택');

  Object.keys(MODE_CONFIG).forEach((modeKey) => {
    const config = MODE_CONFIG[modeKey];
    const isSelected = modeKey === currentMode;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode-btn';
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(isSelected));
    button.textContent = config.label;
    button.addEventListener('click', () => onSelect(modeKey));

    container.appendChild(button);
  });
}

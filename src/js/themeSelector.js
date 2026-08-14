/**
 * themeSelector.js
 * (v2) 테마 선택 UI 렌더링 및 변경 이벤트 처리
 */

import { THEME_CONFIG } from './config.js';

/**
 * 테마 3개를 라디오 그룹(role="radiogroup")으로 렌더링, 현재 선택값 하이라이트
 * @param {HTMLElement} container
 * @param {import('./config.js').ThemeKey} currentTheme
 * @param {(theme: import('./config.js').ThemeKey) => void} onSelect
 * @returns {void}
 */
export function renderThemeSelector(container, currentTheme, onSelect) {
  container.innerHTML = '';
  container.setAttribute('role', 'radiogroup');
  container.setAttribute('aria-label', '테마 선택');

  Object.keys(THEME_CONFIG).forEach((themeKey) => {
    const config = THEME_CONFIG[themeKey];
    const isSelected = themeKey === currentTheme;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-btn';
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(isSelected));

    const icon = document.createElement('span');
    icon.className = 'theme-btn__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = config.icon;

    const label = document.createElement('span');
    label.className = 'theme-btn__label';
    label.textContent = config.label;

    button.appendChild(icon);
    button.appendChild(label);
    button.addEventListener('click', () => onSelect(themeKey));

    container.appendChild(button);
  });
}

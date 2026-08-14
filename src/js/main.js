/**
 * main.js
 * 앱 부트스트랩: 모듈 wiring, 초기 렌더, 이벤트 연결
 */

import { DEFAULT_DIFFICULTY, DEFAULT_THEME, DEFAULT_MODE } from './config.js';
import * as gameState from './gameState.js';
import { renderBoard, updateCardElement } from './cardRenderer.js';
import { renderDifficultySelector } from './difficultySelector.js';
import { renderThemeSelector } from './themeSelector.js';
import { renderModeSelector } from './modeSelector.js';
import {
  initScoreboard,
  handleGameCompleted,
  renderHighScorePanel,
  renderPlayerTurnPanel,
  renderMatchRecordPanel,
  resetMatchRecord,
  clearCompletionBanner,
} from './scoreboard.js';
import { loadSavedTheme, saveTheme } from './storage.js';

function init() {
  const boardEl = document.getElementById('card-board');
  const difficultySelectorEl = document.getElementById('difficulty-selector');
  const themeSelectorEl = document.getElementById('theme-selector');
  const modeSelectorEl = document.getElementById('mode-selector');
  const completionBannerEl = document.getElementById('completion-banner');
  const highScorePanelEl = document.getElementById('high-score-panel');
  const playerTurnPanelEl = document.getElementById('player-turn-panel');
  const matchRecordPanelEl = document.getElementById('match-record-panel');

  initScoreboard({ completionBannerEl, highScorePanelEl, playerTurnPanelEl, matchRecordPanelEl });

  // 카드 클릭: 이벤트 위임으로 보드 컨테이너 하나에만 리스너 등록
  boardEl.addEventListener('click', (event) => {
    const cardButton = event.target.closest('.card');
    if (!cardButton || !boardEl.contains(cardButton)) return;

    const cardId = Number(cardButton.dataset.cardId);
    gameState.flipCard(cardId);
  });

  // 재시작 버튼: 완료 배너 안에서 동적으로 렌더링되므로 이벤트 위임으로 처리
  completionBannerEl.addEventListener('click', (event) => {
    const restartBtn = event.target.closest('[data-action="restart"]');
    if (!restartBtn) return;
    startGame(); // 옵션 없이 호출 → 현재 난이도/테마/모드 그대로 새 게임
  });

  // 전적 초기화 버튼: 전적 패널 안에서 동적으로 렌더링되므로 이벤트 위임으로 처리
  matchRecordPanelEl.addEventListener('click', (event) => {
    const resetBtn = event.target.closest('[data-action="reset-match-record"]');
    if (!resetBtn) return;
    if (!window.confirm('2인 대결 전적을 초기화할까요?')) return;
    resetMatchRecord();
  });

  // 상태 변경 구독: cardFlipped / pairMatched / mismatchResolved / gameCompleted 시 DOM 갱신
  gameState.subscribe((eventName, state) => {
    if (eventName === 'gameStarted') return; // 새 게임 시작은 startGame()이 직접 처리

    state.cards.forEach((card) => {
      const cardEl = boardEl.querySelector(`[data-card-id="${card.id}"]`);
      if (cardEl) updateCardElement(cardEl, card);
    });

    renderPlayerTurnPanel(playerTurnPanelEl, state);

    if (eventName === 'gameCompleted') {
      handleGameCompleted(state);
    }
  });

  /**
   * 새 게임 시작 헬퍼. 옵션으로 넘기지 않은 값은 현재 상태 값을 유지한다.
   * (v2) gameState.startNewGame({ difficulty, theme, mode } = {}) 옵션 객체 시그니처에 맞춤
   * @param {{difficulty?: 'easy'|'normal'|'hard', theme?: import('./config.js').ThemeKey, mode?: import('./config.js').ModeKey}} [options]
   */
  function startGame({ difficulty, theme, mode } = {}) {
    const current = gameState.getState();
    const nextDifficulty = difficulty ?? current.difficulty ?? DEFAULT_DIFFICULTY;
    const nextTheme = theme ?? current.theme ?? DEFAULT_THEME;
    const nextMode = mode ?? current.mode ?? DEFAULT_MODE;

    clearCompletionBanner();
    document.body.dataset.theme = nextTheme;
    saveTheme(nextTheme);

    const state = gameState.startNewGame({
      difficulty: nextDifficulty,
      theme: nextTheme,
      mode: nextMode,
    });

    renderBoard(boardEl, state);
    renderDifficultySelector(difficultySelectorEl, nextDifficulty, (newDifficulty) =>
      startGame({ difficulty: newDifficulty })
    );
    renderThemeSelector(themeSelectorEl, nextTheme, (newTheme) => startGame({ theme: newTheme }));
    renderModeSelector(modeSelectorEl, nextMode, (newMode) => startGame({ mode: newMode }));
    renderHighScorePanel(highScorePanelEl, nextDifficulty);
    renderPlayerTurnPanel(playerTurnPanelEl, state);
    renderMatchRecordPanel(matchRecordPanelEl);
  }

  const initialTheme = loadSavedTheme();
  startGame({ difficulty: DEFAULT_DIFFICULTY, theme: initialTheme, mode: DEFAULT_MODE });
}

document.addEventListener('DOMContentLoaded', init);

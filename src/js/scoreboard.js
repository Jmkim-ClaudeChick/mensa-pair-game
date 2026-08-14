/**
 * scoreboard.js
 * 게임 완료 배너, 시간 포맷, 신기록 판정 연동
 */

import * as storage from './storage.js';
import { DIFFICULTY_CONFIG } from './config.js';

/** @type {HTMLElement|null} */
let _completionBannerEl = null;

/** @type {HTMLElement|null} */
let _highScorePanelEl = null;

/** @type {HTMLElement|null} */
let _playerTurnPanelEl = null;

/** @type {HTMLElement|null} */
let _matchRecordPanelEl = null;

/**
 * 완료 배너/최고기록 패널/턴·점수 패널/전적 패널 DOM 참조를 등록한다. main.js 부트스트랩 시 1회 호출.
 * @param {{completionBannerEl: HTMLElement, highScorePanelEl: HTMLElement, playerTurnPanelEl?: HTMLElement, matchRecordPanelEl?: HTMLElement}} elements
 * @returns {void}
 */
export function initScoreboard(elements) {
  _completionBannerEl = elements.completionBannerEl;
  _highScorePanelEl = elements.highScorePanelEl;
  _playerTurnPanelEl = elements.playerTurnPanelEl || null;
  _matchRecordPanelEl = elements.matchRecordPanelEl || null;
}

/**
 * 소요 시간을 "mm:ss" 형식으로 변환
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 게임 완료 배너 렌더링 ("게임 완료" 메시지 + 시도 횟수 + 소요 시간 + 신기록 여부)
 * @param {{attempts: number, elapsedTime: number, isRecord: boolean}} payload
 * @returns {void}
 */
export function renderCompletionBanner({ attempts, elapsedTime, isRecord }) {
  if (!_completionBannerEl) return;

  _completionBannerEl.hidden = false;
  _completionBannerEl.innerHTML = `
    <p class="completion-banner__title">게임 완료!</p>
    <p class="completion-banner__stats">시도 횟수: ${attempts}회 · 소요 시간: ${formatTime(elapsedTime)}</p>
    ${isRecord ? '<p class="completion-banner__record">신기록!</p>' : ''}
    <button type="button" class="restart-btn" data-action="restart">다시하기</button>
  `;
}

/**
 * 완료 배너를 초기화(숨김)한다. 새 게임 시작 시 호출.
 * @returns {void}
 */
export function clearCompletionBanner() {
  if (!_completionBannerEl) return;
  _completionBannerEl.hidden = true;
  _completionBannerEl.innerHTML = '';
}

/**
 * 난이도 선택/변경, 게임 완료 시마다 호출되어 최고기록 표시 영역을 갱신
 * @param {HTMLElement} container
 * @param {'easy'|'normal'|'hard'} difficulty
 * @returns {void}
 */
export function renderHighScorePanel(container, difficulty) {
  const target = container || _highScorePanelEl;
  if (!target) return;

  const record = storage.getHighScoreForDifficulty(difficulty);
  const label = DIFFICULTY_CONFIG[difficulty].label;

  target.innerHTML = record
    ? `<p class="high-score-panel__label">${label} 난이도 최고 기록</p>
       <p class="high-score-panel__value">시도 ${record.attempts}회 · ${formatTime(record.timeSeconds)}</p>`
    : `<p class="high-score-panel__label">${label} 난이도 최고 기록</p>
       <p class="high-score-panel__value">최고 기록 없음</p>`;
}

/**
 * (v2) 2인 모드 진행 중 현재 차례·플레이어별 점수를 표시. mode!=='twoPlayer'이거나 완료 시 숨김
 * @param {HTMLElement} container
 * @param {import('./gameState.js').GameState} state
 * @returns {void}
 */
export function renderPlayerTurnPanel(container, state) {
  const target = container || _playerTurnPanelEl;
  if (!target) return;

  if (state.mode !== 'twoPlayer' || state.status === 'completed') {
    target.hidden = true;
    target.innerHTML = '';
    return;
  }

  target.hidden = false;
  target.innerHTML = `
    <p class="player-turn-panel__turn">지금은 <strong>Player ${state.currentPlayer}</strong> 차례예요</p>
    <p class="player-turn-panel__scores">
      <span class="player-turn-panel__score ${state.currentPlayer === 1 ? 'is-active' : ''}">Player 1: ${state.scores[1]}개</span>
      <span class="player-turn-panel__score ${state.currentPlayer === 2 ? 'is-active' : ''}">Player 2: ${state.scores[2]}개</span>
    </p>
  `;
}

/**
 * (v2) 2인 모드 게임 완료 시 최종 점수 + 승자(or 무승부) 배너 렌더 (1인 모드의 완료 배너와 별도 경로)
 * @param {HTMLElement} container
 * @param {{scores: {1:number, 2:number}, winner: 1|2|null}} payload
 * @returns {void}
 */
export function renderTwoPlayerResultBanner(container, { scores, winner }) {
  const target = container || _completionBannerEl;
  if (!target) return;

  const winnerText = winner === null ? '무승부!' : `Player ${winner} 승리!`;

  target.hidden = false;
  target.innerHTML = `
    <p class="completion-banner__title">대결 종료!</p>
    <p class="completion-banner__stats">Player 1: ${scores[1]}개 · Player 2: ${scores[2]}개</p>
    <p class="completion-banner__winner">${winnerText}</p>
    <button type="button" class="restart-btn" data-action="restart">다시하기</button>
  `;
}

/**
 * (v2) 2인 모드 누적 승/무/패 전적 패널 렌더링 + 전적 초기화 버튼 포함
 * @param {HTMLElement} [container]
 * @returns {void}
 */
export function renderMatchRecordPanel(container) {
  const target = container || _matchRecordPanelEl;
  if (!target) return;

  const record = storage.loadMatchRecord();

  target.innerHTML = `
    <p class="match-record-panel__label">2인 대결 전적</p>
    <p class="match-record-panel__value">Player 1 승 ${record.player1Wins} · 무승부 ${record.draws} · Player 2 승 ${record.player2Wins}</p>
    <button type="button" class="match-record-panel__reset-btn" data-action="reset-match-record">기록 초기화</button>
  `;
}

/**
 * 누적 승/무/패 전적을 0/0/0으로 초기화하고 패널을 다시 렌더링
 * @returns {void}
 */
export function resetMatchRecord() {
  storage.resetMatchRecord();
  renderMatchRecordPanel(_matchRecordPanelEl);
}

/**
 * 게임 완료 시 호출: 기존 기록과 비교 → 필요 시 저장 → 완료 배너 렌더
 * (v2) 모드에 따라 분기: 2인 모드는 최고 기록에 저장하지 않고 결과 배너만 렌더
 * @param {import('./gameState.js').GameState} state
 * @returns {void}
 */
export function handleGameCompleted(state) {
  if (state.mode === 'twoPlayer') {
    storage.recordMatchResult(state.winner); // 승/무/패 누적 전적 반영
    renderTwoPlayerResultBanner(_completionBannerEl, { scores: state.scores, winner: state.winner });
    renderMatchRecordPanel(_matchRecordPanelEl);
    return; // 2인 모드 결과는 최고 기록에 저장하지 않는다 (PRD 제약)
  }

  const { difficulty, attempts, elapsedTime } = state;
  const current = storage.getHighScoreForDifficulty(difficulty);
  const candidate = { attempts, timeSeconds: elapsedTime };
  const isRecord = storage.isNewRecord(candidate, current);

  if (isRecord) {
    storage.saveHighScore(difficulty, { ...candidate, achievedAt: new Date().toISOString() });
  }

  renderCompletionBanner({ attempts, elapsedTime, isRecord });
  renderHighScorePanel(_highScorePanelEl, difficulty); // 최신 값으로 재렌더
}

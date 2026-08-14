/**
 * gameState.js
 * 게임 상태 저장소 (pub/sub). 카드 클릭/판정 핵심 로직을 담당한다.
 */

import { DEFAULT_DIFFICULTY, DEFAULT_THEME, DEFAULT_MODE, MISMATCH_DELAY_MS } from './config.js';
import { createDeck } from './cardDeck.js';

/**
 * @typedef {Object} GameState
 * @property {'easy'|'normal'|'hard'} difficulty
 * @property {import('./config.js').ThemeKey} theme          - (v2) 현재 테마
 * @property {import('./config.js').ModeKey} mode             - (v2) 현재 플레이 모드
 * @property {import('./cardDeck.js').CardData[]} cards
 * @property {number[]} flippedCardIds   - 현재 뒤집힌 카드 ID (최대 2개)
 * @property {number} attempts           - 시도(2장 비교) 횟수
 * @property {number} matchedPairsCount
 * @property {number} totalPairsCount
 * @property {number|null} startTime     - 게임 시작 시각(ms, Date.now())
 * @property {number} elapsedTime        - 완료 시 확정되는 소요 시간(초)
 * @property {boolean} isLocked          - 두 카드 판정 대기 중 입력 잠금 여부
 * @property {'idle'|'playing'|'completed'} status
 * @property {1|2} currentPlayer                        - (v2) mode==='twoPlayer'일 때만 의미 있음, 현재 차례
 * @property {{1: number, 2: number}} scores             - (v2) mode==='twoPlayer'일 때만 의미 있음, 플레이어별 맞춘 짝 수
 * @property {1|2|null} winner                           - (v2) 게임 완료 시 확정. null이면 무승부
 */

/** @type {GameState} */
let _state = _createInitialState();

/** @type {Array<(eventName: string, state: GameState) => void>} */
let _listeners = [];

/**
 * 게임 세대 번호. startNewGame마다 증가시켜, 이전 게임에서 예약된
 * resolveMismatch 타이머가 새 게임 상태를 잘못 조작하지 않도록 막는다.
 * @type {number}
 */
let _generation = 0;

function _createInitialState() {
  return {
    difficulty: DEFAULT_DIFFICULTY,
    theme: DEFAULT_THEME,
    mode: DEFAULT_MODE,
    cards: [],
    flippedCardIds: [],
    attempts: 0,
    matchedPairsCount: 0,
    totalPairsCount: 0,
    startTime: null,
    elapsedTime: 0,
    isLocked: false,
    status: 'idle',
    currentPlayer: 1,
    scores: { 1: 0, 2: 0 },
    winner: null,
  };
}

function _notify(eventName) {
  const snapshot = getState();
  _listeners.forEach((listener) => listener(eventName, snapshot));
}

/**
 * 새 게임 시작: 덱 생성 + 상태 초기화 + 구독자에게 통지
 * (v2) 옵션 객체로 확장: 기존 startNewGame(difficulty) 호출부는 startNewGame({ difficulty })로 갱신
 * @param {{difficulty?: 'easy'|'normal'|'hard', theme?: import('./config.js').ThemeKey, mode?: import('./config.js').ModeKey}} [options]
 * @returns {GameState}
 */
export function startNewGame({ difficulty = DEFAULT_DIFFICULTY, theme = DEFAULT_THEME, mode = DEFAULT_MODE } = {}) {
  const cards = createDeck(difficulty, theme);
  _generation += 1;

  _state = {
    difficulty,
    theme,
    mode,
    cards,
    flippedCardIds: [],
    attempts: 0,
    matchedPairsCount: 0,
    totalPairsCount: cards.length / 2,
    startTime: Date.now(),
    elapsedTime: 0,
    isLocked: false,
    status: 'playing',
    currentPlayer: 1,
    scores: { 1: 0, 2: 0 },
    winner: null,
  };

  _notify('gameStarted');
  return getState();
}

/**
 * 카드 클릭 진입점. 잠금/이미뒤집힘/이미매치/3번째클릭 등 방어 로직 포함
 * @param {number} cardId
 * @returns {{success: boolean, state: GameState}}
 */
export function flipCard(cardId) {
  const state = _state;
  const card = state.cards.find((c) => c.id === cardId);

  if (!card) return { success: false, state: getState() };
  if (state.isLocked) return { success: false, state: getState() }; // 판정 대기 중 입력 무시
  if (card.isMatched || card.isFlipped) return { success: false, state: getState() }; // 확정/중복 클릭 무시
  if (state.flippedCardIds.length >= 2) return { success: false, state: getState() }; // 3번째 카드 방어

  card.isFlipped = true;
  state.flippedCardIds.push(cardId);
  _notify('cardFlipped');

  if (state.flippedCardIds.length === 2) {
    state.attempts += 1; // "시도(뒤집기) 횟수" = 카드 2장 비교 1회 단위로 카운트
    state.isLocked = true;
    const [firstId, secondId] = state.flippedCardIds;
    const [first, second] = [firstId, secondId].map((id) => state.cards.find((c) => c.id === id));

    if (first.pairId === second.pairId) {
      first.isMatched = second.isMatched = true;
      state.matchedPairsCount += 1;
      state.flippedCardIds = [];
      state.isLocked = false;
      if (state.mode === 'twoPlayer') {
        state.scores[state.currentPlayer] += 1; // (v2) 짝을 맞춘 플레이어가 그대로 한 번 더 진행
      }
      _notify('pairMatched');
      if (state.matchedPairsCount === state.totalPairsCount) completeGame();
    } else {
      const gen = _generation;
      setTimeout(() => resolveMismatch(firstId, secondId, gen), MISMATCH_DELAY_MS); // 1초 후 자동 원복
    }
  }

  return { success: true, state: getState() };
}

/**
 * 2장 비교 결과가 불일치일 때 1초 뒤 자동 원복 (setTimeout 콜백)
 * @param {number} firstId
 * @param {number} secondId
 * @param {number} [gen] - 예약 시점의 게임 세대. 현재 세대와 다르면
 *   (그 사이 새 게임이 시작되었으면) 아무 것도 하지 않는다.
 * @returns {void}
 */
export function resolveMismatch(firstId, secondId, gen = _generation) {
  if (gen !== _generation) return; // 새 게임이 이미 시작됨 — 원복 대상 없음

  const state = _state;
  const first = state.cards.find((c) => c.id === firstId);
  const second = state.cards.find((c) => c.id === secondId);

  if (first) first.isFlipped = false;
  if (second) second.isFlipped = false;
  state.flippedCardIds = [];
  state.isLocked = false;
  if (state.mode === 'twoPlayer') {
    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1; // (v2) 틀리면 상대 플레이어로 턴 전환
  }

  _notify('mismatchResolved');
}

/**
 * 모든 짝이 맞춰졌을 때 상태를 completed로 전환하고 elapsedTime 확정
 * @returns {void}
 */
export function completeGame() {
  const state = _state;
  state.status = 'completed';
  state.elapsedTime = state.startTime ? Math.round((Date.now() - state.startTime) / 1000) : 0;

  if (state.mode === 'twoPlayer') {
    if (state.scores[1] > state.scores[2]) state.winner = 1;
    else if (state.scores[2] > state.scores[1]) state.winner = 2;
    else state.winner = null; // 무승부
  }

  _notify('gameCompleted');
}

/**
 * 상태 변경 구독 (렌더러가 등록)
 * @param {(eventName: string, state: GameState) => void} listener
 * @returns {() => void} unsubscribe 함수
 */
export function subscribe(listener) {
  _listeners.push(listener);
  return function unsubscribe() {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

/**
 * 현재 상태 스냅샷 조회 (읽기 전용 스냅샷)
 * @returns {GameState}
 */
export function getState() {
  return {
    ..._state,
    cards: _state.cards.map((card) => ({ ...card })),
    flippedCardIds: [..._state.flippedCardIds],
    scores: { ..._state.scores },
  };
}

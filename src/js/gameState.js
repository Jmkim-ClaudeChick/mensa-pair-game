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
  _listeners.forEach((listener) => {
    // 리스너(렌더링 콜백)에서 예외가 나더라도 다른 리스너 호출과, 무엇보다
    // flipCard()가 이미 확정한 isLocked/flippedCardIds 등의 게임 상태 변경 흐름이
    // 절대 끊기지 않도록 격리한다. 격리하지 않으면 카드가 영구히 선택 불가능해질 수 있다.
    try {
      listener(eventName, snapshot);
    } catch (err) {
      console.error(`[gameState] listener error on "${eventName}"`, err);
    }
  });
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

  // 방어적 자기 복구: isLocked=false인데 flippedCardIds가 2개 남아있는 것은
  // 정상 흐름에서는 절대 나올 수 없는 조합이다(판정 로직이 알림 리스너 예외 등으로
  // 중간에 끊긴 경우에만 발생). 다음 클릭에서 조용히 정리해 보드가 영구히
  // 멈추지 않도록 한다.
  if (!state.isLocked && state.flippedCardIds.length >= 2) {
    state.flippedCardIds = [];
  }

  if (!card) return { success: false, state: getState() };
  if (state.isLocked) return { success: false, state: getState() }; // 판정 대기 중 입력 무시
  if (card.isMatched || card.isFlipped) return { success: false, state: getState() }; // 확정/중복 클릭 무시
  if (state.flippedCardIds.length >= 2) return { success: false, state: getState() }; // 3번째 카드 방어

  card.isFlipped = true;
  state.flippedCardIds.push(cardId);

  if (state.flippedCardIds.length < 2) {
    _notify('cardFlipped'); // 첫 장: 판정할 것이 없으므로 바로 알림
    return { success: true, state: getState() };
  }

  // 두 번째 장: 판정에 필요한 모든 상태 변경(isLocked/flippedCardIds/isMatched/scores/타이머 예약)을
  // 먼저 전부 확정한 뒤에만 알림을 보낸다. 알림 리스너(렌더링 콜백)가 예외를 던지더라도
  // 게임 상태 자체는 이미 일관된 값으로 확정되어 있으므로 보드가 멈추지 않는다.
  state.attempts += 1; // "시도(뒤집기) 횟수" = 카드 2장 비교 1회 단위로 카운트
  const [firstId, secondId] = state.flippedCardIds;
  const [first, second] = [firstId, secondId].map((id) => state.cards.find((c) => c.id === id));
  const isMatch = first.pairId === second.pairId;

  if (isMatch) {
    first.isMatched = second.isMatched = true;
    state.matchedPairsCount += 1;
    state.flippedCardIds = [];
    state.isLocked = false;
    if (state.mode === 'twoPlayer') {
      state.scores[state.currentPlayer] += 1; // (v2) 짝을 맞춘 플레이어가 그대로 한 번 더 진행
    }
    const justCompleted = state.matchedPairsCount === state.totalPairsCount;
    if (justCompleted) _markCompleted(state);

    _notify('pairMatched');
    if (justCompleted) _notify('gameCompleted');
  } else {
    state.isLocked = true;
    const gen = _generation;
    setTimeout(() => resolveMismatch(firstId, secondId, gen), MISMATCH_DELAY_MS); // 1초 후 자동 원복
    _notify('cardFlipped');
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
 * status/elapsedTime/winner 등 "완료" 관련 필드만 확정한다 (알림은 호출부 책임).
 * flipCard()의 매치 판정 직후와 completeGame() 양쪽에서 공유하는 내부 헬퍼.
 * @param {GameState} state
 * @returns {void}
 */
function _markCompleted(state) {
  state.status = 'completed';
  state.elapsedTime = state.startTime ? Math.round((Date.now() - state.startTime) / 1000) : 0;

  if (state.mode === 'twoPlayer') {
    if (state.scores[1] > state.scores[2]) state.winner = 1;
    else if (state.scores[2] > state.scores[1]) state.winner = 2;
    else state.winner = null; // 무승부
  }
}

/**
 * 모든 짝이 맞춰졌을 때 상태를 completed로 전환하고 elapsedTime 확정
 * @returns {void}
 */
export function completeGame() {
  _markCompleted(_state);
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

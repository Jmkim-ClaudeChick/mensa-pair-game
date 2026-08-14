/**
 * storage.js
 * localStorage 읽기/쓰기 (난이도별 최고 기록)
 */

import { STORAGE_KEY, DIFFICULTY_CONFIG, THEME_CONFIG, DEFAULT_THEME, MATCH_RECORD_STORAGE_KEY } from './config.js';

/** (v2) localStorage에 마지막 선택 테마를 저장할 때 사용하는 키 */
const THEME_STORAGE_KEY = 'mensaPairGame.theme.v1';

/**
 * @typedef {Object} HighScoreRecord
 * @property {number} attempts        - 해당 플레이의 시도 횟수
 * @property {number} timeSeconds     - 해당 플레이의 소요 시간(초)
 * @property {string} achievedAt      - 기록 달성 시각 (ISO 8601 문자열)
 */

/**
 * @typedef {Object.<'easy'|'normal'|'hard', HighScoreRecord|null>} HighScoreStore
 */

/**
 * 난이도 키마다 null이 채워진 빈 기록 저장소를 생성
 * @returns {HighScoreStore}
 */
function _createEmptyStore() {
  /** @type {HighScoreStore} */
  const store = {};
  Object.keys(DIFFICULTY_CONFIG).forEach((difficultyKey) => {
    store[difficultyKey] = null;
  });
  return store;
}

/**
 * localStorage에서 전체 최고기록 맵을 읽음. 값이 없거나 파싱 실패 시
 * { easy:null, normal:null, hard:null } 반환
 * @returns {HighScoreStore}
 */
export function loadHighScores() {
  const emptyStore = _createEmptyStore();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore;

    const parsed = JSON.parse(raw);
    return { ...emptyStore, ...parsed };
  } catch (error) {
    return emptyStore;
  }
}

/**
 * 특정 난이도의 최고 기록을 조회
 * @param {'easy'|'normal'|'hard'} difficulty
 * @returns {HighScoreRecord|null}
 */
export function getHighScoreForDifficulty(difficulty) {
  const store = loadHighScores();
  return store[difficulty] ?? null;
}

/**
 * 특정 난이도의 최고 기록을 갱신하여 localStorage에 저장
 * @param {'easy'|'normal'|'hard'} difficulty
 * @param {HighScoreRecord} record
 * @returns {boolean} 저장 성공 여부 (localStorage 접근 불가/쿼터 초과 시 false)
 */
export function saveHighScore(difficulty, record) {
  const store = loadHighScores();
  store[difficulty] = record;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * candidate가 current보다 "우수"한지 판정 (시도 횟수 또는 시간 중 하나라도 개선되면 true)
 * @param {{attempts: number, timeSeconds: number}} candidate
 * @param {HighScoreRecord|null} current
 * @returns {boolean}
 */
export function isNewRecord(candidate, current) {
  if (!current) return true; // 처음 플레이 → 무조건 최초 기록
  return candidate.attempts < current.attempts || candidate.timeSeconds < current.timeSeconds;
}

/**
 * (v2) localStorage에서 마지막 선택 테마를 읽음. 없거나 유효하지 않으면 DEFAULT_THEME 반환
 * @returns {import('./config.js').ThemeKey}
 */
export function loadSavedTheme() {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw && Object.prototype.hasOwnProperty.call(THEME_CONFIG, raw)) {
      return raw;
    }
    return DEFAULT_THEME;
  } catch (error) {
    return DEFAULT_THEME;
  }
}

/**
 * (v2) 선택한 테마를 localStorage에 저장
 * @param {import('./config.js').ThemeKey} themeId
 * @returns {boolean} 저장 성공 여부
 */
export function saveTheme(themeId) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * @typedef {Object} MatchRecord
 * @property {number} player1Wins
 * @property {number} draws
 * @property {number} player2Wins
 */

/**
 * @returns {MatchRecord}
 */
function _createEmptyMatchRecord() {
  return { player1Wins: 0, draws: 0, player2Wins: 0 };
}

/**
 * localStorage에서 2인 모드 누적 승/무/패 전적을 읽음. 값이 없거나 파싱 실패 시 0/0/0 반환
 * @returns {MatchRecord}
 */
export function loadMatchRecord() {
  const empty = _createEmptyMatchRecord();

  try {
    const raw = window.localStorage.getItem(MATCH_RECORD_STORAGE_KEY);
    if (!raw) return empty;

    const parsed = JSON.parse(raw);
    return { ...empty, ...parsed };
  } catch (error) {
    return empty;
  }
}

/**
 * 2인 모드 누적 승/무/패 전적을 localStorage에 저장
 * @param {MatchRecord} record
 * @returns {boolean} 저장 성공 여부
 */
export function saveMatchRecord(record) {
  try {
    window.localStorage.setItem(MATCH_RECORD_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 게임 완료 시 확정된 winner 값을 누적 전적에 1건 반영 후 저장
 * @param {1|2|null} winner - 1이면 Player 1 승, 2면 Player 2 승, null이면 무승부
 * @returns {MatchRecord}
 */
export function recordMatchResult(winner) {
  const record = loadMatchRecord();
  if (winner === 1) record.player1Wins += 1;
  else if (winner === 2) record.player2Wins += 1;
  else record.draws += 1;

  saveMatchRecord(record);
  return record;
}

/**
 * 누적 승/무/패 전적을 0/0/0으로 초기화
 * @returns {MatchRecord}
 */
export function resetMatchRecord() {
  const empty = _createEmptyMatchRecord();
  saveMatchRecord(empty);
  return empty;
}

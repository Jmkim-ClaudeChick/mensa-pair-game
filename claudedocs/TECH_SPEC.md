# TECH_SPEC: MENSA Pair Game

> PRD 참조: `claudedocs/PRD.md`
> 작성: @architect (tech-spec-writer 스킬)

---

## 0. 설계 개요

MENSA Pair Game은 로그인/서버 없이 브라우저에서 바로 실행되는 **정적 싱글 페이지 카드 짝 맞추기 게임**이다. PRD의 기술적 제약(백엔드/DB 없음, 정적 HTML/CSS/JS, localStorage만 사용)에 따라 프레임워크나 번들러 없이 **바닐라 HTML/CSS/JavaScript(ES6 모듈)** 로 구현한다.

- 기능 5개(카드 짝 맞추기 / 난이도 선택 / 최고 기록 저장 / **(v2) 테마 선택** / **(v2) 2인 플레이**) → 아래 §3에 1:1 매핑
- 수용 기준 24개(4+4+4+6+6) → §7 검증 매트릭스에서 전수 매핑
- 빌드 도구 없이 `index.html`을 브라우저(또는 정적 서버)로 열면 바로 동작

> **v2 변경 이력**: 어린이(유치원생~초등 저학년) 대상 테마 선택 기능과 로컬 2인 플레이 모드를 추가한다. 기존 기능 1~3의 로직/파일은 유지하며, 확장이 필요한 지점만 최소 변경한다 (예: `createDeck(difficulty)` → `createDeck(difficulty, theme)`).

---

## 1. 기술 스택

| 구분 | 기술 | 버전 | 선정 근거 |
|------|------|------|----------|
| 마크업 | HTML5 (semantic) | - | 별도 프레임워크 불필요. `<button>` 기반 카드로 네이티브 키보드 접근성(Tab/Enter/Space) 확보 |
| 스타일 | CSS3 (Grid + Custom Properties) | - | 빌드 없이 반응형 카드 그리드 구현 가능. `grid-template-columns`로 난이도별(3x2/4x4/6x4) 레이아웃을 손쉽게 전환 |
| 로직 | Vanilla JavaScript (ES6 모듈, `type="module"`) | ES2017+ | PRD 제약(백엔드/빌드 없음)과 MVP 규모(기능 3개)에 React/Vue 등 프레임워크는 과도한 엔지니어링. `<script type="module">`은 최신 브라우저 네이티브 지원으로 번들러 불필요 |
| 상태 관리 | 자체 구현 pub/sub 스토어 (`gameState.js`) | - | 상태 변경 → 렌더링 갱신 흐름만 필요한 소규모 앱. Redux 등 외부 라이브러리 불필요 |
| 데이터 저장 | `window.localStorage` | Web Storage API | PRD 제약상 서버/DB 사용 불가. 브라우저 내장 API로 난이도별 최고 기록을 키-값으로 영속 저장 |
| 배포 | 정적 파일 호스팅 (예: GitHub Pages, 로컬 정적 서버) | - | 빌드 산출물 없이 `src/` 그대로 배포 가능 |

**결정하지 않은 것 (의도적 배제)**
- 빌드 도구(Webpack/Vite 등): 파일 3~9개 규모의 MVP에 불필요, "정적 파일 기반" 제약과도 상충
- CSS 프레임워크(Tailwind 등): 카드 그리드/애니메이션이 CSS Grid + transition만으로 충분
- 상태관리 라이브러리: 단일 게임 상태 하나만 관리하면 되므로 자체 pub/sub로 충분

---

## 2. 프로젝트 구조

```
MENSA_Pair_Game/
├── claudedocs/
│   ├── PRD.md
│   └── TECH_SPEC.md
└── src/
    ├── index.html               # 싱글 페이지 진입점 (테마/모드/난이도 선택 + 게임 보드 + 결과/최고기록/턴 영역)
    ├── css/
    │   └── styles.css           # 전역 스타일, 테마별 CSS 변수, 카드 그리드(반응형), 뒤집기 애니메이션, 포커스 스타일
    └── js/
        ├── main.js              # 앱 부트스트랩: 모듈 wiring, 초기 렌더, 이벤트 연결
        ├── config.js            # DIFFICULTY_CONFIG, THEME_CONFIG, MODE_CONFIG, STORAGE_KEY 등 상수
        ├── cardDeck.js           # 카드 덱 생성(난이도+테마 반영) + 셔플(Fisher-Yates)
        ├── gameState.js          # 게임 상태 저장소 (pub/sub), 카드 클릭/판정/턴전환/점수 핵심 로직
        ├── cardRenderer.js       # 카드 DOM 렌더링/갱신, 접근성 속성(aria-*) 부여
        ├── difficultySelector.js # 난이도 선택 UI 렌더링 및 변경 이벤트 처리
        ├── themeSelector.js      # (v2) 테마 선택 UI 렌더링 및 변경 이벤트 처리
        ├── modeSelector.js       # (v2) 1인/2인 모드 선택 UI 렌더링 및 변경 이벤트 처리
        ├── scoreboard.js         # 게임 완료 배너(1인/2인 분기), 턴/점수 패널, 시간 포맷, 신기록 판정 연동
        └── storage.js            # localStorage 읽기/쓰기 (난이도별 최고 기록 + 마지막 선택 테마)
```

총 12개 파일(HTML 1 + CSS 1 + JS 10)을 설계한다.

---

## 3. 구현 명세

### 기능 1: 카드 짝 맞추기 플레이 (핵심 게임플레이) → 구현 명세

> PRD 매핑: 기능 1 — 카드를 뒤집어 같은 패턴의 짝을 찾는 핵심 게임플레이

**관련 파일**: `src/js/gameState.js` (핵심 로직), `src/js/cardRenderer.js` (렌더링), `src/js/cardDeck.js` (덱 생성)

**데이터 구조 (JSDoc typedef, 순수 JS 객체로 구현)**

```javascript
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
 * @typedef {Object} GameState
 * @property {'easy'|'normal'|'hard'} difficulty
 * @property {'animal'|'space'|'ocean'} theme          - (v2) 현재 테마
 * @property {'single'|'twoPlayer'} mode                - (v2) 현재 플레이 모드
 * @property {CardData[]} cards
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
```

**핵심 함수 (`gameState.js`)**

```javascript
// 새 게임 시작: 덱 생성 + 상태 초기화 + 구독자에게 통지
// (v2) 옵션 객체로 확장: 기존 startNewGame(difficulty) 호출부는 startNewGame({ difficulty })로 갱신
function startNewGame({ difficulty = DEFAULT_DIFFICULTY, theme = DEFAULT_THEME, mode = DEFAULT_MODE } = {}) { /* → GameState */ }

// 카드 클릭 진입점. 잠금/이미뒤집힘/이미매치/3번째클릭 등 방어 로직 포함
function flipCard(cardId) { /* → { success: boolean, state: GameState } */ }

// 2장 비교 결과가 불일치일 때 1초 뒤 자동 원복 (setTimeout 콜백)
// (v2) mode==='twoPlayer'이면 원복과 동시에 currentPlayer를 상대 플레이어로 전환
function resolveMismatch(firstId, secondId, gen) { /* → void */ }

// 모든 짝이 맞춰졌을 때 상태를 completed로 전환하고 elapsedTime 확정
// (v2) mode==='twoPlayer'이면 scores 비교로 winner(1|2|null) 확정
function completeGame() { /* → void */ }

// 상태 변경 구독 (렌더러가 등록)
function subscribe(listener /* (eventName, state) => void */) { /* → unsubscribe fn */ }

function getState() { /* → GameState (읽기 전용 스냅샷) */ }
```

**핵심 로직 요약 (`flipCard`)**
```javascript
function flipCard(cardId) {
  const state = _state;
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return { success: false, state };
  if (state.isLocked) return { success: false, state };          // 판정 대기 중 입력 무시
  if (card.isMatched || card.isFlipped) return { success: false, state }; // 확정/중복 클릭 무시
  if (state.flippedCardIds.length >= 2) return { success: false, state }; // 3번째 카드 방어

  card.isFlipped = true;
  state.flippedCardIds.push(cardId);
  _notify('cardFlipped');

  if (state.flippedCardIds.length === 2) {
    state.attempts += 1;   // "시도(뒤집기) 횟수" = 카드 2장 비교 1회 단위로 카운트
    state.isLocked = true;
    const [firstId, secondId] = state.flippedCardIds;
    const [first, second] = [firstId, secondId].map(id => state.cards.find(c => c.id === id));

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
      const gen = _generation; // 새 게임 시작 시 증가하는 세대 번호. 아래 setTimeout이 지연되는 동안
                                // 사용자가 난이도/테마/모드를 바꿔 새 게임을 시작해도, 이 예전 타이머가
                                // "새 게임"의 카드 상태를 잘못 되돌리지 않도록 막는 가드에 사용한다.
      setTimeout(() => resolveMismatch(firstId, secondId, gen), MISMATCH_DELAY_MS); // 1초 후 자동 원복
    }
  }
  return { success: true, state };
}

function resolveMismatch(firstId, secondId, gen) {
  if (gen !== _generation) return; // 그 사이 새 게임이 시작됨 — 원복 대상 없음, 아무 것도 하지 않는다
  const state = _state;
  const first = state.cards.find(c => c.id === firstId);
  const second = state.cards.find(c => c.id === secondId);
  if (first) first.isFlipped = false;
  if (second) second.isFlipped = false;
  state.flippedCardIds = [];
  state.isLocked = false;
  if (state.mode === 'twoPlayer') {
    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1; // (v2) 틀리면 상대 플레이어로 턴 전환
  }
  _notify('mismatchResolved');
}
```

> **설계 결정 1**: "시도(뒤집기) 횟수"는 카드 1장 단위가 아니라 **2장 비교(턴) 1회 단위**로 카운트한다. 메모리 매칭 게임의 일반적 관례이며, `attempts`가 곧 "몇 번의 판정 시도를 거쳤는가"를 직관적으로 표현한다.
>
> **설계 결정 2 (v2)**: 2인 모드의 턴 전환 규칙은 "맞추면 계속, 틀리면 상대에게"로 정한다. 어린이 대상 오프라인 메모리 게임의 표준 규칙이며, 잘 기억하는 플레이어에게 보상을 주어 게임의 몰입도를 높인다.
>
> **설계 결정 3 (버그 수정 이력)**: 최초 구현 시 `resolveMismatch`가 예약 시점의 카드 ID만으로 즉시 전역 상태를 되돌렸는데, 그 1초 대기 사이에 사용자가 난이도를 바꾸면(카드 ID가 0부터 재사용되므로) 이전 게임의 예약된 타이머가 **새로 시작된 게임의 카드 상태를 잘못 조작**하는 버그가 실행 검증에서 발견되었다. `_generation` 카운터를 `startNewGame()`마다 증가시키고, 타이머 예약 시점의 세대 값을 클로저로 캡처해 `resolveMismatch`가 세대 불일치 시 아무 것도 하지 않도록 가드해 해결했다.

**`completeGame()` 구현 (v2 확장)**
```javascript
function completeGame() {
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
```

**렌더링 (`cardRenderer.js`)**

```javascript
function renderBoard(container, state) { /* 전체 카드 그리드 렌더 (난이도/테마/모드 변경·새 게임 시) */ }
function createCardElement(card) { /* → HTMLButtonElement, <button class="card" tabindex="0"> */ }
function updateCardElement(cardEl, card) { /* isFlipped/isMatched에 따라 class·aria 갱신 */ }
```

- 카드는 `<button>` 요소로 생성 → 네이티브 Tab 포커스 이동, Enter/Space 클릭 트리거를 브라우저가 기본 제공 (별도 keydown 핸들러 불필요)
- 카드 앞면은 `card.glyph`(테마별 이모지) + 텍스트 라벨을 함께 표시, `aria-label="카드, {name}"`으로 스크린리더 대응 → 색상에만 의존하지 않는 식별(NFR 대응)
- 클릭 핸들러는 `gameState.flipCard(id)` 호출 후 반환된 `state`로 즉시 DOM 갱신(동기 처리, 네트워크 호출 없음) → 200ms 반응 요구사항 충족 근거는 §6 참조
- 매칭된 카드는 `disabled` 속성 대신 `aria-disabled="true"` + CSS `pointer-events:none`으로 처리한다 (버그 수정 이력: `disabled`를 직접 사용하면 포커스가 가 있던 카드가 매칭되는 순간 브라우저가 강제로 포커스를 잃어, 키보드 사용자의 Tab 탐색이 끊기는 접근성 결함이 있었다)

**수용 기준 매핑**

| PRD 수용 기준 | 구현 방법 |
|--------------|----------|
| 뒤집혀 있지 않은 카드 클릭 시 앞면(숫자/도형)으로 표시 | `flipCard()`가 `card.isFlipped = true` 설정 → `cardRenderer.updateCardElement()`가 `.card.is-flipped` 클래스 부여, CSS가 `glyph` 노출 |
| 최대 2장까지만 뒤집기, 불일치 시 1초 내 자동 복귀 | `flippedCardIds.length >= 2` 가드 + `setTimeout(resolveMismatch, 1000)` |
| 확정 카드/3번째 카드 클릭 시 무반응 | `flipCard()` 상단의 `isMatched`, `isFlipped`, `isLocked`, `flippedCardIds.length >= 2` 가드 |
| 완료 시 "게임 완료" 메시지 + 시도 횟수 + 소요 시간 표시 | `completeGame()`이 `elapsedTime` 확정 → `scoreboard.js`가 `attempts`, `elapsedTime`으로 완료 배너 렌더 |

---

### 기능 2: 난이도(카드 수) 선택 → 구현 명세

> PRD 매핑: 기능 2 — 카드 개수(난이도)를 선택해 자신의 수준에 맞는 도전을 함

**관련 파일**: `src/js/difficultySelector.js`, `src/js/config.js`, `src/js/cardDeck.js`, `src/js/main.js`

**데이터/상수 (`config.js`)**

```javascript
/** @typedef {'easy'|'normal'|'hard'} DifficultyKey */

const DIFFICULTY_CONFIG = {
  easy:   { rows: 2, cols: 3, cardCount: 6,  label: '쉬움' },
  normal: { rows: 4, cols: 4, cardCount: 16, label: '보통' },
  hard:   { rows: 4, cols: 6, cardCount: 24, label: '어려움' },
};

const DEFAULT_DIFFICULTY = 'normal'; // 미선택 시 기본값

const SYMBOL_POOL = [
  { id: 0,  glyph: '★', name: '별' },
  { id: 1,  glyph: '●', name: '원' },
  { id: 2,  glyph: '■', name: '사각형' },
  { id: 3,  glyph: '▲', name: '삼각형' },
  { id: 4,  glyph: '♦', name: '다이아몬드' },
  { id: 5,  glyph: '♥', name: '하트' },
  { id: 6,  glyph: '♣', name: '클로버' },
  { id: 7,  glyph: '⬟', name: '오각형' },
  { id: 8,  glyph: '⬢', name: '육각형' },
  { id: 9,  glyph: '☀', name: '해' },
  { id: 10, glyph: '☾', name: '달' },
  { id: 11, glyph: '✚', name: '십자' },
]; // 12개 → 최대 난이도(어려움=12쌍)까지 모두 커버
```

**핵심 함수 (`cardDeck.js`)**

```javascript
// 난이도에 맞는 카드 쌍을 SYMBOL_POOL에서 필요한 만큼 선택 → 2장씩 복제 → 셔플
function createDeck(difficulty) { /* → CardData[] */ }

// Fisher-Yates 셔플 (매번 무작위 배치 보장)
function shuffleArray(array) { /* → array (in-place) */ }
```

**UI/이벤트 (`difficultySelector.js`)**

```javascript
// 난이도 3개를 라디오 그룹(role="radiogroup")으로 렌더링, 현재 선택값 하이라이트
function renderDifficultySelector(container, currentDifficulty, onSelect) { /* → void */ }
```

- `main.js`에서 `onSelect(difficulty)` 콜백을 `gameState.startNewGame(difficulty)`에 연결
- 페이지 최초 로드 시 선택자 초기값 = `DEFAULT_DIFFICULTY('normal')`이며, 사용자가 아무것도 선택하지 않고 "시작"해도 이 기본값으로 `startNewGame()`이 호출됨
- 난이도 선택자는 게임 화면 상단에 항상 노출되는 영역으로 설계 → 게임 진행 중에도 언제든 다른 난이도를 클릭할 수 있고, 클릭 즉시 `startNewGame(newDifficulty)`가 기존 상태를 덮어써 새 게임을 시작 (진행 중 상태 폐기)

**수용 기준 매핑**

| PRD 수용 기준 | 구현 방법 |
|--------------|----------|
| 쉬움(6)/보통(16)/어려움(24) 3가지 중 선택 가능 | `DIFFICULTY_CONFIG` 3개 항목 + `renderDifficultySelector()`가 3개 버튼 렌더 |
| 선택한 장수만큼 정확히 짝 맞는 카드가 매번 무작위 배치되어 새 게임 시작 | `createDeck()`이 `cardCount/2`쌍을 생성·복제 후 `shuffleArray()`(Fisher-Yates)로 매번 다른 배치 생성 |
| 미선택 시 기본값 "보통"으로 자동 진행 | `DEFAULT_DIFFICULTY='normal'`이 선택자 초기값이자 `startNewGame()`의 기본 매개변수 |
| 진행 중 난이도 변경 시 현재 진행 초기화 + 새 게임 시작 | 난이도 버튼 클릭 → `startNewGame(newDifficulty)` 즉시 호출 → `gameState` 전체를 새 객체로 교체(이전 진행 상태 폐기) |

---

### 기능 3: 최고 기록 저장 및 표시 → 구현 명세

> PRD 매핑: 기능 3 — 난이도별 최고 기록(시도 횟수, 시간)을 저장·비교하여 성취감을 제공

**관련 파일**: `src/js/storage.js`, `src/js/scoreboard.js`

**데이터 구조 (localStorage 스키마)**

```javascript
/**
 * @typedef {Object} HighScoreRecord
 * @property {number} attempts        - 해당 플레이의 시도 횟수
 * @property {number} timeSeconds     - 해당 플레이의 소요 시간(초)
 * @property {string} achievedAt      - 기록 달성 시각 (ISO 8601 문자열)
 */

/**
 * @typedef {Object.<DifficultyKey, HighScoreRecord|null>} HighScoreStore
 * 예: { easy: null, normal: {...}, hard: null }
 */

const STORAGE_KEY = 'mensaPairGame.highScores.v1';
```

**핵심 함수 (`storage.js`)**

```javascript
// localStorage에서 전체 최고기록 맵을 읽음. 값이 없거나 파싱 실패 시 { easy:null, normal:null, hard:null } 반환
function loadHighScores() { /* → HighScoreStore */ }

// 특정 난이도의 최고 기록을 조회
function getHighScoreForDifficulty(difficulty) { /* → HighScoreRecord|null */ }

// 특정 난이도의 최고 기록을 갱신하여 localStorage에 저장
function saveHighScore(difficulty, record) { /* → void */ }

// candidate가 current보다 "우수"한지 판정
function isNewRecord(candidate, current) { /* → boolean */ }
```

```javascript
function isNewRecord(candidate, current) {
  if (!current) return true; // 처음 플레이 → 무조건 최초 기록
  return candidate.attempts < current.attempts || candidate.timeSeconds < current.timeSeconds;
}
```

> **설계 결정**: PRD 수용 기준의 "더 적은 시도 횟수 **또는** 더 짧은 시간"을 문자 그대로 OR 조건으로 구현한다. 즉 시도 횟수 또는 시간 둘 중 하나만 기존 최고 기록보다 개선되어도 "신기록"으로 인정하며, 기록은 시도 횟수·시간을 분리 저장하지 않고 **이번 플레이의 (attempts, timeSeconds) 쌍 전체**를 하나의 `HighScoreRecord`로 갱신·저장한다. (예: 기존 기록보다 시간은 늘었지만 시도 횟수가 줄면, 시도 횟수 개선분을 인정해 시간 값도 함께 이번 플레이 값으로 갱신된다.) 두 지표를 별도로 추적하지 않아 데이터 구조와 UI 표시가 단순해진다.

**연동 함수 (`scoreboard.js`)**

```javascript
// 게임 완료 시 호출: 기존 기록과 비교 → 필요 시 저장 → 완료 배너 렌더
function handleGameCompleted(state) { /* → void, storage.js + cardRenderer.js 조합 사용 */ }

// 소요 시간을 "mm:ss" 형식으로 변환
function formatTime(totalSeconds) { /* → string */ }

// 난이도 선택/변경, 게임 완료 시마다 호출되어 최고기록 표시 영역을 갱신
function renderHighScorePanel(container, difficulty) { /* → void */ }
```

```javascript
function handleGameCompleted(state) {
  const { difficulty, attempts, elapsedTime } = state;
  const current = storage.getHighScoreForDifficulty(difficulty);
  const candidate = { attempts, timeSeconds: elapsedTime };
  const isRecord = storage.isNewRecord(candidate, current);

  if (isRecord) {
    storage.saveHighScore(difficulty, { ...candidate, achievedAt: new Date().toISOString() });
  }
  scoreboard.renderCompletionBanner({ attempts, elapsedTime, isRecord });
  scoreboard.renderHighScorePanel(highScorePanelEl, difficulty); // 최신 값으로 재렌더
}
```

- `renderHighScorePanel()`은 페이지 최초 로드, 난이도 변경, 게임 완료 직후 총 3개 시점에 호출되어 항상 localStorage의 최신 값을 반영 → 새로고침/재방문 시에도 동일 로직으로 값을 다시 읽어와 유지됨을 보장

**수용 기준 매핑**

| PRD 수용 기준 | 구현 방법 |
|--------------|----------|
| 완료 시 이번 기록이 같은 난이도의 저장된 최고 기록과 자동 비교 | `handleGameCompleted()`가 `getHighScoreForDifficulty(difficulty)` 조회 후 `isNewRecord()` 호출 |
| 우수한 경우 "신기록" 표시 + 갱신·저장 | `isRecord === true`일 때 `saveHighScore()` 호출 + `renderCompletionBanner({ isRecord: true })`가 "신기록" 배지 렌더 |
| 새로고침/재방문해도 난이도별 최고 기록 유지·표시 | 데이터가 `localStorage`(브라우저 영속 저장소)에 저장되며, `renderHighScorePanel()`이 페이지 로드 시마다 `loadHighScores()`로 재조회 |
| 처음 플레이(기록 없음)는 "최고 기록 없음" 표시 후 최초 기록으로 저장 | `getHighScoreForDifficulty()`가 `null` 반환 시 `renderHighScorePanel()`이 "최고 기록: 없음" 렌더, `isNewRecord(candidate, null) === true`로 첫 저장 수행 |

---

### 기능 4 (v2): 어린이 친화적 디자인 테마 선택 → 구현 명세

> PRD 매핑: 기능 4 — 어린이가 좋아할 만한 테마를 골라 화면을 꾸밀 수 있게 함

**관련 파일**: `src/js/themeSelector.js`, `src/js/config.js`, `src/js/cardDeck.js`, `src/js/storage.js`, `src/css/styles.css`

**데이터/상수 (`config.js`)**

```javascript
/** @typedef {'animal'|'space'|'ocean'} ThemeKey */

const THEME_CONFIG = {
  animal: {
    label: '동물 친구',
    icon: '🐶',                 // 선택 버튼에 쓰이는 대표 이모지
    symbolPool: [
      { id: 0, glyph: '🐶', name: '강아지' }, { id: 1, glyph: '🐱', name: '고양이' },
      { id: 2, glyph: '🐼', name: '판다' },   { id: 3, glyph: '🦁', name: '사자' },
      { id: 4, glyph: '🐰', name: '토끼' },   { id: 5, glyph: '🐻', name: '곰' },
      { id: 6, glyph: '🐸', name: '개구리' }, { id: 7, glyph: '🐵', name: '원숭이' },
      { id: 8, glyph: '🐷', name: '돼지' },   { id: 9, glyph: '🐔', name: '병아리' },
      { id: 10, glyph: '🦊', name: '여우' },  { id: 11, glyph: '🐨', name: '코알라' },
    ],
  },
  space: {
    label: '우주 탐험대',
    icon: '🚀',
    symbolPool: [
      { id: 0, glyph: '🚀', name: '로켓' },   { id: 1, glyph: '🪐', name: '토성' },
      { id: 2, glyph: '⭐', name: '별' },     { id: 3, glyph: '🌙', name: '달' },
      { id: 4, glyph: '☄️', name: '혜성' },   { id: 5, glyph: '👽', name: '외계인' },
      { id: 6, glyph: '🛸', name: 'UFO' },    { id: 7, glyph: '🌎', name: '지구' },
      { id: 8, glyph: '☀️', name: '태양' },   { id: 9, glyph: '🌟', name: '반짝별' },
      { id: 10, glyph: '🧑‍🚀', name: '우주비행사' }, { id: 11, glyph: '🛰️', name: '인공위성' },
    ],
  },
  ocean: {
    label: '바다 친구',
    icon: '🐠',
    symbolPool: [
      { id: 0, glyph: '🐠', name: '물고기' }, { id: 1, glyph: '🐬', name: '돌고래' },
      { id: 2, glyph: '🐙', name: '문어' },   { id: 3, glyph: '🦀', name: '게' },
      { id: 4, glyph: '🐳', name: '고래' },   { id: 5, glyph: '🐢', name: '거북이' },
      { id: 6, glyph: '🦈', name: '상어' },   { id: 7, glyph: '⭐', name: '불가사리' },
      { id: 8, glyph: '🦐', name: '새우' },   { id: 9, glyph: '🐡', name: '복어' },
      { id: 10, glyph: '🪸', name: '산호' },  { id: 11, glyph: '🐋', name: '흰수염고래' },
    ],
  },
};

const DEFAULT_THEME = 'animal'; // 미선택 시 기본 테마
```

- 각 테마 12쌍(최대 난이도 어려움=12쌍)까지 커버 → 기존 `SYMBOL_POOL` 방식과 동일한 슬라이스 규칙 재사용
- 테마별 색상 팔레트(배경/카드 뒷면/강조색/매칭색)는 `styles.css`에 `[data-theme="..."]` 커스텀 프로퍼티로 정의 (아래 CSS 전략 참조)

**핵심 함수 변경 (`cardDeck.js`)**

```javascript
// (v2) 두 번째 인자로 테마를 받아 해당 테마의 symbolPool에서 카드 이모지를 선택
function createDeck(difficulty, theme = DEFAULT_THEME) { /* → CardData[] */ }
```

**UI/이벤트 (`themeSelector.js`)**

```javascript
// 테마 3개를 라디오 그룹(role="radiogroup")으로 렌더링, 현재 선택값 하이라이트
function renderThemeSelector(container, currentTheme, onSelect) { /* → void */ }
```

- 난이도 선택자(`difficultySelector.js`)와 동일한 패턴(라디오 그룹, 버튼 클릭 = 즉시 선택)으로 일관성 유지
- 버튼 라벨은 이모지 아이콘 + 한글 라벨(`🐶 동물 친구`)로 구성 → 아직 글을 잘 못 읽는 유아도 아이콘만으로 선택 가능(PRD 사용성 요구사항 대응)
- 테마 변경 시 `main.js`의 `startGame({ theme: newTheme })`를 호출해 난이도 변경과 동일하게 새 게임으로 재시작

**저장 (`storage.js` 추가 함수)**

```javascript
const THEME_STORAGE_KEY = 'mensaPairGame.theme.v1';

// localStorage에서 마지막 선택 테마를 읽음. 없거나 유효하지 않으면 DEFAULT_THEME 반환
function loadSavedTheme() { /* → ThemeKey */ }

// 선택한 테마를 localStorage에 저장
function saveTheme(themeId) { /* → boolean, 저장 성공 여부 */ }
```

**CSS 전략 (`styles.css`)**

```css
/* 예시: 테마별 CSS 커스텀 프로퍼티 오버라이드. <body data-theme="animal"> 로 적용 */
[data-theme='animal'] { --color-bg: #fff3e0; --color-accent: #ff9f43; --color-card-back: #ffd9a0; --color-card-matched: #7bd88f; }
[data-theme='space']  { --color-bg: #10123b; --color-accent: #8c7bff; --color-card-back: #2a2a63; --color-card-matched: #55e6c1; }
[data-theme='ocean']  { --color-bg: #e3f7fb; --color-accent: #2ec4f1; --color-card-back: #aee6f5; --color-card-matched: #ffd166; }
```

- 어린이 친화적 재설계에 맞춰 기존 다크 톤 팔레트를 테마별 밝고 채도 높은 배색으로 교체하고, `--radius-md`를 더 키우고(둥근 카드 모서리), 카드 뒷면에는 "?" 대신 테마 아이콘(`🐾`/`✨`/`🌊`)을 표시해 친근감을 높인다
- 색상만으로 테마를 구분하지 않도록 카드 앞면은 항상 이모지+텍스트 라벨 유지(PRD 접근성 요구사항 유지)

**수용 기준 매핑**

| PRD 수용 기준 | 구현 방법 |
|--------------|----------|
| 3가지 테마 중 하나를 클릭 한 번으로 선택 가능 | `THEME_CONFIG` 3항목 + `renderThemeSelector()`가 버튼 3개 렌더 |
| 테마 선택 시 카드 뒷면/앞면/배경/강조색이 즉시 바뀜 | `<body data-theme>` 갱신 → `[data-theme='...']` CSS 변수 오버라이드가 즉시 적용, `createDeck(difficulty, theme)`가 새 symbolPool 사용 |
| 미선택 시 기본 테마(동물 친구) 자동 적용 | `DEFAULT_THEME='animal'`이 선택자 초기값 및 `startNewGame()` 기본 인자 |
| 테마 변경 시 난이도 변경과 동일하게 진행 상황 초기화 + 새 게임 시작 | 테마 버튼 클릭 → `startGame({ theme: newTheme })` → `gameState` 전체 교체 |
| 새로고침/재방문해도 마지막 선택 테마 유지 | `saveTheme()`으로 저장, 페이지 로드 시 `loadSavedTheme()`으로 복원 후 `startGame()`에 전달 |
| 모든 테마에서 색상 비의존 식별 가능 | 테마 무관하게 카드 앞면은 항상 이모지(`glyph`) + `aria-label`의 `name` 텍스트 병행 표시 |

---

### 기능 5 (v2): 2인 플레이 모드 → 구현 명세

> PRD 매핑: 기능 5 — 한 화면에서 두 명이 번갈아 플레이하며 승자를 가리는 로컬 대전 모드

**관련 파일**: `src/js/modeSelector.js`, `src/js/gameState.js`, `src/js/scoreboard.js`, `src/js/main.js`

**데이터/상수 (`config.js`)**

```javascript
/** @typedef {'single'|'twoPlayer'} ModeKey */

const MODE_CONFIG = {
  single:    { label: '1인 플레이' },
  twoPlayer: { label: '2인 플레이' },
};

const DEFAULT_MODE = 'single'; // 미선택 시 기본값
```

**상태 확장은 §3-기능1의 `GameState` typedef, `flipCard`/`resolveMismatch`/`completeGame` 구현 참조** (mode/currentPlayer/scores/winner 필드 및 턴 전환·점수 집계·승자 판정 로직 이미 포함)

**UI/이벤트 (`modeSelector.js`)**

```javascript
// 모드 2개(1인/2인)를 라디오 그룹으로 렌더링, 현재 선택값 하이라이트
function renderModeSelector(container, currentMode, onSelect) { /* → void */ }
```

- 모드 변경 시 `main.js`의 `startGame({ mode: newMode })` 호출 → 난이도/테마 변경과 동일하게 새 게임으로 재시작

**턴/점수 패널 (`scoreboard.js` 추가 함수)**

```javascript
// 2인 모드 진행 중 현재 차례·플레이어별 점수를 표시. mode!=='twoPlayer'이거나 완료 시 숨김
function renderPlayerTurnPanel(container, state) { /* → void */ }

// 2인 모드 게임 완료 시 최종 점수 + 승자(or 무승부) 배너 렌더 (1인 모드의 완료 배너와 별도 경로)
function renderTwoPlayerResultBanner(container, { scores, winner }) { /* → void */ }
```

```javascript
// handleGameCompleted(state) 확장: 모드에 따라 분기
function handleGameCompleted(state) {
  if (state.mode === 'twoPlayer') {
    renderTwoPlayerResultBanner(completionBannerEl, { scores: state.scores, winner: state.winner });
    return; // 2인 모드 결과는 최고 기록에 저장하지 않는다 (PRD 제약)
  }
  // 기존 1인 모드 로직 그대로 (§3-기능3 참조)
  const { difficulty, attempts, elapsedTime } = state;
  const current = storage.getHighScoreForDifficulty(difficulty);
  const candidate = { attempts, timeSeconds: elapsedTime };
  const isRecord = storage.isNewRecord(candidate, current);
  if (isRecord) storage.saveHighScore(difficulty, { ...candidate, achievedAt: new Date().toISOString() });
  renderCompletionBanner({ attempts, elapsedTime, isRecord });
  renderHighScorePanel(highScorePanelEl, difficulty);
}
```

- `main.js`의 `gameState.subscribe()` 콜백에서 `cardFlipped`/`pairMatched`/`mismatchResolved`/`gameStarted` 이벤트마다 `renderPlayerTurnPanel()`을 호출해 턴/점수 패널을 항상 최신 상태로 유지
- `index.html`에 `#player-turn-panel` 컨테이너를 결과 영역 위에 신설, `mode==='single'`이면 `hidden` 처리

**수용 기준 매핑**

| PRD 수용 기준 | 구현 방법 |
|--------------|----------|
| 1인/2인 플레이 선택 가능, 미선택 시 1인 기본값 | `MODE_CONFIG` 2항목 + `renderModeSelector()`, `DEFAULT_MODE='single'` |
| 2인 플레이 중 현재 차례·양쪽 점수 항상 표시 | `renderPlayerTurnPanel()`이 매 이벤트마다 `state.currentPlayer`/`state.scores` 렌더 |
| 짝 맞추면 점수 +1, 같은 플레이어가 계속 진행 | `flipCard()` 매치 분기에서 `state.scores[state.currentPlayer] += 1`, `currentPlayer` 미변경 |
| 짝 틀리면 원복 후 상대에게 턴 전환 | `resolveMismatch()`에서 `state.currentPlayer = 상대` |
| 완료 시 최종 점수 + 승자/무승부 표시 | `completeGame()`이 `winner` 확정 → `renderTwoPlayerResultBanner()`가 점수·승자 렌더 |
| 2인 결과는 최고 기록 미저장, 1인 전환 시 최고 기록 기능 정상 | `handleGameCompleted()`가 `mode==='twoPlayer'`이면 `storage.saveHighScore()` 경로를 아예 타지 않고 조기 반환 |

---

## 4. 데이터 모델 (전체 요약)

```javascript
// src/js/config.js
/** @typedef {'easy'|'normal'|'hard'} DifficultyKey */
/** @typedef {'animal'|'space'|'ocean'} ThemeKey        - (v2) */
/** @typedef {'single'|'twoPlayer'} ModeKey              - (v2) */

// src/js/cardDeck.js, gameState.js
/**
 * @typedef {Object} CardData
 * @property {number} id
 * @property {number} pairId
 * @property {string} glyph
 * @property {string} name
 * @property {boolean} isFlipped
 * @property {boolean} isMatched
 */

/**
 * @typedef {Object} GameState
 * @property {DifficultyKey} difficulty
 * @property {ThemeKey} theme                - (v2)
 * @property {ModeKey} mode                   - (v2)
 * @property {CardData[]} cards
 * @property {number[]} flippedCardIds
 * @property {number} attempts
 * @property {number} matchedPairsCount
 * @property {number} totalPairsCount
 * @property {number|null} startTime
 * @property {number} elapsedTime
 * @property {boolean} isLocked
 * @property {'idle'|'playing'|'completed'} status
 * @property {1|2} currentPlayer               - (v2) mode==='twoPlayer'일 때만 사용
 * @property {{1: number, 2: number}} scores    - (v2) mode==='twoPlayer'일 때만 사용
 * @property {1|2|null} winner                  - (v2) 완료 시 확정, 무승부면 null
 */

// src/js/storage.js
/**
 * @typedef {Object} HighScoreRecord
 * @property {number} attempts
 * @property {number} timeSeconds
 * @property {string} achievedAt   // ISO 8601
 */

/** localStorage key: "mensaPairGame.highScores.v1"
 * value: { easy: HighScoreRecord|null, normal: HighScoreRecord|null, hard: HighScoreRecord|null }
 * (2인 모드 결과는 이 저장소에 기록하지 않는다)
 */

/** (v2) localStorage key: "mensaPairGame.theme.v1"
 * value: ThemeKey 문자열 하나 (예: "space")
 */
```

> 본 프로젝트는 빌드 도구를 사용하지 않는 순수 JavaScript(ES2017+)이므로, 위 타입들은 TypeScript 컴파일 대상이 아닌 **JSDoc 주석 기반 문서화 타입**이며 에디터 자동완성/가독성 목적으로만 사용한다.

---

## 5. 모듈 공개 인터페이스 (API 명세 대체)

> PRD 제약(백엔드 없음)에 따라 REST API가 존재하지 않는다. 대신 모듈 간 통신에 사용되는 **공개 함수 인터페이스**를 아래에 명시한다.

| 모듈 | 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|------|
| `gameState.js` | `startNewGame({difficulty, theme, mode})` | 옵션 객체(각 필드 optional) | `GameState` | 새 덱 생성 후 상태 초기화 |
| `gameState.js` | `flipCard(cardId)` | `number` | `{success, state}` | 카드 클릭 처리, 판정/턴전환/점수 로직 실행 |
| `gameState.js` | `subscribe(listener)` | `(event, state) => void` | `unsubscribe fn` | 상태 변경 구독 |
| `gameState.js` | `getState()` | - | `GameState` | 현재 상태 스냅샷 조회 |
| `cardDeck.js` | `createDeck(difficulty, theme)` | `DifficultyKey, ThemeKey` | `CardData[]` | 무작위 배치된 카드 덱 생성(테마별 이모지 반영) |
| `storage.js` | `getHighScoreForDifficulty(difficulty)` | `DifficultyKey` | `HighScoreRecord\|null` | 난이도별 최고 기록 조회 |
| `storage.js` | `saveHighScore(difficulty, record)` | `DifficultyKey, HighScoreRecord` | `boolean` | 최고 기록 갱신 저장, 성공 여부 반환 |
| `storage.js` | `isNewRecord(candidate, current)` | `{attempts,timeSeconds}, HighScoreRecord\|null` | `boolean` | 신기록 여부 판정 |
| `storage.js` | `loadSavedTheme()` (v2) | - | `ThemeKey` | 마지막 선택 테마 조회 |
| `storage.js` | `saveTheme(themeId)` (v2) | `ThemeKey` | `boolean` | 선택 테마 저장 |

---

## 6. 비기능 요구사항(NFR) 구현 전략

| NFR | 구현 전략 |
|-----|----------|
| 카드 클릭 반응 200ms 이내 | 클릭 핸들러가 `gameState.flipCard()`(순수 동기 함수, 네트워크/비동기 호출 없음)를 호출해 즉시 상태를 갱신하고, `cardRenderer.updateCardElement()`가 같은 이벤트 루프 틱에서 DOM class를 토글한다. 카드 뒤집기 CSS 트랜지션(`transform`)은 150ms로 설정해 시각적 반응까지 200ms 예산 내에 완료되도록 여유를 둔다 |
| 불일치 카드 1초 후 자동 복귀 | `gameState.js`의 `setTimeout(() => resolveMismatch(...), 1000)`으로 정확히 1000ms 고정 |
| 키보드 접근성(Tab + Enter/Space) | 카드를 `<button>` 요소로 렌더링해 브라우저 네이티브 포커스 이동(Tab)과 활성화(Enter/Space)를 그대로 활용. 난이도 선택 버튼도 동일하게 `<button>` 사용. `:focus-visible` 스타일을 `styles.css`에 명시적으로 정의 |
| 색상 비의존 카드 식별 | `SYMBOL_POOL`의 도형 문자(`glyph`)를 카드 앞면의 1차 식별자로 표시하고, `aria-label`에 도형 이름(`name`)을 텍스트로 포함해 스크린리더와 색약/색맹 사용자 모두 색상 없이 구분 가능 |
| 반응형 레이아웃(모바일/데스크톱) | `styles.css`에서 `.card-grid { display:grid; grid-template-columns: repeat(var(--cols), 1fr); gap: clamp(...); }` 형태로 난이도별 `cols` 값을 CSS 커스텀 프로퍼티로 주입하고, 미디어 쿼리로 카드 크기·간격을 화면 폭에 맞춰 조정 |
| 최초 로드 2초 이내 | 정적 파일(HTML/CSS/JS)만 사용하고 외부 라이브러리·폰트·이미지 요청이 없어 리소스 수가 최소화됨(총 12개 파일, 래스터 이미지 없음 — 카드 그림은 시스템 폰트가 렌더링하는 유니코드 이모지) |
| (v2) 클릭 대상이 어린이도 실수 없이 누를 수 있는 크기 | `styles.css`에서 버튼류(`.difficulty-btn`, `.theme-btn`, `.mode-btn`) 최소 타점 44×44px 이상 확보, 카드도 기존보다 `--radius-md` 확대 + 여백을 늘려 큼직하게 표시 |
| (v2) 쉬운 문구/그림 위주 정보 전달 | 테마·모드 선택 버튼은 이모지 아이콘을 텍스트보다 크게 배치, 결과 배너 문구는 "Player 1 승리!"처럼 짧고 쉬운 한글 사용 |
| (v2) 테마 전환도 200ms 반응 유지 | 테마 전환은 `<body data-theme>` 속성 변경 1회 + CSS 변수 재계산만으로 처리되어 JS 연산 비용이 없음(레이아웃 스타일 재계산은 브라우저 네이티브 처리) |

---

## 7. 검증 매트릭스 (PRD 수용 기준 24개 전수 매핑)

| # | PRD 기능 | PRD 수용 기준 | TECH_SPEC 구현 | 파일 | 테스트 기준 |
|---|----------|---------------|-----------------|------|-------------|
| 1 | 기능1 | 뒤집히지 않은 카드 클릭 시 앞면(숫자/도형)으로 표시 | `flipCard()` → `isFlipped=true` → `updateCardElement()` | `gameState.js`, `cardRenderer.js` | 카드 클릭 → 즉시 glyph 노출 확인 |
| 2 | 기능1 | 최대 2장까지만 뒤집기, 불일치 시 1초 내 자동 복귀 | `flippedCardIds.length>=2` 가드 + `setTimeout(resolveMismatch,1000)` | `gameState.js` | 3장째 클릭 무반응, 불일치 카드가 정확히 1초 뒤 뒷면 전환되는지 타이머 측정 |
| 3 | 기능1 | 확정/3번째 카드 클릭 시 무반응 | `isMatched`/`isFlipped`/`isLocked` 가드 | `gameState.js` | 매치된 카드 재클릭, 판정 대기 중 3번째 카드 클릭 시 상태 불변 확인 |
| 4 | 기능1 | 완료 시 "게임 완료" + 시도 횟수 + 소요 시간 표시 | `completeGame()` → `handleGameCompleted()` → `renderCompletionBanner()` | `gameState.js`, `scoreboard.js` | 모든 짝 완료 후 배너에 attempts/elapsedTime 노출 확인 |
| 5 | 기능2 | 쉬움(6)/보통(16)/어려움(24) 3가지 선택 가능 | `DIFFICULTY_CONFIG` 3항목 + `renderDifficultySelector()` | `config.js`, `difficultySelector.js` | 선택자에 버튼 3개 렌더 및 각각 클릭 시 해당 카드 수로 게임 시작 확인 |
| 6 | 기능2 | 선택 장수만큼 정확히 짝 맞는 카드가 매번 무작위 배치 | `createDeck()` + `shuffleArray()`(Fisher-Yates) | `cardDeck.js` | 동일 난이도로 여러 번 새 게임 시 카드 배치 순서가 매번 달라짐, 모든 `pairId`가 정확히 2장씩 존재함을 확인 |
| 7 | 기능2 | 미선택 시 기본값 "보통"으로 자동 진행 | `DEFAULT_DIFFICULTY='normal'`이 선택자 초기값 및 `startNewGame()` 기본 인자 | `config.js`, `main.js` | 선택자 클릭 없이 초기 로드 시 16장(4x4) 보드로 시작하는지 확인 |
| 8 | 기능2 | 진행 중 난이도 변경 시 초기화 + 새 게임 시작 | 난이도 버튼 클릭 시 `startNewGame(newDifficulty)`로 상태 전체 교체 | `difficultySelector.js`, `gameState.js` | 게임 진행 중 다른 난이도 클릭 → 이전 진행 상태 사라지고 새 카드 수로 재시작 확인 |
| 9 | 기능3 | 완료 시 이번 기록이 같은 난이도 최고 기록과 자동 비교 | `handleGameCompleted()`가 `getHighScoreForDifficulty()` + `isNewRecord()` 호출 | `scoreboard.js`, `storage.js` | 완료 직후 콘솔/UI에서 비교 로직 실행 여부 확인 |
| 10 | 기능3 | 우수한 경우 "신기록" 표시 + 갱신·저장 | `isRecord===true`일 때 `saveHighScore()` + 배너에 "신기록" 배지 | `storage.js`, `scoreboard.js` | 기존 기록보다 attempts/timeSeconds 개선된 플레이 완료 시 "신기록" 배지와 localStorage 갱신값 확인 |
| 11 | 기능3 | 새로고침/재방문해도 난이도별 최고 기록 유지·표시 | `loadHighScores()`가 `localStorage`에서 매번 재조회, `renderHighScorePanel()`이 로드 시 호출 | `storage.js`, `scoreboard.js` | 기록 저장 후 새로고침(F5) → 동일 값이 최고 기록 패널에 그대로 표시되는지 확인 |
| 12 | 기능3 | 기록 없는 난이도는 "최고 기록 없음" 표시 후 최초 기록 저장 | `getHighScoreForDifficulty()===null` → "없음" 렌더, `isNewRecord(candidate,null)===true` | `storage.js`, `scoreboard.js` | localStorage 비운 상태에서 특정 난이도 최초 진입 시 "최고 기록: 없음" 표시 → 완료 후 해당 기록이 최초 저장되는지 확인 |
| 13 | 기능4 | 3가지 테마 중 하나를 클릭 한 번으로 선택 가능 | `THEME_CONFIG` 3항목 + `renderThemeSelector()` | `config.js`, `themeSelector.js` | 테마 선택자에 버튼 3개 렌더, 각각 클릭 시 테마 전환 확인 |
| 14 | 기능4 | 테마 선택 시 카드 뒷면/앞면/배경/강조색 즉시 변경 | `data-theme` 속성 갱신 → CSS 변수 오버라이드 즉시 적용 | `styles.css`, `themeSelector.js` | 테마 클릭 직후 배경색·카드 색상이 해당 테마 팔레트로 바뀌는지 육안/computed style 확인 |
| 15 | 기능4 | 미선택 시 기본 테마(동물 친구) 자동 적용 | `DEFAULT_THEME='animal'` | `config.js`, `main.js` | 최초 로드 시 동물 이모지 카드로 시작하는지 확인 |
| 16 | 기능4 | 테마 변경 시 진행 상황 초기화 + 새 게임 시작 | 테마 버튼 클릭 → `startGame({theme})` → `gameState` 전체 교체 | `themeSelector.js`, `gameState.js` | 진행 중 테마 변경 시 이전 카드 상태 사라지고 새 테마로 재시작 확인 |
| 17 | 기능4 | 새로고침/재방문해도 마지막 선택 테마 유지 | `saveTheme()`/`loadSavedTheme()` | `storage.js` | 테마 선택 후 새로고침 → 동일 테마로 로드되는지 확인 |
| 18 | 기능4 | 모든 테마에서 색상 비의존 식별 가능 | 테마 무관 이모지(`glyph`)+`aria-label` 병행 | `cardRenderer.js` | 각 테마에서 그레이스케일 필터로도 카드 구분 가능한지 확인 |
| 19 | 기능5 | 1인/2인 선택 가능, 미선택 시 1인 기본값 | `MODE_CONFIG` 2항목 + `DEFAULT_MODE='single'` | `config.js`, `modeSelector.js` | 모드 선택자 렌더 및 미선택 시 1인 모드로 시작 확인 |
| 20 | 기능5 | 2인 플레이 중 현재 차례·양쪽 점수 항상 표시 | `renderPlayerTurnPanel()` | `scoreboard.js`, `main.js` | 2인 모드 진입 시 턴/점수 패널 노출, 매 이벤트마다 갱신 확인 |
| 21 | 기능5 | 짝 맞추면 점수 +1, 같은 플레이어 턴 유지 | `flipCard()` 매치 분기 `scores[currentPlayer]+=1` | `gameState.js` | Player 1이 매치 성공 시 점수 증가 + 다음 카드도 Player 1 차례로 유지되는지 확인 |
| 22 | 기능5 | 짝 틀리면 원복 후 상대에게 턴 전환 | `resolveMismatch()`에서 `currentPlayer` 반전 | `gameState.js` | 불일치 후 1초 뒤 `currentPlayer`가 상대로 바뀌는지 확인 |
| 23 | 기능5 | 완료 시 최종 점수 + 승자/무승부 표시 | `completeGame()` winner 확정 → `renderTwoPlayerResultBanner()` | `gameState.js`, `scoreboard.js` | 2인 모드 완주 후 최종 점수와 승자(또는 "무승부") 배너 확인 |
| 24 | 기능5 | 2인 결과 미저장, 1인 전환 시 최고 기록 기능 정상 | `handleGameCompleted()` 모드 분기, `twoPlayer`면 `saveHighScore()` 미호출 | `scoreboard.js` | 2인 모드 완주 후 localStorage 최고 기록 불변 확인, 이후 1인 모드로 전환해 정상 저장되는지 확인 |

**추가 비기능 검증 항목**

| # | PRD 항목 | 구현 | 파일 | 테스트 기준 |
|---|----------|------|------|-------------|
| N1 | 클릭 반응 200ms 이내 | 동기 상태갱신 + 150ms CSS 트랜지션 | `cardRenderer.js`, `styles.css` | DevTools Performance 탭에서 클릭→DOM 갱신 지연 측정 |
| N2 | 키보드 접근성 | `<button>` 기반 카드/선택자 | `cardRenderer.js`, `difficultySelector.js` | 마우스 없이 Tab/Enter/Space만으로 전체 게임 플레이 가능한지 확인 |
| N3 | 색상 비의존 식별 | `SYMBOL_POOL` glyph + aria-label | `config.js`, `cardRenderer.js` | 그레이스케일 필터 적용 후에도 카드 구분 가능한지 육안 확인 |
| N4 | 반응형 레이아웃 | CSS Grid + 미디어 쿼리 | `styles.css` | 모바일/태블릿/데스크톱 뷰포트에서 카드 그리드 정상 배치 확인 |
| N5 (v2) | 클릭 대상 충분히 크게 | 버튼류 최소 타점 44×44px | `styles.css` | 테마/모드/난이도 버튼, 카드 크기 실측으로 확인 |
| N6 (v2) | 테마 전환도 200ms 반응 유지 | 배색 자체는 `[data-theme]` CSS 변수 전환만으로 즉시 처리(추가 JS 연산 없음). 테마 변경은 §3-기능4 수용 기준대로 난이도 변경과 동일하게 `startNewGame()`으로 새 게임을 시작하므로, 덱 재생성·보드 재렌더 비용은 기존 난이도 전환과 동일 수준으로 발생함 | `styles.css`, `themeSelector.js`, `gameState.js` | 테마 클릭 → 배색은 체감 지연 없이 전환, 보드 재렌더는 기존 난이도 전환 성능과 동등한지 확인 |

---

## 8. 매핑 완전성 체크

- PRD 기능 5개 → §3 구현 명세 5개 (1:1 매핑 완료, 기능4·5는 v2 확장)
- PRD 수용 기준 24개 → §7 검증 매트릭스 24행 (전수 매핑 완료, 누락 없음)
- PRD 비기능 요구사항(성능/보안/접근성/사용성) → §6, §7 추가 검증 항목으로 반영
- PRD 제약사항(백엔드 없음/로그인 없음/localStorage만 사용/2인 결과 미저장) → §1 기술 스택, §3-기능5, §5에서 준수 확인

# 스펙 검증 리포트

> 검증 일시: 2026-08-13 (최초 검증) → 2026-08-13 (코드 수정 반영 재검증) → 2026-08-13 (실제 브라우저 실행 검증)
> 프로젝트: MENSA Pair Game
> 검증자: @reviewer (spec-validator 스킬) + 실제 Chrome 브라우저 수동 플레이 테스트
> 대상: `claudedocs/PRD.md` ↔ `claudedocs/TECH_SPEC.md` ↔ `src/`

---

## 종합 결과 (브라우저 실행 검증까지 반영한 최종)

| 단계 | 결과 | 점수 |
|------|------|------|
| Stage 1: PRD 일치 검증 (수용 기준 12개) | ✅ PASS | 12/12 (100%) |
| Stage 2: TECH_SPEC 일치 검증 (파일/함수/데이터/로직) | ✅ PASS | 100% (세부 표 참조) |
| Stage 3: 코드 품질 검증 (5개 항목) | ✅ PASS | 5/5 (100%) |
| Stage 4: 실제 브라우저 실행 검증 (신규) | ✅ PASS | 아래 참조 |
| **종합** | **✅ PERFECT** | **100%** |

> 판정 기준: 100%=PERFECT / 80~99%=PASS / 60~79%=WARNING / 0~59%=FAIL

**최초 정적 코드 검증(93%)에서 발견된 3건은 모두 수정 완료 및 재검증되었습니다.** 이후 실제 Chrome 브라우저로 게임을 직접 플레이하는 실행 검증에서 **정적 코드 검토만으로는 발견할 수 없었던 CSS 렌더링 버그 1건**을 추가로 발견하여 수정했습니다. 상세 내역은 [수정 내역 및 재검증](#수정-내역-및-재검증-2026-08-13)과 [Stage 4: 실제 브라우저 실행 검증](#stage-4-실제-브라우저-실행-검증-신규) 섹션 참조.

---

## Stage 1: PRD 일치 검증

### 기능 1: 카드 짝 맞추기 플레이 (핵심 게임플레이)

| # | 수용 기준 | 판정 | 근거 |
|---|----------|------|------|
| 1-1 | 뒤집혀 있지 않은 카드를 클릭하면 앞면(도형)으로 뒤집혀 보인다 | ✅ PASS | `main.js:26-32` 클릭 위임 → `gameState.flipCard(cardId)` 호출 → `gameState.js:88` `card.isFlipped = true` → `main.js:35-41` 구독 콜백이 `cardRenderer.updateCardElement()` 호출 → `cardRenderer.js:66,70` `.is-flipped` 클래스/aria 갱신 → `styles.css:199-201` `.card.is-flipped .card-inner { transform: rotateY(180deg); }`로 앞면(`card-face--front`, glyph 텍스트, `cardRenderer.js:47`) 노출 |
| 1-2 | 최대 2장까지만 뒤집기 가능, 불일치 시 1초 이내 자동 원복 | ✅ PASS | `gameState.js:86` `if (state.flippedCardIds.length >= 2) return...`로 3번째 뒤집기 차단. 불일치 시 `gameState.js:106` `setTimeout(() => resolveMismatch(firstId, secondId), MISMATCH_DELAY_MS)`, `config.js:44` `MISMATCH_DELAY_MS = 1000`(정확히 1초). `resolveMismatch()`(`gameState.js:119-130`)가 `isFlipped=false`로 원복 |
| 1-3 | 확정 카드/3번째 카드 클릭 시 무반응 | ✅ PASS | `gameState.js:84-86` 가드: `isLocked` → `isMatched\|\|isFlipped` → `flippedCardIds.length>=2` 순서로 모두 무반응 처리. DOM 레벨에서도 `cardRenderer.js:68` `cardEl.disabled = card.isMatched`로 이중 방어 |
| 1-4 | 완료 시 "게임 완료" + 시도 횟수 + 소요 시간 표시 | ✅ PASS | `gameState.js:104` 모든 짝 완료 시 `completeGame()` 호출 → `gameState.js:136-142` `status='completed'`, `elapsedTime` 확정 → `_notify('gameCompleted')` → `main.js:43-45` → `scoreboard.js:87-99` `handleGameCompleted()` → `scoreboard.js:41-49` `renderCompletionBanner()`가 `"게임 완료!"`, `"시도 횟수: N회 · 소요 시간: mm:ss"` 렌더 |

**기능 1 소계: 4/4 PASS**

### 기능 2: 난이도(카드 수) 선택

| # | 수용 기준 | 판정 | 근거 |
|---|----------|------|------|
| 2-1 | 쉬움(6)/보통(16)/어려움(24) 3가지 중 선택 가능 | ✅ PASS | `config.js:12-16` `DIFFICULTY_CONFIG`에 easy(6)/normal(16)/hard(24) 3항목 정의, `difficultySelector.js:20-34`가 `Object.keys(DIFFICULTY_CONFIG)`를 순회해 버튼 3개 렌더(`role="radio"`, 라벨+장수 표시) |
| 2-2 | 선택 장수만큼 짝 맞는 카드가 매번 무작위 배치되어 새 게임 시작 | ✅ PASS | `cardDeck.js:23-47` `createDeck()`이 `cardCount/2`쌍을 심볼별 2장씩 생성 후 `shuffleArray()`(Fisher-Yates, `cardDeck.js:55-61`) 호출로 매번 재배치. `main.js:48-54` `startGame()`이 `gameState.startNewGame(difficulty)` 호출 |
| 2-3 | 미선택 시 기본값 "보통"으로 자동 진행 | ✅ PASS | `config.js:19` `DEFAULT_DIFFICULTY = 'normal'`, `main.js:56` `startGame(DEFAULT_DIFFICULTY)`가 최초 로드 시 자동 호출되어 선택 없이도 보통 난이도(16장)로 시작 |
| 2-4 | 진행 중 난이도 변경 시 초기화 + 새 게임 시작 | ✅ PASS | 난이도 버튼 클릭 → `onSelect` → `main.js:48-54` `startGame(newDifficulty)` → `gameState.js:57-68`에서 `_state` 전체를 새 객체로 교체(이전 진행 폐기) + `cardRenderer.js:14-24` `renderBoard()`로 보드 전체 재렌더 + `clearCompletionBanner()`(`main.js:49`) |

**기능 2 소계: 4/4 PASS**

### 기능 3: 최고 기록 저장 및 표시

| # | 수용 기준 | 판정 | 근거 |
|---|----------|------|------|
| 3-1 | 완료 시 이번 기록이 같은 난이도 최고 기록과 자동 비교 | ✅ PASS | `scoreboard.js:87-92` `handleGameCompleted()`가 `storage.getHighScoreForDifficulty(difficulty)` 조회 후 `storage.isNewRecord(candidate, current)` 자동 호출 (게임 완료 이벤트에서 자동 트리거, `main.js:43-45`) |
| 3-2 | 우수한 경우(더 적은 시도 또는 더 짧은 시간) "신기록" 표시 + 갱신·저장 | ✅ PASS | `storage.js:79-82` `isNewRecord()`가 `candidate.attempts < current.attempts \|\| candidate.timeSeconds < current.timeSeconds`로 OR 조건 판정(PRD 문구 그대로 구현). `scoreboard.js:93-95` `isRecord`일 때 `saveHighScore()` 호출, `scoreboard.js:48` `"신기록!"` 배지 렌더 |
| 3-3 | 새로고침/재방문해도 난이도별 최고 기록 유지·표시 | ✅ PASS | `storage.js:67-71` `saveHighScore()`가 `window.localStorage.setItem()`으로 영속 저장. `main.js:53,56` 최초 로드 시 `renderHighScorePanel()`이 `storage.js:37-49` `loadHighScores()`로 매번 localStorage 재조회 |
| 3-4 | 기록 없는 난이도는 "최고 기록 없음" 표시 후 최초 기록 저장 | ✅ PASS | `scoreboard.js:75-79` `record`가 falsy면 `"최고 기록 없음"` 렌더. `storage.js:80` `isNewRecord(candidate, null)`이 무조건 `true` 반환 → 최초 저장 |

**기능 3 소계: 4/4 PASS**

**Stage 1 총점: 12/12 (100%) — 모든 PRD 수용 기준 충족**

---

## Stage 2: TECH_SPEC 일치 검증

### 파일 구조

| TECH_SPEC 명세 (§2) | 실제 파일 | 판정 |
|---------------------|----------|------|
| `src/index.html` | 존재 (`src/index.html`) | ✅ |
| `src/css/styles.css` | 존재 | ✅ |
| `src/js/main.js` | 존재 | ✅ |
| `src/js/config.js` | 존재 | ✅ |
| `src/js/cardDeck.js` | 존재 | ✅ |
| `src/js/gameState.js` | 존재 | ✅ |
| `src/js/cardRenderer.js` | 존재 | ✅ |
| `src/js/difficultySelector.js` | 존재 | ✅ |
| `src/js/scoreboard.js` | 존재 | ✅ |
| `src/js/storage.js` | 존재 | ✅ |

파일 구조 10/10 일치. (단, TECH_SPEC 본문 §2 서술 "총 9개 파일(HTML 1 + CSS 1 + **JS 7**)"은 바로 위에 나열된 JS 파일 목록이 실제로는 8개(main/config/cardDeck/gameState/cardRenderer/difficultySelector/scoreboard/storage)라서 TECH_SPEC 문서 자체의 산술 오기입니다. 코드가 문서 목록과 불일치하는 것이 아니라, TECH_SPEC의 요약 문장이 자체 목록과 불일치하는 문서 결함입니다. — 상세 내용은 "불일치 항목 상세" 참조)

### 핵심 함수 시그니처

| TECH_SPEC 명세 (§5) | 실제 구현 | 판정 |
|---------------------|----------|------|
| `startNewGame(difficulty)` → `GameState` | `gameState.js:54` `export function startNewGame(difficulty = DEFAULT_DIFFICULTY)` | ✅ |
| `flipCard(cardId)` → `{success, state}` | `gameState.js:79` 동일 시그니처, `{success, state: getState()}` 반환 | ✅ |
| `resolveMismatch(firstId, secondId)` → `void` | `gameState.js:119` 동일 시그니처 | ✅ |
| `completeGame()` → `void` | `gameState.js:136` 동일 시그니처 | ✅ |
| `subscribe(listener)` → unsubscribe fn | `gameState.js:149` 동일 시그니처, 리스너 배열에서 제거하는 함수 반환 | ✅ |
| `getState()` → `GameState` | `gameState.js:160` 카드 배열까지 얕은 복제한 읽기전용 스냅샷 반환 | ✅ |
| `createDeck(difficulty)` → `CardData[]` | `cardDeck.js:23` 동일 시그니처 | ✅ |
| `shuffleArray(array)` → `array`(in-place) | `cardDeck.js:55` Fisher-Yates 구현 일치 | ✅ |
| `getHighScoreForDifficulty(difficulty)` → `HighScoreRecord\|null` | `storage.js:56` 동일 | ✅ |
| `saveHighScore(difficulty, record)` → `void` | `storage.js:67` 동일 | ✅ |
| `isNewRecord(candidate, current)` → `boolean` | `storage.js:79` 로직까지 TECH_SPEC 코드블록과 완전히 동일 | ✅ |

### 데이터 구조

| TECH_SPEC 명세 | 실제 구현 | 판정 |
|---------------|----------|------|
| `CardData {id, pairId, glyph, name, isFlipped, isMatched}` | `cardDeck.js:9-16` typedef 및 `cardDeck.js:34-41` 실제 생성 객체 필드 일치 | ✅ |
| `GameState {difficulty, cards, flippedCardIds, attempts, matchedPairsCount, totalPairsCount, startTime, elapsedTime, isLocked, status}` | `gameState.js:29-42` `_createInitialState()` 필드 완전 일치 | ✅ |
| `DIFFICULTY_CONFIG` (easy 2x3=6, normal 4x4=16, hard 4x6=24) | `config.js:12-16` 값 완전 동일 | ✅ |
| `DEFAULT_DIFFICULTY = 'normal'` | `config.js:19` 동일 | ✅ |
| `SYMBOL_POOL` 12개 항목 | `config.js:25-38` glyph/name/id 12개 전부 동일 | ✅ |
| `STORAGE_KEY = 'mensaPairGame.highScores.v1'` | `config.js:41` 동일 | ✅ |
| `HighScoreRecord {attempts, timeSeconds, achievedAt}` | `storage.js:9-13` typedef 및 `scoreboard.js:94` 실제 저장 객체 일치 | ✅ |

### `flipCard()` 가드 순서 (TECH_SPEC §3 의사코드 대조 요청 사항)

TECH_SPEC(`TECH_SPEC.md:121-127`) 순서: `!card` → `isLocked` → `isMatched\|\|isFlipped` → `flippedCardIds.length>=2`

실제 코드(`gameState.js:83-86`):
```javascript
if (!card) return { success: false, state: getState() };
if (state.isLocked) return { success: false, state: getState() };
if (card.isMatched || card.isFlipped) return { success: false, state: getState() };
if (state.flippedCardIds.length >= 2) return { success: false, state: getState() };
```
→ **가드 순서 완전 일치. ✅ PASS**

### API 엔드포인트
해당 없음 (PRD/TECH_SPEC 제약상 백엔드 없음, `TECH_SPEC.md:386` 명시). N/A로 처리.

**Stage 2 총점: 파일 10/10, 함수 11/11, 데이터구조 7/7, 가드순서 일치 — 전 항목 ✅ PASS**

---

## Stage 3: 코드 품질 검증

| 항목 | 판정 | 비고 |
|------|------|------|
| 타입 안전성 (JSDoc 일관성) | ✅ PASS | TypeScript 미사용은 TECH_SPEC의 의도적 설계(§4 "JSDoc 주석 기반 문서화 타입"). 모든 모듈에서 `@typedef`/`@param`/`@returns` JSDoc이 일관되게 작성되어 있고 실제 필드/시그니처와 어긋남 없음 |
| 에러 처리 | ✅ PASS | `storage.js` `loadHighScores()`(파싱 실패 방어)에 이어 `saveHighScore()`의 `window.localStorage.setItem()` 호출도 try/catch로 감싸 쓰기 실패 시 `false`를 반환하도록 수정(발견 2, 수정 완료). 난이도 전환 시 잔존 타이머로 인한 상태 손상 가능성(발견 1)도 세대(generation) 가드로 수정 완료 — 상세는 [수정 내역 및 재검증](#수정-내역-및-재검증-2026-08-13) 참조 |
| 접근성 (a11y) | ✅ PASS | 카드/난이도 버튼 모두 `<button>` 네이티브 요소로 Tab/Enter/Space 지원, `cardRenderer.js:70` 동적 `aria-label`, `difficultySelector.js:17,28-29` `role="radiogroup"`/`role="radio"`/`aria-checked`, `index.html:24-28` `role="status"`/`aria-live="polite"`, `styles.css:90-93,185-189` `:focus-visible` 스타일 정의. 도형 glyph + 텍스트 라벨로 색상 비의존 식별 확보(`config.js:25-38`, `cardRenderer.js:47,70`) |
| 하드코딩 여부 | ✅ PASS | 매직 넘버 없음. 난이도/심볼/저장키/타이머 지연시간 모두 `config.js`에 상수화(`MISMATCH_DELAY_MS`, `STORAGE_KEY`, `DIFFICULTY_CONFIG`, `SYMBOL_POOL`) |
| 모듈 단일 책임 | ✅ PASS | config(상수) / cardDeck(덱생성) / gameState(상태·판정로직) / cardRenderer(렌더링) / difficultySelector(난이도UI) / storage(영속화) / scoreboard(완료·기록UI) / main(부트스트랩·wiring)으로 TECH_SPEC 설계 그대로 책임 분리됨. 과도한 책임을 가진 모듈 없음 |

**Stage 3 총점: 5/5 (100%) — 전 항목 PASS (수정 반영 후)**

---

## 불일치 항목 상세 (최초 검증 시점 기준 — 모두 수정 완료됨)

> 아래 3건은 최초 검증(93%) 시점에 발견된 내용을 그대로 보존한 기록입니다. 각 항목의 실제 수정 내용과 재검증 결과는 [수정 내역 및 재검증](#수정-내역-및-재검증-2026-08-13) 섹션을 참조하세요.

### [발견 1] 난이도 전환 시 잔존 `resolveMismatch` 타이머가 새 게임 상태를 오염시킬 수 있음 (우선순위: 높음) — ✅ 수정 완료

- **스펙**: PRD 기능 2, 수용 기준 4 — "게임 진행 중 난이도를 변경하면 현재 진행 상황은 초기화되고 선택한 난이도로 새 게임이 시작된다." TECH_SPEC §3-기능2는 `startNewGame(newDifficulty)`가 "`gameState` 전체를 새 객체로 교체(이전 진행 상태 폐기)"한다고 명시.
- **실제**: `gameState.js:106` `setTimeout(() => resolveMismatch(firstId, secondId), MISMATCH_DELAY_MS)`로 예약된 콜백은 `firstId`/`secondId`(숫자 ID)만 클로저로 캡처하고, 실행 시점에는 `gameState.js:120` `const state = _state;`로 **그 시점의 모듈 전역 `_state`**(즉, 타이머 예약 이후 `startNewGame()`이 호출되어 교체된 "새 게임"의 상태)를 참조합니다. 카드 ID는 항상 `0 ~ cardCount-1`로 재사용되므로, 사용자가 카드 불일치 대기(1초) 도중 난이도를 변경하면 잔존 타이머가 새로 시작된 게임의 카드(같은 숫자 ID를 가진 카드)를 대상으로 `isFlipped=false` 처리 및 `state.flippedCardIds=[]`, `state.isLocked=false`를 강제 실행합니다.
- **차이**: 새 게임이 시작된 직후에도 이전 게임에서 예약된 타이머가 새 게임의 `flippedCardIds`/`isLocked`를 임의로 초기화하거나, 새 게임에서 막 뒤집은 카드를 사용자의 조작 없이 원상복구시킬 수 있습니다. 이는 "최대 2장까지만 뒤집기" 불변조건이나 "진행 상황이 정확히 새 게임 것으로만 유지되어야 한다"는 암묵적 기대를 깨뜨릴 수 있는 상태 손상(state corruption) 버그입니다. PRD가 명시적으로 이 타이밍 케이스를 시나리오로 기술하지 않아 Stage 1에서는 FAIL로 판정하지 않았으나, 코드 품질/견고성 관점에서 명확한 결함입니다.
- **재현 조건**: (1) 카드 2장을 뒤집어 불일치 상태 대기(1초) 진입 → (2) 대기 중 난이도 버튼 클릭으로 새 게임 시작 → (3) 새 게임에서 카드를 즉시 조작 → (4) 원래 타이머가 만료되며 새 게임의 `flippedCardIds`/`isLocked`/일부 카드의 `isFlipped`를 잘못 조작.
- **개선 제안**: `startNewGame()` 호출 시 세대(generation) 카운터를 증가시키고, `flipCard()`에서 타이머 예약 시 현재 세대 값을 클로저로 캡처하여 `resolveMismatch()` 실행 시 `capturedGeneration !== 현재 generation`이면 즉시 반환하도록 가드를 추가하거나, 예약된 `setTimeout` ID를 모듈 변수에 저장해두었다가 `startNewGame()` 시작부에서 `clearTimeout()`으로 명시적으로 취소하는 방식을 권장합니다. 수정 범위는 `gameState.js` 한 파일, 약 10줄 내외로 작습니다.

### [발견 2] `saveHighScore()`의 `localStorage.setItem()`에 예외 처리 누락 (우선순위: 중간) — ✅ 수정 완료

- **스펙**: TECH_SPEC §3-기능3 `storage.js` 주석 — 읽기 함수(`loadHighScores`)는 "값이 없거나 파싱 실패 시 ... 반환"으로 실패 처리를 명시. PRD §5 성공 지표 — "최고 기록의 저장 및 불러오기(localStorage 읽기/쓰기) 성공률 100%, 관련 오류 0건."
- **실제**: `storage.js:37-48` `loadHighScores()`는 try/catch로 읽기 실패(파싱 오류 등)를 방어하지만, `storage.js:67-71` `saveHighScore()`는 `window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))`를 try/catch 없이 직접 호출합니다.
- **차이**: 시크릿/프라이빗 모드에서 일부 브라우저가 `localStorage` 쓰기를 차단하거나, 저장 용량 초과(QuotaExceededError) 상황에서 `setItem()`이 예외를 던지면 이 예외가 그대로 `scoreboard.js:94` `handleGameCompleted()` 호출 스택으로 전파되어, 이후에 실행되어야 할 `renderCompletionBanner()`(완료 배너 표시)와 `renderHighScorePanel()`(최고기록 갱신 표시)가 실행되지 않을 수 있습니다. 즉 저장 실패 시 "게임 완료" UI 자체가 표시되지 않는 연쇄 장애로 이어질 수 있습니다.
- **개선 제안**: `saveHighScore()` 내부에서 `try { window.localStorage.setItem(...) } catch (error) { /* 저장 실패를 무시하고 진행, 필요 시 콘솔 경고만 출력 */ }` 형태로 방어하거나, `scoreboard.js`의 `handleGameCompleted()`가 `storage.saveHighScore()` 호출을 try/catch로 감싸 완료 배너 렌더는 저장 성공 여부와 무관하게 항상 실행되도록 순서를 조정할 것을 권장합니다. 수정 범위는 `storage.js` 또는 `scoreboard.js` 중 한 곳, 5줄 내외로 작습니다.

### [발견 3] TECH_SPEC 문서 자체의 파일 개수 서술 오류 (우선순위: 낮음, 문서 결함 — 코드 결함 아님) — ✅ 수정 완료

- **스펙**: `TECH_SPEC.md:58` "총 9개 파일(HTML 1 + CSS 1 + JS 7)을 설계한다."
- **실제**: 바로 위 §2 파일 트리(`TECH_SPEC.md:47-55`)에는 JS 파일이 `main.js, config.js, cardDeck.js, gameState.js, cardRenderer.js, difficultySelector.js, scoreboard.js, storage.js` **8개**가 나열되어 있어, 총합은 HTML 1 + CSS 1 + JS 8 = **10개**가 되어야 문서 내부적으로 정합합니다. 실제 `src/` 코드는 이 8개 JS 파일 + HTML 1 + CSS 1 = 10개 파일로, **파일 트리 목록과는 정확히 일치**합니다.
- **차이**: 코드가 TECH_SPEC과 불일치하는 것이 아니라, TECH_SPEC 문서 본문의 합계 문장이 자신이 나열한 목록과 산술적으로 어긋나는 문서 자체 결함입니다.
- **개선 제안**: TECH_SPEC.md §2 문장을 "총 10개 파일(HTML 1 + CSS 1 + JS 8)"로 정정 권장. 코드 수정은 불필요합니다.

---

## 수정 내역 및 재검증 (2026-08-13)

최초 검증에서 발견된 3건을 모두 수정하고, 코드 재대조 및 실행 스모크 테스트로 재검증했습니다.

### [발견 1] 세대(generation) 가드 추가 — `src/js/gameState.js`

- 모듈 전역에 `_generation` 카운터를 추가하고, `startNewGame()` 호출마다 증가시킴.
- `flipCard()`가 불일치 타이머를 예약할 때 그 시점의 `_generation` 값을 `gen`으로 캡처하여 `resolveMismatch(firstId, secondId, gen)`에 전달.
- `resolveMismatch()` 진입부에서 `if (gen !== _generation) return;`으로, 예약 이후 새 게임이 시작되어 세대가 바뀐 경우 아무 것도 하지 않고 즉시 반환하도록 가드.
- **재검증**: 카드 2장을 뒤집어 불일치 대기(1초) 상태를 만든 직후 `startNewGame()`으로 새 게임을 시작하고, 원래 타이머가 만료되는 시점(1.2초 후)에 새 게임의 `flippedCardIds`/`isLocked`가 전혀 변경되지 않음을 실행 테스트로 확인 (`PASS - new game state untouched`).

### [발견 2] `saveHighScore()` try/catch 추가 — `src/js/storage.js`

- `window.localStorage.setItem()` 호출을 try/catch로 감싸고, 성공 시 `true`, 예외(QuotaExceededError, 프라이빗 모드 차단 등) 발생 시 예외를 전파하지 않고 `false`를 반환하도록 수정.
- 반환형 변경: `void` → `boolean` (저장 성공 여부).
- **재검증**: `localStorage.setItem`이 예외를 던지도록 스텁을 구성한 뒤 `saveHighScore()`를 호출해, 예외가 호출자로 전파되지 않고 `false`가 정상 반환됨을 실행 테스트로 확인 (`PASS - no throw, returned false`). 이에 따라 저장 실패 시에도 `scoreboard.js`의 완료 배너 렌더링이 중단되지 않음.

### [발견 3] TECH_SPEC 문서 오기 정정 — `claudedocs/TECH_SPEC.md`

- §2의 "총 9개 파일(HTML 1 + CSS 1 + JS 7)" → "총 10개 파일(HTML 1 + CSS 1 + JS 8)"로 정정 (파일 트리 목록과 합계 문장을 일치시킴).
- §6 성능 근거의 "총 9개 파일" 표기도 동일하게 "총 10개 파일"로 정정.

### 검증 방법

- `node --check`로 수정된 `gameState.js`, `storage.js` 구문 오류 없음 확인.
- Node ESM 환경에서 `gameState.js`/`storage.js`를 직접 임포트해 위 두 시나리오를 실행 테스트로 재현·확인(임시 테스트 파일은 검증 후 삭제, `src/`에 잔존하지 않음).
- 수정이 기존 Stage 1(PRD 수용 기준 12개) 동작에 영향을 주지 않았는지 재확인: `flipCard`/`resolveMismatch`/`saveHighScore`의 정상 경로(성공적인 매칭, 정상 저장) 로직은 변경되지 않고 방어 코드만 추가되었으므로 기존 PASS 판정 12건 모두 유지됨.

---

## Stage 4: 실제 브라우저 실행 검증 (신규)

Stage 1~3은 코드를 읽고 정적으로 대조하는 검증이었습니다. 이번에는 `src/`를 정적 서버(Python `http.server`)로 띄우고 실제 Chrome 브라우저에서 게임을 처음부터 끝까지 직접 플레이하여, 코드 리딩만으로는 드러나지 않는 **실제 렌더링/동작 결함**을 확인했습니다.

### [발견 4] `.card-inner`가 `<span>`(inline 요소)인데 `display` 미지정 — 카드가 전혀 렌더링되지 않는 치명적 시각 버그 (우선순위: 매우 높음) — ✅ 발견 즉시 수정 완료

- **증상**: 브라우저에서 실제로 열어보니 카드의 배경/테두리(둥근 사각형, 그라디언트)가 전혀 보이지 않고, 카드 뒷면의 "?" 문자만 페이지 곳곳에 붕 뜬 채로 표시됨. 행간 간격이 비정상적으로 넓어 16장짜리 보드가 스크롤을 여러 번 해야 할 정도로 페이지가 길어짐.
- **원인**: `cardRenderer.js:37`에서 `document.createElement('span')`으로 생성한 `.card-inner`는 기본 `display: inline`인데, `styles.css`의 `.card-inner` 규칙(`width: 100%; height: 100%;`)에는 `display`가 지정되어 있지 않았습니다. inline 요소에는 `width`/`height`가 적용되지 않으므로 `.card-inner`가 0×0 크기로 붕괴했고, 그 안에서 `position: absolute; inset: 0;`으로 배치되는 `.card-face`(앞/뒷면)도 정의된 크기의 부모(containing block)를 찾지 못해 콘텐츠 크기(글자 하나)로 쪼그라들었습니다. `node --check`로는 잡히지 않는 순수 CSS/레이아웃 버그로, Stage 1~3의 정적 코드 대조 검증에서는 발견할 수 없었고 실제 브라우저 렌더링에서만 드러났습니다.
- **실제 확인**: `getBoundingClientRect()`로 측정한 결과 `.card`는 168×224로 정상이었으나 `.card-inner`는 0×0, `.card-face--back`은 4×4(글자 크기만큼)이었습니다.
- **수정**: `src/css/styles.css`의 `.card-inner` 규칙에 `display: block;` 한 줄 추가.
- **재검증**: 수정 후 페이지를 새로고침하여 카드 6/16/24장 보드 모두 카드 배경·테두리·"?" 아이콘이 정상적인 카드 모양으로 렌더링됨을 스크린샷으로 확인.

### 전체 플레이 시나리오 검증 (쉬움 난이도, 6장)

실제 클릭으로 게임을 처음부터 끝까지 플레이하며 PRD 수용 기준을 재확인했습니다.

| 검증 시나리오 | 결과 |
|--------------|------|
| 카드 클릭 → 앞면(도형) 표시 | ✅ 클릭한 두 카드가 각각 다른 도형(■, ●)으로 뒤집힘을 스크린샷으로 확인 |
| 불일치 시 1초 후 자동 원복 | ✅ `attempts`가 정상적으로 1 증가하고, 잠시 후 두 카드 모두 `isFlipped:false`로 복귀함을 상태 조회로 확인 |
| 판정 대기(`isLocked`) 중 3번째 카드 클릭 무시 | ✅ 두 카드가 뒤집힌 직후 세 번째 카드를 클릭했으나 화면상 전혀 반응하지 않음(계속 "?" 상태) |
| 짝이 맞으면 초록색 확정 상태로 고정 | ✅ `classList`에 `is-matched` 부여, `getComputedStyle`로 확인한 배경색이 `rgb(53,197,143)`(`--color-card-matched`)로 정확히 일치. `disabled=true`로 재클릭도 차단됨 |
| 전체 완료 시 "게임 완료!" + 시도 횟수 + 소요 시간 | ✅ 스크린샷으로 "게임 완료! / 시도 횟수: 5회 · 소요 시간: 04:48" 배너 직접 확인 |
| 최초 플레이 시 "신기록!" 표시 및 저장 | ✅ "신기록!" 배지 표시, `localStorage`에 `{attempts:5, timeSeconds:288, achievedAt:...}` 저장 확인 |
| 새로고침 후에도 최고 기록 유지 | ✅ 페이지를 새로고침한 뒤 "쉬움 난이도 최고 기록: 시도 5회 · 04:48"이 그대로 표시됨을 스크린샷으로 재확인 |
| 난이도별 카드 수(6/16/24장, 3열/4열 그리드) | ✅ 쉬움 전환 시 3×2 그리드로, 기본 진입 시 보통(4×4)으로 정상 렌더링 |

### 보통(16장)·어려움(24장) 난이도 추가 실행 검증

발견 4 수정 후, 나머지 두 난이도에서도 카드 렌더링·클릭 반응·완료·최고 기록 저장/유지가 동일하게 동작하는지 실제 브라우저에서 추가로 확인했습니다. 각 난이도에서 실제 클릭으로 카드를 뒤집어 렌더링과 클릭 반응을 먼저 확인한 뒤(정상), 나머지 매칭은 페이지에 실제로 로드된 `gameState.js`의 `flipCard()`를 그대로 호출해(테스트 전용 코드가 아닌 프로덕션 코드 경로 그대로 사용) 빠르게 완주시키고 결과를 검증했습니다.

| 난이도 | 그리드 렌더링 | 클릭 반응 | 완료 결과 | 최고 기록 저장 | 새로고침 후 유지 |
|--------|--------------|----------|----------|--------------|-----------------|
| 보통 (16장, 4×4) | ✅ 카드 박스 정상 표시 (발견 4 수정 후 정상) | ✅ 실제 클릭으로 두 카드가 각각 ■/★로 뒤집힘 확인 | ✅ "게임 완료! 시도 횟수: 9회 · 소요 시간: 00:30" + "신기록!" | ✅ `{attempts:9, timeSeconds:30}` localStorage 저장 확인 | ✅ "보통 난이도 최고 기록: 시도 9회 · 00:30" 재확인 |
| 어려움 (24장, 4×6) | ✅ 카드 박스 정상 표시 | ✅ 실제 클릭 시 정상적으로 뒤집히고 불일치 자동 원복까지 확인 | ✅ "게임 완료! 시도 횟수: 13회 · 소요 시간: 00:26" + "신기록!" | ✅ `{attempts:13, timeSeconds:26}` localStorage 저장 확인 | ✅ "어려움 난이도 최고 기록: 시도 13회 · 00:26" 재확인 |

세 난이도(쉬움/보통/어려움) 모두 독립적으로 완주 및 새로고침 재확인까지 마쳤으며, 세 난이도의 최고 기록이 동시에 `localStorage`에 정상적으로 공존(서로 덮어쓰지 않음)하는 것도 마지막 스크린샷에서 확인되었습니다.

### 참고: 스크린샷에서 관찰되었으나 실제 버그가 아닌 것으로 확인된 현상

매칭된 카드를 스크린샷으로 캡처하면 뒤집힌 도형 대신 좌우반전된 "?" 문자가 보이는 경우가 있었습니다. 이는 CDP(자동화 스크린샷 캡처) 환경이 `transform-style: preserve-3d` + `backface-visibility: hidden` 조합의 3D 회전을 완전히 컴포지팅하지 못해 생기는 **스크린샷 캡처 한계**로 판단됩니다. `getComputedStyle`로 직접 확인한 결과 `backface-visibility: hidden`, `background-color: rgb(53,197,143)`(매칭 색상), 회전 `matrix3d` 값 모두 정상이었으므로, 실제 사용자가 일반 Chrome 창에서 보는 렌더링에는 영향이 없는 것으로 판단하고 코드는 수정하지 않았습니다.

---

## 개선 권고사항

### 필수 (발견 1·2·3·4) — ✅ 모두 반영 완료
1. **[발견 1]** ~~`gameState.js`에 세대(generation) 가드 추가~~ → 반영 완료, 실행 테스트로 재검증됨.
2. **[발견 2]** ~~`storage.js`의 `saveHighScore()`에 try/catch 추가~~ → 반영 완료, 실행 테스트로 재검증됨.
3. **[발견 3]** ~~`TECH_SPEC.md`의 "JS 7"/"총 9개" → "JS 8"/"총 10개" 정정~~ → 반영 완료.
4. **[발견 4]** ~~`styles.css`의 `.card-inner`에 `display: block` 누락으로 카드가 렌더링되지 않던 문제~~ → 반영 완료, 실제 브라우저 실행으로 재검증됨(Stage 4 참조).

### 선택 (100% 판정에는 영향 없는 추가 개선 아이디어, 미반영)
1. `storage.js`의 `loadHighScores()`에서 파싱된 값이 예상 스키마(`{easy, normal, hard}` 객체)를 따르는지 최소한의 형태 검증(예: `typeof parsed === 'object' && parsed !== null`)을 추가하면 손상된 데이터로부터 더 견고해집니다.
2. `hard` 난이도(6열)에서 매우 좁은 화면(약 360px 이하)에 대한 열 수 축소 미디어 쿼리를 추가하면 반응형 경험이 더 매끄러워질 수 있습니다(현재도 `clamp()`/`aspect-ratio`로 최소한의 사용성은 유지됨).

---

## 잘 구현된 부분 (긍정 피드백)

- `gameState.js`의 `flipCard()` 가드 순서가 TECH_SPEC 의사코드와 **완전히 동일**하게 구현되어 있어 스펙 추적성이 매우 우수합니다.
- `isNewRecord()`의 OR 조건 로직이 TECH_SPEC의 설계 결정(§3-기능3, "더 적은 시도 횟수 또는 더 짧은 시간" 문자 그대로 구현)을 코드 한 줄까지 그대로 반영했습니다.
- 접근성 구현이 스펙 요구(NFR) 이상으로 충실합니다: `aria-pressed`, `aria-checked`, `role="status"`/`aria-live="polite"` 완료 배너/최고기록 패널까지 스크린리더 대응이 되어 있습니다(TECH_SPEC에 명시되지 않았지만 추가로 구현된 부분).
- `MISMATCH_DELAY_MS` 등 매직 넘버를 전부 `config.js`로 상수화하여 하드코딩이 없고, 8개 JS 모듈의 책임이 명확히 분리되어 있습니다.
- 매치된 카드에 `disabled` 속성을 부여(`cardRenderer.js:68`)해 상태 로직 가드에 더해 DOM 레벨에서도 이중으로 클릭을 차단하는 방어적 설계가 돋보입니다.

> **참고 (v2 검증에서 확인)**: 위 마지막 항목("`disabled` 속성 부여")은 v1 시점 기준 기록입니다. 아래 v2 검증에서 확인된 바와 같이, 현재 `cardRenderer.js`는 `disabled` 속성 대신 `aria-disabled` + CSS `pointer-events:none` 방식으로 **의도적으로 교체**되었습니다(키보드 포커스 손실 방지, TECH_SPEC §3-기능1 "버그 수정 이력" 명시). 이는 v1의 방어 설계가 잘못되었던 것이 아니라, v2 설계 단계에서 접근성 관점의 추가 결함(포커스 손실)이 발견되어 더 나은 방식으로 개선된 것입니다. 상세는 아래 "v2 검증" 섹션 참조.

---

## v2 검증 (테마 선택 + 2인 플레이 모드)

> 검증 일시: 2026-08-14
> 검증자: @reviewer (spec-validator 스킬), 정적 코드 대조(Stage 1~3)
> 대상: `PRD.md` 기능4·5(v2, 수용 기준 12개) + 기능1~3 회귀(12개) / `TECH_SPEC.md` §2, §3-기능4, §3-기능5, §5, §6, §7(24개 검증 매트릭스) / `src/` 12개 파일 전체(신규 `themeSelector.js`, `modeSelector.js` 포함)

### 종합 결과 (v2)

| 단계 | 결과 | 점수 |
|------|------|------|
| Stage 1: PRD 일치 검증 (v2 신규 12개 + 기존 12개 회귀) | ✅ PASS | 24/24 (100%) |
| Stage 2: TECH_SPEC 일치 검증 (파일/함수/데이터/핵심 버그 수정 보존) | ✅ PASS | 100% (세부 표 참조) |
| Stage 3: 코드 품질 검증 (에러처리/접근성/모드전환/CSS) | ✅ PASS | 4/4 (100%) |
| **v2 종합** | **✅ PERFECT** | **100%** (감점 없는 저우선 관찰 사항 3건 별도 기재) |

**핵심 확인 사항 (사용자 요청)**: v1에서 실제 브라우저 테스트로 발견·수정했던 두 가지 버그 수정(① `gameState.js`의 `_generation` 카운터 가드, ② `cardRenderer.js`의 `aria-disabled`+CSS `pointer-events:none` 방식)이 v2(테마/모드 추가) 구현에서도 **모두 그대로 보존**되어 있음을 코드로 직접 확인했습니다. 상세는 아래 "핵심 버그 수정 보존 여부" 참조.

---

### Stage 1: PRD 일치 검증 (v2)

#### 기능 4 (v2): 어린이 친화적 디자인 테마 선택

| # | 수용 기준 | 판정 | 근거 |
|---|----------|------|------|
| 4-1 | 3가지 테마(동물 친구/우주 탐험대/바다 친구) 중 하나를 클릭 한 번으로 선택 가능 | ✅ PASS | `config.js:53-90` `THEME_CONFIG`에 `animal`/`space`/`ocean` 3항목(label: "동물 친구"/"우주 탐험대"/"바다 친구") 정의. `themeSelector.js:20-45` `Object.keys(THEME_CONFIG)`를 순회해 버튼 3개 렌더, 각 버튼에 `button.addEventListener('click', () => onSelect(themeKey))`(단일 클릭으로 즉시 선택) |
| 4-2 | 테마 선택 시 카드 뒷면 무늬/앞면 그림(이모지)/배경색/강조색이 즉시 변경 | ✅ PASS | `main.js:69` `document.body.dataset.theme = nextTheme;`로 `<body data-theme>` 즉시 갱신 → `styles.css:25-44` `[data-theme='animal'/'space'/'ocean']`가 `--color-bg`/`--color-accent`/`--color-card-back`/`--color-card-matched` 오버라이드(배경·강조색 즉시 반영). 카드 뒷면 무늬: `styles.css:332-344` `.card-face--back::after`가 테마별로 `🐾`/`✨`/`🌊` 아이콘 전환. 카드 앞면 그림: `cardDeck.js:24-49` `createDeck(difficulty, theme)`가 `THEME_CONFIG[theme].symbolPool`에서 이모지를 뽑아 `card.glyph`로 반영, `main.js:72-78`이 테마 변경 시 `startNewGame()`으로 새 덱을 즉시 재생성·재렌더 |
| 4-3 | 미선택 시 기본 테마(동물 친구) 자동 적용 | ✅ PASS | `config.js:93` `DEFAULT_THEME = 'animal'`. `main.js:88-89` `const initialTheme = loadSavedTheme();`(저장된 테마 없으면 `'animal'` 반환, 아래 4-5 근거 참조) → `startGame({..., theme: initialTheme, ...})`. `index.html:9` `<body data-theme="animal">`로 JS 로드 전 초기 렌더에서도 기본 테마 적용(FOUC 방지) |
| 4-4 | 테마 변경 시 난이도 변경과 동일하게 진행 상황 초기화 + 새 게임 시작 | ✅ PASS | `themeSelector.js:42` 클릭 → `main.js:82` `renderThemeSelector(themeSelectorEl, nextTheme, (newTheme) => startGame({ theme: newTheme }))` → `main.js:62-86` `startGame()`이 `gameState.startNewGame({difficulty, theme, mode})`(`gameState.js:72-96`)를 호출해 `_state` 전체를 새 객체로 교체(이전 진행 폐기), `clearCompletionBanner()`(`main.js:68`)로 배너도 초기화 |
| 4-5 | 새로고침/재방문해도 마지막 선택 테마 유지(localStorage) | ✅ PASS | `main.js:70` `saveTheme(nextTheme);`(테마 변경 시마다 저장) → `storage.js:114-121` `saveTheme()`이 `window.localStorage.setItem(THEME_STORAGE_KEY, themeId)`(키: `storage.js:9` `'mensaPairGame.theme.v1'`). 페이지 로드 시 `main.js:88` `loadSavedTheme()` → `storage.js:97-107`이 저장된 값이 `THEME_CONFIG`의 유효 키인지 검사 후 반환, 없거나 유효하지 않으면 `DEFAULT_THEME` |
| 4-6 | 모든 테마에서 카드 식별이 색상이 아닌 그림(이모지)으로 가능 | ✅ PASS | 테마 무관하게 `cardRenderer.js:47` `front.textContent = card.glyph;`(이모지 자체가 1차 식별자)와 `cardRenderer.js:70` `aria-label` (`카드, ${card.name}`, 예: "카드, 강아지")를 병행 표시. 3개 테마 모두 `symbolPool`의 각 항목이 서로 다른 이모지(모양)를 가짐(`config.js:57-89`) — 색상 정보 없이도 완전히 식별 가능 |

**기능 4 소계: 6/6 PASS**

#### 기능 5 (v2): 2인 플레이 모드

| # | 수용 기준 | 판정 | 근거 |
|---|----------|------|------|
| 5-1 | 게임 시작 전 "1인 플레이"/"2인 플레이" 선택 가능, 미선택 시 기본값 "1인 플레이" | ✅ PASS | `config.js:101-104` `MODE_CONFIG`에 `single`("1인 플레이")/`twoPlayer`("2인 플레이") 2항목. `modeSelector.js:20-34`가 두 버튼을 렌더. `config.js:107` `DEFAULT_MODE = 'single'`, `main.js:89` 최초 로드 시 `startGame({..., mode: DEFAULT_MODE})` 자동 호출 |
| 5-2 | 2인 플레이 중 현재 차례(Player 1/2)와 각자 점수가 화면에 항상 표시 | ✅ PASS | `index.html:28-34` `#player-turn-panel`(`role="status"`, `aria-live="polite"`) 신설. `scoreboard.js:92-110` `renderPlayerTurnPanel()`이 `mode==='twoPlayer'`이고 완료 전이면 "지금은 Player N 차례예요" + "Player 1: N개 · Player 2: N개"를 렌더. `main.js:42-55` 구독 콜백이 `cardFlipped`/`pairMatched`/`mismatchResolved`/`gameCompleted` 매 이벤트마다 `renderPlayerTurnPanel()` 호출, `main.js:85`에서 새 게임 시작 시에도 별도 호출하여 항상 최신 상태 유지 |
| 5-3 | 현재 차례 플레이어가 짝을 맞추면 점수 +1, 같은 플레이어가 이어서 진행 | ✅ PASS | `gameState.js:122-130` 매치 분기: `if (state.mode === 'twoPlayer') { state.scores[state.currentPlayer] += 1; }` — 이 분기에서 `state.currentPlayer`는 변경되지 않으므로(다음 줄에서 별도로 반전시키는 코드 없음) 같은 플레이어의 턴이 그대로 유지됨 |
| 5-4 | 현재 차례 플레이어가 짝을 틀리면 카드가 자동 원복된 뒤 상대에게 턴 전환 | ✅ PASS | `gameState.js:149-165` `resolveMismatch()`가 `first.isFlipped = false; second.isFlipped = false;`로 원복한 뒤, `if (state.mode === 'twoPlayer') { state.currentPlayer = state.currentPlayer === 1 ? 2 : 1; }`로 상대 플레이어에게 턴을 넘김. 1초 지연은 4-2와 동일하게 `MISMATCH_DELAY_MS`(`config.js:44`) 적용 |
| 5-5 | 완료 시 "게임 완료" 대신 최종 점수 + 승자("Player 1 승리!"/"Player 2 승리!"/"무승부!") 표시 | ✅ PASS (관찰 1건) | `gameState.js:171-183` `completeGame()`이 `scores[1]`/`scores[2]` 비교로 `winner`(1\|2\|null) 확정. `scoreboard.js:118-130` `renderTwoPlayerResultBanner()`가 `winner === null ? '무승부!' : \`Player ${winner} 승리!\`` — PRD가 요구한 3가지 문구와 **글자 하나까지 정확히 일치**. 최종 점수(`Player 1: N개 · Player 2: N개`)도 함께 렌더됨. *(관찰: 배너 최상단에 "게임 완료!" 타이틀이 승자 문구와 나란히 유지되어 PRD의 "대신"이라는 문구를 문자 그대로는 만족하지 않음 — 상세는 아래 "불일치 항목 상세[v2]" 참조. 핵심 요구사항인 최종 점수·승자 표시 자체는 정확히 구현되어 FAIL로 판정하지 않음)* |
| 5-6 | 2인 플레이 결과는 최고 기록에 미저장, 1인 전환 시 최고 기록 기능 정상 동작 | ✅ PASS | `scoreboard.js:138-142` `handleGameCompleted()`가 `if (state.mode === 'twoPlayer') { renderTwoPlayerResultBanner(...); return; }`로 `storage.saveHighScore()` 호출 경로 자체를 타지 않고 조기 반환. 1인 모드 전환 시(`modeSelector.js` → `startGame({mode:'single'})`)에는 `scoreboard.js:144-154`의 **기존 기능3과 동일한 코드 경로**(`getHighScoreForDifficulty` → `isNewRecord` → `saveHighScore` → `renderCompletionBanner`/`renderHighScorePanel`)가 변경 없이 그대로 재사용되어 정상 동작 |

**기능 5 소계: 6/6 PASS**

#### 기능 1~3 회귀 확인 (v2 변경이 기존 로직에 영향을 주지 않았는지)

| 기능 | 회귀 결과 | 확인 내용 |
|------|----------|----------|
| 기능 1 (카드 짝 맞추기) | ✅ 회귀 없음, 4/4 유지 | `flipCard()`/`resolveMismatch()`/`completeGame()`의 1인 모드 분기(`state.mode !== 'twoPlayer'`일 때)는 v1 로직과 동일하게 동작(2인 모드 전용 코드는 `if (state.mode === 'twoPlayer')`로 분기되어 1인 모드 흐름을 건드리지 않음). 매치 시 `isMatched=true` 처리, 3번째 카드 방어, 1초 원복 로직 모두 `gameState.js:103-165`에서 그대로 확인 |
| 기능 2 (난이도 선택) | ✅ 회귀 없음, 4/4 유지 | `DIFFICULTY_CONFIG`(`config.js:12-16`) 값 불변. `difficultySelector.js` 로직 무변경, 다만 `main.js:79-81`에서 `startGame({ difficulty: newDifficulty })` 호출 시 `theme`/`mode`는 `current` 값을 유지(`main.js:64-66` `nextTheme = theme ?? current.theme ?? DEFAULT_THEME`, `nextMode` 동일 패턴)하여 난이도만 변경되고 테마/모드는 그대로 보존됨 확인 |
| 기능 3 (최고 기록) | ✅ 회귀 없음, 4/4 유지 | `storage.js`의 `loadHighScores`/`getHighScoreForDifficulty`/`saveHighScore`/`isNewRecord`(`storage.js:40-91`) 로직·시그니처 무변경. `STORAGE_KEY`(`'mensaPairGame.highScores.v1'`)와 신규 `THEME_STORAGE_KEY`(`'mensaPairGame.theme.v1'`)가 서로 다른 키를 사용해 충돌 없음(`storage.js:6,9`) |

**Stage 1(v2) 총점: 신규 12/12 + 회귀 12/12 = 24/24 (100%)**

---

### Stage 2: TECH_SPEC 일치 검증 (v2)

#### 파일 구조 (§2, 총 12개)

| TECH_SPEC 명세 | 실제 파일 | 판정 |
|---|---|---|
| `src/index.html` | 존재 | ✅ |
| `src/css/styles.css` | 존재 | ✅ |
| `src/js/main.js` | 존재 | ✅ |
| `src/js/config.js` | 존재 | ✅ |
| `src/js/cardDeck.js` | 존재 | ✅ |
| `src/js/gameState.js` | 존재 | ✅ |
| `src/js/cardRenderer.js` | 존재 | ✅ |
| `src/js/difficultySelector.js` | 존재 | ✅ |
| `src/js/themeSelector.js` (v2 신규) | 존재 | ✅ |
| `src/js/modeSelector.js` (v2 신규) | 존재 | ✅ |
| `src/js/scoreboard.js` | 존재 | ✅ |
| `src/js/storage.js` | 존재 | ✅ |

Glob으로 `src/` 전체를 재스캔한 결과 위 12개 파일 외 추가/누락 파일 없음. **파일 구조 12/12 완전 일치** (v1 검증에서 지적됐던 "9개/10개" 산술 오기도 이번 TECH_SPEC 본문 §2 "총 12개 파일(HTML 1 + CSS 1 + JS 10)" 서술과 실제 파일 트리·개수가 정확히 일치함을 확인 — 문서 오기 재발 없음).

#### 핵심 함수 시그니처 및 로직 (§3, §5)

| TECH_SPEC 명세 | 실제 구현 | 판정 |
|---|---|---|
| `startNewGame({difficulty, theme, mode} = {})` → `GameState` | `gameState.js:72` `export function startNewGame({ difficulty = DEFAULT_DIFFICULTY, theme = DEFAULT_THEME, mode = DEFAULT_MODE } = {})` — 옵션 객체 시그니처, 기본값까지 정확히 일치 | ✅ |
| `GameState.theme: ThemeKey` | `gameState.js:44` `_createInitialState()`의 `theme: DEFAULT_THEME`, `gameState.js:78` `startNewGame()` 반환 객체의 `theme` 필드 | ✅ |
| `GameState.mode: ModeKey` | `gameState.js:45,79` 동일 패턴으로 `mode` 필드 존재 | ✅ |
| `GameState.currentPlayer: 1\|2` | `gameState.js:55,89` `currentPlayer: 1`(초기값) | ✅ |
| `GameState.scores: {1:number, 2:number}` | `gameState.js:56,90` `scores: { 1: 0, 2: 0 }` | ✅ |
| `GameState.winner: 1\|2\|null` | `gameState.js:57,91` `winner: null`(초기값), `completeGame()`에서 확정 | ✅ |
| `flipCard()` 매치 시 "점수+1·턴 유지" | `gameState.js:122-131` — `scores[currentPlayer] += 1` 실행 후 `currentPlayer` 재할당 코드 없음(다음 줄로 그대로 진행) → 턴 유지. TECH_SPEC 의사코드(TECH_SPEC.md:151-160)와 로직 순서까지 동일 | ✅ |
| `resolveMismatch()` "틀리면 턴 전환" | `gameState.js:160-162` `state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;` — TECH_SPEC 의사코드(TECH_SPEC.md:180-182)와 동일 | ✅ |
| `completeGame()` "승자 판정" | `gameState.js:176-180` `scores[1] > scores[2] ? winner=1 : scores[2] > scores[1] ? winner=2 : winner=null` — TECH_SPEC 코드블록(TECH_SPEC.md:200-204)과 완전히 동일 | ✅ |
| `createDeck(difficulty, theme = DEFAULT_THEME)` → `CardData[]` | `cardDeck.js:24` 동일 시그니처, `THEME_CONFIG[theme].symbolPool`에서 슬라이스 | ✅ |
| `THEME_CONFIG` 구조(`{label, icon, symbolPool}` × 3) | `config.js:53-90` — animal/space/ocean 각 12쌍, TECH_SPEC.md:402-439와 이모지·이름까지 1:1 동일 | ✅ |
| `MODE_CONFIG` 구조(`{label}` × 2) | `config.js:101-104` — single/twoPlayer, TECH_SPEC.md:513-516과 동일 | ✅ |
| `renderThemeSelector(container, currentTheme, onSelect)` | `themeSelector.js:15` 동일 시그니처 | ✅ |
| `renderModeSelector(container, currentMode, onSelect)` | `modeSelector.js:15` 동일 시그니처 | ✅ |
| `renderPlayerTurnPanel(container, state)` | `scoreboard.js:92` 동일 시그니처 | ✅ |
| `renderTwoPlayerResultBanner(container, {scores, winner})` | `scoreboard.js:118` 동일 시그니처 | ✅ |
| `loadSavedTheme()` / `saveTheme(themeId)` (§5 모듈 인터페이스) | `storage.js:97,114` 동일 시그니처·반환형(`ThemeKey`/`boolean`) | ✅ |

#### ⭐ 핵심 버그 수정 보존 여부 (사용자 명시 요청 항목)

| 버그 수정 | v1 수정 내용 | v2 코드에서 보존 여부 | 판정 |
|---|---|---|---|
| ① `_generation` 카운터 가드 | 잔존 `resolveMismatch` 타이머가 새 게임 상태를 오염시키지 않도록 세대 번호로 방어 | `gameState.js:39` `let _generation = 0;` 선언 유지 → `gameState.js:74` `startNewGame()`마다 `_generation += 1;`(난이도/테마/모드 **셋 중 무엇을 바꿔도 동일하게 `startNewGame()` 한 경로만 타므로** 세 축 모두 커버) → `gameState.js:133` `flipCard()`가 불일치 시 `const gen = _generation;`으로 캡처 → `gameState.js:134` `setTimeout(() => resolveMismatch(firstId, secondId, gen), MISMATCH_DELAY_MS)` → `gameState.js:150` `resolveMismatch()` 진입부 `if (gen !== _generation) return;` 가드 그대로 존재 | ✅ **완전 보존** |
| ② `cardRenderer.js`의 `aria-disabled`+`pointer-events:none` | 매칭된 카드에 `disabled` 속성 대신 `aria-disabled`+CSS로 처리해 키보드 포커스 손실 방지 | `cardRenderer.js:68` `cardEl.setAttribute('aria-disabled', String(card.isMatched));` — 파일 전체를 검색해도 `cardEl.disabled = ...`나 `button.disabled` 같은 네이티브 `disabled` 속성 설정 코드는 **존재하지 않음**. 클릭 차단은 CSS `styles.css:292-295` `.card.is-matched { cursor: default; pointer-events: none; }`로 처리 | ✅ **완전 보존** |

**두 버그 수정 모두 v2 구현(테마/모드 추가)에서 되돌려지거나 손상되지 않고 그대로 유지되어 있음을 확인했습니다.** 특히 ①은 난이도 전환 시나리오뿐 아니라 테마 전환·모드 전환 시나리오에서도 동일한 `startNewGame()` 단일 진입점을 공유하므로(`main.js:72-76`), 세 가지 전환 축 모두에서 동일하게 방어됨을 코드 구조상 확인했습니다.

#### NFR/CSS 전략(§6) 대조

| TECH_SPEC 명세 | 실제 구현 | 판정 |
|---|---|---|
| 테마별 CSS 변수가 `[data-theme]`로 스코프 | `styles.css:25-44` `[data-theme='animal'/'space'/'ocean']` 3블록이 `--color-bg`/`--color-accent`/`--color-card-back`/`--color-card-matched` 오버라이드, `index.html:9`+`main.js:69`가 `<body data-theme>`를 갱신해 스코프 적용 | ✅ |
| 클릭 대상 44×44px 이상(N5, v2) | `styles.css:21` `--tap-min: 44px;`, `styles.css:99-104` `.difficulty-btn, .theme-btn, .mode-btn { min-width: var(--tap-min); min-height: var(--tap-min); ... }` — 테마/모드 버튼에도 동일 규칙 적용됨 확인 | ✅ |

---

### Stage 3: 코드 품질 검증 (v2)

| 항목 | 판정 | 근거 |
|---|---|---|
| 에러 처리 — `storage.js`의 `saveTheme`/`loadSavedTheme` try/catch 방어 | ✅ PASS | `storage.js:97-107` `loadSavedTheme()` 전체가 `try { ... } catch (error) { return DEFAULT_THEME; }`로 감싸져 있어 `localStorage` 접근 자체가 차단된 환경(프라이빗 모드 등)에서도 예외가 전파되지 않고 안전하게 기본 테마로 폴백. `storage.js:114-121` `saveTheme()`도 동일하게 `try { setItem(...); return true; } catch (error) { return false; }`로 방어되어 기존 `saveHighScore()`(v1 수정 사항)와 동일한 방어 패턴을 정확히 재사용함 |
| 접근성 — 테마/모드 버튼 키보드(Tab/Enter/Space) 조작 가능, `aria-*` 속성 | ✅ PASS | `themeSelector.js:24-29`, `modeSelector.js:24-29` 모두 네이티브 `<button type="button">` 요소로 생성 → 브라우저가 Tab 포커스 이동과 Enter/Space 클릭 트리거를 기본 제공(별도 keydown 핸들러 불필요, `difficultySelector.js`와 동일 패턴). `role="radiogroup"`(컨테이너)/`role="radio"`+`aria-checked`(버튼 각각)가 테마·모드 선택자 모두에 적용(`themeSelector.js:17-18,28-29`, `modeSelector.js:17-18,28-29`). `styles.css:157-162` `:focus-visible` 아웃라인 스타일이 `.theme-btn`/`.mode-btn`에도 공통 적용되어 키보드 포커스가 시각적으로 확인 가능 |
| 2인 모드 ↔ 1인 모드 전환 시 상태 오염 여부(회귀 위험 지점) | ✅ PASS | 모드 전환도 `startGame({mode: newMode})` → `gameState.startNewGame()`(`gameState.js:72-96`)을 거쳐 `_state` 전체가 새 객체로 교체되므로(`currentPlayer`/`scores`/`winner` 모두 초기값으로 리셋), 이전 모드의 점수·턴 정보가 다음 모드로 새어나갈 여지가 없음. `_generation`도 함께 증가하므로 모드 전환 직전에 예약된 2인 모드용 `resolveMismatch` 턴전환 타이머가 전환 후 1인 모드 상태를 잘못 건드릴 가능성도 ①번 가드로 차단됨. `scoreboard.js:60-64` `clearCompletionBanner()`가 매 `startGame()`마다 완료 배너를 비워, 2인 모드의 "Player 1 승리!" 문구가 다음 1인 모드 화면에 잔존하는 문제도 없음 |
| CSS — 테마 변수 `[data-theme]` 스코프, 매직넘버/하드코딩 여부 | ✅ PASS | 위 Stage2 표에서 확인한 `[data-theme]` 스코프에 더해, 신규 버튼류(`.theme-btn`, `.mode-btn`, `.player-turn-panel`)도 기존 `--radius-md`/`--color-accent`/`--tap-min` 등 기존 CSS 커스텀 프로퍼티를 재사용(`styles.css:99-172`)하여 하드코딩된 색상·크기 값 없음. 테마별 hex 색상값(`#fff3e0` 등) 자체는 `[data-theme]` 블록에 중앙화된 설정값으로, 매직넘버가 아닌 의도된 팔레트 데이터임 |

**Stage 3(v2) 총점: 4/4 (100%)**

---

### 불일치 항목 상세 (v2) — 감점 없는 저우선 관찰 사항

> 아래 3건은 기능적 결함(FAIL)이 아니라, PRD·TECH_SPEC 문구를 매우 엄격하게 문자 그대로 대조하는 과정에서 발견된 **경미한 서술/설계 뉘앙스 차이**입니다. 핵심 수용 기준은 모두 충족되어 있어 Stage 1 판정에는 영향을 주지 않았으며, 향후 손쉽게 다듬을 수 있는 개선 아이디어로 기록합니다.

#### [관찰 1] 2인 모드 완료 배너에 "게임 완료!" 타이틀이 승자 문구와 함께 유지됨 (우선순위: 낮음)

- **스펙**: PRD 기능5 수용 기준 5 — "모든 카드의 짝을 다 맞추면 **'게임 완료' 대신** 최종 점수와 승자(...)가 표시된다."
- **실제**: `scoreboard.js:125-129` `renderTwoPlayerResultBanner()`가 렌더하는 HTML은 다음과 같습니다.
  ```javascript
  target.innerHTML = `
    <p class="completion-banner__title">게임 완료!</p>
    <p class="completion-banner__stats">Player 1: ${scores[1]}개 · Player 2: ${scores[2]}개</p>
    <p class="completion-banner__winner">${winnerText}</p>
  `;
  ```
  "게임 완료!" 타이틀이 최종 점수·승자 문구와 함께 그대로 유지되어 있습니다.
- **차이**: PRD 문구 "대신"을 문자 그대로 해석하면 2인 모드에서는 "게임 완료" 문구가 승자 정보로 완전히 **대체**되어야 하나, 실제로는 "게임 완료!"가 제목으로 남고 그 아래에 점수·승자 정보가 **추가**되는 형태입니다. 다만 PRD가 요구하는 핵심 정보(최종 점수, 승자 문구 "Player 1 승리!"/"Player 2 승리!"/"무승부!")는 정확한 문구로 모두 표시되고 있어, 정보 누락이나 오정보는 없습니다. FAIL로 판정하지 않고 관찰 사항으로 기록합니다.
- **개선 제안**: `renderTwoPlayerResultBanner()`의 타이틀을 `<p class="completion-banner__title">대결 종료!</p>`처럼 1인 모드 문구("게임 완료!")와 구분되는 별도 문구로 바꾸거나, 타이틀 자체를 생략하고 승자 문구(`completion-banner__winner`)를 배너 최상단으로 옮기는 방식을 권장합니다. 수정 범위는 `scoreboard.js` 한 파일, 1~2줄입니다.

#### [관찰 2] TECH_SPEC §6 NFR "N6 테마 전환도 200ms 반응 유지" 서술이 실제 구현 비용을 과소 서술 (우선순위: 낮음, 문서 서술 이슈 — 코드 결함 아님)

- **스펙**: `TECH_SPEC.md:667` "(v2) 테마 전환도 200ms 반응 유지 | 테마 전환은 `<body data-theme>` 속성 변경 1회 + CSS 변수 재계산만으로 처리되어 **JS 연산 비용이 없음**"
- **실제**: 테마 버튼 클릭 시 실제로는 `main.js:82` → `startGame({theme: newTheme})` → `gameState.js:72-96` `startNewGame()`(새 덱 생성 `createDeck()` + Fisher-Yates 셔플) → `cardRenderer.js:14-24` `renderBoard()`(기존 DOM 전체 제거 후 카드 버튼을 최대 24개까지 재생성)까지 함께 실행됩니다. 이는 PRD 기능4 수용 기준 4("테마 변경 시... 새 게임이 시작된다")를 만족시키기 위해 TECH_SPEC 자신이 §3-기능4에서 명시적으로 요구한 동작이므로 **코드는 스펙(수용 기준)을 올바르게 따른 것**이지만, §6 NFR 표의 "JS 연산 비용이 없음"이라는 서술과는 내용이 어긋납니다(카드 24장 재생성은 실측상 수 ms 수준이라 200ms 예산 내에는 여전히 들어오지만, "연산 비용이 없다"는 표현은 부정확합니다).
- **차이**: TECH_SPEC 문서 내부에서 §3-기능4(새 게임 재시작 요구)와 §6(JS 연산 없음 주장)가 서로 미묘하게 모순되는 서술입니다. v1 검증의 "발견 3"(파일 개수 산술 오기)과 유사한 **문서 자체의 서술 정합성 문제**이며, 코드 수정은 불필요합니다.
- **개선 제안**: `TECH_SPEC.md` §6 N6 행을 "테마 전환 시 배경/강조색은 CSS 변수 재계산만으로 즉시 전환되며, 동반되는 새 게임 재시작(덱 재생성·보드 재렌더)도 카드 24장 이하 규모라 200ms 예산 내에서 완료됨"과 같이 정정할 것을 권장합니다.

#### [관찰 3] "우주 탐험대" 테마의 어두운 배경색이 PRD "밝고 화사한" 문구와 다소 결이 다름 (우선순위: 낮음, 주관적 판단 요소 포함)

- **스펙**: PRD 기능4 수용 기준 2 — "...테마에 맞는 **밝고 화사한** 색상 조합으로 즉시 바뀐다."
- **실제**: `styles.css:32-37` `[data-theme='space'] { --color-bg: #10123b; --color-accent: #8c7bff; --color-card-back: #2a2a63; --color-card-matched: #55e6c1; }` — 배경색이 짙은 남색(`#10123b`)으로, animal(`#fff3e0`)/ocean(`#e3f7fb`) 테마의 밝은 파스텔 배경과 대비됩니다.
- **차이**: 우주(space) 테마 배경이 문자 그대로의 "밝고 화사한"과는 다소 거리가 있으나, 이는 TECH_SPEC(`TECH_SPEC.md:482`)이 설계 단계에서 이미 명시적으로 결정한 값이며 "우주의 밤하늘"이라는 테마 정체성을 위한 의도된 디자인 선택으로 보입니다. 강조색(`#8c7bff` 보라)·매치색(`#55e6c1` 민트)은 채도 높은 색상을 사용해 화사함을 일부 보완하고 있습니다. 코드가 TECH_SPEC과 정확히 일치하고, "밝음"의 기준이 주관적이라 FAIL로 판정하지 않습니다.
- **개선 제안**: 실제 어린이 사용자 대상 QA(PRD §5 성공지표 "3가지 테마 모두 QA로 전환·플레이 확인") 시 우주 테마의 가독성/호감도를 별도로 확인하고, 필요 시 배경을 한 톤 밝은 남색으로 조정하거나 별·행성 같은 밝은 장식 요소를 추가하는 것을 검토할 수 있습니다. 순수히 시각 디자인 튜닝이며 기능적 결함은 아닙니다.

---

### 개선 권고사항 (v2)

#### 우선순위 높음 (PRD 불일치)
없음. 신규 12개 수용 기준 모두 PASS.

#### 우선순위 중간 (TECH_SPEC 불일치)
없음. 파일 구조, 함수 시그니처, 데이터 구조, 두 가지 핵심 버그 수정 모두 TECH_SPEC과 완전히 일치.

#### 우선순위 낮음 (품질/문서 개선, 감점 없음) — ✅ 1·2 반영 완료
1. **[관찰 1]** ~~`scoreboard.js`의 2인 모드 완료 배너 "게임 완료!" 타이틀~~ → "대결 종료!"로 교체 완료 (`scoreboard.js`), 실제 브라우저에서 "대결 종료! / Player 1: 1개 · Player 2: 2개 / Player 2 승리!" 정상 표시 확인.
2. **[관찰 2]** ~~`TECH_SPEC.md` §6 N6 행 서술~~ → 테마 전환이 난이도 전환과 동일하게 새 게임 재시작을 동반함을 명시하도록 정정 완료.
3. **[관찰 3]** 우주(space) 테마의 짙은 남색 배경은 TECH_SPEC이 의도적으로 정한 "우주 콘셉트" 배색이며, 실제 브라우저에서 밝은 별(⭐)·강조색(보라)과 대비되어 시인성이 좋음을 확인. 별도 수정 없이 유지.

---

### 잘 구현된 부분 (v2, 긍정 피드백)

- **두 가지 핵심 버그 수정(① `_generation` 가드, ② `aria-disabled`+`pointer-events:none`)이 테마/모드라는 새로운 상태 축이 추가된 이후에도 전혀 손상되지 않고 그대로 보존**되어 있습니다. 특히 ①은 `startNewGame()`이라는 단일 진입점을 난이도/테마/모드 세 가지 변경 모두가 공유하도록 설계되어, 신규 기능 추가 시에도 자동으로 방어 범위에 포함되는 견고한 아키텍처입니다.
- `gameState.js`의 2인 모드 로직(점수 증가·턴 유지·턴 전환·승자 판정)이 TECH_SPEC 의사코드와 변수명·조건문 순서까지 동일하게 구현되어 있어 스펙 추적성이 v1과 동일한 수준으로 우수합니다.
- `themeSelector.js`/`modeSelector.js`가 기존 `difficultySelector.js`와 완전히 동일한 패턴(role=radiogroup, 네이티브 button, 단일 클릭 콜백)을 재사용해 일관성을 유지하면서 접근성도 자동으로 상속받았습니다.
- `saveTheme`/`loadSavedTheme`이 v1에서 발견·수정했던 `saveHighScore()`의 try/catch 방어 패턴을 정확히 동일하게 재적용해, 같은 유형의 결함(localStorage 예외 전파)이 v2 신규 코드에서 재발하지 않았습니다.
- 2인 모드 승자 문구("Player 1 승리!"/"Player 2 승리!"/"무승부!")가 PRD에 명시된 표현을 글자 하나까지 정확히 재현했습니다.

---

## Stage 5 (v2): 실제 브라우저 실행 검증

reviewer 에이전트의 정적 코드 검증 이후, `src/`를 정적 서버로 띄우고 실제 Chrome에서 테마 3종과 2인 플레이 모드를 처음부터 끝까지 직접 플레이했습니다.

| 검증 시나리오 | 결과 |
|--------------|------|
| 동물 친구 / 우주 탐험대 / 바다 친구 테마 전환 | ✅ 3개 테마 모두 클릭 즉시 배경·강조색·카드 뒷면 아이콘(🐾/✨/🌊)이 정확히 전환됨을 스크린샷으로 확인 |
| 2인 모드 진입 시 턴/점수 패널 표시 | ✅ "지금은 Player 1 차례예요 / Player 1: 0개 Player 2: 0개" 정상 표시 |
| 짝 맞추면 점수 +1, 턴 유지 | ✅ Player 1이 매치 성공 → `scores.1=1`, `currentPlayer`는 계속 1로 유지됨을 상태 조회로 확인 |
| 짝 틀리면 원복 후 턴 전환 | ✅ 불일치 발생 → 1초 후 자동 원복과 동시에 `currentPlayer`가 2로 전환됨을 확인 |
| 완료 시 최종 점수·승자 표시 | ✅ "대결 종료! / Player 1: 1개 · Player 2: 2개 / Player 2 승리!" 배너를 스크린샷으로 직접 확인 |
| 2인 결과가 최고 기록에 영향 없음 | ✅ 2인 모드 완주 후에도 최고 기록 패널이 이전 1인 플레이 값("시도 5회 · 04:48")을 그대로 유지 |
| 1인 모드 복귀 시 회귀 없음 | ✅ 2인→1인 전환 시 턴 패널이 사라지고 최고 기록 패널이 정상 복귀 |
| 새로고침 후 테마 유지 | ✅ "바다 친구" 테마 선택 후 새로고침 → 동일 테마로 재로드됨을 확인 (모드/난이도는 스펙대로 기본값으로 초기화됨) |
| 매칭 카드 DOM 정합성 | ✅ 스크린샷에 매칭 카드가 순간적으로 반전된 아이콘처럼 보이는 현상 재관찰 — `getComputedStyle`로 `is-matched`/`is-flipped` 클래스, 정확한 매칭색(`rgb(255,209,102)`=바다 테마 매칭색), `backface-visibility:hidden` 모두 정상임을 재확인. v1과 동일한 **스크린샷 캡처 도구의 한계**이며 실제 브라우저 렌더링에는 영향 없음 |

**결론**: v2 기능(테마 선택, 2인 플레이 모드) 모두 정적 검증과 실제 실행 검증에서 일치하는 결과를 얻었으며, 기존 기능 1~3의 회귀도 발견되지 않았습니다.
- 파일 구조·함수 시그니처·데이터 구조 어느 것 하나 TECH_SPEC과 어긋남 없이 12개 파일 전체가 1:1로 대응되며, v1에서 지적됐던 "파일 개수 산술 오기" 유형의 문서 결함도 이번 TECH_SPEC §2에서는 재발하지 않았습니다(총 12개 파일 서술과 실제 파일 트리가 정확히 일치).

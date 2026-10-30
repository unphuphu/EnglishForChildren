# English For Children v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React web app where a 9–12 year old (and a parent) learn ~1500 English words through 5 game modes, with per-profile XP, streaks, badges and daily goals.

**Architecture:** Pure-logic modules in `src/core` (no React, unit-tested) feed game components in `src/games` and screens in `src/ui`. Vocabulary is static JSON per topic; per-profile progress lives in `localStorage`. No backend.

**Tech Stack:** React 18, Vite, React Router, Vitest + jsdom + React Testing Library, plain JavaScript (no TypeScript).

**Spec:** `docs/superpowers/specs/2026-10-30-english-for-children-v1-design.md`

## Global Constraints

- Plain JavaScript, ES modules; no TypeScript, no backend, no network calls at runtime (offline-capable).
- Targets Chrome and Edge on Windows. Pronunciation = `speechSynthesis` only; no microphone use.
- Word record: `{ id, word, pos, vi, ipa, emoji?, example, exampleVi, topic, level }`; `id` = `<topic>-<3-digit number>`; `level` ∈ {1,2,3}; `emoji` omitted for abstract words; every word has `example` and `exampleVi`.
- Vocabulary total: 1000–2000 words (target ~1500), about 25–30 topics, one JSON file per topic in `src/data/vocab/`.
- Max **4 profiles**; avatars chosen from a fixed set of 24 emoji, no two profiles share an avatar; no passwords.
- Daily goal options 5, 10, 15, 20; default **10**; never below **5**.
- SRS intervals after consecutive correct answers: 1, 3, 7, 14 days; wrong answer → due again the same day.
- XP: correct +10, perfect session +20, daily goal reached +30 (once per day). Values live in `src/core/config.js`.
- A session is ~10 words. Streak extends only on a day the daily goal is reached; a missed day resets it to 0.
- Dates are local-time `YYYY-MM-DD` strings.
- Storage: one key for the profile list, `progress:<profileId>` per profile, each with `version`; a last-good backup is kept; export/import per profile as JSON.
- Repo is private on GitHub; branch `main`; one commit per task.

## Review Focus

- Adding a 5th profile, or picking an avatar already used by another profile → rejected with a clear error, not silently accepted.
- A session that crosses midnight → the date used for goal/streak is the date the session **started**.
- A word without `emoji` in quiz, match and flashcard → no blank card or "undefined"; falls back to the Vietnamese meaning/example.
- A topic with fewer than 10 words (or fewer than 4 for quiz options) → the session pads from other topics at the same level instead of crashing or repeating a word.
- Scramble of a very short word, a repeated-letter word, or a multi-word entry → shuffled result never equals the original and spaces/hyphens are handled.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/test/setup.js`, `src/App.test.jsx`
- Modify: `.gitignore` (already ignores `node_modules`, `dist`)

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm test` (Vitest, jsdom, globals on, setup file `src/test/setup.js` importing `@testing-library/jest-dom/vitest`).

- [ ] **Step 1: Scaffold Vite React (JS) in the existing folder** — `npm create vite@latest . -- --template react` (keep `docs/` and `.git`), then `npm i react-router-dom` and `npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`. Add scripts `"test": "vitest run"`.
- [ ] **Step 2: Write failing test** `src/App.test.jsx`: renders `<App />` inside `MemoryRouter` and `expect(screen.getByText(/English For Children/i)).toBeInTheDocument()`.
- [ ] **Step 3: Run** `npm test` — Expected: FAIL (text not found).
- [ ] **Step 4: Make `App` render a heading "English For Children"**; remove Vite demo assets and CSS.
- [ ] **Step 5: Run** `npm test` and `npm run build` — Expected: both succeed.
- [ ] **Step 6: Commit** `git add -A && git commit -m "chore: scaffold Vite React app with Vitest"`

### Task 2: Vocabulary validator and `vocabService`

**Files:**
- Create: `src/core/vocabSchema.js`, `src/core/vocabService.js`, `src/core/vocabSchema.test.js`, `src/core/vocabService.test.js`, `scripts/validateVocab.js`

**Interfaces:**
- Produces:
  - `validateWord(word: object): string[]` — list of error messages, empty when valid (checks required fields, `level` ∈ 1..3, id format `^[a-z-]+-\d{3}$` matching `topic`, `emoji` is a single emoji grapheme when present).
  - `validateVocab(words: object[]): string[]` — all word errors prefixed with the id, plus duplicate-id errors.
  - `createVocabService(words: Word[]): { all(): Word[], topics(): {topic: string, count: number}[], byTopic(topic: string): Word[], byLevel(level: number): Word[], get(id: string): Word|undefined }`
  - `src/data/vocab/index.js` default-exports the concatenation of every topic file (created in Task 3).

- [ ] **Step 1: Write failing tests** — `validateWord` returns `[]` for the spec's `dog` example; returns an error mentioning `vi` when `vi` is missing; rejects `level: 4`; rejects id `animals-1`; accepts a word with no `emoji`. `validateVocab` flags two words sharing an id. `createVocabService` over 3 fixture words: `topics()` returns counts, `byTopic('animals')` filters, `get('animals-001').word === 'dog'`, `get('nope') === undefined`.
- [ ] **Step 2: Run** `npx vitest run src/core/vocab` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** both modules per the signatures above.
- [ ] **Step 4: Implement `scripts/validateVocab.js`** — reads every `src/data/vocab/*.json`, runs `validateVocab`, prints errors, exits 1 on any; add `"validate:vocab"` script and run it as part of `"build"` (`npm run validate:vocab && vite build`).
- [ ] **Step 5: Run** `npx vitest run src/core/vocab` — Expected: PASS.
- [ ] **Step 6: Commit** `git commit -m "feat: vocab schema validator and service"`

### Task 3: Vocabulary data, batch A (people, food, body)

**Files:**
- Create: `src/data/vocab/<topic>.json` for ~9 topics (e.g. `family`, `school`, `animals`, `food`, `drinks`, `fruits`, `vegetables`, `body`, `clothes`), `src/data/vocab/index.js`, `src/data/vocab/data.test.js`

**Interfaces:**
- Consumes: `validateVocab` (Task 2).
- Produces: `src/data/vocab/index.js` default-exporting `Word[]`; each topic ≥ 30 words; level split roughly 40% / 40% / 20%; ~500 words in this batch.

- [ ] **Step 1: Write failing test** `data.test.js`: `validateVocab(allWords)` returns `[]`; every topic has ≥ 30 words; every word has `level` 1–3 with each level used at least once per topic.
- [ ] **Step 2: Run** `npx vitest run src/data` — Expected: FAIL (no data).
- [ ] **Step 3: Generate the topic files.** Common, child-appropriate words; Vietnamese `vi` meaning, IPA, and a short example (≤ 10 words, uses only words of equal or lower level where possible) with Vietnamese translation; emoji only for concrete words.
- [ ] **Step 4: Run** `npm run validate:vocab` and `npx vitest run src/data` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "data: vocabulary batch A"`
- [ ] **Step 6: Flag for the parent** that `vi`/`ipa` were machine-generated and need a spot check (note in `README.md` task 19).

### Task 4: Vocabulary data, batch B (home, world, activities)

**Files:**
- Create: ~10 topic files (e.g. `home`, `furniture`, `weather`, `seasons`, `transport`, `jobs`, `sports`, `hobbies`, `nature`, `town`); modify `src/data/vocab/index.js` and `data.test.js` only to include the new files.

**Interfaces:**
- Consumes/Produces: same schema and rules as Task 3; ~500 more words.

- [ ] **Step 1: Extend `data.test.js`** — assert the aggregate count is now ≥ 800 and no id duplicates across files.
- [ ] **Step 2: Run** `npx vitest run src/data` — Expected: FAIL (count too low).
- [ ] **Step 3: Generate the topic files** following Task 3's rules; register them in `index.js`.
- [ ] **Step 4: Run** `npm run validate:vocab && npx vitest run src/data` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "data: vocabulary batch B"`

### Task 5: Vocabulary data, batch C (abstract and functional words)

**Files:**
- Create: ~8–10 topic files (e.g. `feelings`, `time`, `numbers-colors-shapes`, `daily-actions`, `adjectives`, `adverbs`, `prepositions-connectors`, `technology`, `health`, `travel`); modify `index.js`, `data.test.js`.

**Interfaces:**
- Produces: final dataset with total in **[1000, 2000]**, 25–30 topics; abstract words (`because`, `although`…) have no `emoji` and carry a clear context example.

- [ ] **Step 1: Extend `data.test.js`** — total within 1000..2000; topic count within 25..30; every word whose `emoji` is absent still has non-empty `example`.
- [ ] **Step 2: Run** — Expected: FAIL (count < 1000 or topics < 25).
- [ ] **Step 3: Generate the topic files**, register them.
- [ ] **Step 4: Run** `npm run validate:vocab && npx vitest run src/data` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "data: vocabulary batch C"`

### Task 6: `storage` and data migration

**Files:**
- Create: `src/core/storage.js`, `src/core/migrate.js`, `src/core/storage.test.js`, `src/core/migrate.test.js`

**Interfaces:**
- Produces:
  - `createStorage(backend?: Storage): { get(key): any|null, set(key, value): boolean, remove(key): void, restoreBackup(key): boolean, isPersistent(): boolean }` — JSON values; `set` copies the previous value to `<key>:bak` first; if the backend throws (disabled/full) it keeps data in memory, returns `false`, and `isPersistent()` becomes `false`; `get` on invalid JSON returns `null` without deleting the raw value.
  - `migrateData(data: {version: number, ...}, migrations: Record<number, (d) => d>, target: number): object` — applies `migrations[v]` to go from `v` to `v+1` until `target`; throws if a step is missing or `data.version > target`.

- [ ] **Step 1: Write failing tests** — set/get round-trip; second `set` writes `<key>:bak` with the first value and `restoreBackup` restores it; backend whose `setItem` throws → `set` returns `false`, `get` still returns the value, `isPersistent()` is `false`; corrupt raw string → `get` returns `null` and raw is still present; `migrateData({version:1,x:1}, {1: d=>({...d,version:2,y:2})}, 2)` equals `{version:2,x:1,y:2}`; missing step throws.
- [ ] **Step 2: Run** `npx vitest run src/core/storage src/core/migrate` — Expected: FAIL.
- [ ] **Step 3: Implement** both modules.
- [ ] **Step 4: Run** same command — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: storage with backup and data migration"`

### Task 7: `profiles`

**Files:**
- Create: `src/core/profiles.js`, `src/core/profiles.test.js`

**Interfaces:**
- Consumes: `createStorage` (Task 6).
- Produces:
  - `AVATARS: string[]` (24 emoji), `MAX_PROFILES = 4`, `MIN_DAILY_GOAL = 5`, `DEFAULT_DAILY_GOAL = 10`.
  - `createProfiles(storage): { list(): Profile[], add({name, avatar, dailyGoal?}): Profile, update(id, patch: Partial<{name, avatar, dailyGoal}>): Profile, remove(id): void, getCurrentId(): string|null, setCurrentId(id: string|null): void }` where `Profile = { id, name, avatar, dailyGoal }`.
  - Errors thrown as `Error` with messages: `'MAX_PROFILES'`, `'AVATAR_TAKEN'`, `'GOAL_TOO_LOW'`, `'NAME_REQUIRED'`.
  - `remove(id)` also deletes `progress:<id>` from storage and clears the current id if it was that profile.

- [ ] **Step 1: Write failing tests** — add with no `dailyGoal` → 10; `dailyGoal: 4` throws `GOAL_TOO_LOW`; 5th add throws `MAX_PROFILES`; same avatar twice throws `AVATAR_TAKEN`; `update` to another profile's avatar throws; empty name throws `NAME_REQUIRED`; `remove(a)` deletes `progress:a` but leaves `progress:b` and profile `b`; `setCurrentId` persists across a new `createProfiles(sameStorage)`.
- [ ] **Step 2: Run** `npx vitest run src/core/profiles` — Expected: FAIL.
- [ ] **Step 3: Implement.** Profile list under key `profiles` (`{version:1, items:[...]}`), current id under `currentProfile`, ids from `crypto.randomUUID()`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: profiles with avatars and limits"`

### Task 8: Dates and spaced repetition (`srs`)

**Files:**
- Create: `src/core/date.js`, `src/core/srs.js`, `src/core/date.test.js`, `src/core/srs.test.js`

**Interfaces:**
- Produces:
  - `todayISO(now?: Date): string` (local `YYYY-MM-DD`), `addDays(iso: string, n: number): string`, `daysBetween(a: string, b: string): number` (b − a).
  - `Card = { box: number /*0..4*/, correct: number, wrong: number, due: string|null }`; `newCard(): Card` (box 0, zeros, `due: null`).
  - `INTERVALS = [1, 3, 7, 14]`, `MASTERED_BOX = 3`.
  - `review(card: Card, correct: boolean, today: string): Card` — correct: `box = min(box+1, 4)`, `due = addDays(today, INTERVALS[min(box,4)-1])`; wrong: `box = 0`, `due = today`; counters updated.
  - `isMastered(card): boolean` (`box >= MASTERED_BOX`).
  - `pickWords({ words: Word[], cards: Record<string, Card>, today: string, level: number, count: number }): Word[]` — priority: due (`due <= today`) first, then words with `wrong > correct`, then unseen words with `level <= level`; no duplicates; stops at `count`; if short, pads with any word of `level <= level` not yet picked.

- [ ] **Step 1: Write failing tests** — `addDays('2026-10-30', 3) === '2026-11-02'`, across month and year end; `todayISO(new Date(2026,9,30,23,59)) === '2026-10-30'`; three consecutive corrects on a new card give boxes 1,2,3 with dues +1, +3, +7 days; a wrong at box 3 resets to box 0, due today; `isMastered` true at box 3; `pickWords` returns due words before unseen ones, never duplicates, honors `count`, and with only 4 words available and `count: 10` returns 4 without throwing.
- [ ] **Step 2: Run** `npx vitest run src/core/date src/core/srs` — Expected: FAIL.
- [ ] **Step 3: Implement** both modules (use local-time date parts, not `toISOString`).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: date helpers and spaced repetition"`

### Task 9: `progress` (XP, level, streak, badges, daily goal)

**Files:**
- Create: `src/core/config.js`, `src/core/progress.js`, `src/core/progress.test.js`

**Interfaces:**
- Consumes: `review`, `newCard`, `isMastered`, `addDays`, `daysBetween` (Task 8); `createStorage` (Task 6).
- Produces:
  - `config.js`: `XP = { correct: 10, perfectSession: 20, goalReached: 30 }`, `BADGES: {id: string, title: string, emoji: string, test: (state) => boolean}[]` with ids `streak-3`, `streak-7`, `streak-30`, `mastered-50`, `mastered-100`, `mastered-500`, `first-perfect`, `topic-complete:<topic>` handled in `progress.js` via `topicCompleteBadges(state, vocab)`.
  - `emptyProgress(): ProgressState` = `{ version: 1, xp: 0, streak: { count: 0, lastDate: null }, cards: {}, badges: [], perfectSessions: 0, daily: { date: null, correctIds: [], goalAwarded: false } }`.
  - `levelForXp(xp: number): number` = `floor(sqrt(xp / 50)) + 1`.
  - `currentStreak(state, today): number` — `0` if `lastDate` is neither today nor yesterday.
  - `dailyCount(state, today): number` — distinct correct word ids today (0 if `daily.date !== today`).
  - `finishSession(state, { results: {wordId: string, correct: boolean}[], goal: number, today: string, vocab: Word[] }): { state: ProgressState, xpGained: number, newBadges: string[], goalReachedNow: boolean }` — pure; updates cards via `review`, XP per rules, `+20` only when every result is correct and there are ≥ 1 results, goal bonus once per day, streak extended only when goal reached that call, badges awarded once.
  - `createProgressStore(storage, profileId): { load(): ProgressState, save(state): void }` — key `progress:<profileId>`, runs `migrateData`, falls back to `emptyProgress()` when absent or `null`.

- [ ] **Step 1: Write failing tests** — 7 correct + 3 wrong → `xpGained === 70`; 10/10 correct with goal 10 → `10*10 + 20 + 30 = 150`; second session same day that again reaches goal → no second `+30`; streak: goal reached on D then D+1 → count 2, skipping D+2 → `currentStreak(state, D+3) === 0`; goal not reached → streak unchanged; `levelForXp(0)=1`, `levelForXp(50)=2`, `levelForXp(200)=3`; badge `first-perfect` awarded once; `mastered-50` awarded when 50 cards reach box ≥ 3; `finishSession` does not mutate its input; `createProgressStore.load()` for a missing profile returns `emptyProgress()`; two stores for different ids never see each other's data.
- [ ] **Step 2: Run** `npx vitest run src/core/progress` — Expected: FAIL.
- [ ] **Step 3: Implement** `config.js` and `progress.js`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: progress, XP, streak and badges"`

### Task 10: `speech`

**Files:**
- Create: `src/core/speech.js`, `src/core/speech.test.js`

**Interfaces:**
- Produces: `isSpeechAvailable(synth?: SpeechSynthesis): boolean` (true only if a voice with `lang` starting `en` exists); `speak(text: string, opts?: { rate?: number, synth?: SpeechSynthesis }): void` — cancels any ongoing utterance, picks an `en-US` voice, falls back to any `en*`; no-op (no throw) when unavailable.

- [ ] **Step 1: Write failing tests** with a fake `synth` — available only when an `en` voice exists; `speak` calls `cancel()` then `speak()` with `utterance.text === 'dog'`, `rate` applied; with no voices `speak` does not throw and calls nothing.
- [ ] **Step 2: Run** `npx vitest run src/core/speech` — Expected: FAIL.
- [ ] **Step 3: Implement** (voices may load late: read `synth.getVoices()` on each call).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: speech synthesis wrapper"`

### Task 11: Quiz and Listen games

**Files:**
- Create: `src/games/quizLogic.js`, `src/games/Quiz.jsx`, `src/games/Listen.jsx`, `src/games/quizLogic.test.js`, `src/games/Quiz.test.jsx`

**Interfaces:**
- Consumes: `speak`, `isSpeechAvailable` (Task 10).
- Produces:
  - All game components share props `{ words: Word[], pool: Word[], onFinish: (results: {wordId: string, correct: boolean}[]) => void }` (`pool` = extra words used as distractors/padding).
  - `buildQuestion(word: Word, pool: Word[], direction: 'en2vi'|'vi2en', rng?: () => number): { prompt: string, emoji: string|null, options: string[], answer: string }` — 4 distinct options including the answer, distractors drawn from `pool` excluding `word` and any option with the same text; fewer than 3 distractors available → fewer options, never duplicates.
  - `Quiz` shows emoji when present, else the `vi`/`example` text, never a blank card; `Listen` auto-plays `speak(word.word)` on each question and hides the speaker button when `!isSpeechAvailable()`.

- [ ] **Step 1: Write failing tests** — `buildQuestion` options contain the answer exactly once and are all distinct; pool containing the same `vi` as the word is not offered as a distractor; with a 2-word pool returns 3 options; `Quiz` renders 3 words, choosing the right option marks correct, after the third answer `onFinish` is called once with 3 results (one `correct:false` when chosen wrong); a word without `emoji` renders its meaning, and the document never contains the text `undefined`.
- [ ] **Step 2: Run** `npx vitest run src/games/quiz` — Expected: FAIL.
- [ ] **Step 3: Implement** logic, `Quiz.jsx` and `Listen.jsx` (Listen reuses `buildQuestion` with `en` audio prompt and `en` options).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: quiz and listen games"`

### Task 12: Flashcard game

**Files:**
- Create: `src/games/Flashcard.jsx`, `src/games/Flashcard.test.jsx`

**Interfaces:**
- Consumes: shared game props (Task 11), `speak`.
- Produces: `Flashcard` — front shows `word` (+ emoji if any), tap flips to `vi`, `ipa`, `example` + `exampleVi`; buttons "Đã nhớ" / "Chưa nhớ" record `correct: true/false`; speaker button hidden when speech unavailable; `onFinish` fires after the last card.

- [ ] **Step 1: Write failing tests** — flip reveals `vi` and example; "Đã nhớ" then "Chưa nhớ" on 2 words → `onFinish([{wordId:a,correct:true},{wordId:b,correct:false}])`; word without emoji shows no empty emoji node.
- [ ] **Step 2: Run** `npx vitest run src/games/Flashcard` — Expected: FAIL.
- [ ] **Step 3: Implement** `Flashcard.jsx`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: flashcard game"`

### Task 13: Scramble game

**Files:**
- Create: `src/games/scrambleLogic.js`, `src/games/Scramble.jsx`, `src/games/scrambleLogic.test.js`, `src/games/Scramble.test.jsx`

**Interfaces:**
- Produces: `scramble(word: string, rng?: () => number): string[]` — shuffles the letters of `word` (spaces and hyphens removed from the shuffled set and re-inserted in place by the component), result never equals the original letter order unless all letters are identical or length ≤ 1; `Scramble` lets the child tap letters to build the word, shows emoji/`vi` as the clue, offers speaker, and marks correct on exact match (case-insensitive); two wrong submissions on a word record `correct:false` and reveal the answer.

- [ ] **Step 1: Write failing tests** — `scramble('dog', fixedRng)` differs from `['d','o','g']` for every seed in a loop of 50; `scramble('aa')` returns `['a','a']`; `scramble('a')` returns `['a']`; `scramble('ice-cream')` shuffles only the 8 letters; `Scramble` with word `dog`: tapping d,o,g in order → correct; tapping wrong letters twice → result `correct:false`.
- [ ] **Step 2: Run** `npx vitest run src/games/scramble src/games/Scramble` — Expected: FAIL.
- [ ] **Step 3: Implement** logic and component.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: scramble game"`

### Task 14: Match game

**Files:**
- Create: `src/games/matchLogic.js`, `src/games/Match.jsx`, `src/games/matchLogic.test.js`, `src/games/Match.test.jsx`

**Interfaces:**
- Produces: `buildMatchBoard(words: Word[], rng?: () => number): { id: string, wordId: string, kind: 'en'|'vi', text: string }[]` — 2 cards per word (max 6 words → 12 cards), shuffled; `Match` flips two cards at a time, matching pair stays revealed, mismatch flips back after ~800 ms, shows a timer, finishes when all matched with one result per word (`correct:true` if the word never took part in a mismatch).

- [ ] **Step 1: Write failing tests** — board for 6 words has 12 cards, one `en` and one `vi` per `wordId`; board for 3 words has 6 cards; a word with no emoji still has a `vi` card with non-empty text; component: with fake timers, picking a non-pair then waiting 800 ms hides both; matching all pairs calls `onFinish` once with a result per word and the mismatched word marked `correct:false`.
- [ ] **Step 2: Run** `npx vitest run src/games/match src/games/Match` — Expected: FAIL.
- [ ] **Step 3: Implement** logic and component.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: match game"`

### Task 15: Session builder ("Học hôm nay")

**Files:**
- Create: `src/core/session.js`, `src/core/session.test.js`

**Interfaces:**
- Consumes: `pickWords`, `isMastered` (Task 8), `levelForXp` (Task 9).
- Produces:
  - `playerLevelToWordLevel(xpLevel: number): 1|2|3` — XP level 1–3 → 1, 4–6 → 2, ≥ 7 → 3.
  - `buildDailySession({ vocab: Word[], progress: ProgressState, today: string, size?: number /*10*/ }): { words: Word[], newWords: Word[], steps: {mode: 'flashcard'|'quiz'|'listen'|'scramble'|'match', words: Word[]}[] }` — `words` from `pickWords` at the player's word level, padded from other topics when short; `newWords` (cards unseen) first get a `flashcard` step, then remaining steps rotate through `quiz`, `listen`, `scramble`, `match` (match step max 6 words); every word appears in at least one non-flashcard step.
  - `buildTopicSession({ vocab, topic, progress, today, size?: number }): same shape` for free play within a topic (pads from other topics at the same level when the topic has fewer than `size` words).

- [ ] **Step 1: Write failing tests** — fresh progress at level 1 → 10 words all `level 1`, a `flashcard` step covering all new words; due words are chosen before unseen; topic with 4 words and `size 10` → 10 distinct words (padded); no step has duplicate words; no match step exceeds 6 words; XP level boundaries map as above.
- [ ] **Step 2: Run** `npx vitest run src/core/session` — Expected: FAIL.
- [ ] **Step 3: Implement** `session.js`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: daily and topic session builder"`

### Task 16: App shell, profile picker and Home

**Files:**
- Create: `src/context/AppContext.jsx`, `src/ui/ProfilePicker.jsx`, `src/ui/AddProfile.jsx`, `src/ui/Home.jsx`, `src/ui/Header.jsx`, `src/ui/ProfilePicker.test.jsx`, `src/ui/Home.test.jsx`, `src/styles.css`
- Modify: `src/App.jsx`, `src/main.jsx`

**Interfaces:**
- Consumes: `createProfiles` (Task 7), `createProgressStore`, `levelForXp`, `currentStreak`, `dailyCount` (Task 9), `createVocabService` + vocab data (Tasks 2–5), `todayISO`.
- Produces:
  - `AppContext` value: `{ storage, profiles, vocab, currentProfile: Profile|null, progress: ProgressState, saveProgress(state), switchProfile(id|null) }`.
  - Routes: `/` (picker when no current profile, else `Home`), `/add-profile`, `/topics`, `/play/:mode`, `/profile`, `/settings` (later tasks fill these).
  - `ProfilePicker`: large avatar tiles with names + "Thêm hồ sơ" tile (hidden at 4 profiles); `AddProfile`: avatar grid (taken avatars disabled), name input, daily-goal chooser (5/10/15/20, default 10; skipping keeps 10), surfaces error codes as Vietnamese messages.
  - `Home`: greeting, streak 🔥, level + XP bar, goal ring `dailyCount/goal`, "Học hôm nay" button → `/play/daily`; `Header` shows the avatar on every screen, tapping calls `switchProfile(null)`.
  - Styling: large buttons, readable at child level; define in `styles.css`.

- [ ] **Step 1: Write failing tests** — with no profiles, `ProfilePicker` shows only "Thêm hồ sơ"; creating a profile named "Bin" with avatar 🦊 and no goal selection stores `dailyGoal: 10` and navigates to Home; with 4 profiles the add tile is absent; with one avatar used, its tile is disabled in `AddProfile`; `Home` for a profile with goal 10 and 4 correct words today shows `4/10`; tapping the header avatar returns to the picker.
- [ ] **Step 2: Run** `npx vitest run src/ui` — Expected: FAIL.
- [ ] **Step 3: Implement** context, screens, routing and styles.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: app shell, profile picker and home"`

### Task 17: Topics, play flow and results

**Files:**
- Create: `src/ui/Topics.jsx`, `src/ui/ModePicker.jsx`, `src/ui/Play.jsx`, `src/ui/Results.jsx`, `src/ui/Play.test.jsx`
- Modify: `src/App.jsx` (routes)

**Interfaces:**
- Consumes: `buildDailySession`, `buildTopicSession` (Task 15), game components (Tasks 11–14), `finishSession` (Task 9), `AppContext` (Task 16).
- Produces:
  - `Topics`: grid of topics with `mastered/total` per topic for the current profile; choosing a topic → `ModePicker` listing the 5 modes → `/play/<mode>?topic=<t>`.
  - `Play`: `/play/daily` runs the steps of `buildDailySession` in order; `/play/<mode>` runs a single step from `buildTopicSession`. **`today` is captured once when the session starts** and used for `finishSession`. Collects results from each step, calls `finishSession` on the last step, `saveProgress`, then renders `Results`.
  - `Results`: XP gained, new badges, goal status, words to review (wrong ones), buttons "Chơi tiếp" / "Về trang chủ".

- [ ] **Step 1: Write failing tests** — completing a single `flashcard` mode with all "Đã nhớ" on 3 words yields `Results` showing `+30 XP` (3 × 10) and saved progress contains 3 cards at box 1; with a mocked clock moving past midnight during play, the saved `daily.date` equals the session-start date; `Topics` shows `0/<n>` for a fresh profile and increments after mastering words; topic with 4 words plays a full session of 10 distinct words.
- [ ] **Step 2: Run** `npx vitest run src/ui/Play` — Expected: FAIL.
- [ ] **Step 3: Implement** the screens and routes.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: topics, play flow and results"`

### Task 18: Profile, badges and settings (incl. export/import)

**Files:**
- Create: `src/core/exportImport.js`, `src/core/exportImport.test.js`, `src/ui/ProfileScreen.jsx`, `src/ui/Settings.jsx`, `src/ui/Settings.test.jsx`

**Interfaces:**
- Consumes: `createProfiles`, `createProgressStore`, `BADGES`, `speak`.
- Produces:
  - `exportProfile(storage, profileId): string` — JSON `{ app: 'english-for-children', version: 1, profile, progress }`; `importProfile(storage, json: string): Profile` — validates `app` and `version`, creates a new profile (new id, honors the 4-profile and avatar rules, reassigning a free avatar if the exported one is taken), writes progress; throws `Error('INVALID_FILE')` on bad input.
  - `ProfileScreen`: level, XP, mastered count, badge collection (earned vs locked).
  - `Settings`: edit name/avatar, daily goal (5/10/15/20, minimum 5), speech rate slider with a "thử nghe" button, export/import buttons, delete profile with two-step confirmation (typing the name or confirming twice).

- [ ] **Step 1: Write failing tests** — export then import into a fresh storage reproduces xp and cards; importing JSON with the wrong `app` throws `INVALID_FILE`; importing when 4 profiles exist throws `MAX_PROFILES`; imported profile whose avatar is taken gets a different free avatar; `Settings` rejects a goal of 4 (control only offers 5/10/15/20); delete requires the second confirmation and leaves other profiles intact.
- [ ] **Step 2: Run** `npx vitest run src/core/exportImport src/ui/Settings` — Expected: FAIL.
- [ ] **Step 3: Implement** modules and screens.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: profile screen, settings and export/import"`

### Task 19: Fallbacks, README and GitHub

**Files:**
- Create: `README.md`
- Modify: `src/ui/Header.jsx` (storage notice), `src/ui/Home.jsx` (speech notice)

**Interfaces:**
- Consumes: `storage.isPersistent()` (Task 6), `isSpeechAvailable()` (Task 10).

- [ ] **Step 1: Write failing tests** — when `isPersistent()` is false the header shows "Tiến độ sẽ không được lưu"; when speech is unavailable Home shows a dismissible note and no speaker buttons render anywhere in a play session.
- [ ] **Step 2: Run** `npm test` — Expected: FAIL on the two new tests.
- [ ] **Step 3: Implement** both notices.
- [ ] **Step 4: Write `README.md`** — how to run (`npm install`, `npm run dev`), how to add words (edit/add JSON in `src/data/vocab/`, run `npm run validate:vocab`), how to back up progress, that `vi`/`ipa`/examples are machine-generated and should be spot-checked.
- [ ] **Step 5: Verify** `npm test` and `npm run build` pass; run `npm run dev` and manually check in Chrome and Edge: create two profiles, play "Học hôm nay", reach the goal, switch profile, confirm progress is separate.
- [ ] **Step 6: Commit** `git commit -m "feat: storage/speech fallbacks and README"`
- [ ] **Step 7: Connect GitHub (needs the repo URL from the user)** — the user creates an empty **private** repo on GitHub; then `git remote add origin <url>` and `git push -u origin main`. Expected: all commits visible on GitHub.

---

## Self-review notes

- **Spec coverage:** vocab data (Tasks 2–5), 5 game modes (11–14), SRS (8), XP/level/streak/badges/goal (9, 15), min/default goal (7, 9, 16), profiles with avatars (7, 16), export/import (18), speech (10), fallbacks (6, 19), GitHub (19). Nothing in the spec is left without a task.
- **Type consistency:** `Card`, `ProgressState`, `Profile`, shared game props and `{wordId, correct}` results are defined once and reused by name.
- **Proportion:** logic tasks carry signatures and assertions only; data tasks specify rules, not words.

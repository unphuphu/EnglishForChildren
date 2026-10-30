# English For Children v2 (Daily Lesson + Grammar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daily 4-step lesson (new words, grammar explanation, sentence practice, word review) with 8 grammar lessons, a grammar screen, checkpoint and general tests, on top of the finished v1 app.

**Architecture:** New pure-logic modules in `src/core` (sentence selection, exercise building, plan, lesson building, assessment) feed new exercise components in `src/games` and screens in `src/ui`. Lesson content is JSON under `src/data/grammar`; each sentence is tagged with the vocabulary it uses so exercises only contain learned words. `finishSession` in `src/core/progress.js` is extended, not replaced.

**Tech Stack:** React 18, Vite, React Router, Vitest + RTL, plain JavaScript (unchanged from v1).

**Spec:** `docs/superpowers/specs/2026-10-30-english-for-children-v2-grammar-design.md` (builds on the v1 spec and code on `main`).

## Global Constraints

- Plain JavaScript, no new runtime dependencies, no network calls, no microphone.
- Progress `version: 2`, with required sections `plan: { step }` and `grammar: { lessons, sentences, checkpoints, tests }`; **no migration from v1**. Export file `version: 2`; v1 files are rejected with `INVALID_FILE`.
- One-time cleanup of v1 data when storage key `appDataVersion` is not 2: remove `profiles`, `currentProfile`, every `progress:*` key (including `:bak`), then set `appDataVersion` to 2. It runs in `src/main.jsx` only, never inside `AppProvider`.
- Lesson step order: new words (profile goal 5/10/15/20, new words per lesson), grammar explanation, **8** sentence exercises (6 from the current part + 2 from earlier parts; fewer allowed, minimum 4, below 4 the step is skipped with a notice), word review of **10 to 20** questions (count = clamp(due words, 10, 20), padded with the weakest learned words; if fewer than 10 learned words exist use all, skip if none).
- Exercise types, in rotation: `order`, `blank`, `choose`, `translate`. One check per sentence. Correct = +10 XP; perfect (all scored answers correct) +20; completing a lesson = goal bonus +30 once per day and streak extension. Self-reported flashcard results never score (v1 rule unchanged).
- A correct sentence counts as a correct review of every word in its `uses` (SRS due rule unchanged); a wrong sentence changes no word card.
- Free words (always known) live in `src/data/grammar/freeWords.json`. A sentence is eligible only when every `uses` word has a card or is a new word of today's lesson.
- 8 grammar lessons in this order with sessions: to-be 2, this-that 1, there-is-are 2, have-has 1, can 1, present-simple 2, present-continuous 2, wh-questions 1 (12 steps). About 22 sentences per lesson.
- Checkpoint test: group = 5 consecutive lessons, 15 questions (minimum 10), pass at 70% (11/15), no locking. General test: 20 questions = 10 vocabulary + 10 grammar (all vocabulary if no lesson was studied), needs 10 learned words. Ratings: 90%+ "Xuất sắc", 70%+ "Tốt", 50%+ "Khá", else "Cần cố gắng thêm". Keep the last 10 test results.
- Badges added: `grammar-first-lesson`, `grammar-group-<n>`, `test-90`.
- Dates are local `YYYY-MM-DD`; the lesson date is the date the lesson started.
- Vietnamese UI text; English content is AI-written and must be spot-checked by the parent (README note).
- Branch `feat/v2-grammar`; one commit per task; private repo `origin`.

## Review Focus

- The one-time cleanup runs exactly once: a second launch with the marker present keeps the new profiles; keys that are not the app's are untouched.
- A sentence containing a word the child has not learned never appears; with only a few learned words fewer sentences appear without crashing or looping, and below 4 the step is skipped with a notice.
- When every roadmap step is finished (or the roadmap is empty) the daily lesson still works as vocabulary plus grammar review; nothing crashes on `plan.step` past the end.
- `blank` and `choose` exercises never contain duplicate options or two correct answers; `order`/`translate` shuffles never equal the correct order (including 2-token sentences and repeated words).
- A second lesson on the same day, or one that crosses midnight, awards the goal bonus and streak only once and uses the start date.

---

### Task 1: Data version cleanup and progress v2

**Files:**
- Modify: `src/core/storage.js`, `src/core/progress.js`, `src/core/exportImport.js`, `src/main.jsx`, `src/test/utils.jsx`
- Create: `src/core/dataVersion.js`, `src/core/dataVersion.test.js`
- Modify tests that hard-code `version: 1`: `src/core/hardening.test.js`, `src/core/progress.test.js`, `src/core/exportImport.test.js`

**Interfaces:**
- Produces: `storage.keys(): string[]` (backend keys; memory-only keys when the backend is blocked); `APP_DATA_VERSION = 2`; `cleanOldData(storage): boolean` (true when it removed anything); `emptyProgress()` with `version: 2`, `plan: { step: 0 }`, `grammar: { lessons: {}, sentences: {}, checkpoints: {}, tests: [] }`; `normalizeProgress` requires `version === 2` and validates the new sections (counts are non-negative numbers, `tests` items `{ date, score, total }`, `checkpoints` items `{ best, total }`).
- `memoryBackend` in `src/test/utils.jsx` gains `length` and `key(i)` so `keys()` works on it.

- [ ] **Step 1: Write failing tests** — `dataVersion.test.js`: with `profiles`, `currentProfile`, `progress:a`, `progress:a:bak`, `other` set and no marker, `cleanOldData` returns `true`, removes the first four, keeps `other`, sets `appDataVersion` to 2; a second call returns `false` and does not touch a newly added `profiles`; works on a fresh empty storage; a storage whose `getItem` throws does not throw. In `progress.test.js` / `hardening.test.js`: `emptyProgress().version === 2` and has `plan`/`grammar`; `normalizeProgress` rejects version 1, rejects a missing `grammar`, rejects `plan.step: -1`, accepts the empty state; update the existing expectations that assumed version 1. `exportImport.test.js`: a file with `version: 1` throws `INVALID_FILE`; round trip still works with version 2.
- [ ] **Step 2: Run** `npx vitest run src/core` — Expected: FAIL (missing module/keys).
- [ ] **Step 3: Implement** `keys()`, `dataVersion.js`, the progress changes and `FILE_VERSION = 2`; call `cleanOldData(storage)` in `src/main.jsx` before rendering and pass that storage to `AppProvider`.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS (all suites; fix tests that fail only because they built v1-shaped progress objects).
- [ ] **Step 5: Commit** `git commit -m "feat: progress v2, one-time cleanup of v1 data"`

### Task 2: Grammar schema validator and loader

**Files:**
- Create: `src/core/grammarSchema.js`, `src/core/grammarSchema.test.js`, `src/data/grammar/freeWords.json`, `src/data/grammar/lessons.js`, `scripts/validateGrammar.js`
- Modify: `package.json` (`validate:grammar` script; `build` runs `validate:vocab && validate:grammar && vite build`)

**Interfaces:**
- Produces:
  - `tokenize(en: string): string[]` — lowercase words without punctuation (apostrophes kept).
  - `matchesUses(token: string, uses: string[]): boolean` — equals a use word or a simple inflection (-s, -es, -ies from -y, -ing incl. e-drop and consonant doubling, -ed, -d, -ied).
  - `validateLesson(lesson, { vocabWords: Set<string>, freeWords: Set<string> }): string[]` — messages prefixed with the lesson id or sentence id.
  - `validateGrammar({ lessons, roadmap, vocab, freeWords }): string[]` — all lesson errors plus duplicate sentence ids and structural roadmap errors (topic missing, lesson missing, `part` above the lesson's `sessions`).
  - `src/data/grammar/lessons.js` default-exports every `src/data/grammar/lessons/*.json` sorted by `order` (via `import.meta.glob`).
  - `freeWords.json`: array of lowercase strings (articles, pronouns, *be/have/do* forms, basic prepositions and conjunctions, *not*, question words, *yes/no*, common proper-name placeholders).

- [ ] **Step 1: Write failing tests** — `tokenize("There's a dog, isn't it?")`; `matchesUses('goes', ['go'])`, `('running', ['run'])`, `('making', ['make'])`, `('studies', ['study'])`, `('played', ['play'])` true and `('dogs', ['cat'])` false; `validateLesson` accepts a valid fixture and reports: unknown `uses` word, a token in `en` that is neither free nor matched by `uses`, missing `vi`, `blank.answer` not in the sentence or not in `options`, `options` with duplicates, a `wrong` equal to `en`, fewer than 2 `wrong`, duplicate sentence ids, `session` above `sessions`; a multi-word use ("ice cream") satisfies its two tokens; `validateGrammar` reports a roadmap step with an unknown topic, unknown lesson and `part: 3` for a 2-session lesson.
- [ ] **Step 2: Run** `npx vitest run src/core/grammarSchema` — Expected: FAIL.
- [ ] **Step 3: Implement** the module, the loader and `scripts/validateGrammar.js` (reads vocab and grammar files from disk like `validateVocab.js`, exits 1 on any error; with no lesson files it prints a note and exits 0).
- [ ] **Step 4: Run** `npx vitest run src/core/grammarSchema && npm run validate:grammar` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: grammar schema validator and loader"`

### Task 3: Sentence selection and exercise building

**Files:**
- Create: `src/core/sentences.js`, `src/core/sentences.test.js`
- Modify: `src/core/config.js` (export `LESSON` constants: `SENTENCES: 8`, `CURRENT_PART: 6`, `MIN_SENTENCES: 4`)

**Interfaces:**
- Consumes: `Card`, `isMastered` (srs), `tokenize`/`matchesUses` (Task 2).
- Produces:
  - `wordIdsFor(sentence, vocab: Word[]): string[]` — ids of `uses` words (case-insensitive match on `word`; unknown words are ignored).
  - `eligibleSentences({ lesson, vocab, cards, extraWordIds = [] }): Sentence[]` — sentences whose every `uses` word id has a card or is in `extraWordIds`.
  - `pickSentences({ lessons, lessonId, part, vocab, progress, extraWordIds, today, count = 8, rng }): { sentence: Sentence, lessonId: string }[]` — for `part` n: up to 6 from part n plus 2 from parts before n (all `count` from part 1 when n = 1); `part: null` draws from every eligible sentence of the lesson (practice) or, with `lessonId: null`, from all lessons with at least one finished part (review). Score = 2 per due used word + 1 per weak used word + 1 if never seen − 0.5 per time seen; ties broken by `rng`; never duplicates; returns fewer when fewer exist.
  - `assignTypes(sentences): ('order'|'blank'|'choose'|'translate')[]` — rotates the four types; a sentence lacking data for its type (order needs ≥ 3 tokens, blank needs `blank`, choose needs ≥ 2 `wrong`) takes the next type.
  - `buildExercise(sentence, lessonId, type, rng): Exercise` with `{ type, sentenceId, lessonId, en, vi, wordIds }` plus: `order: { tokens }` (space-split words of `en`, shuffled, never equal to the original order, retry then rotate); `blank: { text, options, answer }` (`text` has `___` once; options shuffled and distinct); `choose: { options, answer }` (`en` plus 2 or 3 `wrong`, distinct, shuffled); `translate: { prompt, tokens }` (tokens of `en` plus `extra`, shuffled).

- [ ] **Step 1: Write failing tests** — eligibility excludes a sentence with one unknown word and includes it once that word has a card or is in `extraWordIds`; `pickSentences` for part 2 returns 6 from part 2 + 2 from part 1, no duplicates, prefers sentences with due words, returns 3 when only 3 are eligible, returns all 8 from part 1 for part 1; `assignTypes` over 8 sentences gives 2 of each type and swaps a type when data is missing; `buildExercise` invariants for each type (order tokens are a permutation of the correct tokens and differ from it for 50 seeds, including a 2-token sentence and a sentence with a repeated word; blank text contains `___` once and the answer appears once in options; choose options distinct with the correct sentence once; translate tokens equal the sentence tokens plus extras).
- [ ] **Step 2: Run** `npx vitest run src/core/sentences` — Expected: FAIL.
- [ ] **Step 3: Implement** the module per the signatures (reuse `shuffle` from `src/games/shuffle.js`).
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: sentence selection and exercise builder"`

### Task 4: Roadmap data and plan logic

**Files:**
- Create: `src/data/roadmap.json`, `src/core/plan.js`, `src/core/plan.test.js`
- Modify: `src/core/grammarSchema.js` (add coverage check), `scripts/validateGrammar.js`

**Interfaces:**
- Produces:
  - `roadmap.json`: 12 steps `{ "topic", "lesson", "part" }` in lesson order (to-be 1,2 / this-that 1 / there-is-are 1,2 / have-has 1 / can 1 / present-simple 1,2 / present-continuous 1,2 / wh-questions 1) with early easy topics (`family`, `school`, `animals`, `food`, `body`, `clothes`, `home`, `fruits`, `drinks`, `weather`, `town`, `sports`) reused where needed.
  - `suggestToday({ roadmap, lessons, vocab, progress, topicOrder }): { step: number, topic: string, lessonId: string|null, lessonTitle: string|null, part: number|null, sessions: number|null, beyondRoadmap: boolean }` — uses `roadmap[progress.plan.step]`; if that topic has no unlearned word (no card) use the next topic in `topicOrder` (default: `vocab.topics()` order) that does; past the end or an empty roadmap gives `beyondRoadmap: true`, `lessonId: null`.
  - `roadmapCoverageErrors({ roadmap, lessons, vocab, freeWords, perTopic = 10, minSentences = 8 }): string[]` — for each step, learned = the first `perTopic` level-1 words (file order) of every topic in steps ≤ that step; error when fewer than `minSentences` sentences of that lesson part (plus earlier parts) are eligible.

- [ ] **Step 1: Write failing tests** — `suggestToday` returns step 0 for fresh progress; returns the next step after `plan.step: 1`; falls back to the next topic when the roadmap topic is fully learned; `beyondRoadmap` when `plan.step` ≥ length and when the roadmap is `[]`; `roadmapCoverageErrors` reports a step whose lesson has only 3 eligible sentences and none when enough exist (fixtures).
- [ ] **Step 2: Run** `npx vitest run src/core/plan` — Expected: FAIL.
- [ ] **Step 3: Implement** `plan.js`, the coverage check, and wire `roadmapCoverageErrors` into `scripts/validateGrammar.js` (coverage errors are reported only when lessons exist for the step). Write `roadmap.json`.
- [ ] **Step 4: Run** `npx vitest run src/core/plan` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: roadmap data and daily plan logic"`

### Task 5: Grammar content, lessons 1 to 4

**Files:**
- Create: `src/data/grammar/lessons/to-be.json`, `this-that.json`, `there-is-are.json`, `have-has.json`
- Create: `src/data/grammar/data.test.js`
- Modify: `src/data/grammar/freeWords.json` (only to add genuinely function words a sentence needs)

**Interfaces:**
- Produces: lessons with `order` 1 to 4, `sessions` 2/1/2/1, 2–3 `explain` blocks in Vietnamese with 2 English examples each, about 22 sentences per lesson (≥ 10 per session for 2-session lessons), each with `vi`, `uses`, `blank`, ≥ 2 `wrong`, 2 `extra`, `session`. Sentences use only free words and vocabulary from the first 10 level-1 words of the topics in `roadmap.json` up to that lesson's steps (plus later topics only if the step list allows).

- [ ] **Step 1: Write failing test** `data.test.js`: `validateGrammar` over all lessons, the roadmap and the real vocabulary returns `[]`; each lesson has between 20 and 26 sentences; each session of a 2-session lesson has at least 10 sentences; `roadmapCoverageErrors` returns `[]` for the steps whose lessons exist.
- [ ] **Step 2: Run** `npx vitest run src/data/grammar` — Expected: FAIL (no lessons).
- [ ] **Step 3: Write the four lesson files.** Natural, correct, child-appropriate English; simple Vietnamese; wrong sentences contain exactly one grammar error; blank options contain the answer once plus plausible wrong forms. Run `npm run validate:grammar` until clean.
- [ ] **Step 4: Run** `npx vitest run && npm run validate:grammar` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "data: grammar lessons 1-4"`

### Task 6: Grammar content, lessons 5 to 8

**Files:**
- Create: `src/data/grammar/lessons/can.json`, `present-simple.json`, `present-continuous.json`, `wh-questions.json`
- Modify: `src/data/grammar/data.test.js`, `freeWords.json` (if needed)

**Interfaces:**
- Produces: lessons with `order` 5 to 8, `sessions` 1/2/2/1, same rules as Task 5. After this task the whole roadmap is covered.

- [ ] **Step 1: Extend the failing test** — exactly 8 lessons with orders 1..8 and the specified `sessions`; total sentences between 160 and 200; `roadmapCoverageErrors` returns `[]` for all 12 steps.
- [ ] **Step 2: Run** `npx vitest run src/data/grammar` — Expected: FAIL.
- [ ] **Step 3: Write the four lesson files** following Task 5's rules; present-tense lessons contain both affirmative and question/negative sentences; `-ing`/`-s` forms are covered by `uses` inflection matching.
- [ ] **Step 4: Run** `npx vitest run && npm run validate:grammar && npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "data: grammar lessons 5-8"`

### Task 7: Tile exercises (order and translate)

**Files:**
- Create: `src/games/TileExercise.jsx`, `src/games/TileExercise.test.jsx`

**Interfaces:**
- Consumes: `Exercise` of type `order` or `translate` (Task 3), `speak`, `useAutoSpeak`.
- Produces: `TileExercise({ exercise, onAnswer, speechRate, voiceName })` where `onAnswer({ sentenceId, lessonId, wordIds, correct })` is called once, when the child presses **Tiếp tục** after feedback. The child taps tiles to build the sentence (tapping a placed tile returns it), presses **Kiểm tra**; one check only. Feedback shows the correct sentence and its translation; the correct English sentence is read aloud once after the check (nothing is read before). `translate` shows `exercise.prompt` (Vietnamese); `order` shows a short instruction only.

- [ ] **Step 1: Write failing tests** — building the right order gives `correct: true`; a wrong order gives `correct: false` and shows the correct sentence; **Kiểm tra** is disabled until all tiles are placed; a placed tile can be returned; repeated words ("the ... the") are each usable once; `translate` shows the Vietnamese prompt and the extra tiles but accepts only the correct sentence; `speak` is called once with the English sentence after checking and never before; `onAnswer` fires once.
- [ ] **Step 2: Run** `npx vitest run src/games/TileExercise` — Expected: FAIL.
- [ ] **Step 3: Implement** the component (tiles are `{ id, text }` so duplicates are distinct; compare `placed.map(text).join(' ')` with `exercise.en`).
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: tile sentence exercises"`

### Task 8: Choice exercises and exercise runner

**Files:**
- Create: `src/games/ChoiceExercise.jsx`, `src/games/SentenceExercises.jsx`, `src/games/SentenceExercises.test.jsx`

**Interfaces:**
- Consumes: `Exercise` types `blank`/`choose`, `TileExercise` (Task 7).
- Produces:
  - `ChoiceExercise({ exercise, onAnswer, speechRate, voiceName })` — `blank` shows `text` with the blank and the options; `choose` shows the options as full sentences; one tap answers, feedback with the correct sentence and translation, correct sentence read aloud once after answering, **Tiếp tục** calls `onAnswer` once.
  - `SentenceExercises({ exercises, onFinish, speechRate, voiceName })` — runs the list in order with progress `k/n`, dispatching by `type`; `onFinish(results)` with `results: { sentenceId, lessonId, wordIds, correct }[]`. An empty list calls `onFinish([])` immediately.

- [ ] **Step 1: Write failing tests** — `blank`: choosing the answer is correct and the sentence is read once after; choosing another option is wrong and reveals the answer; `choose`: same; options are all different; `SentenceExercises` with 4 mixed exercises (one per type) collects 4 results in order and calls `onFinish` once; progress text `2/4`; empty list calls `onFinish([])`.
- [ ] **Step 2: Run** `npx vitest run src/games/SentenceExercises` — Expected: FAIL.
- [ ] **Step 3: Implement** both components.
- [ ] **Step 4: Run** `npx vitest run src/games` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: choice exercises and exercise runner"`

### Task 9: Lesson building and completion rules

**Files:**
- Create: `src/core/lesson.js`, `src/core/lesson.test.js`
- Modify: `src/core/progress.js`, `src/core/config.js` (lesson constants, new badges), `src/core/progress.test.js`, `src/ui/Play.jsx` and its test (callers of `finishSession`)

**Interfaces:**
- Consumes: `suggestToday` (Task 4), `pickSentences`/`assignTypes`/`buildExercise` (Task 3), `pickWords`.
- Produces:
  - `buildLesson({ roadmap, lessons, vocab, progress, today, goal, topic = null, rng }): { topic, lesson: { id, title, part, sessions, short: boolean } | null, newWords: Word[], exercises: Exercise[], reviewWords: Word[], notice: string|null }` — `topic` overrides the suggested topic; `newWords` = up to `goal` words of the topic with no card (file order; topped up with that topic's due words when short); `short` is true when `part > 1`; `exercises` use `extraWordIds` = ids of `newWords`; when fewer than 4 sentences are eligible, `exercises = []` and `notice = 'Học thêm từ nhé'`; past the roadmap, `lesson = null` and `exercises` come from review of finished lessons; `reviewWords` = count clamp(due, 10, 20) padded with the weakest learned words, excluding today's `newWords`, fewer if fewer learned words exist, `[]` if none.
  - `finishSession(state, { results, sentenceResults = [], today, vocab, completesLesson = false, grammarRef = null })` — **replaces the `goal` parameter**. `sentenceResults` items `{ sentenceId, lessonId, wordIds, correct }` add `+10` per correct and take part in the perfect-session check; each correct one reviews every `wordIds` card as correct; wrong ones leave cards unchanged; `grammar.sentences[id]` gets `seen += 1` (and `wrong += 1` when wrong) and `grammar.lessons[lessonId]` gets `correct`/`wrong` counts. `completesLesson: true` awards the goal bonus (+30, once per day via `daily.goalAwarded`) and advances the streak. `grammarRef: { lessonId, part, advancePlan }` increments `grammar.lessons[lessonId].partsDone` and, when `advancePlan`, `plan.step += 1`; both are applied only when `completesLesson` is true. Returns the same shape as before (`state, xpGained, newBadges, goalReachedNow`).
  - Badges: `grammar-first-lesson` when any `partsDone` ≥ 1; `grammar-group-<n>` and `test-90` are added in Task 13.
  - `Play.jsx` stops passing `goal` and never completes a lesson (quick review and single games earn XP only).

- [ ] **Step 1: Write failing tests** — `buildLesson`: day 1 gives `goal` new words, 8 exercises or fewer, no review; a word without a card never appears in an exercise; `short: true` for part 2; topic override changes `newWords`; fewer than 4 eligible sentences gives `exercises: []` and the notice; past the roadmap gives `lesson: null` and still works; review count is 10 with 3 due words padded by weak ones, 20 with 30 due words, fewer when few learned words, excludes today's new words. `finishSession`: sentence results give 10 XP each and +20 only when all scored answers are correct; a correct sentence advances the cards of its words and a wrong one does not; `completesLesson` gives +30 once per day and extends the streak, a second completion the same day does not; without `completesLesson` the goal bonus and streak never fire even with many correct answers; `grammarRef` increments `partsDone` and `plan.step` only when `completesLesson` and `advancePlan`; self-reported results still score nothing; `grammar-first-lesson` is awarded once; input state is not mutated. Update the existing goal-related tests in `progress.test.js` and `Play.test.jsx` to the new rules.
- [ ] **Step 2: Run** `npx vitest run src/core src/ui/Play` — Expected: FAIL.
- [ ] **Step 3: Implement** `lesson.js` and the `finishSession` changes; update `Play.jsx`.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: lesson building and completion rules"`

### Task 10: Lesson flow screen

**Files:**
- Create: `src/ui/Lesson.jsx`, `src/ui/GrammarExplain.jsx`, `src/ui/Lesson.test.jsx`
- Modify: `src/App.jsx` (route `/lesson`), `src/ui/Results.jsx` (lesson variant)

**Interfaces:**
- Consumes: `buildLesson`, `finishSession` (Task 9), `Flashcard`, `Quiz`, `SentenceExercises` (Task 8), `useApp`, `todayISO`.
- Produces: route `/lesson` (optional `?topic=`). Stages in order: new words (Flashcard), explanation (`GrammarExplain`: Vietnamese blocks with examples, a listen button per example, first example read once; `short` shows only the first block with a "nhắc lại" heading), sentence exercises, review (Quiz). Empty stages are skipped; a stage indicator shows `Bước k/4`. The date is captured when the lesson mounts. On the last stage: `finishSession` with `completesLesson: true`, `grammarRef` (`advancePlan: true` only for the roadmap's lesson, not for a vocabulary-only lesson), `saveProgress`, then `Results` showing XP, the goal bonus, new badges, words to review and "Buổi học hôm nay đã xong ✅". Leaving mid-lesson saves nothing for steps not finished (the next start rebuilds the lesson).

- [ ] **Step 1: Write failing tests** — a fresh profile completes all stages (answering via helper) and the saved progress has `plan.step === 1`, `grammar.lessons[...].partsDone === 1`, new cards for the new words and the goal bonus awarded; a lesson with no eligible sentences skips to the next stage and shows the notice; a lesson past the roadmap still finishes without advancing `plan.step`; the lesson date stays the start date when the clock passes midnight; a second lesson the same day gives no second goal bonus; `?topic=` changes the new words; the explanation screen shows the blocks and `short` shows only one.
- [ ] **Step 2: Run** `npx vitest run src/ui/Lesson` — Expected: FAIL.
- [ ] **Step 3: Implement** the screens and route.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: daily lesson flow"`

### Task 11: Home daily card, topic change, quick review

**Files:**
- Create: `src/ui/ChangeTopic.jsx`
- Modify: `src/ui/Home.jsx`, `src/App.jsx` (route `/lesson/topic`), `src/ui/Settings.jsx` (goal label), tests `src/ui/Home.test.jsx`, `src/ui/ProfilePicker.test.jsx`, `src/ui/Settings.test.jsx`, `src/ui/Recovery.test.jsx`, `src/ui/Navigation.test.jsx`, `src/ui/Play.test.jsx`

**Interfaces:**
- Consumes: `suggestToday` (Task 4), `useApp`.
- Produces: Home shows a card "Hôm nay: chủ đề *X* + bài *Y* (buổi k/n)" (or "chủ đề *X* + ôn ngữ pháp" past the roadmap) with links **Bắt đầu** (`/lesson`) and **Đổi chủ đề** (`/lesson/topic`), and a status "Đã xong ✅" when `daily.date === today && daily.goalAwarded`, otherwise "Chưa làm". The old goal ring (`x/10`) is removed. The old **Học hôm nay** link becomes **Ôn nhanh** (`/play/daily`). `ChangeTopic` lists topics; choosing one goes to `/lesson?topic=<topic>`. The Settings goal label becomes "Số từ mới mỗi buổi học" (still 5/10/15/20). Add a link to the grammar screen (Task 12) only when that route exists.

- [ ] **Step 1: Write failing tests** — Home shows the suggested topic and lesson for a fresh profile and the next step after `plan.step: 3`; shows "Đã xong ✅" after a completed lesson today and "Chưa làm" after yesterday's; **Bắt đầu** links to `/lesson`; **Ôn nhanh** links to `/play/daily`; the topic list links to `/lesson?topic=…`; no `x/10` text remains. Update the older tests that expected the ring or the old labels.
- [ ] **Step 2: Run** `npx vitest run src/ui` — Expected: FAIL.
- [ ] **Step 3: Implement** the Home changes, `ChangeTopic`, the route and the label.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: daily lesson card on home, topic change, quick review"`

### Task 12: Grammar screen

**Files:**
- Create: `src/ui/GrammarList.jsx`, `src/ui/GrammarLesson.jsx`, `src/ui/GrammarPractice.jsx`, `src/ui/Grammar.test.jsx`
- Modify: `src/App.jsx` (routes `/grammar`, `/grammar/:lessonId`, `/grammar/:lessonId/practice`), `src/ui/Home.jsx` (link "Ngữ pháp"), `src/context/AppContext.jsx` (expose `lessons`, `roadmap` from the data modules, overridable through `AppProvider` props for tests), `src/test/utils.jsx`

**Interfaces:**
- Consumes: `GrammarExplain` (Task 10), `pickSentences`/`assignTypes`/`buildExercise`, `SentenceExercises`, `finishSession` (no `completesLesson`).
- Produces: `/grammar` lists lessons with status *chưa học* (`partsDone` 0), *đang học*, *đã học* (`partsDone` ≥ `sessions`) and links to checkpoint/test (Task 14); `/grammar/:lessonId` shows every explanation block (all examples listenable) and a **Luyện thêm** link enabled when `partsDone ≥ 1`; practice runs 8 eligible sentences of that lesson (all parts) through `SentenceExercises`, saves XP/word reviews/sentence stats and shows `Results`. Unknown lesson ids redirect to `/grammar`.

- [ ] **Step 1: Write failing tests** — statuses for three progress states; the lesson page shows all blocks; **Luyện thêm** is disabled before the first finished part; practice completes and saves XP and `grammar.sentences` counts; an unknown lesson id redirects; practice with fewer than 4 eligible sentences shows the notice instead of an empty screen.
- [ ] **Step 2: Run** `npx vitest run src/ui/Grammar` — Expected: FAIL.
- [ ] **Step 3: Implement** the screens, routes and context fields.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: grammar screen with review and practice"`

### Task 13: Assessment logic

**Files:**
- Create: `src/core/assessment.js`, `src/core/assessment.test.js`
- Modify: `src/core/config.js` (rating thresholds, test sizes, badge `test-90`)

**Interfaces:**
- Consumes: `eligibleSentences`, `pickSentences`, `assignTypes`, `buildExercise`, `pickWords`.
- Produces:
  - `groupOf(lessonOrder: number): number` = `ceil(order / 5)`; `isGroupComplete({ group, lessons, progress }): boolean` — the group has 5 lessons and every one has `partsDone ≥ sessions`.
  - `buildCheckpoint({ group, lessons, vocab, progress, today, rng }): Exercise[]` — 15 eligible sentences across the group's lessons (minimum 10; fewer returns `[]`).
  - `buildGeneralTest({ lessons, vocab, progress, today, rng }): { vocabWords: Word[], exercises: Exercise[] }` — 10 learned words and 10 sentences from lessons with ≥ 1 finished part; all 20 from vocabulary when no lesson was studied; `null` when fewer than 10 words are learned.
  - `rateScore(score, total): 'Xuất sắc'|'Tốt'|'Khá'|'Cần cố gắng thêm'`.
  - `weakAreas({ vocabResults, sentenceResults, lessons, vocab }): { lessons: { id, title }[], words: Word[] }` from wrong answers.
  - `recordAssessment(state, { kind: 'checkpoint'|'test', group?, score, total, date }): { state, newBadges }` — updates `grammar.checkpoints[group]` (`best` keeps the highest score) or appends to `grammar.tests` (last 10); awards `grammar-group-<n>` when `score/total ≥ 0.7`, and `test-90` when a test is ≥ 90%.

- [ ] **Step 1: Write failing tests** — `isGroupComplete` false with 4 lessons, false with one unfinished, true with 5 finished; `buildCheckpoint` returns 15 distinct eligible exercises, 10–14 when fewer eligible, `[]` below 10; `buildGeneralTest` splits 10/10, all vocabulary without grammar, `null` below 10 learned words; ratings at 18/20, 14/20, 10/20, 9/20; `weakAreas` lists only lessons/words answered wrong, deduplicated; `recordAssessment` passes at 11/15 and not at 10/15, keeps the best checkpoint score, trims tests to 10, awards `test-90` at 18/20 only, awards a badge once.
- [ ] **Step 2: Run** `npx vitest run src/core/assessment` — Expected: FAIL.
- [ ] **Step 3: Implement** the module and config constants.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: assessment logic"`

### Task 14: Assessment screens

**Files:**
- Create: `src/ui/Assessment.jsx`, `src/ui/AssessmentResults.jsx`, `src/ui/Assessment.test.jsx`
- Modify: `src/App.jsx` (routes `/grammar/checkpoint/:group`, `/test`), `src/ui/GrammarList.jsx` (checkpoint buttons, test button), `src/ui/Home.jsx` (link "Kiểm tra")

**Interfaces:**
- Consumes: Task 13 functions, `SentenceExercises`, `Quiz`, `finishSession` (without `completesLesson`), `recordAssessment`.
- Produces: `/grammar/checkpoint/:group` runs the checkpoint (button shown on the grammar screen only when `isGroupComplete`; direct visits to an incomplete group redirect to `/grammar`); `/test` runs the general test (vocabulary part with `Quiz`, then the sentence part) and is disabled with a message under 10 learned words. `AssessmentResults` shows `score/total`, the rating, pass/fail for checkpoints (retry link, no locking), new badges, and the weak lessons and words. XP and word reviews follow `finishSession`; the date is the start date.

- [ ] **Step 1: Write failing tests** — a completed group shows the checkpoint button and an incomplete one does not; completing a checkpoint with ≥ 11/15 correct saves the badge and `checkpoints`; with fewer, shows the retry link and no badge; visiting an incomplete group redirects; the test button is disabled under 10 learned words with the message; a full test shows rating and weak areas and saves to `grammar.tests`; a test with no studied lessons runs 20 vocabulary questions.
- [ ] **Step 2: Run** `npx vitest run src/ui/Assessment` — Expected: FAIL.
- [ ] **Step 3: Implement** the screens, routes and links.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: checkpoint and general test screens"`

### Task 15: Wrap-up

**Files:**
- Modify: `README.md`, `src/ui/Header.jsx` only if a back link is missing on new routes

**Interfaces:** none new.

- [ ] **Step 1: Write failing test** — in `src/ui/Navigation.test.jsx` add routes `/lesson`, `/lesson/topic`, `/grammar`, `/grammar/to-be`, `/test` to the "has a way back to the home page" list.
- [ ] **Step 2: Run** `npx vitest run src/ui/Navigation` — Expected: FAIL if any new route lacks the back link (otherwise PASS and note it).
- [ ] **Step 3: Update `README.md`** — new lesson flow, grammar screen and tests, that v2 deletes all v1 profiles and progress on first launch (export first if wanted), that grammar content is AI-written and needs a parent spot-check, how to add a grammar lesson (a new JSON in `src/data/grammar/lessons/`, run `npm run validate:grammar`) and the roadmap file.
- [ ] **Step 4: Verify** `npx vitest run`, `npm run validate:vocab`, `npm run validate:grammar`, `npm run build` all pass; start `npm run dev` and fetch the page (HTTP 200). A manual Chrome/Edge check cannot be performed in the session; say so in the final report.
- [ ] **Step 5: Commit** `git commit -m "docs: v2 readme and navigation coverage"`

---

## Self-review notes

- **Spec coverage:** §3 content and validator (Tasks 2, 4, 5, 6), §4 lesson flow and plan (Tasks 4, 9, 10, 11), §5 exercises (Tasks 3, 7, 8), §6 grammar screen and tests (Tasks 12, 13, 14), §7 storage and cleanup (Task 1), §8 errors (Tasks 3, 9, 10), §9 tests (every task), §10 assumptions (README, Task 15).
- **Type consistency:** `Exercise`, `finishSession` options and `suggestToday` shape are defined once and reused by name.
- **Proportion:** logic tasks carry signatures and assertions only; content tasks state rules, not sentences.

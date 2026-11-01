# English For Children v3: speaking practice and AI conversation

Date: 2026-11-01. Two features, one spec, built in order: (1) pronunciation scoring, (2) conversation.

## Intent

The parent and child (9-12) use the app on one Windows PC. The parent wants the two skills still missing after
vocabulary and grammar: saying English out loud with feedback, and having a short conversation. Everything must be
free and run on this PC (12 GB RAM, CPU only). There is no paid API.

Decisions made with the parent:

- Scoring uses the browser's speech recognition (free, Chrome/Edge, needs internet). It only tells whether the child
  said the word or sentence, not which sound was wrong.
- Speaking appears in three places: a "read it" button on the flashcard, a speaking step in the daily lesson, and
  reading the sentence aloud after a correct sentence exercise.
- A wrong or unheard attempt never blocks learning: up to 3 tries, then skip, no penalty.
- Conversation uses a local model in LM Studio (`qwen2.5-3b-instruct`, measured on this PC: about 5 s for a one-sentence
  reply, first call about 15 s while the model loads). A Settings switch turns AI on or off, default on. When AI is off
  or not reachable, scripted dialogues are used.
- The child can speak or type; AI replies are shown and read aloud.
- Correction is a button "Gợi ý sửa" (hint). The model only rewrites the child's sentence; the app compares the two and
  writes the Vietnamese hint itself, because the model cannot write Vietnamese explanations reliably.

Assumptions (not discussed): 5 XP per correctly read sentence in the lesson step, 20 XP for finishing a conversation
(at least 3 child turns), 8 child turns at most per conversation, 6 scenarios, conversations are not saved, the model
name is editable in Settings, the LM Studio address is fixed (`/lmstudio`, proxied by Vite to `localhost:1234`).

## Part 1: speaking practice

Units:

- `core/pronunciation.js` (pure): `normalizeText`, `scoreWord(target, heard[])`, `scoreSentence(target, heard[])`.
  Words match when equal after normalising (lower case, no punctuation, spaces/hyphens ignored) or within edit distance
  1 for words of 5+ letters. A sentence passes when at least 80 % of its words appear in order (longest common
  subsequence); the result lists the missing words and the best heard text. The best of the recogniser's alternatives
  counts.
- `core/speechRecognition.js`: `isRecognitionSupported()` and `listen()` wrap `SpeechRecognition`/`webkitSpeechRecognition`
  (lang en-US, 5 alternatives, one result). `listen` resolves to `{ ok: true, alternatives }` or
  `{ ok: false, reason }` with reason `unsupported | denied | no-speech | error`. The recogniser class is injectable.
- `ui/useMic.js`: true when recognition is supported and the profile's `micEnabled` is not `false`.
- `games/SpeakPractice.jsx`: props `target`, `kind` (`word` | `sentence`), `onDone({ correct, tries, skipped })`,
  speech rate and voice. Idle, listening, result states. A miss shows what was heard (and missing words), plays the
  model voice, and offers "Thử lại" and, after the first miss, "Bỏ qua". After 3 misses only "Tiếp tục" remains. If the
  microphone is denied the component says so and offers "Bỏ qua".
- Flashcard: once flipped, `SpeakPractice` for the word, optional, no XP.
- Sentence exercises: after a correct answer, `SpeakPractice` for the sentence below the feedback, optional, no XP.
- Lesson: new step `speak` between `exercises` and `review`, only when `useMic` is true and the lesson has exercises.
  The child reads up to 3 of today's exercise sentences. 5 XP per correct sentence (`addBonusXp` in `core/progress.js`),
  then the normal `commit` runs. Step labels become "Bước x/5" only when this step is present.
- Settings: checkbox "Dùng micro để luyện nói" (profile field `micEnabled`, default on) and a note that Chrome or Edge
  and internet are needed.
- Without support or permission every speaking control is hidden and the app behaves as before.

## Part 2: conversation

Units:

- `vite.config.js`: dev and preview proxy `/lmstudio` to `http://localhost:1234` (path prefix removed), avoiding CORS.
- `core/aiChat.js`: `chatCompletion({ messages, model, maxTokens, temperature, stop, signal, timeoutMs, fetchImpl })`
  returns the text; `checkAi({ model, fetchImpl })` returns `{ ok: true }` or `{ ok: false, reason }` with reason
  `unreachable | model-missing | timeout | bad-response`. Uses `GET /lmstudio/v1/models` and
  `POST /lmstudio/v1/chat/completions`.
- `core/conversation.js`: `buildSystemPrompt({ scenario, knownWords })`, `cleanReply(text)` (first line only, role
  prefixes removed, at most 2 sentences and 200 characters), `MAX_TURNS = 8`, `MAX_INPUT = 200`.
- `core/correction.js`: `buildCheckMessages(sentence)`, `parseCorrection(sentence, output)` returns `null` when the
  model says OK or its sentence equals the child's (ignoring case and punctuation) or looks unrelated (length ratio
  above 2 or below 0.5, or contains Vietnamese letters); otherwise `{ suggestion, parts: [{ text, changed }] }` where
  changed marks words not in the child's sentence.
- `data/scenarios.json`: 6 scenarios (restaurant, family, directions, shopping, school, weather) with `id`, `title`,
  `emoji`, `topic`, `role` (English description for the prompt), `opening` (first AI line) and `script`: 4 turns of
  `{ ai, options: [3 English sentences] }` for scripted mode.
- `ui/Conversation.jsx` at route `/chat`: scenario list, then chat. On open, if `aiEnabled !== false` it calls
  `checkAi`; on failure it falls back to scripted mode and shows the reason in Vietnamese. Chat shows bubbles, a text box
  with send, a microphone button (when `useMic`) that fills the box, the AI reply read aloud plus a replay button, and
  a "AI đang nghĩ..." state. In AI mode each child bubble has "Gợi ý sửa" which calls the model with
  `buildCheckMessages` and shows the app-written hint (`Thử viết: ...` with changed words highlighted, labelled "AI gợi
  ý, có thể chưa đúng") or "Câu của bạn ổn rồi". In scripted mode the child taps or reads one of the 3 options.
  A conversation ends after 8 child turns or "Kết thúc"; with at least 3 child turns it awards 20 XP once.
  Errors during a turn keep the child's message, show "Chưa nhận được câu trả lời" with "Thử lại".
- Home: link "Trò chuyện". Settings: checkbox "Dùng AI để trò chuyện" (`aiEnabled`, default on), model name field
  (`aiModel`, default `qwen2.5-3b-instruct`), button "Kiểm tra kết nối" with the status.
- Privacy: no conversation text is stored on disk or in storage.

## Testing

Unit tests for the pure modules; recogniser and fetch are faked; UI tests with `aiChat` and `speechRecognition`
mocked. jsdom has no `SpeechRecognition`, so existing tests see the old behaviour. A final run of the full suite,
`vite build`, and a live check of the prompts against LM Studio.

## Out of scope

Per-sound pronunciation scoring, saving conversations, choosing the LM Studio address, voice-only conversation,
Ollama-specific features.

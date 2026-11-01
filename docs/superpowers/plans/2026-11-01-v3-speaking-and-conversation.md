# v3 speaking practice and AI conversation: implementation plan

Spec: `docs/superpowers/specs/2026-11-01-v3-speaking-and-conversation-design.md`. Executed inline, one commit per task,
tests first for pure modules.

1. `core/progress.js`: `addBonusXp(state, amount)` + test.
2. `core/pronunciation.js` + tests (word/sentence scoring, missing words).
3. `core/speechRecognition.js` + tests with a fake recogniser class.
4. `ui/useMic.js`, `games/SpeakPractice.jsx` + tests (mocked `listen`).
5. Integrate: Flashcard, SentenceFeedback, Lesson `speak` step, Settings mic checkbox + tests.
6. `vite.config.js` proxy, `core/aiChat.js` + tests (fake fetch).
7. `core/conversation.js`, `core/correction.js`, `data/scenarios.json` + tests.
8. `ui/Conversation.jsx`, route `/chat`, Home link, Settings AI section, CSS + tests.
9. README section, full test run, build, live check against LM Studio, final commit.

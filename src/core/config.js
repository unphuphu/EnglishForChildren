import { isMastered } from './srs.js'

export const XP = { correct: 10, perfectSession: 20, goalReached: 30 }

// Sizes of one daily lesson: exercises (6 from the current part, the rest from earlier parts)
// and the word-review step (10 to 20 questions).
export const LESSON = { SENTENCES: 8, CURRENT_PART: 6, MIN_SENTENCES: 4, REVIEW_MIN: 10, REVIEW_MAX: 20 }

const masteredCount = (state) => Object.values(state.cards).filter(isMastered).length

export const BADGES = [
  { id: 'streak-3', title: '3 ngày liên tiếp', emoji: '🔥', test: (s) => s.streak.count >= 3 },
  { id: 'streak-7', title: '7 ngày liên tiếp', emoji: '🔥', test: (s) => s.streak.count >= 7 },
  { id: 'streak-30', title: '30 ngày liên tiếp', emoji: '🔥', test: (s) => s.streak.count >= 30 },
  { id: 'mastered-50', title: 'Thuộc 50 từ', emoji: '📗', test: (s) => masteredCount(s) >= 50 },
  { id: 'mastered-100', title: 'Thuộc 100 từ', emoji: '📘', test: (s) => masteredCount(s) >= 100 },
  { id: 'mastered-500', title: 'Thuộc 500 từ', emoji: '📕', test: (s) => masteredCount(s) >= 500 },
  { id: 'first-perfect', title: 'Lượt hoàn hảo đầu tiên', emoji: '⭐', test: (s) => s.perfectSessions >= 1 },
  {
    id: 'grammar-first-lesson',
    title: 'Buổi học ngữ pháp đầu tiên',
    emoji: '📝',
    test: (s) => Object.values(s.grammar.lessons).some((l) => l.partsDone >= 1),
  },
]

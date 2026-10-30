import { XP, BADGES } from './config.js'
import { addDays } from './date.js'
import { isMastered, newCard, review } from './srs.js'
import { migrateData } from './migrate.js'

const VERSION = 2
const DATE = /^\d{4}-\d{2}-\d{2}$/
const invalid = () => new Error('INVALID_PROGRESS')
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isCount = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0
const isDateOrNull = (v) => v === null || (typeof v === 'string' && DATE.test(v))
const isStringList = (v) => Array.isArray(v) && v.every((s) => typeof s === 'string')

export const emptyProgress = () => ({
  version: VERSION,
  xp: 0,
  streak: { count: 0, lastDate: null },
  cards: {},
  badges: [],
  perfectSessions: 0,
  daily: { date: null, correctIds: [], goalAwarded: false },
  plan: { step: 0 },
  grammar: { lessons: {}, sentences: {}, checkpoints: {}, tests: [] },
})

const countsOf = (record, fields) =>
  isObject(record) && Object.values(record).every((item) => isObject(item) && fields.every((f) => isCount(item[f])))

function normalizeGrammar(grammar) {
  if (!isObject(grammar)) throw invalid()
  const { lessons, sentences, checkpoints, tests } = grammar
  if (!countsOf(lessons, ['partsDone', 'correct', 'wrong'])) throw invalid()
  if (!countsOf(sentences, ['seen', 'wrong'])) throw invalid()
  if (!countsOf(checkpoints, ['best', 'total'])) throw invalid()
  if (!Array.isArray(tests) || !tests.every((t) => isObject(t) && typeof t.date === 'string' && isCount(t.score) && isCount(t.total))) {
    throw invalid()
  }
  return { lessons, sentences, checkpoints, tests }
}

// Validates data read from storage or an imported file and fills missing optional sections.
// Throws Error('INVALID_PROGRESS') for anything the app could not safely use.
export function normalizeProgress(data) {
  if (!isObject(data) || !Number.isInteger(data.version) || data.version < 1) throw invalid()
  let migrated
  try {
    migrated = migrateData(data, {}, VERSION)
  } catch {
    throw invalid()
  }
  const defaults = emptyProgress()
  const { xp, cards } = migrated
  const streak = migrated.streak ?? defaults.streak
  const daily = migrated.daily ?? defaults.daily
  const badges = migrated.badges ?? defaults.badges
  const perfectSessions = migrated.perfectSessions ?? defaults.perfectSessions

  if (!isCount(xp) || !isObject(cards)) throw invalid()
  for (const card of Object.values(cards)) {
    if (!isObject(card) || !Number.isInteger(card.box) || card.box < 0 || card.box > 4
      || !isCount(card.correct) || !isCount(card.wrong) || !isDateOrNull(card.due)) throw invalid()
  }
  if (!isObject(streak) || !isCount(streak.count) || !isDateOrNull(streak.lastDate)) throw invalid()
  if (!isObject(daily) || !isDateOrNull(daily.date) || !isStringList(daily.correctIds)) throw invalid()
  if (!isStringList(badges) || !isCount(perfectSessions)) throw invalid()
  if (!isObject(migrated.plan) || !Number.isInteger(migrated.plan.step) || migrated.plan.step < 0) throw invalid()
  const grammar = normalizeGrammar(migrated.grammar)

  return {
    plan: { step: migrated.plan.step },
    grammar,
    version: VERSION,
    xp,
    streak: { count: streak.count, lastDate: streak.lastDate },
    cards,
    badges,
    perfectSessions,
    daily: { date: daily.date, correctIds: daily.correctIds, goalAwarded: daily.goalAwarded === true },
  }
}

export const levelForXp = (xp) => Math.floor(Math.sqrt(xp / 50)) + 1
export const xpForLevel = (level) => 50 * (level - 1) ** 2

export function currentStreak(state, today) {
  const { count, lastDate } = state.streak
  return lastDate === today || lastDate === addDays(today, -1) ? count : 0
}

export function dailyCount(state, today) {
  return state.daily.date === today ? new Set(state.daily.correctIds).size : 0
}

function topicCompleteBadges(state, vocab) {
  const topics = new Map()
  for (const word of vocab) {
    const entry = topics.get(word.topic) ?? { total: 0, mastered: 0 }
    entry.total += 1
    if (state.cards[word.id] && isMastered(state.cards[word.id])) entry.mastered += 1
    topics.set(word.topic, entry)
  }
  return [...topics].filter(([, t]) => t.total > 0 && t.mastered === t.total).map(([topic]) => `topic-complete:${topic}`)
}

function advanceStreak(streak, today) {
  if (streak.lastDate === today) return streak
  const count = streak.lastDate === addDays(today, -1) ? streak.count + 1 : 1
  return { count, lastDate: today }
}

// Results flagged selfReported (flashcard "I remember") schedule cards but earn no XP,
// no daily-goal progress and no perfect bonus: only answered questions score.
export function finishSession(state, { results, goal, today, vocab }) {
  const cards = { ...state.cards }
  const outcomes = new Map()
  for (const { wordId, correct } of results) {
    outcomes.set(wordId, (outcomes.get(wordId) ?? true) && correct)
  }
  for (const [wordId, correct] of outcomes) {
    cards[wordId] = review(cards[wordId] ?? newCard(), correct, today)
  }

  const scored = results.filter((r) => !r.selfReported)
  const correctResults = scored.filter((r) => r.correct)
  const sameDay = state.daily.date === today
  const daily = {
    date: today,
    correctIds: [...new Set([...(sameDay ? state.daily.correctIds : []), ...correctResults.map((r) => r.wordId)])],
    goalAwarded: sameDay ? state.daily.goalAwarded : false,
  }

  let xpGained = correctResults.length * XP.correct
  const perfect = scored.length > 0 && correctResults.length === scored.length
  if (perfect) xpGained += XP.perfectSession

  let streak = state.streak
  const goalReachedNow = !daily.goalAwarded && daily.correctIds.length >= goal
  if (goalReachedNow) {
    xpGained += XP.goalReached
    daily.goalAwarded = true
    streak = advanceStreak(streak, today)
  }

  const next = {
    ...state,
    xp: state.xp + xpGained,
    streak,
    cards,
    perfectSessions: state.perfectSessions + (perfect ? 1 : 0),
    daily,
  }
  const earned = [...BADGES.filter((b) => b.test(next)).map((b) => b.id), ...topicCompleteBadges(next, vocab)]
  const newBadges = earned.filter((id) => !state.badges.includes(id))
  return { state: { ...next, badges: [...state.badges, ...newBadges] }, xpGained, newBadges, goalReachedNow }
}

export function createProgressStore(storage, profileId) {
  const key = `progress:${profileId}`
  const backupKey = `${key}:bak`

  function usable(slot) {
    const { status, value } = storage.getStatus(slot)
    if (status !== 'ok') return { status }
    try {
      return { status: 'ok', state: normalizeProgress(value) }
    } catch {
      return { status: 'corrupt' }
    }
  }

  return {
    check: () => usable(key).status,
    load: () => usable(key).state ?? emptyProgress(),
    save: (state) => storage.set(key, state),
    hasBackup: () => usable(backupKey).status === 'ok',
    restoreBackup() {
      const backup = usable(backupKey)
      if (backup.status !== 'ok') return false
      storage.set(key, backup.state)
      return true
    },
    reset: () => storage.set(key, emptyProgress()),
  }
}

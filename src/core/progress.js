import { XP, BADGES } from './config.js'
import { addDays } from './date.js'
import { isMastered, newCard, review } from './srs.js'
import { migrateData } from './migrate.js'

const VERSION = 1

export const emptyProgress = () => ({
  version: VERSION,
  xp: 0,
  streak: { count: 0, lastDate: null },
  cards: {},
  badges: [],
  perfectSessions: 0,
  daily: { date: null, correctIds: [], goalAwarded: false },
})

export const levelForXp = (xp) => Math.floor(Math.sqrt(xp / 50)) + 1

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

export function finishSession(state, { results, goal, today, vocab }) {
  const cards = { ...state.cards }
  const outcomes = new Map()
  for (const { wordId, correct } of results) {
    outcomes.set(wordId, (outcomes.get(wordId) ?? true) && correct)
  }
  for (const [wordId, correct] of outcomes) {
    cards[wordId] = review(cards[wordId] ?? newCard(), correct, today)
  }

  const correctResults = results.filter((r) => r.correct)
  const sameDay = state.daily.date === today
  const daily = {
    date: today,
    correctIds: [...new Set([...(sameDay ? state.daily.correctIds : []), ...correctResults.map((r) => r.wordId)])],
    goalAwarded: sameDay ? state.daily.goalAwarded : false,
  }

  let xpGained = correctResults.length * XP.correct
  const perfect = results.length > 0 && correctResults.length === results.length
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
  return {
    load() {
      const data = storage.get(key)
      return data ? migrateData(data, {}, VERSION) : emptyProgress()
    },
    save(state) {
      storage.set(key, state)
    },
  }
}

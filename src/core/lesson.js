import { LESSON } from './config.js'
import { suggestToday } from './plan.js'
import { pickNewWords } from './newWords.js'
import { assignTypes, buildExercise, pickSentences } from './sentences.js'

export const NOT_ENOUGH_WORDS_NOTICE = 'Học thêm từ nhé'

const isDue = (card, today) => card.due != null && card.due <= today

const weakness = (cards) => (a, b) => {
  const ca = cards[a.id]
  const cb = cards[b.id]
  return ca.box - cb.box || (cb.wrong - cb.correct) - (ca.wrong - ca.correct) || (ca.due ?? '').localeCompare(cb.due ?? '')
}

// Review: all due words, at least 10 and at most 20 questions, padded with the weakest learned words;
// with fewer than 10 learned words every one of them is used.
function pickReviewWords({ vocab, cards, today, excludeIds }) {
  const learned = vocab.filter((w) => cards[w.id] && !excludeIds.has(w.id))
  const due = learned
    .filter((w) => isDue(cards[w.id], today))
    .sort((a, b) => cards[a.id].due.localeCompare(cards[b.id].due))
  const count = Math.min(Math.max(due.length, LESSON.REVIEW_MIN), LESSON.REVIEW_MAX)
  const picked = due.slice(0, count)
  if (picked.length < count) {
    const taken = new Set(picked.map((w) => w.id))
    const rest = learned.filter((w) => !taken.has(w.id)).sort(weakness(cards))
    picked.push(...rest.slice(0, count - picked.length))
  }
  return picked
}

export function buildLesson({ roadmap, lessons, vocab, progress, today, goal, topic = null, rng = Math.random }) {
  const suggestion = suggestToday({ roadmap, lessons, vocab, progress })
  const chosenTopic = topic ?? suggestion.topic
  const grammar = suggestion.lessonId ? lessons.find((l) => l.id === suggestion.lessonId) : null
  const newWords = chosenTopic
    ? pickNewWords({
      vocab, cards: progress.cards, topic: chosenTopic, goal, today, lesson: grammar, part: suggestion.part,
    })
    : []

  const lesson = suggestion.lessonId
    ? {
      id: suggestion.lessonId,
      title: suggestion.lessonTitle,
      part: suggestion.part,
      sessions: suggestion.sessions,
      short: suggestion.part > 1,
    }
    : null

  const picks = pickSentences({
    lessons,
    lessonId: lesson?.id ?? null,
    part: lesson?.part ?? null,
    vocab,
    progress,
    extraWordIds: newWords.map((w) => w.id),
    today,
    count: LESSON.SENTENCES,
    rng,
  })
  const enough = picks.length >= LESSON.MIN_SENTENCES
  const types = enough ? assignTypes(picks.map((p) => p.sentence)) : []
  const exercises = enough
    ? picks.map((p, i) => buildExercise(p.sentence, p.lessonId, types[i], p.wordIds, rng))
    : []

  const reviewWords = pickReviewWords({
    vocab, cards: progress.cards, today, excludeIds: new Set(newWords.map((w) => w.id)),
  })

  return {
    topic: chosenTopic,
    lesson,
    newWords,
    exercises,
    reviewWords,
    notice: !enough && lesson ? NOT_ENOUGH_WORDS_NOTICE : null,
  }
}

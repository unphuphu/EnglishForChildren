import { addDays } from './date.js'

export const INTERVALS = [1, 3, 7, 14]
export const MASTERED_BOX = 3
const MAX_BOX = INTERVALS.length

export const newCard = () => ({ box: 0, correct: 0, wrong: 0, due: null })

// A correct answer given before the card is due is counted but does not move the card up:
// the spaced intervals only advance when a review is actually due.
export function review(card, correct, today) {
  if (!correct) return { ...card, box: 0, wrong: card.wrong + 1, due: today }
  if (card.due != null && card.due > today) return { ...card, correct: card.correct + 1 }
  const box = Math.min(card.box + 1, MAX_BOX)
  return { ...card, box, correct: card.correct + 1, due: addDays(today, INTERVALS[box - 1]) }
}

export const isMastered = (card) => card.box >= MASTERED_BOX

export function pickWords({ words, cards, today, level, count }) {
  const picked = new Map()
  const take = (list) => {
    for (const word of list) {
      if (picked.size >= count) return
      picked.set(word.id, word)
    }
  }
  const eligible = words.filter((w) => w.level <= level)
  const due = words
    .filter((w) => cards[w.id]?.due != null && cards[w.id].due <= today)
    .sort((a, b) => cards[a.id].due.localeCompare(cards[b.id].due))
  take(due)
  take(words.filter((w) => cards[w.id] && cards[w.id].wrong > cards[w.id].correct))
  take(eligible.filter((w) => !cards[w.id]))
  take(eligible)
  return [...picked.values()]
}

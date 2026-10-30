const isDue = (card, today) => card.due != null && card.due <= today

// How many sentences of the lesson (this part and the parts before it) a still-unlearned topic word
// helps to unlock. A sentence only counts when every other word it uses is already learned or is
// one of today's topic words, so words that could never make a sentence work today are not favoured.
function unlockScores({ lesson, part, vocab, cards, unseen }) {
  const scores = new Map()
  if (!lesson || part == null) return scores
  const learned = new Set(vocab.filter((w) => cards[w.id]).map((w) => w.word.toLowerCase()))
  const obtainable = new Set(unseen.map((w) => w.word.toLowerCase()))
  for (const sentence of lesson.sentences) {
    if (sentence.session > part) continue
    const uses = sentence.uses.map((u) => u.toLowerCase())
    if (!uses.every((u) => learned.has(u) || obtainable.has(u))) continue
    for (const use of uses) {
      if (obtainable.has(use) && !learned.has(use)) scores.set(use, (scores.get(use) ?? 0) + 1)
    }
  }
  return scores
}

// New words of a topic: first the words today's grammar lesson needs (the most useful first, so a
// small daily goal still unlocks sentences), then the rest from easy to hard in file order. A nearly
// finished topic is topped up with its due words.
export function pickNewWords({ vocab, cards, topic, goal, today, lesson = null, part = null }) {
  if (goal <= 0) return []
  const topicWords = vocab.filter((w) => w.topic === topic)
  const unseen = topicWords.filter((w) => !cards[w.id])
  const scores = unlockScores({ lesson, part, vocab, cards, unseen })
  const words = unseen
    .map((word, index) => ({ word, index, score: scores.get(word.word.toLowerCase()) ?? 0 }))
    .sort((a, b) => b.score - a.score || a.word.level - b.word.level || a.index - b.index)
    .map(({ word }) => word)
    .slice(0, goal)
  if (words.length < goal) {
    const taken = new Set(words.map((w) => w.id))
    const due = topicWords
      .filter((w) => cards[w.id] && isDue(cards[w.id], today) && !taken.has(w.id))
      .sort((a, b) => cards[a.id].due.localeCompare(cards[b.id].due))
    words.push(...due.slice(0, goal - words.length))
  }
  return words
}

import { eligibleSentences } from './sentences.js'
import { pickNewWords } from './newWords.js'

const DEFAULT_GOAL = 10
const DEFAULT_MIN_SENTENCES = 8

// Today's suggestion: the next roadmap step (topic + grammar lesson part). If that topic has no
// unlearned word left, the next topic that still has some is used. Past the end of the roadmap
// there is no lesson, only a vocabulary topic.
export function suggestToday({ roadmap, lessons, vocab, progress, topicOrder }) {
  const step = progress.plan.step
  const entry = roadmap[step] ?? null
  const hasNew = (topic) => vocab.some((w) => w.topic === topic && !progress.cards[w.id])
  const order = topicOrder ?? [...new Set(vocab.map((w) => w.topic))]

  let topic = entry?.topic ?? null
  if (!topic || !hasNew(topic)) topic = order.find(hasNew) ?? entry?.topic ?? order[0] ?? null

  const lesson = entry ? lessons.find((l) => l.id === entry.lesson) ?? null : null
  return {
    step,
    topic,
    lessonId: lesson?.id ?? null,
    lessonTitle: lesson?.title ?? null,
    part: lesson ? entry.part : null,
    sessions: lesson?.sessions ?? null,
    beyondRoadmap: entry === null,
  }
}

// Plays the roadmap forward the way the app does: at every step the child learns `goal` new words
// of that step's topic (chosen by the same rule as the real lesson), and the lesson part, together
// with its earlier parts, must then have enough sentences made only of learned words.
export function roadmapCoverageErrors({ roadmap, lessons, vocab, goal = DEFAULT_GOAL, minSentences = DEFAULT_MIN_SENTENCES }) {
  const errors = []
  const cards = {}
  roadmap.forEach((step, index) => {
    const lesson = lessons.find((l) => l.id === step.lesson) ?? null
    const words = pickNewWords({
      vocab, cards, topic: step.topic, goal, today: '2000-01-01', lesson, part: lesson ? step.part : null,
    })
    for (const word of words) cards[word.id] = {}
    if (!lesson) return
    const upToPart = { ...lesson, sentences: lesson.sentences.filter((s) => s.session <= step.part) }
    const count = eligibleSentences({ lesson: upToPart, vocab, cards }).length
    if (count < minSentences) {
      errors.push(`roadmap step ${index + 1} (${step.lesson} part ${step.part}): only ${count} eligible sentences, need ${minSentences}`)
    }
  })
  return errors
}

import { eligibleSentences } from './sentences.js'

const DEFAULT_PER_TOPIC = 10
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

// For each roadmap step, assume the child learned the first `perTopic` level-1 words (file order,
// which is the order new words are introduced) of every topic up to and including that step, and
// check that the lesson part (plus its earlier parts) has enough sentences made only of those words.
export function roadmapCoverageErrors({
  roadmap, lessons, vocab, perTopic = DEFAULT_PER_TOPIC, minSentences = DEFAULT_MIN_SENTENCES,
}) {
  const errors = []
  const learned = new Set()
  roadmap.forEach((step, index) => {
    vocab.filter((w) => w.topic === step.topic && w.level === 1).slice(0, perTopic).forEach((w) => learned.add(w.id))
    const lesson = lessons.find((l) => l.id === step.lesson)
    if (!lesson) return
    const upToPart = { ...lesson, sentences: lesson.sentences.filter((s) => s.session <= step.part) }
    const cards = Object.fromEntries([...learned].map((id) => [id, {}]))
    const count = eligibleSentences({ lesson: upToPart, vocab, cards }).length
    if (count < minSentences) {
      errors.push(`roadmap step ${index + 1} (${step.lesson} part ${step.part}): only ${count} eligible sentences, need ${minSentences}`)
    }
  })
  return errors
}

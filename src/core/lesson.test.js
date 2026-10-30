import { buildLesson } from './lesson.js'
import { emptyProgress } from './progress.js'
import { LESSON } from './config.js'

const TODAY = '2026-10-30'

function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const w = (topic, word, level = 1) => ({ id: `${topic}-${word}`, word, topic, level })
const family = ['mother', 'father', 'sister', 'brother', 'baby', 'grandmother'].map((x) => w('family', x))
family.push(w('family', 'uncle', 2))
const animals = ['dog', 'cat', 'bird', 'fish', 'rabbit', 'mouse'].map((x) => w('animals', x))
const vocab = [...family, ...animals]

const sentence = (id, session, uses) => ({
  id,
  en: `She likes the ${uses[0]} very much.`,
  vi: 'Cô ấy rất thích.',
  uses,
  blank: { answer: 'likes', options: ['likes', 'like', 'liking'] },
  wrong: ['She like the thing very much.', 'She liking the thing very much.'],
  extra: ['has', 'are'],
  session,
})
const sentencesFor = (session, words, each) =>
  words.flatMap((word) => Array.from({ length: each }, (_, i) => sentence(`s${session}-${word}-${i}`, session, [word])))

const toBe = {
  id: 'to-be', title: 'To be', order: 1, sessions: 2, explain: [],
  sentences: [
    ...sentencesFor(1, ['mother', 'father', 'sister', 'brother', 'baby'], 2),
    ...sentencesFor(2, ['grandmother', 'uncle'], 3),
  ],
}
const lessons = [toBe]
const roadmap = [
  { topic: 'family', lesson: 'to-be', part: 1 },
  { topic: 'family', lesson: 'to-be', part: 2 },
]

const cardsFor = (ids, over = {}) => Object.fromEntries(ids.map((id) => [id, { box: 1, correct: 1, wrong: 0, due: '2030-01-01', ...over }]))
const progressWith = (cards = {}, extra = {}) => ({ ...emptyProgress(), cards, ...extra })
const build = (over = {}) => buildLesson({
  roadmap, lessons, vocab, progress: progressWith(), today: TODAY, goal: 5, rng: seeded(1), ...over,
})
const idsOf = (words) => words.map((x) => x.id)

describe('a first day', () => {
  test('gives the goal number of new words from the suggested topic in file order', () => {
    const lesson = build()
    expect(lesson.topic).toBe('family')
    expect(idsOf(lesson.newWords)).toEqual(['family-mother', 'family-father', 'family-sister', 'family-brother', 'family-baby'])
  })

  test('names the grammar lesson part', () => {
    expect(build().lesson).toEqual({ id: 'to-be', title: 'To be', part: 1, sessions: 2, short: false })
  })

  test('gives up to 8 exercises, each using only today\'s new words', () => {
    const { exercises, newWords } = build()
    expect(exercises).toHaveLength(LESSON.SENTENCES)
    const allowed = new Set(idsOf(newWords))
    for (const ex of exercises) for (const id of ex.wordIds) expect(allowed.has(id)).toBe(true)
  })

  test('never offers a sentence containing a word the child has not met', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { exercises } = build({ rng: seeded(seed) })
      for (const ex of exercises) expect(ex.wordIds.some((id) => id.includes('grandmother'))).toBe(false)
    }
  })

  test('has no review step because nothing is learned yet', () => {
    expect(build().reviewWords).toEqual([])
  })

  test('has no notice', () => {
    expect(build().notice).toBeNull()
  })

  test('the exercises cycle through the four types', () => {
    const types = new Set(build().exercises.map((e) => e.type))
    expect(types).toEqual(new Set(['order', 'blank', 'choose', 'translate']))
  })
})

describe('later days', () => {
  const learnedFirst = cardsFor(['family-mother', 'family-father', 'family-sister', 'family-brother', 'family-baby'])

  test('part 2 is marked short and uses the next roadmap step', () => {
    const lesson = build({ progress: progressWith(learnedFirst, { plan: { step: 1 } }) })
    expect(lesson.lesson).toMatchObject({ id: 'to-be', part: 2, short: true })
  })

  test('new words are the unlearned ones, level-1 words before harder ones', () => {
    const lesson = build({ progress: progressWith(learnedFirst, { plan: { step: 1 } }) })
    expect(idsOf(lesson.newWords)).toEqual(['family-grandmother', 'family-uncle'])
  })

  test('a harder word is used only after the easier ones are taken', () => {
    const mixed = [w('t', 'easy1'), w('t', 'hard1', 2), w('t', 'easy2'), w('t', 'hard2', 2), w('t', 'easy3')]
    const lesson = build({ vocab: mixed, roadmap: [], lessons: [], goal: 4 })
    expect(idsOf(lesson.newWords)).toEqual(['t-easy1', 't-easy2', 't-easy3', 't-hard1'])
  })

  test('new words are capped at the goal', () => {
    expect(build({ goal: 3 }).newWords).toHaveLength(3)
  })

  test('review sentences from earlier parts appear alongside the current part', () => {
    const cards = cardsFor([...idsOf(family)])
    const lesson = build({ progress: progressWith(cards, { plan: { step: 1 } }), goal: 5 })
    expect(lesson.exercises.length).toBeGreaterThan(0)
    expect(lesson.exercises.length).toBeLessThanOrEqual(LESSON.SENTENCES)
  })
})

describe('topic override', () => {
  test('changes the new words but keeps the grammar lesson', () => {
    const lesson = build({ topic: 'animals' })
    expect(lesson.topic).toBe('animals')
    expect(idsOf(lesson.newWords)).toEqual(['animals-dog', 'animals-cat', 'animals-bird', 'animals-fish', 'animals-rabbit'])
    expect(lesson.lesson).toMatchObject({ id: 'to-be', part: 1 })
  })

  test('exercises then use only words the child has learned or meets today', () => {
    const lesson = build({ topic: 'animals' })
    expect(lesson.notice).toBe('Học thêm từ nhé')
    expect(lesson.exercises).toEqual([])
  })
})

describe('too few eligible sentences', () => {
  test('skips the step and sets a notice when fewer than 4 sentences qualify', () => {
    const few = { ...toBe, sentences: [sentence('a', 1, ['mother']), sentence('b', 1, ['father']), sentence('c', 1, ['sister'])] }
    const lesson = build({ lessons: [few] })
    expect(lesson.exercises).toEqual([])
    expect(lesson.notice).toBe('Học thêm từ nhé')
  })

  test('exactly 4 sentences are enough', () => {
    const four = { ...toBe, sentences: ['mother', 'father', 'sister', 'brother'].map((x, i) => sentence(`s${i}`, 1, [x])) }
    expect(build({ lessons: [four] }).exercises).toHaveLength(4)
  })
})

describe('past the end of the roadmap', () => {
  const learned = cardsFor(idsOf(family))
  const finished = { ...emptyProgress().grammar, lessons: { 'to-be': { partsDone: 2, correct: 5, wrong: 1 } } }

  test('there is no grammar lesson but the day still works', () => {
    const lesson = build({ progress: progressWith(learned, { plan: { step: 2 }, grammar: finished }) })
    expect(lesson.lesson).toBeNull()
    expect(lesson.newWords.length).toBeGreaterThan(0)
  })

  test('exercises review sentences from finished lessons', () => {
    const lesson = build({ progress: progressWith(learned, { plan: { step: 2 }, grammar: finished }) })
    expect(lesson.exercises.length).toBeGreaterThan(0)
    expect(lesson.notice).toBeNull()
  })

  test('with no finished lesson there are no exercises and no notice', () => {
    const lesson = build({ progress: progressWith(learned, { plan: { step: 2 } }) })
    expect(lesson.exercises).toEqual([])
    expect(lesson.notice).toBeNull()
  })

  test('an empty roadmap behaves the same way', () => {
    const lesson = build({ roadmap: [] })
    expect(lesson.lesson).toBeNull()
    expect(lesson.newWords).toHaveLength(5)
  })
})

describe('word review', () => {
  const big = Array.from({ length: 40 }, (_, i) => w('misc', `word${String(i).padStart(2, '0')}`))
  const plain = (cards, over = {}) => build({ vocab: big, roadmap: [], lessons: [], progress: progressWith(cards), ...over })
  const first = (n) => idsOf(big).slice(0, n)

  test('3 due words are padded to 10 questions with learned words', () => {
    const due = cardsFor(first(3), { due: '2026-10-29' })
    const others = cardsFor(idsOf(big).slice(3, 15))
    expect(plain({ ...due, ...others }).reviewWords).toHaveLength(10)
  })

  test('the due words always come first', () => {
    const due = cardsFor(first(3), { due: '2026-10-29' })
    const others = cardsFor(idsOf(big).slice(3, 15))
    expect(idsOf(plain({ ...due, ...others }).reviewWords).slice(0, 3).sort()).toEqual(first(3))
  })

  test('padding takes the weakest words first', () => {
    const due = cardsFor(first(3), { due: '2026-10-29' })
    const weak = cardsFor(idsOf(big).slice(3, 8), { box: 0, wrong: 3, correct: 0 })
    const strong = cardsFor(idsOf(big).slice(8, 20), { box: 3 })
    const picked = new Set(idsOf(plain({ ...due, ...weak, ...strong }).reviewWords))
    for (const id of idsOf(big).slice(3, 8)) expect(picked.has(id)).toBe(true)
  })

  test('30 due words are capped at 20', () => {
    expect(plain(cardsFor(first(30), { due: '2026-10-29' })).reviewWords).toHaveLength(LESSON.REVIEW_MAX)
  })

  test('15 due words give 15 questions', () => {
    expect(plain(cardsFor(first(15), { due: '2026-10-29' })).reviewWords).toHaveLength(15)
  })

  test('with only 5 learned words the review uses all 5', () => {
    expect(plain(cardsFor(first(5))).reviewWords).toHaveLength(5)
  })

  test('with nothing learned the review is empty', () => {
    expect(plain({}).reviewWords).toEqual([])
  })

  test('today\'s new words never appear in the review', () => {
    const topic = [w('small', 'a'), w('small', 'b'), w('small', 'c'), w('small', 'd')]
    const cards = { ...cardsFor(['small-b', 'small-c', 'small-d'], { due: '2026-10-29' }), ...cardsFor(idsOf(big).slice(0, 12)) }
    const lesson = build({
      vocab: [...topic, ...big], roadmap: [], lessons: [], goal: 5, topic: 'small', progress: progressWith(cards),
    })
    expect(idsOf(lesson.newWords).sort()).toEqual(['small-a', 'small-b', 'small-c', 'small-d'])
    const review = new Set(idsOf(lesson.reviewWords))
    for (const id of idsOf(lesson.newWords)) expect(review.has(id)).toBe(false)
  })

  test('a word is never listed twice', () => {
    const lesson = plain(cardsFor(first(25), { due: '2026-10-29' }))
    expect(new Set(idsOf(lesson.reviewWords)).size).toBe(lesson.reviewWords.length)
  })
})

describe('new words when the topic is nearly finished', () => {
  test('due words of the topic top up the list', () => {
    const topic = [w('small', 'a'), w('small', 'b'), w('small', 'c')]
    const cards = cardsFor(['small-b', 'small-c'], { due: '2026-10-29' })
    const lesson = build({ vocab: topic, roadmap: [], lessons: [], goal: 5, progress: progressWith(cards) })
    expect(idsOf(lesson.newWords)).toEqual(['small-a', 'small-b', 'small-c'])
  })

  test('words that are learned and not due are not repeated as new', () => {
    const topic = [w('small', 'a'), w('small', 'b')]
    const lesson = build({ vocab: topic, roadmap: [], lessons: [], goal: 5, progress: progressWith(cardsFor(['small-b'])) })
    expect(idsOf(lesson.newWords)).toEqual(['small-a'])
  })

  test('an empty vocabulary does not crash', () => {
    const lesson = build({ vocab: [], roadmap: [], lessons: [] })
    expect(lesson.newWords).toEqual([])
    expect(lesson.topic).toBeNull()
  })
})

test('the same random seed builds the same lesson', () => {
  const a = build({ rng: seeded(9) })
  const b = build({ rng: seeded(9) })
  expect(a.exercises.map((e) => [e.sentenceId, e.type])).toEqual(b.exercises.map((e) => [e.sentenceId, e.type]))
})

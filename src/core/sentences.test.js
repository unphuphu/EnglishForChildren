import {
  resolveWordIds, eligibleSentences, pickSentences, assignTypes, buildExercise,
} from './sentences.js'
import { emptyProgress } from './progress.js'

const TODAY = '2026-10-30'

function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const vocab = [
  { id: 'a-001', word: 'dog', topic: 'animals' },
  { id: 'a-002', word: 'cat', topic: 'animals' },
  { id: 'a-003', word: 'bird', topic: 'animals' },
  { id: 'f-001', word: 'apple', topic: 'food' },
  { id: 'x-001', word: 'light', topic: 'home' },
  { id: 'x-002', word: 'light', topic: 'adjectives' },
]

const sentence = (id, session, uses, over = {}) => ({
  id,
  en: `She likes the ${uses[0] ?? 'thing'} very much.`,
  vi: 'Cô ấy rất thích.',
  uses,
  blank: { answer: 'likes', options: ['likes', 'like', 'liking'] },
  wrong: ['She like the thing very much.', 'She liking the thing very much.'],
  extra: ['has', 'are'],
  session,
  ...over,
})

const many = (prefix, session, count, uses) =>
  Array.from({ length: count }, (_, i) => sentence(`${prefix}-${session}-${i}`, session, uses))

const lessonOf = (id, order, sessions, sentences) => ({ id, title: id, order, sessions, explain: [], sentences })

const cardsFor = (...ids) => Object.fromEntries(ids.map((id) => [id, { box: 1, correct: 1, wrong: 0, due: '2030-01-01' }]))

const progressWith = (cards, extra = {}) => ({ ...emptyProgress(), cards, ...extra })

describe('resolveWordIds', () => {
  test('returns the learned ids for each used word', () => {
    expect(resolveWordIds(sentence('s', 1, ['dog', 'cat']), vocab, new Set(['a-001', 'a-002']))).toEqual(['a-001', 'a-002'])
  })

  test('returns null when a used word is not learned', () => {
    expect(resolveWordIds(sentence('s', 1, ['dog', 'cat']), vocab, new Set(['a-001']))).toBeNull()
  })

  test('with two entries of the same word only the learned one is returned', () => {
    expect(resolveWordIds(sentence('s', 1, ['light']), vocab, new Set(['x-002']))).toEqual(['x-002'])
  })

  test('matching ignores case and a sentence with no uses is always resolvable', () => {
    expect(resolveWordIds(sentence('s', 1, ['DOG']), vocab, new Set(['a-001']))).toEqual(['a-001'])
    expect(resolveWordIds(sentence('s', 1, []), vocab, new Set())).toEqual([])
  })
})

describe('eligibleSentences', () => {
  const lesson = lessonOf('l', 1, 1, [sentence('s1', 1, ['dog']), sentence('s2', 1, ['dog', 'cat'])])

  test('excludes a sentence that uses an unlearned word', () => {
    expect(eligibleSentences({ lesson, vocab, cards: cardsFor('a-001') }).map((s) => s.id)).toEqual(['s1'])
  })

  test('includes it once the word is learned or is a new word of today', () => {
    expect(eligibleSentences({ lesson, vocab, cards: cardsFor('a-001', 'a-002') })).toHaveLength(2)
    expect(eligibleSentences({ lesson, vocab, cards: cardsFor('a-001'), extraWordIds: ['a-002'] })).toHaveLength(2)
  })

  test('nothing is eligible when nothing is learned', () => {
    expect(eligibleSentences({ lesson, vocab, cards: {} })).toEqual([])
  })
})

describe('pickSentences', () => {
  const lesson = lessonOf('l', 1, 2, [...many('p1', 1, 10, ['dog']), ...many('p2', 2, 10, ['dog'])])
  const progress = progressWith(cardsFor('a-001'))
  const base = { lessons: [lesson], lessonId: 'l', vocab, progress, today: TODAY, rng: seeded(1) }

  test('part 2 gives 6 from part 2 and 2 from part 1', () => {
    const picked = pickSentences({ ...base, part: 2 })
    expect(picked).toHaveLength(8)
    expect(picked.filter((p) => p.sentence.session === 2)).toHaveLength(6)
    expect(picked.filter((p) => p.sentence.session === 1)).toHaveLength(2)
  })

  test('part 1 gives all 8 from part 1', () => {
    const picked = pickSentences({ ...base, part: 1 })
    expect(picked).toHaveLength(8)
    expect(picked.every((p) => p.sentence.session === 1)).toBe(true)
  })

  test('there are never duplicates', () => {
    const ids = pickSentences({ ...base, part: 2 }).map((p) => p.sentence.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('each pick carries the lesson id and the resolved word ids', () => {
    const [first] = pickSentences({ ...base, part: 1 })
    expect(first.lessonId).toBe('l')
    expect(first.wordIds).toEqual(['a-001'])
  })

  test('sentences with due words come first', () => {
    const two = lessonOf('l', 1, 1, [
      sentence('quiet', 1, ['dog']), sentence('due', 1, ['cat']), sentence('quiet2', 1, ['dog']),
    ])
    const cards = { ...cardsFor('a-001'), 'a-002': { box: 1, correct: 1, wrong: 0, due: TODAY } }
    const picked = pickSentences({ ...base, lessons: [two], part: 1, vocab, progress: progressWith(cards), count: 1 })
    expect(picked[0].sentence.id).toBe('due')
  })

  test('sentences already seen many times come after unseen ones', () => {
    const l = lessonOf('l', 1, 1, [sentence('old', 1, ['dog']), sentence('new', 1, ['dog'])])
    const grammar = { ...emptyProgress().grammar, sentences: { old: { seen: 5, wrong: 0 } } }
    const picked = pickSentences({ ...base, lessons: [l], part: 1, count: 1, progress: progressWith(cardsFor('a-001'), { grammar }) })
    expect(picked[0].sentence.id).toBe('new')
  })

  test('returns fewer when fewer are eligible', () => {
    const l = lessonOf('l', 1, 1, [sentence('a', 1, ['dog']), sentence('b', 1, ['dog']), sentence('c', 1, ['dog']), sentence('d', 1, ['cat'])])
    expect(pickSentences({ ...base, lessons: [l], part: 1 })).toHaveLength(3)
  })

  test('tops up from earlier parts when the current part has too few', () => {
    const l = lessonOf('l', 1, 2, [...many('p1', 1, 10, ['dog']), ...many('p2', 2, 2, ['dog'])])
    const picked = pickSentences({ ...base, lessons: [l], part: 2 })
    expect(picked).toHaveLength(8)
    expect(picked.filter((p) => p.sentence.session === 2)).toHaveLength(2)
  })

  test('new words of today make their sentences eligible', () => {
    const l = lessonOf('l', 1, 1, [sentence('s', 1, ['cat'])])
    expect(pickSentences({ ...base, lessons: [l], part: 1, extraWordIds: ['a-002'] })).toHaveLength(1)
    expect(pickSentences({ ...base, lessons: [l], part: 1 })).toHaveLength(0)
  })

  test('practice (part null) draws from every part of the lesson', () => {
    const picked = pickSentences({ ...base, part: null })
    expect(picked).toHaveLength(8)
  })

  test('review (lessonId null) only uses lessons with a finished part', () => {
    const other = lessonOf('other', 2, 1, many('o', 1, 10, ['dog']))
    const grammar = { ...emptyProgress().grammar, lessons: { l: { partsDone: 1, correct: 0, wrong: 0 } } }
    const picked = pickSentences({
      ...base, lessons: [lesson, other], lessonId: null, part: null,
      progress: progressWith(cardsFor('a-001'), { grammar }),
    })
    expect(picked.length).toBeGreaterThan(0)
    expect(picked.every((p) => p.lessonId === 'l')).toBe(true)
  })

  test('review with no finished lesson returns nothing', () => {
    expect(pickSentences({ ...base, lessonId: null, part: null })).toEqual([])
  })

  test('an unknown lesson id returns nothing', () => {
    expect(pickSentences({ ...base, lessonId: 'ghost', part: 1 })).toEqual([])
  })
})

describe('assignTypes', () => {
  const eight = Array.from({ length: 8 }, (_, i) => sentence(`s${i}`, 1, ['dog']))

  test('rotates the four types so each is used twice over eight sentences', () => {
    const types = assignTypes(eight)
    for (const type of ['order', 'blank', 'choose', 'translate']) {
      expect(types.filter((t) => t === type)).toHaveLength(2)
    }
  })

  test('a sentence without a blank takes the next type', () => {
    const noBlank = [sentence('a', 1, ['dog']), sentence('b', 1, ['dog'], { blank: undefined })]
    expect(assignTypes(noBlank)).toEqual(['order', 'choose'])
  })

  test('a sentence with fewer than two wrong options cannot be a choose exercise', () => {
    const list = [
      sentence('a', 1, ['dog']), sentence('b', 1, ['dog']),
      sentence('c', 1, ['dog'], { wrong: ['x'] }),
    ]
    expect(assignTypes(list)[2]).toBe('translate')
  })

  test('a two-word sentence cannot be an order exercise', () => {
    const short = sentence('a', 1, ['dog'], { en: 'Go home.', blank: undefined, wrong: ['x'] })
    expect(assignTypes([short])).toEqual(['translate'])
  })

  test('returns one type per sentence', () => {
    expect(assignTypes([])).toEqual([])
    expect(assignTypes(eight.slice(0, 3))).toHaveLength(3)
  })
})

describe('buildExercise', () => {
  const s = sentence('s1', 1, ['dog'], { en: 'She likes the dog very much.' })
  const build = (type, rng = seeded(7)) => buildExercise(s, 'l', type, ['a-001'], rng)

  test('every exercise carries its identity and word ids', () => {
    for (const type of ['order', 'blank', 'choose', 'translate']) {
      expect(build(type)).toMatchObject({
        type, sentenceId: 's1', lessonId: 'l', en: s.en, vi: s.vi, wordIds: ['a-001'],
      })
    }
  })

  test('order tokens are a permutation of the sentence words and never the correct order', () => {
    const correct = s.en.split(' ')
    for (let seed = 1; seed <= 50; seed++) {
      const { tokens } = build('order', seeded(seed))
      expect([...tokens].sort()).toEqual([...correct].sort())
      expect(tokens.join(' ')).not.toBe(s.en)
    }
  })

  test('a constant rng and a two-word sentence still never give the correct order', () => {
    expect(build('order', () => 0).tokens.join(' ')).not.toBe(s.en)
    const two = buildExercise(sentence('t', 1, [], { en: 'Come here' }), 'l', 'order', [], seeded(3))
    expect(two.tokens).toEqual(['here', 'Come'])
  })

  test('a repeated word is kept the right number of times', () => {
    const rep = sentence('r', 1, [], { en: 'The cat and the dog run.' })
    const { tokens } = buildExercise(rep, 'l', 'order', [], seeded(2))
    expect(tokens.filter((t) => t.toLowerCase() === 'the')).toHaveLength(2)
    expect(tokens).toHaveLength(6)
  })

  test('blank text contains the gap once and the answer is among distinct options once', () => {
    const ex = build('blank')
    expect(ex.text).toBe('She ___ the dog very much.')
    expect(ex.text.match(/___/g)).toHaveLength(1)
    expect(ex.answer).toBe('likes')
    expect(ex.options.filter((o) => o === 'likes')).toHaveLength(1)
    expect(new Set(ex.options).size).toBe(ex.options.length)
  })

  test('blank replaces only the first whole-word occurrence', () => {
    const rep = sentence('r', 1, [], { en: 'I am happy and I am here.', blank: { answer: 'am', options: ['am', 'is', 'are'] } })
    expect(buildExercise(rep, 'l', 'blank', [], seeded(1)).text).toBe('I ___ happy and I am here.')
  })

  test('choose offers the correct sentence once among distinct sentences', () => {
    const ex = build('choose')
    expect(ex.answer).toBe(s.en)
    expect(ex.options.filter((o) => o === s.en)).toHaveLength(1)
    expect(new Set(ex.options).size).toBe(ex.options.length)
    expect(ex.options.length).toBeGreaterThanOrEqual(3)
    expect(ex.options.length).toBeLessThanOrEqual(4)
  })

  test('translate shows the Vietnamese prompt and mixes the sentence words with the extras', () => {
    const ex = build('translate')
    expect(ex.prompt).toBe(s.vi)
    expect([...ex.tokens].sort()).toEqual([...s.en.split(' '), ...s.extra].sort())
  })

  test('translate tiles never start with the first two words of the sentence in order', () => {
    const [first, second] = s.en.split(' ')
    for (let seed = 1; seed <= 50; seed++) {
      const tiles = buildExercise(s, 'l', 'translate', [], seeded(seed)).tokens
      expect(tiles[0] === first && tiles[1] === second).toBe(false)
    }
  })

  test('an unknown type throws', () => {
    expect(() => build('essay')).toThrow()
  })
})

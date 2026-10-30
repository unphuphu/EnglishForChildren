import { emptyProgress, finishSession } from './progress.js'

const D = '2026-10-30'
const vocab = [
  { id: 'a', word: 'dog', topic: 't', level: 1 },
  { id: 'b', word: 'cat', topic: 't', level: 1 },
]
const run = (state, extra) => finishSession(state, { results: [], today: D, vocab, ...extra })
const sentence = (sentenceId, correct, wordIds = ['a'], lessonId = 'l') => ({ sentenceId, lessonId, wordIds, correct })
const card = (box, due = '2026-10-29') => ({ box, correct: 1, wrong: 0, due })
const withCards = (cards) => ({ ...emptyProgress(), cards })

describe('sentence results', () => {
  test('each correct sentence gives 10 XP and a perfect round of sentences gives the +20 bonus', () => {
    const out = run(withCards({ a: card(1) }), { sentenceResults: [sentence('s1', true), sentence('s2', true)] })
    expect(out.xpGained).toBe(40)
    expect(out.state.perfectSessions).toBe(1)
  })

  test('one wrong sentence removes the perfect bonus', () => {
    const out = run(withCards({ a: card(1) }), { sentenceResults: [sentence('s1', true), sentence('s2', false)] })
    expect(out.xpGained).toBe(10)
    expect(out.state.perfectSessions).toBe(0)
  })

  test('sentences and scored word answers are judged together for the perfect bonus', () => {
    const out = run(withCards({ a: card(1) }), {
      results: [{ wordId: 'a', correct: true }],
      sentenceResults: [sentence('s1', false)],
    })
    expect(out.xpGained).toBe(10)
    expect(out.state.perfectSessions).toBe(0)
  })

  test('self-reported flashcards do not count toward the perfect bonus alongside sentences', () => {
    const out = run(withCards({ a: card(1) }), {
      results: [{ wordId: 'b', correct: false, selfReported: true }],
      sentenceResults: [sentence('s1', true)],
    })
    expect(out.xpGained).toBe(30)
  })

  test('a correct sentence reviews every word it uses, following the due rule', () => {
    const state = withCards({ a: card(1, '2026-10-29'), b: card(2, '2026-12-01') })
    const out = run(state, { sentenceResults: [sentence('s1', true, ['a', 'b'])] })
    expect(out.state.cards.a.box).toBe(2)
    expect(out.state.cards.b.box).toBe(2)
    expect(out.state.cards.b.correct).toBe(2)
  })

  test('a wrong sentence leaves its word cards untouched', () => {
    const state = withCards({ a: card(1) })
    const out = run(state, { sentenceResults: [sentence('s1', false)] })
    expect(out.state.cards.a).toEqual(state.cards.a)
  })

  test('a wrong word answer is not undone by a correct sentence with the same word', () => {
    const state = withCards({ a: card(2) })
    const out = run(state, {
      results: [{ wordId: 'a', correct: false }],
      sentenceResults: [sentence('s1', true)],
    })
    expect(out.state.cards.a.box).toBe(0)
  })

  test('sentence and lesson statistics are recorded', () => {
    const out = run(withCards({ a: card(1) }), {
      sentenceResults: [sentence('s1', true), sentence('s2', false), sentence('s1', true)],
    })
    expect(out.state.grammar.sentences.s1).toEqual({ seen: 2, wrong: 0 })
    expect(out.state.grammar.sentences.s2).toEqual({ seen: 1, wrong: 1 })
    expect(out.state.grammar.lessons.l).toEqual({ partsDone: 0, correct: 2, wrong: 1 })
  })

  test('statistics accumulate across sessions', () => {
    const first = run(withCards({ a: card(1) }), { sentenceResults: [sentence('s1', false)] })
    const second = run(first.state, { sentenceResults: [sentence('s1', true)] })
    expect(second.state.grammar.sentences.s1).toEqual({ seen: 2, wrong: 1 })
  })
})

describe('completing a lesson', () => {
  const ref = (over = {}) => ({ lessonId: 'l', part: 1, advancePlan: true, ...over })

  test('grammarRef counts a finished part and advances the plan only when the lesson completes', () => {
    const not = run(withCards({ a: card(1) }), { sentenceResults: [sentence('s1', true)], grammarRef: ref() })
    expect(not.state.plan.step).toBe(0)
    expect(not.state.grammar.lessons.l.partsDone).toBe(0)
    const done = run(withCards({ a: card(1) }), { sentenceResults: [sentence('s1', true)], grammarRef: ref(), completesLesson: true })
    expect(done.state.plan.step).toBe(1)
    expect(done.state.grammar.lessons.l.partsDone).toBe(1)
  })

  test('advancePlan false keeps the plan step but still counts the part', () => {
    const out = run(emptyProgress(), { grammarRef: ref({ advancePlan: false }), completesLesson: true })
    expect(out.state.plan.step).toBe(0)
    expect(out.state.grammar.lessons.l.partsDone).toBe(1)
  })

  test('a vocabulary-only lesson (no lesson id) completes without touching grammar or the plan', () => {
    const out = run(emptyProgress(), { grammarRef: ref({ lessonId: null, advancePlan: false }), completesLesson: true })
    expect(out.goalReachedNow).toBe(true)
    expect(out.state.plan.step).toBe(0)
    expect(out.state.grammar.lessons).toEqual({})
  })

  test('the grammar-first-lesson badge is awarded once', () => {
    const first = run(emptyProgress(), { grammarRef: ref(), completesLesson: true })
    expect(first.newBadges).toContain('grammar-first-lesson')
    const second = run(first.state, { grammarRef: ref({ part: 2 }), completesLesson: true })
    expect(second.newBadges).not.toContain('grammar-first-lesson')
    expect(second.state.badges.filter((b) => b === 'grammar-first-lesson')).toHaveLength(1)
  })

  test('completing a lesson without grammar does not award the grammar badge', () => {
    const out = run(emptyProgress(), { completesLesson: true })
    expect(out.newBadges).not.toContain('grammar-first-lesson')
  })

  test('the goal bonus once per day applies on top of sentence XP', () => {
    const out = run(withCards({ a: card(1) }), {
      sentenceResults: [sentence('s1', true)], completesLesson: true, grammarRef: ref(),
    })
    expect(out.xpGained).toBe(10 + 20 + 30)
  })

  test('the input state is not mutated', () => {
    const state = withCards({ a: card(1) })
    const frozen = structuredClone(state)
    run(state, { sentenceResults: [sentence('s1', true)], completesLesson: true, grammarRef: ref() })
    expect(state).toEqual(frozen)
  })
})

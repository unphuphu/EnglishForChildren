import { scramble, assemble } from './scrambleLogic.js'

function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

test('the shuffled order never equals the original for 50 seeds', () => {
  for (let seed = 1; seed <= 50; seed++) {
    expect(scramble('dog', seeded(seed)).join('')).not.toBe('dog')
  }
})

test('a constant rng still never returns the original order', () => {
  expect(scramble('dog', () => 0.3).join('')).not.toBe('dog')
  expect(scramble('apple', () => 0).join('')).not.toBe('apple')
})

test('the result is a permutation of the letters', () => {
  expect([...scramble('apple', seeded(3))].sort()).toEqual(['a', 'e', 'l', 'p', 'p'])
})

test('identical letters and single letters come back unchanged', () => {
  expect(scramble('aa')).toEqual(['a', 'a'])
  expect(scramble('a')).toEqual(['a'])
})

test('spaces and hyphens are not shuffled', () => {
  const letters = scramble('ice-cream', seeded(2))
  expect(letters).toHaveLength(8)
  expect(letters).not.toContain('-')
  expect(scramble('ice cream', seeded(2))).not.toContain(' ')
})

test('assemble puts separators back in place', () => {
  expect(assemble('ice-cream', [...'icecream'])).toBe('ice-cream')
  expect(assemble('ice cream', [...'icecream'])).toBe('ice cream')
  expect(assemble('dog', ['d', 'o'])).toBe('do')
})

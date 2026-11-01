import { buildMessages, buildSystemPrompt, childTurns, cleanReply } from './conversation.js'

const scenario = { role: 'Anna, a friendly waitress', setting: 'The child orders food in a restaurant.' }

test('the system prompt carries the role, situation, rules and a few known words', () => {
  const prompt = buildSystemPrompt({ scenario, knownWords: ['pizza', 'water'] })
  expect(prompt).toContain('Anna, a friendly waitress')
  expect(prompt).toContain('orders food in a restaurant')
  expect(prompt).toMatch(/ONE or TWO short sentences/)
  expect(prompt).toMatch(/Never use Vietnamese/)
  expect(prompt).toContain('Words the child knows: pizza, water.')
})

test('known words are capped and omitted when there are none', () => {
  const many = Array.from({ length: 50 }, (_, i) => `w${i}`)
  expect(buildSystemPrompt({ scenario, knownWords: many })).toContain('w19.')
  expect(buildSystemPrompt({ scenario, knownWords: many })).not.toContain('w20')
  expect(buildSystemPrompt({ scenario })).not.toContain('Words the child knows')
})

test('messages map the history to chat roles after the system prompt', () => {
  const messages = buildMessages({
    scenario,
    history: [{ role: 'ai', text: 'Hello!' }, { role: 'child', text: 'I want pizza.' }],
  })
  expect(messages.map((m) => m.role)).toEqual(['system', 'assistant', 'user'])
  expect(messages[2].content).toBe('I want pizza.')
})

test('cleanReply keeps at most two sentences of the first line', () => {
  expect(cleanReply('Hi! You want pizza? Yes, yes!\nDo you like it?')).toBe('Hi! You want pizza?')
  expect(cleanReply('  Sure. What do you want? And more?  ')).toBe('Sure. What do you want?')
})

test('cleanReply removes role labels and emoji', () => {
  expect(cleanReply('Anna: Hello there! 🍕')).toBe('Hello there!')
  expect(cleanReply('Sure! 🍕 🍔 🍜')).toBe('Sure!')
})

test('cleanReply skips empty lines, caps the length and handles empty input', () => {
  expect(cleanReply('\n\nOkay, what kind?')).toBe('Okay, what kind?')
  const long = `${'word '.repeat(60)}end.`
  expect(cleanReply(long).length).toBeLessThanOrEqual(200)
  expect(cleanReply('')).toBe('')
  expect(cleanReply(null)).toBe('')
})

test('childTurns counts only the child messages', () => {
  expect(childTurns([{ role: 'ai' }, { role: 'child' }, { role: 'ai' }, { role: 'child' }])).toBe(2)
})

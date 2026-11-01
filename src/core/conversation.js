export const MAX_TURNS = 8
export const MIN_TURNS_FOR_XP = 3
export const MAX_INPUT = 200
export const CONVERSATION_XP = 20
// The small model tends to keep writing both sides of the dialogue; these end the reply at the first line.
export const STOP = ['\n', 'Child:', 'You:']

export function buildSystemPrompt({ scenario, knownWords = [] }) {
  const words = knownWords.slice(0, 20)
  return [
    `You are ${scenario.role}. You are talking with a 10-year-old Vietnamese child who is learning English.`,
    `Situation: ${scenario.setting}`,
    'Rules: use only very simple words and short sentences. Reply with ONE or TWO short sentences only.',
    'Always end with one simple question. Never speak for the child. Never use Vietnamese. Never use emoji.',
    'If the child makes a mistake, just answer naturally and use the correct form in your reply.',
    words.length > 0 ? `Words the child knows: ${words.join(', ')}.` : '',
  ].filter(Boolean).join(' ')
}

// history: [{ role: 'ai' | 'child', text }] starting with the AI's opening line.
export function buildMessages({ scenario, knownWords, history }) {
  return [
    { role: 'system', content: buildSystemPrompt({ scenario, knownWords }) },
    ...history.map((turn) => ({ role: turn.role === 'ai' ? 'assistant' : 'user', content: turn.text })),
  ]
}

const MAX_REPLY = 200

// Keeps what the child should read: the first line, no "Name:" label, no emoji, at most two sentences.
export function cleanReply(text) {
  const line = String(text ?? '').split('\n').map((l) => l.trim()).find(Boolean) ?? ''
  const plain = line
    .replace(/^[A-Z][a-z]{1,15}:\s*/, '')
    .replace(/\p{Extended_Pictographic}️?/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  const sentences = plain.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []
  let reply = sentences.slice(0, 2).map((s) => s.trim()).join(' ')
  if (reply.length > MAX_REPLY) {
    const cut = reply.slice(0, MAX_REPLY)
    const end = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('?'), cut.lastIndexOf('!'))
    reply = end > 0 ? cut.slice(0, end + 1) : cut.trim()
  }
  return reply
}

export const childTurns = (history) => history.filter((turn) => turn.role === 'child').length

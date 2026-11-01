// Grammar hint for one sentence of the child. The small local model cannot explain mistakes in Vietnamese,
// so it is only asked to rewrite the sentence; the app compares the two and writes the hint itself.
import { normalizeText } from './pronunciation.js'

export function buildCheckMessages(sentence) {
  return [
    {
      role: 'system',
      content: 'You correct English sentences written by a 10-year-old learner. If the sentence is correct, answer exactly: OK. '
        + 'If it has a mistake, answer with ONLY the corrected sentence, with no explanation.',
    },
    { role: 'user', content: sentence },
  ]
}

const VIETNAMESE = /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i
const MAX_CHANGED = 0.5

// The model often adds a label ("Incorrect grammar: ...") or a note in brackets; both are removed.
function extractSentence(output) {
  let line = String(output ?? '').split('\n').map((l) => l.trim()).find(Boolean) ?? ''
  const colon = line.indexOf(':')
  if (colon > 0 && line.slice(0, colon).trim().split(/\s+/).length <= 4) line = line.slice(colon + 1).trim()
  return line.replace(/\s*\([^)]*\)\s*$/, '').replace(/^["“']+|["”']+$/g, '').trim()
}

// Returns null when there is nothing useful to show (the model said OK, changed nothing, or answered with
// something that is not a small fix of the sentence); otherwise `{ suggestion, parts: [{ text, changed }] }`.
export function parseCorrection(sentence, output) {
  if (/^ok\b/i.test(String(output ?? '').trim())) return null
  const suggestion = extractSentence(output)
  if (!suggestion || VIETNAMESE.test(suggestion)) return null
  const original = normalizeText(sentence)
  if (normalizeText(suggestion) === original) return null
  const ratio = suggestion.length / Math.max(1, sentence.trim().length)
  if (ratio > 2 || ratio < 0.5) return null

  const known = new Set(original.split(' '))
  const parts = suggestion.split(/\s+/).map((text) => ({ text, changed: !known.has(normalizeText(text)) }))
  const changed = parts.filter((p) => p.changed).length
  if (changed === 0 || changed / parts.length > MAX_CHANGED) return null
  return { suggestion, parts }
}

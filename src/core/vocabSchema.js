const REQUIRED = ['id', 'word', 'pos', 'vi', 'ipa', 'example', 'exampleVi', 'topic']

function isSingleEmoji(value) {
  if (typeof value !== 'string' || !/\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u.test(value)) return false
  return [...new Intl.Segmenter().segment(value)].length === 1
}

export function validateWord(word) {
  const errors = []
  for (const field of REQUIRED) {
    if (typeof word[field] !== 'string' || word[field].trim() === '') {
      errors.push(`missing or empty field: ${field}`)
    }
  }
  if (![1, 2, 3].includes(word.level)) errors.push('level must be 1, 2 or 3')
  if (typeof word.id === 'string') {
    const match = /^([a-z-]+)-\d{3}$/.exec(word.id)
    if (!match) errors.push('id must look like <topic>-<3 digits>')
    else if (match[1] !== word.topic) errors.push('id prefix must equal topic')
  }
  if (word.emoji !== undefined && !isSingleEmoji(word.emoji)) {
    errors.push('emoji must be a single emoji')
  }
  return errors
}

export function validateVocab(words) {
  const errors = []
  const seen = new Set()
  for (const word of words) {
    for (const message of validateWord(word)) errors.push(`${word.id}: ${message}`)
    if (seen.has(word.id)) errors.push(`${word.id}: duplicate id`)
    seen.add(word.id)
  }
  return errors
}

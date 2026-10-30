const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const isText = (v) => typeof v === 'string' && v.trim() !== ''

export function tokenize(en) {
  return en.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []
}

function inflections(word) {
  const forms = new Set([word, `${word}s`, `${word}es`, `${word}ing`, `${word}ed`])
  if (word.endsWith('e')) {
    forms.add(`${word.slice(0, -1)}ing`)
    forms.add(`${word}d`)
  }
  if (/[^aeiou]y$/.test(word)) {
    forms.add(`${word.slice(0, -1)}ies`)
    forms.add(`${word.slice(0, -1)}ied`)
  }
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(word)) {
    const last = word.at(-1)
    forms.add(`${word}${last}ing`)
    forms.add(`${word}${last}ed`)
  }
  return forms
}

export function matchesUses(token, uses) {
  return uses.some((use) => inflections(use.toLowerCase()).has(token))
}

function sentenceErrors(sentence, sessions, { vocabWords, freeWords }) {
  const id = sentence.id ?? '(no id)'
  const errors = []
  const fail = (message) => errors.push(`${id}: ${message}`)

  if (!isText(sentence.id)) fail('missing id')
  if (!isText(sentence.en)) fail('missing en')
  if (!isText(sentence.vi)) fail('missing vi translation')
  if (!Number.isInteger(sentence.session) || sentence.session < 1 || sentence.session > sessions) {
    fail(`session must be between 1 and ${sessions}`)
  }

  const uses = Array.isArray(sentence.uses) ? sentence.uses : []
  if (!Array.isArray(sentence.uses)) fail('uses must be a list')
  for (const use of uses) {
    if (!vocabWords.has(String(use).toLowerCase())) fail(`uses word not in vocabulary: ${use}`)
  }

  if (isText(sentence.en)) {
    let text = sentence.en.toLowerCase()
    for (const use of uses.filter((u) => u.includes(' '))) text = text.replaceAll(use.toLowerCase(), ' ')
    const singles = uses.filter((u) => !u.includes(' '))
    for (const token of tokenize(text)) {
      if (!freeWords.has(token) && !matchesUses(token, singles)) fail(`word not allowed: ${token}`)
    }
  }

  const blank = sentence.blank
  if (!blank || !isText(blank.answer) || !Array.isArray(blank.options) || blank.options.length < 2) {
    fail('blank needs an answer and at least 2 options')
  } else {
    if (!blank.options.includes(blank.answer)) fail('blank answer is not among the options')
    if (new Set(blank.options).size !== blank.options.length) fail('blank options contain duplicates')
    if (isText(sentence.en) && !new RegExp(`\\b${escapeRegExp(blank.answer.toLowerCase())}\\b`).test(sentence.en.toLowerCase())) {
      fail('blank answer is not in the sentence')
    }
  }

  const wrong = sentence.wrong
  if (!Array.isArray(wrong) || wrong.length < 2 || !wrong.every(isText)) {
    fail('wrong needs at least 2 sentences')
  } else {
    if (wrong.includes(sentence.en)) fail('wrong sentence equals the correct sentence')
    if (new Set(wrong).size !== wrong.length) fail('wrong sentences contain duplicates')
  }

  if (!Array.isArray(sentence.extra) || !sentence.extra.every(isText)) fail('extra must be a list of words')
  return errors
}

export function validateLesson(lesson, context) {
  const id = lesson.id ?? '(no id)'
  const errors = []
  const fail = (message) => errors.push(`${id}: ${message}`)

  if (!isText(lesson.id)) fail('missing id')
  if (!isText(lesson.title)) fail('missing title')
  if (!Number.isInteger(lesson.order) || lesson.order < 1) fail('order must be a positive integer')
  if (!Number.isInteger(lesson.sessions) || lesson.sessions < 1) fail('sessions must be a positive integer')

  const explain = Array.isArray(lesson.explain) ? lesson.explain : []
  if (explain.length === 0) fail('explain is empty')
  for (const block of explain) {
    if (!isText(block.vi)) fail('explain block without vi text')
    const examples = Array.isArray(block.examples) ? block.examples : []
    if (examples.length === 0) fail('explain block without examples')
    for (const ex of examples) if (!isText(ex.en) || !isText(ex.vi)) fail('example needs en and vi')
  }

  const sentences = Array.isArray(lesson.sentences) ? lesson.sentences : []
  if (sentences.length === 0) fail('sentences is empty')
  const seen = new Set()
  for (const sentence of sentences) {
    if (seen.has(sentence.id)) fail(`duplicate sentence id ${sentence.id}`)
    seen.add(sentence.id)
    errors.push(...sentenceErrors(sentence, lesson.sessions, context))
  }
  return errors
}

export function validateGrammar({ lessons, roadmap, vocab, freeWords }) {
  const context = {
    vocabWords: new Set(vocab.map((w) => w.word.toLowerCase())),
    freeWords: new Set(freeWords.map((w) => w.toLowerCase())),
  }
  const errors = []
  const lessonIds = new Map()
  const orders = new Set()
  const sentenceIds = new Set()

  for (const lesson of lessons) {
    errors.push(...validateLesson(lesson, context))
    if (lessonIds.has(lesson.id)) errors.push(`${lesson.id}: duplicate lesson id`)
    lessonIds.set(lesson.id, lesson)
    if (orders.has(lesson.order)) errors.push(`${lesson.id}: duplicate lesson order ${lesson.order}`)
    orders.add(lesson.order)
    for (const sentence of lesson.sentences ?? []) {
      if (sentenceIds.has(sentence.id)) errors.push(`${sentence.id}: duplicate sentence id across lessons`)
      sentenceIds.add(sentence.id)
    }
  }

  const topics = new Set(vocab.map((w) => w.topic))
  roadmap.forEach((step, i) => {
    const label = `roadmap step ${i + 1}`
    if (!topics.has(step.topic)) errors.push(`${label}: unknown topic ${step.topic}`)
    const lesson = lessonIds.get(step.lesson)
    if (!lesson) errors.push(`${label}: unknown lesson ${step.lesson}`)
    else if (!Number.isInteger(step.part) || step.part < 1 || step.part > lesson.sessions) {
      errors.push(`${label}: part ${step.part} is outside 1..${lesson.sessions}`)
    }
  })
  return errors
}

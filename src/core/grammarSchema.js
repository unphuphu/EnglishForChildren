const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const isText = (v) => typeof v === 'string' && v.trim() !== ''
// Distractor tiles that could turn the sentence into a different but also correct sentence.
const BANNED_EXTRA = new Set(['no', 'not', 'and', 'or'])
// Deliberately wrong forms (cans, haves, more big, bigger then) that may appear in wrong sentences and extra tiles.
const MISTAKE_WORDS = new Set(['cans', 'haves', 'more', 'then'])

export function tokenize(en) {
  return en.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []
}

function inflections(word) {
  const forms = new Set([word, `${word}s`, `${word}es`, `${word}ing`, `${word}ed`, `${word}er`])
  if (word.endsWith('e')) {
    forms.add(`${word.slice(0, -1)}ing`)
    forms.add(`${word}d`)
    forms.add(`${word}r`)
  }
  if (/[^aeiou]y$/.test(word)) {
    forms.add(`${word.slice(0, -1)}ies`)
    forms.add(`${word.slice(0, -1)}ied`)
    forms.add(`${word.slice(0, -1)}ier`)
  }
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(word)) {
    const last = word.at(-1)
    forms.add(`${word}${last}ing`)
    forms.add(`${word}${last}ed`)
    forms.add(`${word}${last}er`)
  }
  return forms
}

export function matchesUses(token, uses) {
  return uses.some((use) => inflections(use.toLowerCase()).has(token))
}

// Wrong sentences and extra tiles are shown to the child too, so they may only contain words the
// child can know: function words, the words the sentence uses, its own words and its blank options
// (those carry the deliberate misspellings such as siting).
function distractorErrors(sentence, { freeWords }, fail) {
  const errors = []
  if (!isText(sentence.en) || !Array.isArray(sentence.uses)) return errors
  const own = new Set([...tokenize(sentence.en), ...(sentence.blank?.options ?? []).flatMap((o) => tokenize(String(o)))])
  const singles = sentence.uses.filter((u) => !u.includes(' '))
  const multi = sentence.uses.filter((u) => u.includes(' ')).map((u) => u.toLowerCase())
  const allowed = (token) => freeWords.has(token) || MISTAKE_WORDS.has(token) || own.has(token) || matchesUses(token, singles)
  const check = (label, text) => {
    let rest = text.toLowerCase()
    for (const phrase of multi) rest = rest.replaceAll(phrase, ' ')
    for (const token of tokenize(rest)) {
      if (!allowed(token)) fail(`${label} has a word the child cannot know: ${token}`)
    }
  }
  for (const w of Array.isArray(sentence.wrong) ? sentence.wrong : []) if (isText(w)) check('wrong sentence', w)
  for (const e of Array.isArray(sentence.extra) ? sentence.extra : []) if (isText(e)) check('extra tile', e)
  return errors
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
  else {
    for (const tile of sentence.extra) {
      if (BANNED_EXTRA.has(tile.toLowerCase())) fail(`extra tile "${tile}" can build another correct sentence`)
    }
  }
  if (isText(sentence.en) && /\b(and|or)\b/i.test(sentence.en)) {
    fail('coordination (and/or) lets the parts swap places, so the word order is ambiguous: write it without and/or')
  }
  errors.push(...distractorErrors(sentence, { vocabWords, freeWords }, fail))
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

// Used when the app starts: a lesson file that is broken (wrong shape, unknown words...) is left
// out instead of crashing the whole app. `rejected` lists why, so it can be reported.
export function filterValidLessons(lessons, context) {
  const valid = []
  const rejected = []
  const ids = new Set()
  for (const entry of lessons) {
    const id = entry !== null && typeof entry === 'object' && !Array.isArray(entry) ? entry.id ?? null : null
    try {
      if (id === null && !(entry && typeof entry === 'object' && !Array.isArray(entry))) {
        rejected.push({ id, errors: ['not a lesson object'] })
        continue
      }
      const errors = validateLesson(entry, context)
      if (ids.has(id)) errors.push(`${id}: duplicate lesson id`)
      if (errors.length > 0) {
        rejected.push({ id, errors })
        continue
      }
      ids.add(id)
      valid.push(entry)
    } catch (error) {
      rejected.push({ id, errors: [`unreadable lesson: ${error.message}`] })
    }
  }
  return { valid, rejected }
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

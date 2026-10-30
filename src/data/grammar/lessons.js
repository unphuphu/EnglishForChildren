import vocab from '../vocab/index.js'
import freeWords from './freeWords.json'
import { filterValidLessons } from '../../core/grammarSchema.js'

const modules = import.meta.glob('./lessons/*.json', { eager: true, import: 'default' })

// A lesson file that is broken is left out (and reported in the console) instead of crashing the
// app, so the parent can fix it later; `npm run validate:grammar` shows the exact problems.
const { valid, rejected } = filterValidLessons(Object.values(modules), {
  vocabWords: new Set(vocab.map((w) => w.word.toLowerCase())),
  freeWords: new Set(freeWords.map((w) => w.toLowerCase())),
})
for (const lesson of rejected) {
  console.warn(`Grammar lesson "${lesson.id ?? '?'}" was left out:`, lesson.errors.join('; '))
}

export default valid.sort((a, b) => a.order - b.order)

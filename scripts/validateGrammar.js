import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateGrammar } from '../src/core/grammarSchema.js'
import { roadmapCoverageErrors } from '../src/core/plan.js'
import { LESSON } from '../src/core/config.js'

const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
const dir = (relative) => fileURLToPath(new URL(relative, import.meta.url))

const vocabDir = dir('../src/data/vocab/')
const lessonsDir = dir('../src/data/grammar/lessons/')
const roadmapFile = dir('../src/data/roadmap.json')

const vocab = readdirSync(vocabDir).filter((n) => n.endsWith('.json')).flatMap((n) => read(join(vocabDir, n)))
const lessonFiles = existsSync(lessonsDir) ? readdirSync(lessonsDir).filter((n) => n.endsWith('.json')) : []
const lessons = lessonFiles.map((n) => read(join(lessonsDir, n))).sort((a, b) => a.order - b.order)
const roadmap = existsSync(roadmapFile) ? read(roadmapFile) : []
const freeWords = read(dir('../src/data/grammar/freeWords.json'))

if (lessons.length === 0) {
  console.log('Grammar: no lesson files yet, nothing to validate')
  process.exit(0)
}

// Coverage is checked for a child with the default goal (8 sentences needed) and for the smallest
// goal of 5 new words (at least the 4 sentences a lesson needs to show its exercises).
const errors = [
  ...validateGrammar({ lessons, roadmap, vocab, freeWords }),
  ...roadmapCoverageErrors({ roadmap, lessons, vocab, goal: 10, minSentences: 8 }),
  ...roadmapCoverageErrors({ roadmap, lessons, vocab, goal: 5, minSentences: LESSON.MIN_SENTENCES }).map((e) => `${e} (goal 5)`),
]
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
const sentences = lessons.reduce((n, l) => n + l.sentences.length, 0)
console.log(`Grammar OK: ${lessons.length} lessons, ${sentences} sentences, ${roadmap.length} roadmap steps`)

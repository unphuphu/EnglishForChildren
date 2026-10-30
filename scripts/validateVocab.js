import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateVocab } from '../src/core/vocabSchema.js'

const dir = fileURLToPath(new URL('../src/data/vocab/', import.meta.url))
const files = readdirSync(dir).filter((name) => name.endsWith('.json'))
const words = files.flatMap((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')))
const errors = validateVocab(words)

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Vocabulary OK: ${words.length} words in ${files.length} topics`)

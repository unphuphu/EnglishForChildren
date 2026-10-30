import { migrateData } from './migrate.js'

test('applies each step from the data version up to the target', () => {
  const migrations = { 1: (d) => ({ ...d, version: 2, y: 2 }) }
  expect(migrateData({ version: 1, x: 1 }, migrations, 2)).toEqual({ version: 2, x: 1, y: 2 })
})

test('returns data unchanged when already at target', () => {
  expect(migrateData({ version: 2, x: 1 }, {}, 2)).toEqual({ version: 2, x: 1 })
})

test('chains several steps', () => {
  const migrations = {
    1: (d) => ({ ...d, version: 2, a: 1 }),
    2: (d) => ({ ...d, version: 3, b: 2 }),
  }
  expect(migrateData({ version: 1 }, migrations, 3)).toEqual({ version: 3, a: 1, b: 2 })
})

test('throws when a migration step is missing', () => {
  expect(() => migrateData({ version: 1 }, {}, 2)).toThrow(/migration/i)
})

test('throws when data is newer than the target', () => {
  expect(() => migrateData({ version: 5 }, {}, 2)).toThrow(/newer/i)
})

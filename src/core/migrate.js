export function migrateData(data, migrations, target) {
  if (data.version > target) throw new Error(`Data version ${data.version} is newer than ${target}`)
  let current = data
  while (current.version < target) {
    const step = migrations[current.version]
    if (!step) throw new Error(`Missing migration from version ${current.version}`)
    current = step(current)
  }
  return current
}

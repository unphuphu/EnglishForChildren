export function createStorage(backend = globalThis.localStorage) {
  const memory = new Map()
  let persistent = true

  function readRaw(key) {
    try {
      return backend.getItem(key)
    } catch {
      persistent = false
      return null
    }
  }

  return {
    get(key) {
      if (!persistent && memory.has(key)) return memory.get(key)
      const raw = readRaw(key)
      if (raw === null) return memory.has(key) ? memory.get(key) : null
      try {
        return JSON.parse(raw)
      } catch {
        return null
      }
    },
    set(key, value) {
      memory.set(key, value)
      try {
        const previous = backend.getItem(key)
        if (previous !== null) backend.setItem(`${key}:bak`, previous)
        backend.setItem(key, JSON.stringify(value))
        return true
      } catch {
        persistent = false
        return false
      }
    },
    remove(key) {
      memory.delete(key)
      try {
        backend.removeItem(key)
        backend.removeItem(`${key}:bak`)
      } catch {
        persistent = false
      }
    },
    restoreBackup(key) {
      try {
        const backup = backend.getItem(`${key}:bak`)
        if (backup === null) return false
        backend.setItem(key, backup)
        memory.delete(key)
        return true
      } catch {
        return false
      }
    },
    isPersistent: () => persistent,
  }
}

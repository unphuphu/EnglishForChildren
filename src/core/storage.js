function parses(raw) {
  try {
    JSON.parse(raw)
    return true
  } catch {
    return false
  }
}

// `source` is a Storage-like backend or a function returning one. Merely reading
// window.localStorage can throw when the browser blocks site data, so it is resolved here.
export function createStorage(source = () => globalThis.localStorage) {
  const memory = new Map()
  let persistent = true
  let backend = null
  try {
    backend = typeof source === 'function' ? source() : source
  } catch {
    backend = null
  }
  if (!backend) persistent = false

  function readRaw(key) {
    if (!backend) return null
    try {
      return backend.getItem(key)
    } catch {
      persistent = false
      return null
    }
  }

  function getStatus(key) {
    if (!persistent && memory.has(key)) return { status: 'ok', value: memory.get(key) }
    const raw = readRaw(key)
    if (raw === null) return memory.has(key) ? { status: 'ok', value: memory.get(key) } : { status: 'missing', value: null }
    try {
      return { status: 'ok', value: JSON.parse(raw) }
    } catch {
      return { status: 'corrupt', value: null }
    }
  }

  return {
    getStatus,
    get: (key) => getStatus(key).value,
    set(key, value) {
      memory.set(key, value)
      if (!backend) return false
      try {
        const previous = backend.getItem(key)
        if (previous !== null && parses(previous)) backend.setItem(`${key}:bak`, previous)
        backend.setItem(key, JSON.stringify(value))
        return true
      } catch {
        persistent = false
        return false
      }
    },
    remove(key) {
      memory.delete(key)
      if (!backend) return
      try {
        backend.removeItem(key)
        backend.removeItem(`${key}:bak`)
      } catch {
        persistent = false
      }
    },
    restoreBackup(key) {
      if (!backend) return false
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

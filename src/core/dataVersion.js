export const APP_DATA_VERSION = 2
const VERSION_KEY = 'appDataVersion'

const isV1Key = (key) => key === 'profiles' || key === 'currentProfile' || key.startsWith('progress:')

// Version 2 starts from scratch: the first time it runs, everything version 1 stored is removed
// (profiles, current profile, every progress record and its backup), then a marker is written
// so this never happens again. Keys that are not the app's are left alone.
export function cleanOldData(storage) {
  if (storage.get(VERSION_KEY) === APP_DATA_VERSION) return false
  let removed = false
  for (const key of storage.keys()) {
    if (isV1Key(key)) {
      storage.remove(key)
      removed = true
    }
  }
  storage.set(VERSION_KEY, APP_DATA_VERSION)
  return removed
}

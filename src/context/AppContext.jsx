import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { createStorage } from '../core/storage.js'
import { createProfiles } from '../core/profiles.js'
import { createProgressStore, emptyProgress } from '../core/progress.js'
import { createVocabService } from '../core/vocabService.js'
import defaultWords from '../data/vocab/index.js'

const AppContext = createContext(null)

export function AppProvider({ storage: storageProp, words = defaultWords, children }) {
  const storage = useMemo(() => storageProp ?? createStorage(), [storageProp])
  const profiles = useMemo(() => createProfiles(storage), [storage])
  const vocab = useMemo(() => createVocabService(words), [words])
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  const profileList = profiles.list()
  const currentId = profiles.getCurrentId()
  const currentProfile = profileList.find((p) => p.id === currentId) ?? null

  // Reload from storage whenever the profile changes or something was saved (version bump).
  const loaded = useMemo(() => {
    if (!currentId) return { progress: emptyProgress(), problem: false, hasBackup: false }
    const store = createProgressStore(storage, currentId)
    const problem = store.check() === 'corrupt'
    return { progress: store.load(), problem, hasBackup: problem && store.hasBackup() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage, currentId, version])

  const saveProgress = useCallback(
    (state) => {
      if (currentId) createProgressStore(storage, currentId).save(state)
      refresh()
    },
    [storage, currentId, refresh],
  )

  const recoverProgress = useCallback(() => {
    const ok = currentId ? createProgressStore(storage, currentId).restoreBackup() : false
    refresh()
    return ok
  }, [storage, currentId, refresh])

  const resetProgress = useCallback(() => {
    if (currentId) createProgressStore(storage, currentId).reset()
    refresh()
  }, [storage, currentId, refresh])

  const switchProfile = useCallback(
    (id) => {
      profiles.setCurrentId(id)
      refresh()
    },
    [profiles, refresh],
  )

  const value = {
    storage,
    profiles,
    profileList,
    vocab,
    currentProfile,
    progress: loaded.progress,
    progressProblem: loaded.problem,
    hasBackup: loaded.hasBackup,
    saveProgress,
    recoverProgress,
    resetProgress,
    switchProfile,
    refresh,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}

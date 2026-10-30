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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const progress = useMemo(
    () => (currentId ? createProgressStore(storage, currentId).load() : emptyProgress()),
    [storage, currentId, version],
  )

  const saveProgress = useCallback(
    (state) => {
      if (currentId) createProgressStore(storage, currentId).save(state)
      refresh()
    },
    [storage, currentId, refresh],
  )

  const switchProfile = useCallback(
    (id) => {
      profiles.setCurrentId(id)
      refresh()
    },
    [profiles, refresh],
  )

  const value = {
    storage, profiles, profileList, vocab, currentProfile, progress, saveProgress, switchProfile, refresh,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}

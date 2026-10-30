export function createVocabService(words) {
  const byId = new Map(words.map((word) => [word.id, word]))
  return {
    all: () => words,
    topics() {
      const counts = new Map()
      for (const word of words) counts.set(word.topic, (counts.get(word.topic) ?? 0) + 1)
      return [...counts].map(([topic, count]) => ({ topic, count }))
    },
    byTopic: (topic) => words.filter((word) => word.topic === topic),
    byLevel: (level) => words.filter((word) => word.level === level),
    get: (id) => byId.get(id),
  }
}

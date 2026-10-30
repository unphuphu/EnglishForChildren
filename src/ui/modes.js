export const MODE_LABELS = {
  flashcard: 'Flashcard',
  quiz: 'Trắc nghiệm',
  listen: 'Nghe rồi chọn',
  scramble: 'Ghép chữ',
  match: 'Ghép cặp',
}

export const prettyTopic = (slug) => {
  const text = slug.replace(/-/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

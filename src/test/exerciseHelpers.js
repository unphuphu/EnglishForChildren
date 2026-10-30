import { screen, within } from '@testing-library/react'

// Helpers for tests that play sentence exercises built from the fixture lesson in utils.jsx
// (every sentence reads "She sees wordN now.").

export async function tapTiles(user, words) {
  for (const text of words) {
    await user.click(screen.getAllByRole('button', { name: text }).find((b) => !b.disabled))
  }
}

export async function answerExerciseRight(user) {
  const choices = screen.queryByRole('group', { name: /đáp án/i })
  if (choices) {
    const buttons = within(choices).getAllByRole('button')
    await user.click(buttons.find((b) => b.textContent === 'sees' || /^She sees word\d+ now\.$/.test(b.textContent)))
  } else {
    const wordTile = screen.getAllByRole('button').find((b) => /^word\d+$/.test(b.textContent))
    await tapTiles(user, ['She', 'sees', wordTile.textContent, 'now.'])
    await user.click(screen.getByRole('button', { name: /kiểm tra/i }))
  }
  await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
}

export async function answerExerciseWrong(user) {
  const choices = screen.queryByRole('group', { name: /đáp án/i })
  if (choices) {
    const buttons = within(choices).getAllByRole('button')
    await user.click(buttons.find((b) => b.textContent !== 'sees' && !/^She sees word\d+ now\.$/.test(b.textContent)))
  } else {
    const tiles = screen.getAllByRole('button').filter((b) => b.classList.contains('word-tile'))
    await user.click(tiles.find((b) => !b.disabled))
    const rest = screen.getAllByRole('button').filter((b) => b.classList.contains('word-tile') && !b.disabled)
    for (const tile of rest) await user.click(tile)
    await user.click(screen.getByRole('button', { name: /kiểm tra/i }))
  }
  await user.click(screen.getByRole('button', { name: /tiếp tục/i }))
}

// Quiz questions show either "wordN" (answer "nghĩa N") or "nghĩa N" (answer "wordN").
export async function answerQuiz(user, right) {
  const prompt = document.querySelector('.prompt-text').textContent
  const n = prompt.match(/\d+/)[0]
  const expected = prompt.startsWith('word') ? `nghĩa ${n}` : `word${n}`
  const options = within(screen.getByRole('group', { name: /đáp án/i })).getAllByRole('button')
  await user.click(options.find((b) => (b.textContent === expected) === right))
  await user.click(screen.getByRole('button', { name: /tiếp tục|xem kết quả/i }))
}

export async function answerExercisesRight(user, count) {
  for (let i = 0; i < count; i++) await answerExerciseRight(user)
}

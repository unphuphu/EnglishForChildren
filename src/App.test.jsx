import { screen } from '@testing-library/react'
import App from './App.jsx'
import { renderApp } from './test/utils.jsx'

test('shows the app title', () => {
  renderApp(<App />)
  expect(screen.getByText(/English For Children/i)).toBeInTheDocument()
})

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders p2p-drop title and connection options', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('p2p-drop')
    expect(screen.getByTestId('create-connection-btn')).toBeInTheDocument()
    expect(screen.getByTestId('join-connection-btn')).toBeInTheDocument()
  })
})

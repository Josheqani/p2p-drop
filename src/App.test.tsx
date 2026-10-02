import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'
import { translations } from './lib/i18n'

describe('App & UI (Apple Design System)', () => {
  it('renders title, connection panel, and segmented control tabs', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(translations.title)
    expect(screen.getByTestId('tab-quick-code')).toBeInTheDocument()
    expect(screen.getByTestId('tab-manual-qr')).toBeInTheDocument()
    expect(screen.getByTestId('create-room-btn')).toBeInTheDocument()
    expect(screen.getByTestId('join-room-btn')).toBeInTheDocument()

    // Switch to manual & QR tab
    fireEvent.click(screen.getByTestId('tab-manual-qr'))
    expect(screen.getByTestId('create-connection-btn')).toBeInTheDocument()
    expect(screen.getByTestId('join-connection-btn')).toBeInTheDocument()

    // Switch back to quick code tab
    fireEvent.click(screen.getByTestId('tab-quick-code'))
    expect(screen.getByTestId('create-room-btn')).toBeInTheDocument()
    expect(screen.getByTestId('join-room-btn')).toBeInTheDocument()
  })

  it('renders English i18n strings correctly throughout the UI', () => {
    render(<App />)
    expect(screen.getByText(translations.tagline)).toBeInTheDocument()
    expect(screen.getByText(translations.status)).toBeInTheDocument()
    expect(screen.getByText(translations.statusIdle)).toBeInTheDocument()
  })
})

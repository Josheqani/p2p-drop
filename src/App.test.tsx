import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App & UI', () => {
  it('renders title, connection panel, tabs, and language toggle', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('p2p-drop')
    expect(screen.getByTestId('tab-quick-code')).toBeInTheDocument()
    expect(screen.getByTestId('tab-manual-qr')).toBeInTheDocument()
    expect(screen.getByTestId('create-room-btn')).toBeInTheDocument()
    expect(screen.getByTestId('join-room-btn')).toBeInTheDocument()
    expect(screen.getByTestId('language-toggle-btn')).toBeInTheDocument()

    // Switch to manual & QR tab
    fireEvent.click(screen.getByTestId('tab-manual-qr'))
    expect(screen.getByTestId('create-connection-btn')).toBeInTheDocument()
    expect(screen.getByTestId('join-connection-btn')).toBeInTheDocument()
  })

  it('switches between English and Persian with RTL support', () => {
    render(<App />)
    const toggleBtn = screen.getByTestId('language-toggle-btn')
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toBe('en')

    // Switch to Persian
    fireEvent.click(toggleBtn)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('پی‌توپی دراپ')
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('fa')

    // Switch back to English
    fireEvent.click(toggleBtn)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('p2p-drop')
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toBe('en')
  })
})

import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QrCodeDisplay } from './QrCodeDisplay'

describe('QrCodeDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a canvas for a short payload', () => {
    render(<QrCodeDisplay data="short-code" />)
    expect(screen.getByTestId('qr-canvas')).toBeInTheDocument()
    expect(screen.queryByTestId('qr-frame-counter')).not.toBeInTheDocument()
  })

  it('cycles frames for a long payload exceeding threshold', () => {
    const longData = 'a'.repeat(650)
    render(<QrCodeDisplay data={longData} />)

    expect(screen.getByTestId('qr-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('qr-frame-counter')).toHaveTextContent('Frame 1 of 3')

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(screen.getByTestId('qr-frame-counter')).toHaveTextContent('Frame 2 of 3')

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(screen.getByTestId('qr-frame-counter')).toHaveTextContent('Frame 3 of 3')

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(screen.getByTestId('qr-frame-counter')).toHaveTextContent('Frame 1 of 3')
  })
})

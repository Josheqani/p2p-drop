import { describe, it, expect } from 'vitest'
import { formatBytes, formatSpeed, formatTime } from './format'

describe('format utilities', () => {
  describe('formatBytes', () => {
    it('formats bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(-10)).toBe('0 B')
      expect(formatBytes(500)).toBe('500 B')
      expect(formatBytes(1024)).toBe('1.0 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
      expect(formatBytes(1048576)).toBe('1.0 MB')
      expect(formatBytes(524288000)).toBe('500 MB')
      expect(formatBytes(1073741824)).toBe('1.0 GB')
    })
  })

  describe('formatSpeed', () => {
    it('formats speed with /s suffix', () => {
      expect(formatSpeed(0)).toBe('0 B/s')
      expect(formatSpeed(1024 * 1024)).toBe('1.0 MB/s')
      expect(formatSpeed(15 * 1024 * 1024)).toBe('15 MB/s')
    })
  })

  describe('formatTime', () => {
    it('formats seconds, minutes, and hours', () => {
      expect(formatTime(0)).toBe('0s')
      expect(formatTime(45)).toBe('45s')
      expect(formatTime(60)).toBe('1m')
      expect(formatTime(125)).toBe('2m 5s')
      expect(formatTime(3600)).toBe('1h')
      expect(formatTime(3665)).toBe('1h 1m')
    })
  })
})

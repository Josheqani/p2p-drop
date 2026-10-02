import { describe, it, expect } from 'vitest'
import { parseUserAgentInfo } from './deviceInfo'

describe('parseUserAgentInfo', () => {
  it('correctly identifies iPhone 11 with iOS and Safari', () => {
    const iphoneUa =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1'
    const info = parseUserAgentInfo(iphoneUa, 414, 896, 2)

    expect(info.deviceType).toBe('mobile')
    expect(info.osName).toBe('iOS')
    expect(info.osVersion).toBe('17.4.1')
    expect(info.deviceModel).toBe('iPhone 11 / XR')
    expect(info.browserName).toBe('Safari')
    expect(info.browserVersion).toBe('17.4.1')
    expect(info.displayName).toContain('iPhone 11 / XR')
  })

  it('correctly identifies Android device with Chrome', () => {
    const androidUa =
      'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36'
    const info = parseUserAgentInfo(androidUa, 384, 854, 2.8)

    expect(info.deviceType).toBe('mobile')
    expect(info.osName).toBe('Android')
    expect(info.osVersion).toBe('14')
    expect(info.deviceModel).toBe('SM-S918B')
    expect(info.browserName).toBe('Chrome')
    expect(info.displayName).toContain('SM-S918B (Android 14 • Chrome 122)')
  })

  it('correctly identifies Mac with Chrome', () => {
    const macUa =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    const info = parseUserAgentInfo(macUa, 1920, 1080, 2)

    expect(info.deviceType).toBe('desktop')
    expect(info.osName).toBe('macOS')
    expect(info.osVersion).toBe('10.15.7')
    expect(info.deviceModel).toBe('Mac')
    expect(info.browserName).toBe('Chrome')
  })

  it('correctly identifies Windows with Edge', () => {
    const winUa =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
    const info = parseUserAgentInfo(winUa, 1920, 1080, 1)

    expect(info.deviceType).toBe('desktop')
    expect(info.osName).toBe('Windows')
    expect(info.deviceModel).toBe('Windows PC')
    expect(info.browserName).toBe('Edge')
  })
})

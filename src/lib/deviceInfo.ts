export interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop'
  deviceModel: string
  osName: string
  osVersion: string
  browserName: string
  browserVersion: string
  screenResolution: string
  displayName: string
}

function detectIPhoneModel(width: number, height: number, dpr: number): string {
  const w = Math.min(width, height)
  const h = Math.max(width, height)

  if (w === 414 && h === 896) {
    return dpr === 2 ? 'iPhone 11 / XR' : 'iPhone 11 Pro Max / XS Max'
  }
  if (w === 375 && h === 812) {
    return 'iPhone 11 Pro / X / XS / 12 mini / 13 mini'
  }
  if (w === 390 && h === 844) {
    return 'iPhone 12 / 13 / 14'
  }
  if (w === 393 && h === 852) {
    return 'iPhone 14 Pro / 15 / 15 Pro / 16'
  }
  if (w === 428 && h === 926) {
    return 'iPhone 12/13/14 Plus / Pro Max'
  }
  if (w === 430 && h === 932) {
    return 'iPhone 14/15/16 Pro Max / Plus'
  }
  if (w === 375 && h === 667) {
    return 'iPhone SE / 8 / 7'
  }
  return 'Apple iPhone'
}

export function parseUserAgentInfo(
  ua: string,
  screenWidth = 1920,
  screenHeight = 1080,
  dpr = 1,
): DeviceInfo {
  let deviceType: DeviceInfo['deviceType'] = 'desktop'
  let osName = 'Unknown OS'
  let osVersion = ''
  let deviceModel = 'Unknown Device'
  let browserName = 'Browser'
  let browserVersion = ''

  // Browser detection
  if (/Edg\/([0-9.]+)/i.test(ua)) {
    browserName = 'Edge'
    browserVersion = ua.match(/Edg\/([0-9.]+)/i)?.[1] ?? ''
  } else if (/OPR\/([0-9.]+)/i.test(ua) || /Opera/i.test(ua)) {
    browserName = 'Opera'
    browserVersion = ua.match(/(?:OPR|Version)\/([0-9.]+)/i)?.[1] ?? ''
  } else if (/Chrome\/([0-9.]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    browserName = 'Chrome'
    browserVersion = ua.match(/Chrome\/([0-9.]+)/i)?.[1] ?? ''
  } else if (/CriOS\/([0-9.]+)/i.test(ua)) {
    browserName = 'Chrome iOS'
    browserVersion = ua.match(/CriOS\/([0-9.]+)/i)?.[1] ?? ''
  } else if (/FxiOS\/([0-9.]+)/i.test(ua)) {
    browserName = 'Firefox iOS'
    browserVersion = ua.match(/FxiOS\/([0-9.]+)/i)?.[1] ?? ''
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    browserName = 'Firefox'
    browserVersion = ua.match(/Firefox\/([0-9.]+)/i)?.[1] ?? ''
  } else if (/Version\/([0-9.]+).*Safari/i.test(ua)) {
    browserName = 'Safari'
    browserVersion = ua.match(/Version\/([0-9.]+)/i)?.[1] ?? ''
  }

  // OS & Device detection
  if (/iPad/i.test(ua) || (navigator?.maxTouchPoints > 1 && /Macintosh/i.test(ua))) {
    deviceType = 'tablet'
    osName = 'iPadOS'
    deviceModel = 'Apple iPad'
    const match = ua.match(/OS ([0-9_]+)/i)
    if (match) osVersion = match[1].replace(/_/g, '.')
  } else if (/iPhone/i.test(ua)) {
    deviceType = 'mobile'
    osName = 'iOS'
    deviceModel = detectIPhoneModel(screenWidth, screenHeight, dpr)
    const match = ua.match(/OS ([0-9_]+)/i)
    if (match) osVersion = match[1].replace(/_/g, '.')
  } else if (/Android/i.test(ua)) {
    deviceType = /Mobile/i.test(ua) ? 'mobile' : 'tablet'
    osName = 'Android'
    const vMatch = ua.match(/Android\s+([0-9.]+)/i)
    if (vMatch) osVersion = vMatch[1]
    const mMatch = ua.match(/;\s*([^;]+?)\s+Build\//i)
    if (mMatch && mMatch[1]) {
      deviceModel = mMatch[1].trim()
    } else {
      deviceModel = 'Android Device'
    }
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'desktop'
    osName = 'macOS'
    deviceModel = 'Mac'
    const match = ua.match(/Mac OS X ([0-9_]+)/i)
    if (match) osVersion = match[1].replace(/_/g, '.')
  } else if (/Windows NT/i.test(ua)) {
    deviceType = 'desktop'
    osName = 'Windows'
    deviceModel = 'Windows PC'
    if (/Windows NT 10.0/i.test(ua)) osVersion = '10 / 11'
    else if (/Windows NT 6.3/i.test(ua)) osVersion = '8.1'
    else if (/Windows NT 6.1/i.test(ua)) osVersion = '7'
  } else if (/Linux/i.test(ua)) {
    deviceType = 'desktop'
    osName = 'Linux'
    deviceModel = 'Linux PC'
  }

  const screenResolution = `${screenWidth}×${screenHeight}`

  // Format clean display name
  const osPart = osVersion ? `${osName} ${osVersion.split('.').slice(0, 2).join('.')}` : osName
  const browserPart = browserVersion
    ? `${browserName} ${browserVersion.split('.')[0]}`
    : browserName
  const displayName = `${deviceModel} (${osPart} • ${browserPart})`

  return {
    deviceType,
    deviceModel,
    osName,
    osVersion,
    browserName,
    browserVersion,
    screenResolution,
    displayName,
  }
}

export async function getClientDeviceInfo(): Promise<DeviceInfo> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const width = typeof window !== 'undefined' ? window.screen.width : 1920
  const height = typeof window !== 'undefined' ? window.screen.height : 1080
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

  const baseInfo = parseUserAgentInfo(ua, width, height, dpr)

  // Use Client Hints if available for precise model name (Chromium/Android)
  if (typeof navigator !== 'undefined' && 'userAgentData' in navigator) {
    try {
      const uad = (navigator as unknown as {
        userAgentData?: {
          getHighEntropyValues?: (hints: string[]) => Promise<{
            model?: string
            platform?: string
            platformVersion?: string
          }>
        }
      }).userAgentData

      if (uad?.getHighEntropyValues) {
        const hints = await uad.getHighEntropyValues(['model', 'platform', 'platformVersion'])
        if (hints.model) {
          baseInfo.deviceModel = hints.model
          if (hints.platform === 'Windows' && hints.platformVersion) {
            const major = parseInt(hints.platformVersion.split('.')[0], 10)
            if (major >= 13) baseInfo.osVersion = '11'
          }
          baseInfo.displayName = `${baseInfo.deviceModel} (${baseInfo.osName} ${baseInfo.osVersion} • ${baseInfo.browserName})`
        }
      }
    } catch {
      // ignore client hint errors
    }
  }

  return baseInfo
}

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'en' | 'fa'

export interface TranslationStrings {
  title: string
  tagline: string
  status: string
  statusIdle: string
  statusCreating: string
  statusWaiting: string
  statusConnecting: string
  statusConnected: string
  statusFailed: string
  statusClosed: string
  resetOrDisconnect: string
  createConnection: string
  createConnectionDesc: string
  joinConnection: string
  joinConnectionDesc: string
  offerCodeLabel: string
  generatingOffer: string
  copy: string
  copied: string
  pasteAnswerLabel: string
  pasteAnswerPlaceholder: string
  connect: string
  connecting: string
  pasteOfferLabel: string
  pasteOfferPlaceholder: string
  generateAnswer: string
  generatingAnswer: string
  answerCodeLabel: string
  waitingForCreator: string
  p2pFileTransfer: string
  dropFilesPrompt: string
  browse: string
  dropFilesSubtext: string
  transfers: string
  send: string
  recv: string
  queued: string
  completed: string
  cancelled: string
  failed: string
  cancel: string
  download: string
  left: string
  languageToggle: string
  showQr: string
  hideQr: string
  scanQr: string
  cameraDenied: string
  close: string
  connectionFailedExplanation: string
  transferInProgressWarning: string
  settings: string
  iceSettings: string
  iceSettingsDesc: string
  turnRelay: string
  turnRelayDesc: string
  activeIceServers: string
  customIceServers: string
  customIceServersDesc: string
  resetDefaults: string
  save: string
  saved: string
}



export const translations: Record<Language, TranslationStrings> = {
  en: {
    title: 'p2p-drop',
    tagline: 'Direct, serverless WebRTC file transfer between two browsers.',
    status: 'Status:',
    statusIdle: 'idle',
    statusCreating: 'creating',
    statusWaiting: 'waiting',
    statusConnecting: 'connecting',
    statusConnected: 'connected',
    statusFailed: 'failed',
    statusClosed: 'closed',
    resetOrDisconnect: 'Reset / Disconnect',
    createConnection: 'Create connection',
    createConnectionDesc: 'Start a room to send or receive',
    joinConnection: 'Join connection',
    joinConnectionDesc: 'Join with an offer code',
    offerCodeLabel: '1. Your Offer Code (send this to the peer)',
    generatingOffer: 'Generating offer...',
    copy: 'Copy',
    copied: 'Copied!',
    pasteAnswerLabel: '2. Paste Answer Code from peer',
    pasteAnswerPlaceholder: 'Paste the answer code here...',
    connect: 'Connect',
    connecting: 'Connecting...',
    pasteOfferLabel: '1. Paste Offer Code from peer',
    pasteOfferPlaceholder: 'Paste offer code here...',
    generateAnswer: 'Generate Answer Code',
    generatingAnswer: 'Generating answer...',
    answerCodeLabel: '2. Your Answer Code (send this back to creator)',
    waitingForCreator: 'Waiting for creator to accept answer...',
    p2pFileTransfer: 'P2P File Transfer',
    dropFilesPrompt: 'Drag & drop files here, or',
    browse: 'browse',
    dropFilesSubtext: 'Any file size • Transferred directly peer-to-peer',
    transfers: 'Transfers',
    send: 'SEND',
    recv: 'RECV',
    queued: 'Queued...',
    completed: '✓ Completed',
    cancelled: 'Cancelled',
    failed: '✕ Failed',
    cancel: 'Cancel',
    download: 'Download',
    left: 'left',
    languageToggle: 'فارسی',
    showQr: 'Show QR',
    hideQr: 'Hide QR',
    scanQr: 'Scan QR with Camera',
    cameraDenied: 'Camera access denied or unavailable. Please paste the code manually.',
    close: 'Close',
    connectionFailedExplanation:
      'Direct WebRTC connection could not be established. This usually happens when one or both devices are on restrictive enterprise/cellular networks or behind symmetric NATs that block direct peer-to-peer UDP connections.',
    transferInProgressWarning:
      'A file transfer is currently in progress. Leaving this page will cancel the transfer.',
    settings: 'Network Settings',
    iceSettings: 'WebRTC & Relay Settings',
    iceSettingsDesc:
      'Configure STUN and TURN servers to help connect through cellular firewalls (MCI/Irancell), symmetric NAT, and VPNs.',
    turnRelay: 'Enable TURN Relay',
    turnRelayDesc:
      'Uses encrypted relay servers (OpenRelay) if direct P2P connection fails due to symmetric NAT or VPN.',
    activeIceServers: 'Active STUN/TURN Servers',
    customIceServers: 'Custom ICE Servers (JSON)',
    customIceServersDesc: 'Supply your own custom RTCIceServer list.',
    resetDefaults: 'Reset to Defaults',
    save: 'Save',
    saved: 'Saved!',
  },
  fa: {
    title: 'پی‌توپی دراپ',
    tagline: 'انتقال مستقیم و بدون سرور فایل بین دو مرورگر با وب‌آرتی‌سی',
    status: 'وضعیت:',
    statusIdle: 'آماده',
    statusCreating: 'در حال ایجاد',
    statusWaiting: 'در انتظار پاسخ',
    statusConnecting: 'در حال اتصال',
    statusConnected: 'متصل شد',
    statusFailed: 'ناموفق',
    statusClosed: 'بسته شد',
    resetOrDisconnect: 'قطع ارتباط / شروع مجدد',
    createConnection: 'ایجاد اتصال',
    createConnectionDesc: 'شروع برای ارسال یا دریافت فایل',
    joinConnection: 'پیوستن به اتصال',
    joinConnectionDesc: 'اتصال با کد دریافت شده',
    offerCodeLabel: '۱. کد پیشنهاد شما (این کد را برای دستگاه مقابل بفرستید)',
    generatingOffer: 'در حال تولید کد پیشنهاد...',
    copy: 'کپی',
    copied: 'کپی شد!',
    pasteAnswerLabel: '۲. کد پاسخ دستگاه مقابل را جای‌گذاری کنید',
    pasteAnswerPlaceholder: 'کد پاسخ را اینجا قرار دهید...',
    connect: 'برقراری اتصال',
    connecting: 'در حال اتصال...',
    pasteOfferLabel: '۱. کد پیشنهاد دستگاه اول را جای‌گذاری کنید',
    pasteOfferPlaceholder: 'کد پیشنهاد را اینجا قرار دهید...',
    generateAnswer: 'تولید کد پاسخ',
    generatingAnswer: 'در حال تولید کد پاسخ...',
    answerCodeLabel: '۲. کد پاسخ شما (این را برای دستگاه اول بفرستید)',
    waitingForCreator: 'در انتظار تأیید توسط دستگاه اول...',
    p2pFileTransfer: 'انتقال مستقیم فایل',
    dropFilesPrompt: 'فایل‌ها را اینجا بکشید و رها کنید، یا',
    browse: 'انتخاب کنید',
    dropFilesSubtext: 'بدون محدودیت حجم • انتقال مستقیم و امن',
    transfers: 'انتقال‌ها',
    send: 'ارسال',
    recv: 'دریافت',
    queued: 'در صف...',
    completed: '✓ تکمیل شد',
    cancelled: 'لغو شد',
    failed: '✕ خطا',
    cancel: 'لغو',
    download: 'دانلود',
    left: 'باقی‌مانده',
    languageToggle: 'English',
    showQr: 'نمایش بارکد QR',
    hideQr: 'بستن بارکد QR',
    scanQr: 'اسکن بارکد با دوربین',
    cameraDenied: 'دسترسی به دوربین رد شد یا در دسترس نیست. لطفاً کد را دستی وارد کنید.',
    close: 'بستن',
    connectionFailedExplanation:
      'برقراری ارتباط مستقیم نظیربه‌نظیر ناموفق بود. بررسی کنید که گزینه رله TURN در تنظیمات فعال باشد، یا بدون فیلترشکن روی یک وای‌فای مشترک تست کنید.',
    transferInProgressWarning:
      'انتقال فایل در حال انجام است. خروج از این صفحه موجب لغو انتقال خواهد شد.',
    settings: 'تنظیمات شبکه',
    iceSettings: 'تنظیمات وب‌آرتی‌سی و رله',
    iceSettingsDesc:
      'پیکربندی سرورهای STUN و TURN برای اتصال پایدار از طریق فایروال، اینترنت همراه (همراه اول/ایرانسل) و وی‌پی‌ان.',
    turnRelay: 'فعال‌سازی رله TURN',
    turnRelayDesc:
      'در صورت مسدود بودن اتصال مستقیم به دلیل NAT متقارن یا وی‌پی‌ان، از سرورهای واسط امن (OpenRelay) استفاده می‌شود.',
    activeIceServers: 'سرورهای فعال STUN و TURN',
    customIceServers: 'سرورهای سفارشی (JSON)',
    customIceServersDesc: 'امکان تعریف سرورهای اختصاصی RTCIceServer.',
    resetDefaults: 'بازنشانی به پیش‌فرض',
    save: 'ذخیره',
    saved: 'ذخیره شد!',
  },
}

export interface I18nContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: keyof TranslationStrings) => string
  dir: 'ltr' | 'rtl'
}

export const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en')
  const dir = lang === 'fa' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.dir = dir
    document.documentElement.lang = lang
  }, [dir, lang])

  const t = (key: keyof TranslationStrings): string => {
    return translations[lang][key] || translations.en[key] || key
  }

  return React.createElement(
    I18nContext.Provider,
    { value: { lang, setLang, t, dir } },
    children,
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

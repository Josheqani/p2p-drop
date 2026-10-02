import React, { createContext, useContext, useMemo } from 'react'

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
  tabQuickCode: string
  tabManualQr: string
  roomCode: string
  roomCodeDesc: string
  waitingForJoiner: string
  enterRoomCode: string
  enterRoomCodePlaceholder: string
  requestToConnect: string
  requestSentWaiting: string
  incomingRequestTitle: string
  incomingRequestDesc: string
  device: string
  operatingSystem: string
  browser: string
  screen: string
  acceptConnection: string
  declineConnection: string
  connectionDeclined: string
}

export const translations: TranslationStrings = {
  title: 'p2p-drop',
  tagline: 'Direct, serverless WebRTC file transfer between two browsers.',
  status: 'Status:',
  statusIdle: 'Idle',
  statusCreating: 'Creating…',
  statusWaiting: 'Waiting…',
  statusConnecting: 'Connecting…',
  statusConnected: 'Connected',
  statusFailed: 'Failed',
  statusClosed: 'Closed',
  resetOrDisconnect: 'Disconnect',
  createConnection: 'Create Room',
  createConnectionDesc: 'Generate a code to send or receive files',
  joinConnection: 'Join Room',
  joinConnectionDesc: 'Connect with an existing code',
  offerCodeLabel: '1. Your Offer Code (send to peer)',
  generatingOffer: 'Generating offer…',
  copy: 'Copy',
  copied: 'Copied',
  pasteAnswerLabel: '2. Paste Answer Code from peer',
  pasteAnswerPlaceholder: 'Paste the answer code here…',
  connect: 'Connect',
  connecting: 'Connecting…',
  pasteOfferLabel: '1. Paste Offer Code from peer',
  pasteOfferPlaceholder: 'Paste offer code here…',
  generateAnswer: 'Generate Answer Code',
  generatingAnswer: 'Generating answer…',
  answerCodeLabel: '2. Your Answer Code (send to creator)',
  waitingForCreator: 'Waiting for creator to accept answer…',
  p2pFileTransfer: 'AirDrop P2P Transfer',
  dropFilesPrompt: 'Drop files to send, or',
  browse: 'choose files',
  dropFilesSubtext: 'Unlimited file size • End-to-end encrypted peer-to-peer',
  transfers: 'Transfers',
  send: 'SEND',
  recv: 'RECV',
  queued: 'Queued…',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
  cancel: 'Cancel',
  download: 'Download',
  left: 'left',
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
    'Configure STUN and TURN servers to help connect through cellular firewalls, symmetric NAT, and VPNs.',
  turnRelay: 'TURN Relay',
  turnRelayDesc:
    'Uses encrypted relay servers if direct P2P connection fails due to symmetric NAT or VPN.',
  activeIceServers: 'Active STUN/TURN Servers',
  customIceServers: 'Custom ICE Servers (JSON)',
  customIceServersDesc: 'Supply your own custom RTCIceServer list.',
  resetDefaults: 'Reset to Defaults',
  save: 'Save',
  saved: 'Saved',
  tabQuickCode: 'Quick Code',
  tabManualQr: 'Manual & QR',
  roomCode: 'Room Code',
  roomCodeDesc: 'Share this 6-digit code with the other device to connect directly.',
  waitingForJoiner: 'Waiting for peer to enter room code…',
  enterRoomCode: 'Enter 6-Digit Room Code',
  enterRoomCodePlaceholder: '123 456',
  requestToConnect: 'Request Connection',
  requestSentWaiting: 'Request sent! Waiting for approval…',
  incomingRequestTitle: 'Connection Request',
  incomingRequestDesc: 'A nearby device is requesting to connect and transfer files:',
  device: 'Device',
  operatingSystem: 'OS',
  browser: 'Browser',
  screen: 'Display',
  acceptConnection: 'Accept',
  declineConnection: 'Decline',
  connectionDeclined: 'Connection request was declined by the host.',
}

export interface I18nContextType {
  t: (key: keyof TranslationStrings) => string
  strings: TranslationStrings
}

export const I18nContext = createContext<I18nContextType>({
  t: (key: keyof TranslationStrings) => translations[key] ?? key,
  strings: translations,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(
    () => ({
      t: (key: keyof TranslationStrings): string => translations[key] ?? key,
      strings: translations,
    }),
    [],
  )

  return React.createElement(I18nContext.Provider, { value }, children)
}

export function useI18n() {
  const context = useContext(I18nContext)
  return context ?? {
    t: (key: keyof TranslationStrings): string => translations[key] ?? key,
    strings: translations,
  }
}

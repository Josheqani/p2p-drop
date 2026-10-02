# p2p-drop

[![CI](https://github.com/Josheqani/p2p-drop/actions/workflows/ci.yml/badge.svg)](https://github.com/Josheqani/p2p-drop/actions/workflows/ci.yml)
[![Live Site](https://img.shields.io/badge/Live_Site-workers.dev-emerald?style=flat&logo=cloudflare)](https://p2p-drop.josheqani-824.workers.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> 🛸 Send files directly browser-to-browser with WebRTC magic. No servers, no uploads, zero trust issues. 🪂⚡️

**p2p-drop** is a fast, serverless, peer-to-peer file transfer web application built around the **Apple Design System (Human Interface Guidelines / HIG)**. Transfer files of any size directly between devices with end-to-end encryption without ever uploading data to a third-party server.

---

## 🎨 Apple Design System (HIG)

p2p-drop is designed from the ground up to match the **Apple Design System** pixel-by-pixel, delivering a native iOS / macOS AirDrop experience in the browser:

- **Typography**: Native San Francisco typography (`SF Pro Display`, `SF Pro Text`, and `SF Mono`) with subpixel antialiasing and proportional letter tracking.
- **Materials & Vibrancy**: Translucent frosted glass layers with `backdrop-blur-2xl`, subtle hairline borders (`0.5px` Apple dividers), and ambient background vibrancy glows.
- **Continuous Squircles**: Smooth organic corner radii (`rounded-[28px]` window cards, `rounded-[20px]` action cards, and `rounded-[14px]` controls).
- **Native Micro-Interactions**:
  - **Segmented Control**: iOS-style tab switcher with smooth pill elevation and shadows.
  - **Side-by-Side Action Cards**: Balanced horizontal layout with icons positioned on the same line as the title and description for effortless comparison.
  - **Passcode & Room Display**: Large, spaced San Francisco Mono numerals inspired by iOS passcode and verification screens.
  - **Switch Toggles**: Authentic iOS green (`#34C759`) toggle switches with animated knobs.
  - **Portal-Based Action Sheets**: Modals and alert sheets rendered via React Portals directly to `document.body` with pinned headers, scrollable bodies, and fixed footers to prevent viewport clipping.
- **Adaptive Appearance**: First-class support for both Light and Dark appearances following Apple's semantic system colors.

---

## Features

- **100% Peer-to-Peer & Private**: Files are streamed directly over an encrypted WebRTC data channel (`RTCDataChannel`). Files never touch any server.
- **Dual Signaling Modes**:
  - **Quick Room Code**: Share a 6-digit PIN code with automatic WebSocket signaling and host device authorization approval.
  - **Offline Manual & QR**: Fully offline fallback using compressed base64 codes and multi-frame cycling animated QR codes.
- **Chunked Transfer with Backpressure**: Slices files into 16 KiB chunks, monitoring buffer thresholds (`bufferedAmount`) to prevent memory exhaustion even with massive multi-gigabyte files.
- **Sequential File Queue**: Queue multiple files at once, streamed one after another with live speed, progress percentage, and estimated time remaining.
- **Animated QR Signaling**: Automatically splits dense SDP codes into cycling multi-frame QR animations that smartphone cameras can read reliably.
- **Camera QR Scanner**: High-performance camera scanning using the native `BarcodeDetector` API when available, falling back seamlessly to `jsQR`.
- **Screen Wake Lock**: Automatically requests a screen `wakeLock` during active transfers to prevent mobile screens from sleeping mid-transfer.
- **Unload Protection**: Warns users via `beforeunload` if they attempt to navigate away while a transfer is in progress.
- **Centralized Typed i18n**: Strongly typed translation dictionary and `useI18n()` hook for easy copy management without hardcoded text.
- **Custom STUN/TURN Configuration**: Configurable network settings with built-in Cloudflare, Google, and OpenRelay STUN/TURN servers, plus custom JSON configuration for symmetric NAT and cellular firewall bypass.

---

## How It Works

p2p-drop establishes direct peer connections via WebRTC:

```
Device A (Host)                                Device B (Peer)
       |                                              |
       | <--- 1. Connect via 6-Digit Room / QR ------ |
       |                                              |
       | ---> 2. Host Approves Device Connection ---> |
       |                                              |
       |<============ Direct WebRTC P2P =============>|
       |              (16 KiB Chunks)                 |
```

1. **Room Signaling / Handshake**: Device A creates a room code or manual offer. Device B enters the room code or scans the QR code.
2. **Device Authorization**: When Device B requests to connect, Device A is presented with an Apple-style approval sheet showing the requesting device's model, OS, browser, and display specs.
3. **Data Channel Established**: Upon approval, both peers negotiate direct WebRTC connection via ICE/STUN/TURN.
4. **Chunked Streaming**: Files are sliced into 16 KiB chunks and streamed peer-to-peer with real-time backpressure control and end-to-end DTLS/SCTP encryption.

---

## Privacy & Security

**Your files never touch any server.**
- File content is transferred directly between browsers using WebRTC DTLS/SCTP encryption.
- The optional WebSocket signaling server only facilitates the initial SDP/ICE metadata handshake and ephemeral room coordination via Cloudflare Durable Objects. No file payloads ever pass through the signaling layer.

---

## Development & Testing

### Prerequisites
- [Bun](https://bun.sh/) (or Node.js 20+)

### Commands

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run type checking
bun run typecheck

# Run linter
bun run lint

# Run all unit and integration tests
bun run test

# Build for production
bun run build

# Preview production build locally
bun run preview
```

---

## Deployment to Cloudflare Workers

p2p-drop is deployed as a **Cloudflare Worker with Static Assets** and a **Durable Object** for real-time room signaling:

```bash
# Deploy to Cloudflare Worker
bun x wrangler deploy
```

---

## License

MIT License © 2026 Josheqani. See [LICENSE](LICENSE) for details.

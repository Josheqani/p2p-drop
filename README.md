# p2p-drop

[![CI](https://github.com/Josheqani/p2p-drop/actions/workflows/ci.yml/badge.svg)](https://github.com/Josheqani/p2p-drop/actions/workflows/ci.yml)
[![Live Site](https://img.shields.io/badge/Live_Site-p2p--drop.pages.dev-emerald?style=flat&logo=cloudflare)](https://p2p-drop.pages.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Send files between two devices directly from the browser using WebRTC. No server, no upload.

p2p-drop is a fast, completely server-less, browser-to-browser file transfer web application. Direct peer connections are formed via manual signaling (copy-pasting or animated QR codes), allowing users to send files of any size directly without ever uploading data to a third-party server.

---

## Demo & Screenshots

<!-- Demo GIF Placeholder -->
![p2p-drop Demo GIF](https://placehold.co/800x450/4f46e5/ffffff?text=Demo+GIF+Placeholder+-+Add+demo.gif+here)

<!-- Screenshot Placeholder -->
![p2p-drop UI Screenshot](https://placehold.co/800x450/1e293b/ffffff?text=App+Screenshot+-+Add+screenshot.png+here)

---

## Features

- **100% Serverless & Private**: Files are streamed directly over an encrypted WebRTC data channel (`RTCDataChannel`). Files never touch any server.
- **Chunked Transfer with Backpressure**: Slices files into 16 KiB chunks, automatically monitoring buffer thresholds (`bufferedAmount`) to prevent memory exhaustion or UI freezing even with massive files (500 MB+).
- **Sequential File Queue**: Queue multiple files at once, streamed one after another with live speed, progress percentage, and estimated time remaining.
- **Animated QR Signaling**: Automatically splits dense SDP codes (>300 chars) into multi-frame cycling QR animations that smartphone cameras can read reliably.
- **Camera QR Scanner**: Uses the high-performance native `BarcodeDetector` API when available, seamlessly falling back to `jsQR`.
- **Streaming to Disk & Blob Fallback**: Uses the native File System Access API (`showSaveFilePicker`) when supported to stream straight to disk, falling back gracefully to Blob downloads.
- **Screen Wake Lock**: Automatically requests a screen `wakeLock` during active transfers to prevent mobile screens from sleeping mid-stream.
- **Unload Protection**: Warns users (`beforeunload`) if they attempt to navigate away while a transfer is in flight.
- **Bilingual & RTL-Ready**: Full English and Persian (`فارسی`) internationalization with RTL (`dir="rtl"`) layout built entirely using logical CSS utilities.
- **Dark & Light Modes**: Clean, modern interface following the user's system preferences.

---

## How It Works

Traditional web apps require a signaling server (like WebSockets or Firebase) to negotiate peer-to-peer WebRTC connections. **p2p-drop eliminates the signaling server entirely** by allowing users to exchange the handshake manually:

```
Device A (Creator)                           Device B (Joiner)
       |                                             |
       |-- 1. Create Offer (SDP + ICE) ------------->| (via QR or Copy/Paste)
       |                                             |
       |<-- 2. Create Answer (SDP + ICE) ------------| (via QR or Copy/Paste)
       |                                             |
       |<============ Direct WebRTC P2P =============>|
       |              (16 KiB Chunks)                |
```

1. **Offer Generation**: Device A creates a data channel (`files`), generates a local WebRTC session description, gathers all ICE candidates (non-trickle), compresses the JSON using `CompressionStream('deflate-raw')`, and base64url-encodes it without padding.
2. **Handshake Exchange**: Device A presents the code as text and an animated cycling QR code. Device B scans or pastes the offer and generates a compressed answer code.
3. **Data Channel Established**: Device A accepts the answer. Both peers establish a direct, encrypted `RTCDataChannel`.
4. **Chunked Streaming**: Files are sliced into 16 KiB chunks and sent with real-time backpressure control.

---

## Limitations

- **Strict NATs & Corporate Firewalls**: Connections rely on STUN (`stun:stun.l.google.com:19302`). In strict symmetric NAT environments, mobile cellular carrier NATs, or restrictive corporate/campus firewalls that disallow direct peer-to-peer UDP hole punching, connections may fail without a TURN relay server.
- **Camera Requirements**: Browsers only grant camera access over secure contexts (`https://` or `localhost`). When hosted on HTTP, camera scanning is disabled by the browser, but copy/paste remains fully functional.

---

## Privacy Note

**Files never touch a server.**
- There is NO backend server, NO Cloudflare Worker, and NO Durable Object.
- The web app is served purely as a static website.
- Signaling is performed client-side, and all file content is encrypted end-to-end between the two devices via WebRTC DTLS/SCTP.

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

# Preview production build
bun run preview
```

---

## Deployment to Cloudflare Pages

This application is 100% static and ideally suited for Cloudflare Pages.

### Method 1: Git Integration (Recommended)
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Compute (Workers) > Workers & Pages > Create application > Pages > Connect to Git**.
3. Select your repository: `Josheqani/p2p-drop`.
4. Configure the build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build` (or `bun run build`)
   - **Build output directory**: `dist`
5. Click **Save and Deploy**. Cloudflare Pages will automatically deploy on every push to `main`.

### Method 2: Command Line (Wrangler)
```bash
# Deploy using the deploy script
bun run deploy
```

---

## License

MIT License © 2026 Josheqani. See [LICENSE](LICENSE) for details.

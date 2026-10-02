import { I18nProvider } from './lib/i18n'
import { Header, ConnectionPanel } from './components'

function MainContent() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#F2F2F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col items-center justify-center p-4 sm:p-6 transition-colors selection:bg-[#007AFF]/20 selection:text-[#007AFF]">
      {/* Apple Ambient Vibrancy Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#007AFF]/12 via-[#5856D6]/6 to-transparent blur-3xl rounded-full"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-1/4 w-[450px] h-[300px] bg-gradient-to-t from-[#34C759]/8 to-transparent blur-3xl rounded-full"
      />

      <div className="relative w-full max-w-[480px] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.04),0_16px_48px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.5)] border border-black/[0.06] dark:border-white/[0.12] p-6 sm:p-7 space-y-6">
        <Header />
        <ConnectionPanel />
      </div>

      <footer className="mt-5 text-center text-[12px] text-[#86868B] dark:text-[#98989D] tracking-tight">
        <span>Protected by WebRTC E2EE</span>
      </footer>
    </main>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <MainContent />
    </I18nProvider>
  )
}

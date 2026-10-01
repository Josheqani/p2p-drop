import { I18nProvider } from './lib/i18n'
import { Header, ConnectionPanel } from './components'

function MainContent() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 transition-colors">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
        <Header />
        <ConnectionPanel />
      </div>
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

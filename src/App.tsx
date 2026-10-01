import { ConnectionPanel } from './components/ConnectionPanel'

export default function App() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 text-start">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
        <header className="space-y-1">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="h-3 w-3 rounded-full bg-indigo-600 inline-block"></span>
            <h1 className="text-2xl font-bold tracking-tight">p2p-drop</h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Direct, serverless WebRTC file transfer between two browsers.
          </p>
        </header>

        <ConnectionPanel />
      </div>
    </main>
  )
}

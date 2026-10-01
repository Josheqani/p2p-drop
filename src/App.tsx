export default function App() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 text-start">
      <div className="w-full max-w-lg p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h1 className="text-3xl font-bold tracking-tight mb-2">p2p-drop</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Send files between two devices directly from the browser using WebRTC. No server, no upload.
        </p>
      </div>
    </main>
  )
}

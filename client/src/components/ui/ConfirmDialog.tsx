import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Drop-in replacement for window.confirm(). Usage:
//   const confirm = useConfirm()
//   if (await confirm('Delete this post?')) { ... }
//   if (await confirm({ title: 'Disconnect?', body: 'Sure?', destructive: true })) ...

interface ConfirmOptions {
  title?:        string
  body?:         string
  confirmLabel?: string
  cancelLabel?:  string
  destructive?:  boolean
}

type ConfirmFn = (opts: string | ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm() must be used inside <ConfirmProvider>')
  return ctx
}

interface PendingDialog {
  opts:    ConfirmOptions
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingDialog | null>(null)
  const confirmBtnRef         = useRef<HTMLButtonElement>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalised: ConfirmOptions = typeof opts === 'string' ? { body: opts } : opts
    return new Promise<boolean>((resolve) => setPending({ opts: normalised, resolve }))
  }, [])

  // Resolve + close. Wrapped so all close paths go through the same logic.
  const close = useCallback((result: boolean) => {
    if (!pending) return
    pending.resolve(result)
    setPending(null)
  }, [pending])

  // Focus the confirm button when the dialog opens; lock body scroll while open.
  useEffect(() => {
    if (!pending) return
    confirmBtnRef.current?.focus()
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = originalOverflow }
  }, [pending])

  // ESC = cancel, Enter = confirm
  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false) }
      if (e.key === 'Enter')  { e.preventDefault(); close(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, close])

  const o = pending?.opts
  const confirmLabel = o?.confirmLabel ?? (o?.destructive ? 'Delete' : 'Confirm')
  const cancelLabel  = o?.cancelLabel  ?? 'Cancel'

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-[fadeIn_120ms_ease-out]"
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h2 id="confirm-dialog-title" className="font-semibold text-gray-900 text-base">
                {o?.title ?? 'Are you sure?'}
              </h2>
              {o?.body && <p className="text-sm text-gray-600 leading-relaxed">{o.body}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={() => close(true)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  o?.destructive
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-300'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-300'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

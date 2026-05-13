import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

// Globally-bound keyboard shortcuts. Composer-local shortcuts (Tab to accept
// autocomplete, Escape to dismiss) stay in the Composer component because they
// need direct access to its local state.
export function useKeyboardShortcuts() {
  const navigate       = useNavigate()
  const resetComposer  = useAppStore((s) => s.resetComposer)
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const mod   = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return

      const target = e.target as HTMLElement | null
      const inTextField =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      const key = e.key.toLowerCase()

      // Ctrl+N — new post
      if (key === 'n' && !e.shiftKey && !inTextField) {
        e.preventDefault()
        resetComposer()
        navigate('/compose')
        return
      }

      // Ctrl+Shift+C — carousel builder
      if (key === 'c' && e.shiftKey) {
        e.preventDefault()
        navigate('/compose/carousel')
        return
      }

      // Ctrl+Shift+A — focus AI chat input (Composer right panel)
      if (key === 'a' && e.shiftKey) {
        const el = document.querySelector<HTMLInputElement>('[data-ai-input]')
        if (el) { e.preventDefault(); el.focus() }
        return
      }

      // Ctrl+Shift+D — toggle dark mode
      if (key === 'd' && e.shiftKey) {
        e.preventDefault()
        toggleDarkMode()
        return
      }

      // Ctrl+S / Ctrl+Enter — let the active page handle via data-* hooks
      if (key === 's' && !e.shiftKey) {
        const el = document.querySelector<HTMLButtonElement>('[data-shortcut="save"]')
        if (el) { e.preventDefault(); el.click() }
        return
      }
      if (key === 'enter') {
        const el = document.querySelector<HTMLButtonElement>('[data-shortcut="publish"]')
        if (el) { e.preventDefault(); el.click() }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, resetComposer, toggleDarkMode])
}

import { useEffect } from 'react'
import useAppStore from '../store/useAppStore'

const STORAGE_KEY = 'postly-dark-mode'

// Applies the .dark class to <html> and persists the choice.
// The initial value is read synchronously in the store, so no hydration effect
// or flash-of-wrong-theme is needed here.
export function useDarkMode() {
  const isDark = useAppStore((s) => s.darkMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem(STORAGE_KEY, String(isDark))
  }, [isDark])

  return isDark
}

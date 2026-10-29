import { useSyncExternalStore } from 'react'
const media = () => window.matchMedia('(max-width: 768px)')
const subscribe = (fn) => { const m = media(); m.addEventListener('change', fn); return () => m.removeEventListener('change', fn) }
export const useMobile = () => useSyncExternalStore(subscribe, () => media().matches, () => false)

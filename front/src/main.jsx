import { StrictMode } from 'react'
import { I18nProvider } from 'react-aria-components'
import { createRoot } from 'react-dom/client'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/pages.css'
import './styles/bold.css'
import './styles/round4.css'
import './styles/legal.css'
import './styles/mobile-navigation.css'
import './components/form/form.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider locale="pt-BR"><App /></I18nProvider>
  </StrictMode>,
)

// Nunca registra em dev: mantém o Vite/HMR livre do service worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* App segue online sem SW. */ })
  }, { once: true })
}

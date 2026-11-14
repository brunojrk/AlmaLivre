import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './estilo.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sem service worker o app só não abre offline */
    })
  })
}

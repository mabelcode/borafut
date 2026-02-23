import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

Sentry.init({
  dsn: 'https://095b9f7a92a1a1db4192c9952e5293ab0o4509777586159616.ingest.us.sentry.io/4510932517126144',
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
  ],
  // Tracing — 100% em dev, reduzir em produção se necessário
  tracesSampleRate: 1.0,
  tracePropagationTargets: ['localhost', /^https:\/\/.*\.supabase\.co/],
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Logs
  enableLogs: true,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


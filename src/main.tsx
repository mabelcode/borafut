import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

Sentry.init({
  dsn: 'https://095b9f7a92a1a1db4192c9952e5293ab@o4509777586159616.ingest.us.sentry.io/4510932517126144',
  environment: import.meta.env.DEV ? 'development' : 'production',
  sendDefaultPii: true,
  debug: true, // TODO: remover após confirmar que Sentry funciona
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
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

// ── Verificação temporária — remover após confirmar que Sentry recebe eventos ──
Sentry.logger.info('Sentry test log from borafut', { log_source: 'sentry_test' })
Sentry.captureMessage('Sentry connection test from borafut', { level: 'info' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

Sentry.init({
  dsn: 'https://095b9f7a92a1a1db4192c9952e5293ab@o4509777586159616.ingest.us.sentry.io/4510932517126144',
  environment: import.meta.env.DEV ? 'development' : 'production',
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
    Sentry.consoleLoggingIntegration({
      levels: (import.meta.env.VITE_SENTRY_CONSOLE_LEVELS || 'log,warn,error')
        .split(',')
        .map((l: string) => l.trim()),
    }),
  ],
  tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '1.0'),
  tracePropagationTargets: ['localhost', /^https:\/\/.*\.supabase\.co/],
  replaysSessionSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAY_SESSION_RATE || '0.1'),
  replaysOnErrorSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAY_ERROR_RATE || '1.0'),
  enableLogs: true,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

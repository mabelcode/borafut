import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
    cleanup()
})

// Global Mocks for Supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn(),
        auth: {
            getUser: vi.fn(),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
        }
    }
}))

// Global Mocks for Sentry
vi.mock('@sentry/react', () => ({
    captureException: vi.fn((err) => console.error("SENTRY CAUGHT ERROR:", err)),
    captureMessage: vi.fn(),
    logger: {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        fmt: (strings: TemplateStringsArray, ...values: unknown[]) =>
            strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), ''),
    },
}))

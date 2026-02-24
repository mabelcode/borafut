import * as Sentry from '@sentry/react'

type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

const LOG_LEVELS: Record<LogLevel, number> = {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
}

const CURRENT_LOG_LEVEL: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || (import.meta.env.DEV ? 'DEBUG' : 'INFO')

class Logger {
    private name: string

    constructor(name: string) {
        this.name = name
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL]
    }

    private formatMessage(level: LogLevel, message: string): string {
        const timestamp = new Date().toISOString()
        return `[${timestamp}] [${level}] [${this.name}]: ${message}`
    }

    trace(message: string, ...args: unknown[]) {
        if (this.shouldLog('TRACE')) {
            console.log(this.formatMessage('TRACE', message), ...args)
        }
    }

    debug(message: string, ...args: unknown[]) {
        if (this.shouldLog('DEBUG')) {
            console.debug(this.formatMessage('DEBUG', message), ...args)
        }
    }

    info(message: string, ...args: unknown[]) {
        if (this.shouldLog('INFO')) {
            console.info(this.formatMessage('INFO', message), ...args)
        }
    }

    warn(message: string, ...args: unknown[]) {
        if (this.shouldLog('WARN')) {
            console.warn(this.formatMessage('WARN', message), ...args)
            Sentry.captureMessage(message, {
                level: 'warning',
                extra: { context: this.name, args },
            })
        }
    }

    error(message: string, error?: unknown, ...args: unknown[]) {
        if (this.shouldLog('ERROR')) {
            console.error(this.formatMessage('ERROR', message), error, ...args)
            Sentry.captureException(error || new Error(message), {
                extra: { context: this.name, message, args },
            })
        }
    }
}

export const createLogger = (name: string) => new Logger(name)
export const logger = createLogger('App')

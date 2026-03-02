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
            Sentry.logger.debug(message, { context: this.name })
        }
    }

    info(message: string, ...args: unknown[]) {
        if (this.shouldLog('INFO')) {
            console.info(this.formatMessage('INFO', message), ...args)
            Sentry.logger.info(message, { context: this.name })
        }
    }

    warn(message: string, ...args: unknown[]) {
        if (this.shouldLog('WARN')) {
            console.warn(this.formatMessage('WARN', message), ...args)
            Sentry.logger.warn(message, { context: this.name })
            Sentry.captureMessage(message, {
                level: 'warning',
                extra: { context: this.name, args },
            })
        }
    }

    error(message: string, error?: unknown, ...args: unknown[]) {
        if (this.shouldLog('ERROR')) {
            console.error(this.formatMessage('ERROR', message), error, ...args)
            Sentry.logger.error(message, { context: this.name, error: String(error) })

            let exceptionToCapture: Error;

            if (error instanceof Error) {
                exceptionToCapture = error;
            } else if (error && typeof error === 'object') {
                // Parse Supabase PostgrestError or other plain objects
                const msg = (error as any).message || message;
                exceptionToCapture = new Error(String(msg));
                exceptionToCapture.name = (error as any).name || 'ObjectException';
            } else if (error !== undefined && error !== null) {
                exceptionToCapture = new Error(String(error));
            } else {
                exceptionToCapture = new Error(message);
            }

            Sentry.captureException(exceptionToCapture, {
                extra: {
                    context: this.name,
                    originalMessage: message,
                    args,
                    rawError: error
                },
            })
        }
    }
}

export const createLogger = (name: string) => new Logger(name)
export const logger = createLogger('App')

/* eslint-disable no-console */
/**
 * Simple Logger Utility
 *
 * A lightweight logger for development and production use.
 * Can be extended to use more sophisticated logging libraries like Winston or
 * Pino.
 */
export class Logger {
  private readonly context: string;
  private readonly isDevelopment = process.env.NODE_ENV !== 'production';

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log info level message
   */
  info(message: string, ...args: unknown[]): void {
    console.log(`[${this.getTimestamp()}] [INFO] [${this.context}] ${message}`, ...args);
  }

  /**
   * Log warning level message
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.getTimestamp()}] [WARN] [${this.context}] ${message}`, ...args);
  }

  /**
   * Log error level message
   */
  error(message: string, error?: unknown, ...args: unknown[]): void {
    console.error(`[${this.getTimestamp()}] [ERROR] [${this.context}] ${message}`, error, ...args);

    // In development, also log stack trace
    if (this.isDevelopment && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }

  /**
   * Log debug level message (only in development)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(`[${this.getTimestamp()}] [DEBUG] [${this.context}] ${message}`, ...args);
    }
  }

  /**
   * Log verbose level message (only in development with VERBOSE=true)
   */
  verbose(message: string, ...args: unknown[]): void {
    if (this.isDevelopment && process.env.VERBOSE === 'true') {
      console.log(`[${this.getTimestamp()}] [VERBOSE] [${this.context}] ${message}`, ...args);
    }
  }

  /**
   * Get formatted timestamp
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }
}

/**
 * Create a logger instance for a specific context
 */
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

// Export default logger for general use
export default Logger;
/* eslint-enable no-console */

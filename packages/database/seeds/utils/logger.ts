/**
 * Seeding logger utility
 */

import { getEnvironment } from './environment';

class SeedLogger {
  private prefix = '🌱 SEED';
  private environment = getEnvironment();

  info(message: string, ...args: unknown[]): void {
    console.log(`${this.prefix} [${this.environment.toUpperCase()}] ${message}`, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    console.log(`✅ [${this.environment.toUpperCase()}] ${message}`, ...args);
  }

  warning(message: string, ...args: unknown[]): void {
    console.warn(`⚠️  [${this.environment.toUpperCase()}] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`❌ [${this.environment.toUpperCase()}] ${message}`, ...args);
  }

  start(modelName: string): void {
    this.info(`Starting ${modelName} seeding...`);
  }

  complete(modelName: string, count?: number): void {
    const countText = count ? ` (${count} records)` : '';
    this.success(`${modelName} seeding completed${countText}`);
  }

  skip(modelName: string, reason: string): void {
    this.warning(`Skipping ${modelName} seeding: ${reason}`);
  }
}

export const logger = new SeedLogger();

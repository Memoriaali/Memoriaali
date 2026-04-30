/**
 * Health check endpoint for Docker containers and monitoring
 */

import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'memoriaali-frontend',
    version: process.env.npm_package_version ?? '1.0.0',
  });
}

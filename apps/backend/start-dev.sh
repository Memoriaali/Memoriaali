#!/bin/bash

# start-dev.sh - Start backend development server with environment variables

echo "🚀 Starting Memoriaali Backend Development Server..."
echo "=================================================="

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Backend directory: $SCRIPT_DIR"

# Load environment variables from root .env file
if [[ -f "$PROJECT_ROOT/.env" ]]; then
    echo "🔧 Loading environment variables from $PROJECT_ROOT/.env"
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | grep -v '^$' | xargs)
    
    # Verify key environment variables
    echo "✅ Environment variables loaded:"
    echo "   NODE_ENV: ${NODE_ENV:-'NOT SET'}"
    echo "   DATABASE_URL: ${DATABASE_URL:+'SET'}"
    echo "   JWT_SECRET: ${JWT_SECRET:+'SET'}"
    echo "   DATABASE_ENCRYPTION_KEY: ${DATABASE_ENCRYPTION_KEY:+'SET'}"
else
    echo "❌ Root .env file not found at $PROJECT_ROOT/.env"
    exit 1
fi

# Change to backend directory
cd "$SCRIPT_DIR"

# Validate environment
echo ""
echo "🔍 Validating environment..."
if bash scripts/validate-env.sh; then
    echo "✅ Environment validation passed"
else
    echo "❌ Environment validation failed"
    exit 1
fi

echo ""
echo "🚀 Starting development server..."
echo "📊 Health check will be available at: http://localhost:${PORT:-3001}/api/v2/health"
echo "📚 API docs will be available at: http://localhost:${PORT:-3001}/api/v2/docs"
echo ""

# Start the development server using tsx for better ES module support
echo "🔧 Using tsx for better ES module resolution..."
exec pnpm dev

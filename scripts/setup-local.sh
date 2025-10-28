#!/bin/bash

# Setup script for local development without Cloudflare

set -e

echo "🚀 Setting up President for local development..."
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Install it with: npm install -g pnpm"
    exit 1
fi

echo "✓ pnpm is installed"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
cd ..
pnpm install

# Install scripts dependencies
echo "📦 Installing local server dependencies..."
cd scripts
pnpm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start local development:"
echo ""
echo "  Terminal 1: pnpm run dev:local"
echo "  Terminal 2: pnpm run dev:frontend"
echo ""
echo "Then open: http://localhost:5173"
echo ""
echo "See DEV_LOCAL.md for more information."
echo ""

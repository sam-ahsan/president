#!/bin/bash
# Cleanup script for President dev environment

echo "🧹 Cleaning up dev environment..."

# Kill all workerd processes (Cloudflare workers)
pkill -9 workerd 2>/dev/null

# Kill pnpm dev and concurrently
pkill -f "pnpm dev" 2>/dev/null
pkill -f "concurrently" 2>/dev/null

# Kill processes on dev ports
lsof -ti:8787 -ti:8788 -ti:5173 -ti:5174 -ti:5175 -ti:5176 | xargs kill -9 2>/dev/null

sleep 1

echo "✅ Cleanup complete!"
echo ""
echo "Now you can safely run: pnpm dev"

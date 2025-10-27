#!/bin/bash

# Startup script for President card game development

echo "🎮 Starting President Card Game Dev Environment"
echo "=========================================="
echo ""

# Cleanup first
echo "🧹 Cleaning up old processes..."
./cleanup.sh

# Wait for cleanup
sleep 2

# Start servers
echo ""
echo "🚀 Starting servers..."
echo ""
pnpm dev


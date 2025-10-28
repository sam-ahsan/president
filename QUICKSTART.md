# Quick Start Guide

Get President running in under 5 minutes!

## Prerequisites

- Node.js 18+ installed
- pnpm installed: `npm install -g pnpm`

## 🚀 Fastest Start: Local Development

Run locally without Cloudflare account setup:

```bash
# 1. Install dependencies
pnpm install
cd scripts && pnpm install && cd ..

# 2. Start local API server (Terminal 1)
pnpm run dev:local

# 3. Start frontend (Terminal 2)
pnpm run dev:frontend

# 4. Open browser: http://localhost:5173
```

**That's it!** No Cloudflare account needed. See below for production deployment.

## 📋 Development Options

### Option 1: Simple Local Server (Recommended for getting started)
```bash
pnpm run dev:local        # Terminal 1 - Pure Node.js server
pnpm run dev:frontend     # Terminal 2 - React frontend
```

✅ Fastest startup, no dependencies, in-memory database  
✅ Perfect for UI development and testing  

### Option 2: Wrangler Local (More production-like)
```bash
npm install -g wrangler   # One-time setup
pnpm run dev:api          # Terminal 1 - Uses local D1 emulator
pnpm run dev:realtime     # Terminal 2 - Real-time worker
pnpm run dev:frontend     # Terminal 3 - React frontend
```

✅ Uses actual Worker runtime locally  
✅ Closest to production environment  
✅ No Cloudflare account needed  

### Option 3: Cloudflare (Production deployment)
Requires Cloudflare account setup (see [README.md](README.md) for details).

## 🔧 Troubleshooting

**"Cannot connect to server"**
```bash
# Check if server is running on port 8787
curl http://localhost:8787/health
```

**"Module not found"**
```bash
cd scripts && pnpm install
```

**"Port already in use"**
```bash
# Kill process on port 8787
lsof -ti:8787 | xargs kill
```

**Environment variables**
Create `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:8787
VITE_REALTIME_URL=ws://localhost:8787
```

## 📚 Next Steps

- **For full Cloudflare setup**: See [README.md](README.md)
- **For detailed local dev**: See [DEV_LOCAL.md](DEV_LOCAL.md)  
- **For deployment**: See [README.md#deployment](README.md#deployment)

Happy gaming! 🎮

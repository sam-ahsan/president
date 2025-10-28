# President - Local Development Guide

> **Quick Start**: See [QUICKSTART.md](QUICKSTART.md) for the fastest way to get running.

This guide covers local development options for President in detail, focusing on differences between development modes and advanced scenarios.

## 🚀 Getting Started

See [QUICKSTART.md](QUICKSTART.md) for installation and basic usage. This guide covers:
- Development mode differences
- Advanced configuration  
- Troubleshooting
- When to use each mode

## 🔄 Development Modes

### Option 1: Simple Local Server (Easiest)
```bash
pnpm run dev:local        # Terminal 1 - In-memory Node.js server
pnpm run dev:frontend     # Terminal 2 - React frontend
```

**Best for:** Quick testing, UI development, learning  
**Database:** In-memory (data clears on restart)  
**Pros:** Fastest startup, no dependencies, no compilation needed  
**Cons:** Simplified implementation, data not persisted  

### Option 2: Wrangler Local (Production-like)
```bash
pnpm run dev:api          # Terminal 1 - Local D1 + KV emulators
pnpm run dev:realtime     # Terminal 2 - WebSocket worker  
pnpm run dev:frontend     # Terminal 3 - React frontend
```

**Best for:** Testing worker code, realistic environment  
**Requires:** `npm install -g wrangler` (one-time setup)  
**Pros:** Uses actual Worker runtime, file-based persistence  
**Cons:** Requires Wrangler CLI  

## 🎮 Access Points

Once running, access:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:8787  
- **Health Check**: http://localhost:8787/health

## ⚙️ Environment Configuration

Create `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:8787
VITE_REALTIME_URL=ws://localhost:8787
```

This tells the frontend where to connect.

## 🧪 Testing

Test that everything works:

```bash
# Health check
curl http://localhost:8787/health

# Guest authentication  
curl -X POST http://localhost:8787/api/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"username":"TestUser"}'

# List rooms
curl http://localhost:8787/api/rooms
```

## 📊 Feature Comparison

| Feature | Simple Local | Wrangler Local | Cloudflare Production |
|---------|--------------|---------------|---------------------|
| **Database** | In-memory | D1 emulator (file) | D1 (edge) |
| **KV Store** | In-memory | KV emulator (file) | KV (edge) |
| **WebSocket** | Native Node.js | Workers-native | Workers-native |
| **Auth** | Mock JWT | Mock JWT | Real JWT |
| **Startup** | Instant | Fast | N/A (deployed) |
| **Account** | ❌ None | ❌ None | ✅ Required |
| **Data** | Clears on restart | Persists locally | Cloud-backed |

## 🐛 Troubleshooting

### Port Already in Use
```bash
lsof -ti:8787 | xargs kill
```

### Module Not Found
```bash
cd scripts && pnpm install && cd ..
```

### Cannot Connect to Server
- Check server is running: `curl http://localhost:8787/health`
- Check `frontend/.env.local` has correct URLs
- Check for firewall blocking port 8787

### WebSocket Connection Fails
- Ensure `VITE_REALTIME_URL` uses `ws://` not `http://`
- Check server logs for errors
- Try opening WebSocket URL directly in browser

## 🎯 Choosing the Right Mode

**Use Simple Local (`pnpm run dev:local`)** when:
- Building UI components
- Testing frontend features
- Learning the codebase
- Quick prototyping
- Offline development

**Use Wrangler Local** when:
- Testing Worker code
- Debugging backend logic
- Testing with realistic stack
- Preparing for deployment

**Use Cloudflare** when:
- Testing production environment
- Final testing before release
- Debugging edge issues
- Load testing

## 🧹 Cleanup

**Simple Local:** No cleanup needed (in-memory)

**Wrangler Local:**
```bash
# Clean local files
rm -rf .wrangler
```

**Complete Reset:**
```bash
rm -rf node_modules frontend/node_modules .wrangler
pnpm install
cd frontend && pnpm install && cd ..
```

## 🚀 Production Deployment

When ready to deploy to Cloudflare:

1. **Setup Cloudflare account** - See [README.md](README.md)
2. **Create resources** - D1, KV, Workers
3. **Deploy workers** - `pnpm run deploy`
4. **Deploy frontend** - Cloudflare Pages
5. **Update environment variables** - In Pages dashboard

See [README.md](README.md) for detailed deployment instructions.

---

**Quick Links:**
- [Getting Started](QUICKSTART.md) - Quick start guide
- [Full Documentation](README.md) - Complete setup and deployment  
- [Architecture](ARCHITECTURE.md) - System design details
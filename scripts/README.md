# President - Local Development Server

This directory contains a standalone local development server that doesn't require Cloudflare.

## Setup

```bash
cd scripts
pnpm install
```

This will install:
- `better-sqlite3` - SQLite database
- `ws` - WebSocket server

## Running

```bash
# From project root
pnpm run dev:local
```

## How It Works

The `dev-local.js` script:

1. **Creates a local SQLite database** (`local.db`) with the same schema as D1
2. **Runs an HTTP server** on port 8787 that handles API requests
3. **Provides WebSocket support** for real-time game communication
4. **Uses in-memory KV store** for sessions

This allows you to:
- Test the frontend without Cloudflare
- Develop locally without internet
- No account setup required
- Instant startup

## Differences from Cloudflare Workers

| Feature | Local Server | Cloudflare Workers |
|---------|-------------|-------------------|
| Database | SQLite file | D1 (edge) |
| KV Store | In-memory | KV (edge) |
| WebSocket | Native Node.js | Workers-native |
| API | HTTP server | Edge functions |
| Persistence | Local file | Cloud-backed |

## Cleanup

```bash
# From project root
pnpm run clean:local
```

This removes `local.db` and related files.

## Advantages

✅ No Cloudflare account needed  
✅ Faster startup  
✅ Full offline support  
✅ Easy debugging  
✅ No deployment needed  

## When to Use

- **Quick testing**: Test UI changes fast
- **Offline development**: Work without internet
- **Learning**: Understand the architecture
- **Prototyping**: Try new features quickly

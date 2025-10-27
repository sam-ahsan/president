# Getting Started with President Card Game

## 🚀 Quick Start (Without Cloudflare)

The fastest way to get started is to run everything locally without Cloudflare setup.

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build Shared Package

```bash
cd packages/shared && pnpm build && cd ../..
```

### 3. Start the Development Servers

```bash
pnpm dev
```

This starts all three services:
- **Frontend**: http://localhost:5173 ✅
- **API Worker**: http://localhost:8787
- **Realtime Worker**: http://localhost:8788

### 4. Open the Game

Open http://localhost:5173 in your browser.

### 5. Play!

1. Enter a name and click "Play as Guest"
2. Click "Create Room" 
3. Copy the room code
4. Open another browser window (or incognito) and join with the code
5. Click "Ready to Play" in both windows
6. Once all players are ready, the game starts automatically!

---

## 🎮 How to Start and Stop Servers

### Starting

```bash
pnpm dev
```

This runs all three servers in the background. You'll see output from:
- `[0]` - API Worker
- `[1]` - Realtime Worker  
- `[2]` - Frontend (Vite)

### Stopping

**Press `Ctrl + C`** in the terminal where you ran `pnpm dev`

All servers will stop gracefully.

### Restarting

After making code changes:

1. **Stop**: Press `Ctrl + C`
2. **Start**: Run `pnpm dev` again

### Individual Services

Start only what you need:

```bash
# Just frontend
cd web && pnpm dev

# Just API
cd apps/api && pnpm dev

# Just realtime
cd apps/realtime && pnpm dev
```

---

## ☁️ Full Setup with Cloudflare (For Production)

If you want persistent data, leaderboards, and production deployment, you'll need Cloudflare.

### Prerequisites

1. **Cloudflare Account** (free): https://dash.cloudflare.com/sign-up
2. **API Token**: https://dash.cloudflare.com/profile/api-tokens

### Step 1: Create API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template
4. Add permissions for:
   - Cloudflare Workers: Edit
   - D1: Edit  
   - KV: Edit
5. Copy the token

### Step 2: Set Environment Variable

```bash
# Temporary (current session only)
export CLOUDFLARE_API_TOKEN="your-token-here"

# Permanent (add to ~/.bashrc or ~/.zshrc)
echo 'export CLOUDFLARE_API_TOKEN="your-token-here"' >> ~/.bashrc
source ~/.bashrc
```

### Step 3: Create D1 Database

```bash
pnpm exec wrangler d1 create president-db
```

Output will look like:
```
✅ Successfully created the DB 'president-db'!

[[d1_databases]]
binding = "DB"
database_name = "president-db"
database_id = "abc123xyz"  # ← Copy this ID
```

### Step 4: Update Database IDs

Edit these files and replace `your-database-id-here` with the actual ID:

- `wrangler.toml`
- `apps/api/wrangler.toml`
- `apps/realtime/wrangler.toml`

### Step 5: Create KV Namespaces

```bash
# Production
pnpm exec wrangler kv namespace create "LOBBY_KV"
pnpm exec wrangler kv namespace create "PRESENCE_KV"

# Preview (for local dev)
pnpm exec wrangler kv namespace create "LOBBY_KV" --preview
pnpm exec wrangler kv namespace create "PRESENCE_KV" --preview
```

Copy the `id` values and update in all `wrangler.toml` files.

### Step 6: Run Database Migrations

```bash
# Local development
pnpm exec wrangler d1 migrations apply president-db --local

# Production
pnpm exec wrangler d1 migrations apply president-db --remote
```

### Step 7: Generate JWT Secret

```bash
openssl rand -base64 32
```

Update `JWT_SECRET` in all `wrangler.toml` files.

### Step 8: Deploy to Cloudflare

```bash
# Deploy API worker
cd apps/api
pnpm exec wrangler deploy

# Deploy Realtime worker
cd ../realtime  
pnpm exec wrangler deploy

# Deploy frontend
cd ../web
pnpm build
pnpm exec wrangler pages deploy dist
```

---

## 🛠️ Development Workflow

### Daily Development

```bash
# 1. Start servers
pnpm dev

# 2. Make changes to code
# 3. Hot reload happens automatically

# 4. Stop when done
Ctrl + C
```

### Building for Production

```bash
pnpm build
```

This compiles:
- `packages/shared` → TypeScript to JavaScript
- `apps/api` → Worker bundle
- `apps/realtime` → Worker bundle  
- `web` → Optimized production build

### Type Checking

```bash
pnpm type-check
```

Validates TypeScript across all packages.

---

## 🐛 Troubleshooting

### Quick Fix for Most Issues

```bash
# 1. Kill any processes using the ports
lsof -ti:8787 -ti:8788 -ti:5173 -ti:5174 -ti:5175 | xargs kill -9 2>/dev/null

# 2. Kill pnpm/concurrently processes
pkill -f "pnpm dev"
pkill -f "concurrently"

# 3. Build the shared package
cd packages/shared && pnpm build && cd ../..

# 4. Start fresh
pnpm dev
```

---

### ❌ Error: "Address already in use" (Port conflicts)

**Problem**: A previous instance is still running on the port.

**Solution**:
```bash
# Kill specific port
lsof -ti:8788 | xargs kill -9

# Or kill all dev ports at once
lsof -ti:8787 -ti:8788 -ti:5173-5176 | xargs kill -9 2>/dev/null
```

### ❌ Error: "Could not resolve @president/shared"

**Problem**: Shared package hasn't been built yet.

**Solution**:
```bash
cd packages/shared
pnpm build
cd ../..
```

### ❌ Error: "Could not resolve buffer/crypto/util" (API Worker)

**Problem**: Missing `nodejs_compat` flag for Node.js APIs.

**Solution**: Already fixed in `apps/api/wrangler.toml` ✅
- Added `compatibility_flags = ["nodejs_compat"]`
- Updated `compatibility_date = "2024-09-23"`

### ❌ Error: "Workers runtime failed to start"

**Problem**: Usually port conflict or missing dependencies.

**Solution**:
```bash
# Kill everything
lsof -ti:8787 -ti:8788 -ti:5173-5176 | xargs kill -9 2>/dev/null

# Clean install
rm -rf node_modules
pnpm install

# Build shared package
cd packages/shared && pnpm build && cd ../..

# Try again
pnpm dev
```

### ❌ Error: Multiple dev servers running

**Problem**: Duplicate instances of the dev server.

**Solution**:
```bash
# Kill all pnpm dev processes
pkill -f "pnpm dev"
pkill -f "concurrently"

# Wait a moment
sleep 2

# Start fresh
pnpm dev
```

### WebSocket Connection Errors

1. Check realtime worker is running: `curl http://localhost:8788/health`
2. Check browser console for errors (F12)
3. Verify room code is correct

### Database Errors

```bash
# Re-run migrations
pnpm exec wrangler d1 migrations apply president-db --local

# Check database exists
pnpm exec wrangler d1 list
```

---

## 🔧 Complete Clean Start (Nuclear Option)

If nothing else works:

```bash
# 1. Kill everything
pkill -f "pnpm dev"
pkill -f "concurrently"
lsof -ti:8787 -ti:8788 -ti:5173-5176 | xargs kill -9 2>/dev/null

# 2. Clean up
rm -rf node_modules
rm -rf packages/shared/dist

# 3. Reinstall
pnpm install

# 4. Build shared package
cd packages/shared && pnpm build && cd ../..

# 5. Start servers
pnpm dev
```

---

## ✅ Checking Server Status

To verify what's running:

```bash
# Check processes
ps aux | grep -E '(wrangler|vite)' | grep -v grep

# Check ports
lsof -i :8787 -i :8788 -i :5173

# Test if servers are responding
curl http://localhost:8787/health  # API
curl http://localhost:5173         # Frontend
```

## Expected Output

When `pnpm dev` is working correctly, you should see:

```
[0] Ready on http://localhost:8787     # API ✅
[1] Ready on http://localhost:8788     # Realtime ✅  
[2] Local: http://localhost:5173/     # Frontend ✅
```

If you see errors, follow the solutions above.

---

## 📁 Project Structure

```
├── apps/
│   ├── api/              # REST API endpoints
│   └── realtime/          # WebSocket game rooms
├── packages/
│   └── shared/            # Shared TypeScript types
├── web/                   # React frontend
├── schema.sql             # Database schema
└── package.json           # Workspace config
```

---

## 🎯 Common Tasks

| Task | Command |
|------|---------|
| Start development | `pnpm dev` |
| Stop servers | `Ctrl + C` |
| Build all packages | `pnpm build` |
| Check types | `pnpm type-check` |
| Just frontend | `cd web && pnpm dev` |
| Deploy to Cloudflare | See "Full Setup" section |

---

## 💡 Tips

- **Hot reload**: Frontend changes apply instantly, worker changes need restart
- **Multiple browsers**: Test multiplayer by opening different browser windows
- **Logs**: Check terminal output for all server logs
- **Simulated resources**: Local development uses Miniflare simulation (no real Cloudflare needed)

---

## 🗑️ Cleaning Up Cloudflare Resources

If you need to delete namespaces or databases:

### Delete D1 Database

```bash
# List your databases first
pnpm exec wrangler d1 list

# Delete a database (use with caution!)
pnpm exec wrangler d1 delete president-db
```

**Warning**: This permanently deletes all data in the database!

### Delete KV Namespaces

KV namespaces must be deleted via the Cloudflare Dashboard:

1. Go to https://dash.cloudflare.com
2. Select your account
3. Navigate to **Workers & Pages** → **KV**
4. Find your namespace (e.g., `LOBBY_KV`)
5. Click the three dots menu → **Delete**
6. Confirm deletion

**Note**: There's no Wrangler CLI command to delete KV namespaces yet.

### Alternative: Reset Local Resources

If you just want to reset local development data:

```bash
# Delete local D1 database
rm -rf .wrangler/state/v3/d1

# Delete local KV data
rm -rf .wrangler/state/v3/kv
```

This keeps the resources in Cloudflare but clears local Miniflare data.

---

## 📦 Deployment to Production

### Understanding Local vs Production

**Local Development (Current Setup):**
- ✅ Uses in-memory authentication (no database required)
- ✅ Simulates all Cloudflare services with Miniflare
- ✅ Data doesn't persist between restarts
- ✅ Fully functional for testing
- ✅ Works with just `pnpm dev`

**Production Deployment:**
- Uses real Cloudflare D1 database
- Persists data across sessions
- Requires Cloudflare account and setup
- Accessible to others via deployed URL

### Deploying to Cloudflare

Once you've completed the "Full Setup with Cloudflare" section above, deploy with:

```bash
# 1. Change environment to production
# Edit apps/api/wrangler.toml, apps/realtime/wrangler.toml
# Set: ENVIRONMENT = "production"

# 2. Deploy API worker
cd apps/api
pnpm exec wrangler deploy

# 3. Deploy Realtime worker
cd ../realtime
pnpm exec wrangler deploy

# 4. Deploy frontend
cd ../web
pnpm build
pnpm exec wrangler pages deploy dist
```

### Switching Between Environments

**To work locally:**
- Keep `ENVIRONMENT = "development"` in wrangler.toml
- Run `pnpm dev`
- No database needed

**To test production locally:**
```bash
# After setting up Cloudflare resources
pnpm exec wrangler d1 migrations apply president-db --local
pnpm dev  # Now uses real Cloudflare database locally
```

**To deploy:**
- Change `ENVIRONMENT = "production"`
- Complete Cloudflare setup
- Run deployment commands above

---

## 📚 Next Steps

Once running:

1. **Test the UI**: Open http://localhost:5173
2. **Play a game**: Create a room with multiple browser windows
3. **Explore code**: Check `apps/realtime/src/room.ts` for game logic
4. **Customize**: Modify `web/src/components/Card.tsx` for card design

---

## 🆘 Still Need Help?

- Check the terminal output for specific error messages
- Review browser console for frontend errors
- Ensure all dependencies are installed: `pnpm install`
- Verify paths in `tsconfig.json` files

For architecture details, see `README.md`

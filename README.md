# President: Multiplayer Card Game

A real-time multiplayer card game where players compete to become President, built with Cloudflare Workers, Durable Objects, and React.

![GitHub](https://img.shields.io/github/license/your-repo/president)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange)

## 🎮 Features

- **Real-time multiplayer** gameplay for 3-12 players
- **Guest and authenticated** login support with JWT
- **Authoritative server** logic prevents cheating
- **Spectator mode** for observing games
- **Leaderboard system** with ELO ratings
- **Beautiful animations** inspired by Balatro
- **Responsive design** for mobile and desktop
- **Free hosting** on Cloudflare's infrastructure

## 🏗️ Architecture

### Backend
- **API Worker**: Handles authentication, room creation, and leaderboards
- **Realtime Worker**: Manages WebSocket connections and message relay
- **RoomActor Durable Object**: Each game room runs as a single actor managing state
- **D1 Database**: Stores users, sessions, match history, and leaderboards
- **KV Store**: Tracks active sessions and lobbies

### Frontend
- **React + Vite + TypeScript**: Modern, type-safe UI
- **TailwindCSS + Framer Motion**: Polished, animated interface
- **Howler.js**: Sound effects for game actions
- **Zod**: Schema validation for WebSocket messages

## 🚀 Local Development

### Prerequisites

- Node.js 18+ installed
- pnpm package manager installed: `npm install -g pnpm`

> 💡 **Want to skip Cloudflare setup?** See [DEV_LOCAL.md](DEV_LOCAL.md) for running locally without a Cloudflare account!

### Setup

1. **Clone and install dependencies:**
   ```bash
git clone https://github.com/your-repo/president.git
cd president
   pnpm install
   cd frontend && pnpm install && cd ..
   ```

2. **Authenticate with Cloudflare:**
   ```bash
   npx wrangler login
   ```

3. **Create D1 database:**
   ```bash
   npx wrangler d1 create president-db
   ```
   Copy the `database_id` from the output and update `wrangler.toml` file.

4. **Create KV namespaces:**
   ```bash
   npx wrangler kv:namespace create "SESSIONS"
   npx wrangler kv:namespace create "SESSIONS" --preview
   npx wrangler kv:namespace create "LOBBIES"
   npx wrangler kv:namespace create "LOBBIES" --preview
   ```
   Update the IDs in `wrangler.toml` file under `[[kv_namespaces]]`.

5. **Run database migrations:**
   ```bash
   pnpm run db:migrate
   ```

6. **Start development servers:**
   
   In terminal 1 (Frontend):
   ```bash
   pnpm run dev:frontend
   ```
   
   In terminal 2 (Workers):
   ```bash
   pnpm run dev:workers
   ```

### Local Development URLs

- Frontend: `http://localhost:5173`
- Workers API: Your Wrangler dev URL (check console output, typically `localhost:8787`)

### Environment Variables

Create `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:8787
VITE_REALTIME_URL=ws://localhost:8787
```

## 📦 Deployment

### Option 1: Manual Deployment

1. **Deploy Workers to Cloudflare:**
   ```bash
   # Authenticate if not already done
   npx wrangler login
   
   # Deploy both workers
   npx wrangler deploy
   ```

2. **Update wrangler.toml with your actual IDs:**
   - Update `database_id` for D1
   - Update `id` and `preview_id` for KV namespaces

3. **Deploy Frontend to Cloudflare Pages:**
   
   Option A: Using Wrangler CLI
   ```bash
   cd frontend
   pnpm run build
   npx wrangler pages deploy dist
   ```

   Option B: Via Cloudflare Dashboard
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Select Pages → Create a new Project
   - Connect GitHub repository
   - Set build command: `cd frontend && pnpm install && pnpm run build`
   - Set build output directory: `frontend/dist`
   - Add environment variables:
     - `VITE_API_URL`: https://your-worker.workers.dev
     - `VITE_REALTIME_URL`: wss://your-worker.workers.dev

### Option 2: GitHub Actions (Recommended)

The repository includes a `.github/workflows/deploy.yml` that automatically deploys on push to main.

**Setup Secrets in GitHub:**
1. Go to your repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `CLOUDFLARE_API_TOKEN`: Get from [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
   - `CLOUDFLARE_ACCOUNT_ID`: Found in Cloudflare Dashboard URL

**Deploy:**
```bash
git push origin main
```

The GitHub Action will automatically:
- Deploy Workers to Cloudflare
- Build and deploy Frontend to Cloudflare Pages

## 🏃 Quick Local Start (No Cloudflare Account)

Want to start coding immediately without setting up Cloudflare?

```bash
# Install dependencies
pnpm install

# Install local server dependencies
cd scripts && pnpm install && cd ..

# Start local API server (Terminal 1)
pnpm run dev:local

# Start frontend (Terminal 2)
pnpm run dev:frontend
```

That's it! Open http://localhost:5173 and start playing.

**Cleanup:**
```bash
pnpm run clean:local  # Removes local database
```

See [DEV_LOCAL.md](DEV_LOCAL.md) for full details.

### Post-Deployment

1. **Get your deployed URLs:**
   - Worker URL: Check Cloudflare Workers dashboard
   - Pages URL: Check Cloudflare Pages dashboard

2. **Update environment variables in Cloudflare Pages:**
   - Add `VITE_API_URL` and `VITE_REALTIME_URL` pointing to your Worker URL

3. **Update wrangler.toml for production:**
   - Set correct production bindings

## 🃏 Game Rules

### The Deal
Starting to the dealer's left, deal one card at a time until all cards have been dealt.

### The Play
The player to dealer's left starts by leading (face up) any single card or any set of cards of equal rank (e.g., three fives).

Each player in turn must either:
- **Pass** (not play any cards)
- **Play** a card or set that beats the previous play

### Beating a Play
- Any higher single card beats a single card
- A set can only be beaten by a higher set with the same number of cards
- Example: If someone plays two sixes, you can beat it with two kings or two sevens, but not with a single king or three sevens

### Passing
- Passing is always allowed
- You don't have to beat the previous play even if you can
- Passing doesn't prevent you from playing later

### Winning
The play continues until someone makes a play everyone else passes. All cards go face down, and the last player starts the next trick.

The first player who is **out of cards** becomes **President** (highest rank).  
The last player left with cards is **Scum** (lowest rank).

## 📁 Project Structure

```
president/
├── src/
│   ├── api/           # API Worker (auth, rooms, leaderboards)
│   ├── realtime/      # Realtime Worker (WebSocket handling)
│   ├── shared/        # Shared types and utilities
│   └── durable/       # Durable Object classes
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── store/        # State management
│   │   └── types/        # TypeScript types
│   └── public/           # Static assets
├── migrations/        # D1 database migrations
└── wrangler.toml      # Cloudflare configuration
```

## 🛠️ Tech Stack

### Backend
- Cloudflare Workers (serverless compute)
- Durable Objects (stateful game rooms)
- D1 Database (SQLite at edge)
- KV Store (sessions & lobbies)

### Frontend
- React 18 (UI framework)
- Vite (build tool)
- TypeScript (type safety)
- TailwindCSS (styling)
- Framer Motion (animations)
- Howler.js (sound effects)
- Zustand (state management)
- Zod (validation)

## 📝 API Endpoints

### Authentication
- `POST /api/auth/guest` - Create guest session
- `POST /api/auth/login` - User login (optional)
- `POST /api/auth/register` - User registration

### Rooms
- `GET /api/rooms` - List public rooms
- `POST /api/rooms` - Create room
- `GET /api/rooms/:id` - Get room info

### Leaderboard
- `GET /api/leaderboard` - Get global leaderboard

### WebSocket
- `wss://your-worker-url/room/:roomId` - Connect to game room

## 🧪 Testing

```bash
# Run linter
pnpm run lint

# Test API locally
curl http://localhost:8787/api/health
```

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 🙏 Acknowledgments

- Inspired by [Balatro](https://localthunk.com/) for animation and design
- Card game rules adapted from traditional President/Scum
- Built on Cloudflare's edge infrastructure

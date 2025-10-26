# President Card Game

A real-time multiplayer browser card game inspired by Balatro's clean design and smooth animations.

## 🎯 Project Goals

- Real-time multiplayer gameplay for 3+ players using server-authoritative logic
- Guest and user login support (JWT based guest sessions, optional persistent users)
- Polished, high quality UI/UX with animations, transitions, and responsive game playout
- Free deployment and operation using Cloudflare's generous free tier
- Lightweight codebase built with TypeScript, Vite, React, and Cloudflare tooling

## 🏗️ Tech Stack

### Backend
- **Runtime**: Cloudflare Workers - serverless compute layer for APIs and WebSocket connections
- **Room State**: Cloudflare Durable Objects - each game room runs as a single consistent actor
- **Real-time Transport**: WebSockets (native workers) - handles all live player updates
- **Database**: Cloudflare D1 (SQLite at edge) - stores users, sessions, match history, and leaderboards
- **Cache/Sessions**: Cloudflare KV store - tracks active rooms, short-term sessions, and lobbies

### Frontend
- **Framework**: React + Vite + TypeScript - responsive web UI with modular state and animation control
- **Styling**: TailwindCSS + Framer Motion - production quality, animated UI and layout transitions
- **Sound Effects**: Howler.js - lightweight and performant sound system
- **State Management**: Zustand - simple and effective state management
- **Validation**: Zod - enforces consistent message schemas between client and server

### Deployment
- **Hosting**: Cloudflare Pages - free global static hosting for the frontend
- **Tooling**: Wrangler + pnpm - unified build and deployment toolchain

## 📁 Project Structure

```
├─ apps/
│  ├─ api/                 # HTTP endpoints (auth, create room, leaderboard)
│  │  ├─ src/index.ts
│  │  └─ wrangler.toml
│  └─ realtime/            # Durable Object worker (rooms, WebSockets)
│     ├─ src/index.ts
│     ├─ src/room.ts
│     ├─ src/gameLogic.ts
│     └─ wrangler.toml
│
├─ web/                    # Frontend (React + Vite)
│  ├─ src/
│  │  ├─ components/       # UI components (Card, PlayerSeat, ChatPanel)
│  │  ├─ pages/            # Lobby, GameRoom, Leaderboard
│  │  ├─ hooks/            # useWebSocket, useGameState
│  │  ├─ animations/       # Framer Motion variants for transitions
│  │  └─ assets/           # Card art, sounds, icons
│  ├─ vite.config.ts
│  ├─ tailwind.config.js
│  └─ package.json
│
├─ packages/
│  ├─ shared/
│  │  ├─ src/messages.ts   # Typed WS message schemas (Zod)
│  │  ├─ src/types.ts
│  │  └─ package.json
│
├─ schema.sql              # D1 schema (users, matches, sessions)
├─ wrangler.toml           # Global config and bindings
├─ package.json            # Workspace scripts
└─ README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Cloudflare account (free tier)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd president-card-game
   pnpm install
   ```

2. **Set up Cloudflare resources:**
   ```bash
   # Create D1 database
   pnpm db:create
   
   # Run database migrations
   pnpm db:migrate
   
   # Create KV namespaces (you'll need to do this in Cloudflare dashboard)
   # Update wrangler.toml files with the actual IDs
   ```

3. **Configure environment variables:**
   - Update `JWT_SECRET` in all `wrangler.toml` files
   - Update database and KV IDs in configuration files

4. **Start development servers:**
   ```bash
   pnpm dev
   ```

This will start:
- API worker on port 8787
- Realtime worker on port 8788  
- Web frontend on port 5173

### Available Scripts

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all packages
- `pnpm deploy` - Deploy all workers
- `pnpm deploy:api` - Deploy only API worker
- `pnpm deploy:realtime` - Deploy only realtime worker
- `pnpm deploy:web` - Deploy only web frontend
- `pnpm type-check` - Run TypeScript type checking

## 🎮 Game Rules

President is a trick-taking card game where players try to get rid of all their cards. The player who runs out of cards first becomes the President, and the last player becomes the Scum.

### Basic Rules
1. Players are dealt all cards from a standard 52-card deck
2. Players take turns playing cards of the same rank
3. Cards must be higher rank than the previous play (or same count)
4. Players can pass their turn
5. When a player runs out of cards, they win the round
6. Roles are assigned based on finish order: President, Vice President, Citizen, Vice Scum, Scum

## 🎨 Design Philosophy

Inspired by Balatro's clean, minimalist design:
- Smooth card animations and transitions
- Glowing highlights and card textures
- Responsive design for mobile and desktop
- Dark mode support
- Satisfying visual feedback for all actions

## 📈 Development Roadmap

- [x] **Phase 1**: Core Framework Setup
- [ ] **Phase 2**: Realtime Networking
- [ ] **Phase 3**: Game Logic MVP
- [ ] **Phase 4**: Auth + Lobby
- [ ] **Phase 5**: UI/UX Foundation
- [ ] **Phase 6**: Leaderboard + Persistence
- [ ] **Phase 7**: Production Polish
- [ ] **Phase 8**: Public Demo Launch

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

MIT License - feel free to use this code for your own projects.


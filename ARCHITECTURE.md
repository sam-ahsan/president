# Architecture Overview

## System Architecture

President is built on Cloudflare's edge infrastructure for low-latency, global multiplayer gaming.

```
┌─────────────────────────────────────────────────────────┐
│                     Cloudflare Pages                     │
│                  (Frontend - React)                      │
│         https://president.pages.dev                 │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/WSS
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                    │
│                                                         │
│  ┌──────────────────┐      ┌──────────────────────┐    │
│  │   API Worker     │      │  Realtime Worker     │    │
│  │                  │      │                      │    │
│  │ • Auth (JWT)     │      │ • WebSocket handling │    │
│  │ • Rooms          │      │ • Message relay      │    │
│  │ • Leaderboards   │◄────►│ • Durable Objects    │    │
│  │                  │      │                      │    │
│  └──────────────────┘      └──────────────────────┘    │
└────────────────────┬────────────────────┬───────────────┘
                     │                    │
                     ▼                    ▼
        ┌──────────────┐      ┌──────────────────────┐
        │   D1 (SQL)   │      │   Durable Objects     │
        │              │      │                       │
        │ • Users      │      │ • RoomActor          │
        │ • Sessions   │      │ • Game State          │
        │ • Matches    │      │ • Player Hands        │
        │ • History    │      │ • Turn Management     │
        └──────────────┘      └──────────────────────┘
```

## Components

### Backend Workers

#### 1. API Worker (`src/api/index.ts`)
Handles HTTP requests for:
- Authentication (guest & registered users)
- Room creation and listing
- Leaderboard data
- User profiles

**Endpoints:**
- `POST /api/auth/guest` - Guest login
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/rooms` - List rooms
- `POST /api/rooms` - Create room
- `GET /api/leaderboard` - Get leaderboard

#### 2. Realtime Worker (`src/realtime/index.ts`)
Manages WebSocket connections and routing to Durable Objects.

**Routes:**
- `WS /room/:roomId` - WebSocket upgrade to game room

### Durable Objects

#### RoomActor (`src/realtime/room-actor.ts`)
Each game room is a Durable Object instance that:
- Manages WebSocket connections for all players
- Enforces game rules and state
- Handles turn logic and card play validation
- Broadcasts state updates to all players
- Prevents cheating through authoritative logic

**Key Methods:**
- `handleSession()` - Add player connection
- `handleMessage()` - Process player actions
- `handlePlayCards()` - Validate and play cards
- `startGame()` - Deal cards and begin game
- `broadcast()` - Send updates to all players

### Frontend (`frontend/`)

#### Tech Stack
- **React 18** - Component-based UI
- **Vite** - Fast build tool
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Zod** - Schema validation (ready for WebSocket messages)
- **Zustand** - Lightweight state management

#### Pages
1. **Home** (`src/pages/Home.tsx`) - Login/registration
2. **Lobby** (`src/pages/Lobby.tsx`) - Room browser and creation
3. **GameRoom** (`src/pages/GameRoom.tsx`) - Active game interface

#### State Management
- `authStore` - User authentication state
- `gameStore` - Game state, selections, WebSocket connection

#### Features
- Guest login with optional username
- Beautiful card animations
- Real-time updates via WebSocket
- Responsive design (mobile & desktop)

## Data Flow

### Joining a Game
1. User logs in via API Worker → receives JWT
2. User creates/joins room via API
3. Frontend opens WebSocket to Realtime Worker
4. Realtime Worker routes to RoomActor Durable Object
5. RoomActor adds player to game state
6. All players receive state update

### Playing Cards
1. User selects cards in frontend
2. Frontend sends WebSocket message
3. RoomActor validates play (can beat previous?)
4. Updates game state
5. Broadcasts new state to all players
6. Frontend receives state, updates UI

### Game Rules Enforcement
All game logic runs server-side in RoomActor:
- Card comparison (2 < 3 < ... < A)
- Set validation (all cards same rank)
- Turn enforcement
- Win detection

This prevents:
- Cheating (can't modify client-side state)
- Desync (single source of truth)
- Exploits (server validates all actions)

## Database Schema

### D1 (SQLite at Edge)

**Users** - User accounts
```sql
id, username, email, elo_rating, games_played, games_won
```

**Sessions** - Auth sessions (also in KV for faster access)
```sql
id, user_id, username, token, is_guest, created_at, expires_at
```

**Rooms** - Game rooms
```sql
id, name, host_id, max_players, current_players, status, created_at
```

**Matches** - Completed games
```sql
id, room_id, started_at, finished_at
```

**Match Results** - Player outcomes
```sql
id, match_id, user_id, role, position
```

### KV Store
- `SESSIONS` - Fast session lookup
- `LOBBIES` - Active room tracking

## Scaling Considerations

### Free Tier Limits
- Workers: Millions of requests/month
- Durable Objects: Free for small-scale
- D1: 100K reads/day, 1K writes/day
- KV: 1GB storage, 100K reads/month
- Pages: Unlimited bandwidth

### Optimization Strategies
1. **D1 Usage**: Batch updates, use KV for hot data
2. **DO Isolation**: Each room is independent
3. **WebSocket**: Efficient bidirectional protocol
4. **Edge Caching**: Static assets via Pages CDN

### Scaling Beyond Free Tier
- D1: Upgrade plan for higher read/write limits
- Workers: Pay-as-you-go pricing
- KV: Additional storage available
- Durable Objects: Fixed pricing per object

## Security

- **JWT Auth**: All API calls require valid token
- **WebSocket**: Token validation on connection
- **Game Validation**: All moves verified server-side
- **SQL Injection**: Parameterized queries in D1
- **XSS**: React escapes by default
- **CORS**: Configured for Cloudflare Pages origin

## Deployment

### Workers
Deployed via `wrangler deploy` command or GitHub Actions

### Frontend
Built via `vite build` → deployed to Cloudflare Pages

### Database
Migrations via `wrangler d1 migrations apply`

See README.md for detailed deployment instructions.

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT,
    created_at INTEGER NOT NULL,
    elo_rating INTEGER DEFAULT 1000,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0
);

-- Sessions table (for guest and authenticated users)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    is_guest BOOLEAN NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host_id TEXT NOT NULL,
    max_players INTEGER NOT NULL,
    current_players INTEGER DEFAULT 0,
    status TEXT NOT NULL, -- 'waiting', 'playing', 'finished'
    created_at INTEGER NOT NULL,
    finished_at INTEGER
    -- Note: No foreign key constraint to allow guest users
);

-- Matches table (completed games)
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Match results table
CREATE TABLE IF NOT EXISTS match_results (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'president', 'vice_president', 'neutral', 'vice_scum', 'scum'
    position INTEGER NOT NULL, -- 1=president, 2=vice, etc.
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Leaderboard view
CREATE VIEW leaderboard AS
SELECT 
    u.id,
    u.username,
    u.elo_rating,
    u.games_played,
    u.games_won,
    CASE 
        WHEN u.games_played > 0 
        THEN (u.games_won * 100.0 / u.games_played) 
        ELSE 0 
    END as win_rate
FROM users u
WHERE u.games_played > 0
ORDER BY u.elo_rating DESC;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_matches_room_id ON matches(room_id);
CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_user_id ON match_results(user_id);

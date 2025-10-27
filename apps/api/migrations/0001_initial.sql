-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for JWT tokens
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Matches table
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL,
  winner_id TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Match players table (many-to-many relationship)
CREATE TABLE match_players (
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  elo_delta INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id, user_id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Leaderboard table (denormalized for performance)
CREATE TABLE leaderboard (
  user_id TEXT PRIMARY KEY,
  elo INTEGER DEFAULT 1000,
  games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_users_handle ON users(handle);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_matches_room_code ON matches(room_code);
CREATE INDEX idx_matches_started_at ON matches(started_at);
CREATE INDEX idx_match_players_match_id ON match_players(match_id);
CREATE INDEX idx_match_players_user_id ON match_players(user_id);
CREATE INDEX idx_leaderboard_elo ON leaderboard(elo DESC);
CREATE INDEX idx_leaderboard_games ON leaderboard(games DESC);

-- Triggers to update timestamps
CREATE TRIGGER update_users_updated_at 
  AFTER UPDATE ON users
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER update_leaderboard_updated_at 
  AFTER UPDATE ON leaderboard
  BEGIN
    UPDATE leaderboard SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
  END;


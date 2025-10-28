interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  LOBBIES: KVNamespace;
}

export type { Env };

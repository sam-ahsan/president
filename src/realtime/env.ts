interface Env {
  ROOM_ACTOR: DurableObjectNamespace;
  DB: D1Database;
  SESSIONS: KVNamespace;
  LOBBIES: KVNamespace;
}

export type { Env };

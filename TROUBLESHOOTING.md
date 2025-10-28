# President - Troubleshooting Guide

## Issues Fixed

### 1. "Failed to connect to server" with Wrangler

**Problem:** API endpoints returning 404 or connection errors

**Cause:** Missing CORS headers and response headers

**Fixed:**
- Added CORS headers to all responses in `src/api/index.ts`
- Added CORS headers to WebSocket responses in `src/realtime/index.ts`
- Fixed response headers to include CORS in all handlers

### 2. "RoomActor [not connected]" in realtime service

**Problem:** Durable Object showing as not connected

**Cause:** RoomActor class not properly exported

**Fixed:**
- Added `export { RoomActor }` in `src/realtime/index.ts`
- Fixed Durable Object bindings format in `wrangler.realtime.toml`

### 3. CSS @import order error

**Problem:** Tailwind @import must precede all statements

**Fixed:**
- Moved `@import` URL to top of `frontend/src/index.css`
- Now: @import → @tailwind in correct order

### 4. Deprecated node_compat

**Problem:** Wrangler warning about legacy node_compat

**Fixed:**
- Changed `node_compat = true` to `nodejs_compat = true` in wrangler configs

## How to Test

### 1. Test with Simple Local Server
```bash
# Terminal 1
pnpm run dev:local

# Terminal 2
pnpm run dev:frontend
```

Open http://localhost:5173

### 2. Test with Wrangler Local

```bash
# Terminal 1 - API Worker
pnpm run dev:api

# Terminal 2 - Realtime Worker (Durable Objects)
pnpm run dev:realtime

# Terminal 3 - Frontend
pnpm run dev:frontend
```

Open http://localhost:5173

## Common Issues

### Issue: "OPTIONS /api/auth/guest 404 Not Found"

**Cause:** Preflight request not handled

**Solution:** ✅ Fixed - Added OPTIONS handler in API worker

### Issue: "Cannot connect to WebSocket"

**Causes:**
1. Realtime worker not running
2. Wrong WebSocket URL in frontend
3. CORS blocking connection

**Solutions:**
1. Check realtime worker is running
2. Verify `VITE_REALTIME_URL` in `.env.local`
3. ✅ Fixed - Added CORS headers to WebSocket responses

### Issue: "Database not found"

**Cause:** D1 database not created

**Solution:**
```bash
npx wrangler d1 create president-db
# Then update database_id in wrangler.api.toml and wrangler.realtime.toml
```

### Issue: "WebSocket closes immediately"

**Causes:**
1. Token not passed
2. Token invalid
3. Room doesn't exist

**Debug:**
- Check browser console for WebSocket errors
- Check wrangler logs for room actor errors
- Verify token is in query params: `?token=...`

## Files Changed

✅ `src/api/index.ts` - Added CORS to all responses  
✅ `src/realtime/index.ts` - Added CORS and exported RoomActor  
✅ `wrangler.api.toml` - Updated to nodejs_compat  
✅ `wrangler.realtime.toml` - Fixed Durable Object bindings  
✅ `frontend/src/index.css` - Fixed @import order  

## Testing Checklist

- [ ] Guest authentication works
- [ ] Can create a room
- [ ] Can list rooms
- [ ] Frontend loads without CSS errors
- [ ] WebSocket connects to room
- [ ] Game state updates received

## Next Steps

1. **Test guest login** - Should work now
2. **Create a room** - Should work with CORS fixes
3. **Join room** - Should connect with WebSocket
4. **Play cards** - Test game logic

If issues persist, check:
- Wrangler version (upgrade with `npm i -g wrangler@latest`)
- Browser console for errors
- Network tab for failed requests

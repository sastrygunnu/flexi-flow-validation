# Fix API 405 Error - Flow Builder Deploy Button

## What I See From Your Screenshot

✅ Frontend loaded correctly
✅ Flow Builder showing `us_onboarding`
✅ Steps are configured (Phone OTP, Identity Check)
❌ "Save failed - API 405" when clicking Deploy

## The Issue

405 = "Method Not Allowed" - This means the server is receiving the request but the HTTP method (POST/PUT) isn't matching what the server expects.

## Quick Diagnosis

**Open Browser DevTools RIGHT NOW:**

1. Press **F12** (or Cmd+Option+I on Mac)
2. Go to **Network** tab
3. Click **Deploy** button again
4. Look for the failed request (should be red)
5. Click on it
6. **Take screenshot** of:
   - Headers tab → Request URL
   - Headers tab → Request Method
   - Payload/Request tab → Request body

**Share that screenshot with me!**

## Likely Causes

### Cause 1: CORS Preflight Failure

The browser might be sending an OPTIONS request first, which the server rejects.

**Fix**: Add better CORS handling:

```javascript
// In server/index.mjs, update OPTIONS handler
if (req.method === "OPTIONS") {
  res.writeHead(204, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400"
  });
  res.end();
  return;
}
```

### Cause 2: Static File Handler Intercepting

The static file serving might be catching the request before it reaches the API handler.

**Test**: What URL is the request going to?
- Should be: `/api/flows` or `/api/flows/{id}`
- If it's something else, that's the problem

### Cause 3: Wrong HTTP Method

**Check in DevTools**:
- Should be: `PUT /api/flows/{id}` (for update)
- Or: `POST /api/flows` (for create)
- If it's GET or DELETE → that's wrong

## Immediate Test

**Run this in browser console** (F12 → Console tab):

```javascript
// Test creating a flow
fetch('/api/flows', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'test_flow',
    steps: [{ type: 'phone', provider: 'twilio' }]
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**What happens?**
- If success → API works, issue is in React code
- If 405 → API endpoint not accepting POST
- If other error → different issue

## Alternative: Test with curl

From your terminal:

```bash
# Test if backend is running
curl http://localhost:8787/api/circle/status

# Test POST to flows
curl -X POST http://localhost:8787/api/flows \
  -H "Content-Type: application/json" \
  -d '{"name":"test","steps":[{"type":"phone","provider":"twilio"}]}'
```

**If curl works but browser doesn't → it's a CORS issue**

## Nuclear Option: Bypass and Test

1. **Stop the dev server** (Ctrl+C)
2. **Restart with CORS fully open**:

Add this to top of `handle()` function in `server/index.mjs`:

```javascript
// Add CORS headers to ALL responses
res.setHeader("access-control-allow-origin", "*");
res.setHeader("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
res.setHeader("access-control-allow-headers", "content-type");
```

3. Restart: `npm run dev:full`
4. Try Deploy button again

## What I Need From You

**To fix this in 2 minutes, send me:**

1. **Screenshot of DevTools Network tab** showing the failed request
2. **Request URL** (from Headers tab)
3. **Request Method** (from Headers tab)
4. **Status Code** (should show 405)
5. **Response body** (from Response tab)

With this, I can tell you EXACTLY what's wrong!

## Quick Check

Is the server actually running?

```bash
# Should return flows array
curl http://localhost:8787/api/flows
```

If this fails → server crashed, restart it
If this works → 405 is coming from somewhere else

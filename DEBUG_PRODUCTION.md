# Debug Production Issues - Step by Step

## Issue: Frontend works locally but not in production

### Step 1: Identify the Platform Issue

The problem is likely one of these:

1. **Backend not running** - Only frontend deployed, no API server
2. **Environment variables missing** - Circle API keys not set
3. **Build/start commands wrong** - Server not starting correctly
4. **Port configuration** - Server listening on wrong port

---

## Railway Debugging

### Check 1: Is the backend actually running?

**Test backend health:**
```bash
curl https://YOUR-URL.railway.app/api/circle/status
```

**Expected**: JSON response with Circle status
**If 404**: Backend not running - see fix below

### Check 2: View Deployment Logs

1. Go to Railway dashboard
2. Click on your project
3. Go to **Deployments** tab
4. Click latest deployment
5. Look for errors

**Common errors:**
- `Cannot find module` - Missing dependencies
- `ENOENT` - File not found
- `Port already in use` - Port conflict

### Fix: Configure Railway Build Settings

Railway should auto-detect, but verify:

1. Go to **Settings** tab
2. Check **Build Command**: `npm install && npm run build`
3. Check **Start Command**: `npm run server`
4. Check **Root Directory**: (leave empty or `/`)

### Check 3: Environment Variables

In Railway → **Variables** tab, you need:

```bash
CIRCLE_API_KEY=TEST_API_KEY:c0a9ca19df7387f70fb346b81bb3101b:2bcd24e84328fbfd347b9efe7864a75b
CIRCLE_ENTITY_SECRET=e8dda4908e96c921d5afa9779ce4394788b3a5e964f3ee1d39f62998efacc3cf
PAYER_WALLET_ID=38a7d65c-54e4-5f5e-a1ad-c8c9ddc32929
PAY_TO_ADDRESS=0x6fd6ab02df737384a67e381055c962603e47fee4
BILL_USDC_CENTS=1
CIRCLE_GATEWAY_ENV=testnet
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_EXPLORER_BASE_URL=https://testnet.arcscan.app
NODE_ENV=production
PORT=8787
```

**DO NOT SET**: `VITE_API_URL` (leave blank in production)

### Check 4: Server Configuration

The server must:
1. ✅ Serve static files from `dist/` folder
2. ✅ Handle API routes at `/api/*`
3. ✅ Listen on PORT from environment (Railway assigns this)

**Verify server/index.mjs** has:
```javascript
const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`listening on http://localhost:${PORT}`));
```

---

## Render Debugging

### Check 1: Build & Start Commands

In Render dashboard → **Settings**:

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run server`
- **Environment**: `Node`
- **Node Version**: `20.x`

### Check 2: Environment Variables

Same as Railway (see above).

### Check 3: Health Check Path

Set to: `/api/circle/status`

This tells Render the app is healthy when this endpoint responds.

---

## Common Issue: Server Not Serving Frontend

### The Problem

If you see:
- ❌ Backend API works: `curl https://app.com/api/flows` ✅
- ❌ Frontend 404: Opening `https://app.com` in browser shows 404

**Root cause**: Server not configured to serve static files.

### The Fix

Check `server/index.mjs` has this code:

```javascript
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files from dist
app.use(express.static(path.join(__dirname, "../dist")));

// Fallback to index.html for SPA routing
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});
```

If missing, the server won't serve your React app!

---

## Vercel-Specific Issues

Vercel is **NOT recommended** because it's designed for serverless/edge functions, not long-running Node servers.

### If you deployed to Vercel anyway:

**Problem**: Vercel deploys the frontend but can't run your Node.js server.

**Solution 1: Deploy backend separately**
1. Deploy backend to Railway/Render
2. In Vercel → Environment Variables → Add:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
3. Redeploy frontend

**Solution 2: Switch to Railway** (recommended)
- Much simpler for full-stack apps
- Follow Railway setup above

---

## Step-by-Step Testing

Run these commands **in order**:

```bash
# Replace with YOUR actual URL
URL="https://your-app.railway.app"

# Test 1: Backend health
echo "Test 1: Backend health"
curl -s $URL/api/circle/status | jq '.ok'
# Expected: true

# Test 2: Flows API
echo "Test 2: Flows API"
curl -s $URL/api/flows | jq '.flows | length'
# Expected: 1 or more

# Test 3: Circle balance
echo "Test 3: Circle balance"
curl -s $URL/api/circle/status | jq '.payerBalances.usdc.amount'
# Expected: "34.887399575" or similar

# Test 4: Frontend loads
echo "Test 4: Frontend"
curl -s $URL | grep -o "<title>.*</title>"
# Expected: <title>Validly</title>
```

**If ANY test fails**, see fixes below.

---

## Specific Error Fixes

### Error: "Cannot GET /api/circle/status" (404)

**Cause**: Backend not running or routes not registered.

**Fix**:
1. Check deployment logs for startup errors
2. Verify `npm run server` works locally
3. Check `server/index.mjs` has route handlers
4. Redeploy with correct start command

### Error: "CORS policy blocked"

**Cause**: Frontend and backend on different domains.

**Fix**:
1. Deploy both to same platform (Railway/Render)
2. OR add CORS headers in `server/index.mjs`:
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

### Error: "Cannot find module './dist/index.html'"

**Cause**: Frontend not built before deployment.

**Fix**:
1. Set build command: `npm install && npm run build`
2. Verify `dist/` folder exists after build
3. Check `dist/index.html` is present

### Error: Empty responses from Circle API

**Cause**: Environment variables not set correctly.

**Fix**:
1. Double-check all Circle env vars in platform dashboard
2. Copy-paste exact values (no extra spaces)
3. Redeploy after adding env vars

### Error: "Payer balance is empty" in UI

**Open browser DevTools** (F12):

1. **Network tab** → Find `/api/circle/status`
2. **Click on it** → Check Response
3. **If response is good** but UI still empty:
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Clear browser cache
   - Try incognito window

4. **If response is error**:
   - Check status code (should be 200)
   - Check error message
   - Fix backend issue

---

## Nuclear Option: Fresh Deployment

If nothing works, start fresh:

### Railway Fresh Deploy

1. **Delete old project** in Railway
2. **Push latest code** to GitHub:
   ```bash
   git add .
   git commit -m "Fresh deployment"
   git push origin main
   ```
3. **Create new Railway project**:
   - Go to railway.app
   - "New Project" → "Deploy from GitHub"
   - Select repository
4. **Add ALL environment variables** (copy from `.env`)
5. **Wait for deployment** (3-5 minutes)
6. **Test with curl commands** above

### Render Fresh Deploy

Same process, use Render dashboard instead.

---

## Get Help

If still broken after all this:

1. **Share deployment logs**:
   - Copy last 50 lines from platform logs
   - Look for errors in red

2. **Test backend directly**:
   ```bash
   curl -v https://your-url/api/circle/status
   ```
   - Share full output

3. **Check browser console**:
   - F12 → Console tab
   - Share any red errors

4. **Verify build output**:
   ```bash
   ls dist/
   ```
   Should show: `index.html`, `assets/`, etc.

---

## Working Example

When everything is correct:

```bash
$ curl https://validly.railway.app/api/circle/status
{
  "ok": true,
  "payer": {
    "address": "0xa7ebedb66d2fb65ab748ae6226fc773fe388afa5"
  },
  "payerBalances": {
    "usdc": {
      "amount": "34.887399575"
    }
  }
}

$ curl https://validly.railway.app/api/flows
{
  "flows": [
    {
      "id": "flow_af6c504362d69a24",
      "name": "us_onboarding",
      "steps": [...]
    }
  ]
}

$ curl https://validly.railway.app | grep title
<title>Validly</title>
```

**Then in browser**: https://validly.railway.app should show full working app.

---

## Quick Checklist

- [ ] Backend responds to `/api/circle/status`
- [ ] Frontend loads at root URL
- [ ] All environment variables set
- [ ] Build command is correct
- [ ] Start command is `npm run server`
- [ ] `dist/` folder exists after build
- [ ] Deployment logs show no errors
- [ ] Browser DevTools shows no network errors

**If all checked and still broken**: Share your deployment URL and logs, I'll help debug!

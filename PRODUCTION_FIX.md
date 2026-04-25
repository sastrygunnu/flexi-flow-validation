# Production Deployment Fix

## Issues Fixed

1. ✅ **API URL in production** - Frontend now uses relative URLs in production
2. ⚠️ **Environment variables need to be set** in your deployment platform

---

## Deploy to Railway (Recommended)

### Step 1: Update Your Deployment

If you already deployed, you need to:

1. **Push the latest changes**:
```bash
cd /Users/sastrykasibotla/Desktop/hackthon/flexi-flow-validation
git add .
git commit -m "Fix production API URL"
git push origin main
```

2. **Railway will auto-redeploy**
   - Wait 2-3 minutes for deployment
   - Check deployment logs in Railway dashboard

### Step 2: Verify Environment Variables in Railway

Go to your Railway project → Variables tab and make sure these are set:

```
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

**Note**: Do NOT set `VITE_API_URL` in production - it will use relative URLs automatically.

### Step 3: Test Your Production Deployment

1. **Open your Railway URL**: `https://validly-production-xxxx.up.railway.app`

2. **Check backend health**:
```bash
curl https://your-app.railway.app/api/circle/status
```

Should return:
```json
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
```

3. **Test in browser**:
   - ✅ Overview should show **34.89 USDC** in Payer balance
   - ✅ Flow Builder should load and save flows
   - ✅ Run Scenario dropdown should show `us_onboarding` flow
   - ✅ Run a scenario and verify payments work

---

## Deploy to Render

### Step 1: Push Changes
```bash
git add .
git commit -m "Fix production API URL"
git push origin main
```

Render will auto-deploy from GitHub.

### Step 2: Check Environment Variables

In Render dashboard → Environment tab:

**Make sure these are set**:
- `CIRCLE_API_KEY`
- `CIRCLE_ENTITY_SECRET`
- `PAYER_WALLET_ID`
- `PAY_TO_ADDRESS`
- `BILL_USDC_CENTS=1`
- `CIRCLE_GATEWAY_ENV=testnet`
- `ARC_RPC_URL=https://rpc.testnet.arc.network`
- `ARC_EXPLORER_BASE_URL=https://testnet.arcscan.app`
- `NODE_ENV=production`
- `PORT=8787`

### Step 3: Test

Visit your Render URL: `https://validly.onrender.com`

---

## Deploy to Vercel

Vercel works for a quick demo using serverless functions (API under `/api/*`), but it’s still **not ideal** for persistence because serverless filesystems are ephemeral. Use Railway/Render + a real database for reliable saved flows/logs.

If you must use Vercel:

### Option 1: Full-stack on Vercel (Fast demo)

- Deploy with project root `flexi-flow-validation`
- Set the same backend env vars (Circle/Gateway/Arc) in Vercel → Project → Settings → Environment Variables
- Expect flows/logs to reset occasionally (stored in `/tmp` on serverless)

### Option 2: Frontend Only on Vercel + Backend Elsewhere

1. **Deploy backend to Railway/Render**
2. **Deploy frontend to Vercel**
3. **Set VITE_API_URL** in Vercel environment variables to your backend URL:
   ```
   VITE_API_URL=https://validly-production-xxxx.up.railway.app
   ```

### Option 3: Use Railway/Render (Easier)

Just use Railway or Render - they handle full-stack apps better.

---

## Troubleshooting

### Issue: "Payer balance is empty"

**Check**:
1. Open browser DevTools (F12) → Network tab
2. Look for `/api/circle/status` request
3. Check the response

**If 404 or CORS error**:
- Environment variables not set correctly
- Backend not serving the API routes
- Check deployment logs

**If 500 error**:
- Circle API key invalid
- Check backend logs in deployment platform

### Issue: "Flow dropdown is empty"

**Check**:
1. DevTools → Network → `/api/flows`
2. Should return: `{"flows":[{...}]}`

**If empty array**:
```bash
# Create a flow via API
curl -X POST https://your-app.railway.app/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "us_onboarding",
    "steps": [
      {"type": "phone", "provider": "twilio"},
      {"type": "email", "provider": "kickbox"},
      {"type": "identity", "provider": "persona"}
    ]
  }'
```

### Issue: "Flow Builder not saving"

**Check**:
1. DevTools → Network → POST to `/api/flows`
2. Check request payload and response

**If fails**:
- Check backend is running: `curl https://your-app/api/circle/status`
- Check backend logs for errors
- Verify `server/data/` directory exists and is writable

### Issue: "Payments not working"

**Check Circle Gateway balance**:
```bash
curl https://your-app.railway.app/api/circle/status | jq '.payerBalances.usdc.amount'
```

Should show: `"34.887399575"` or similar.

**If zero or null**:
- Circle API credentials incorrect
- Wallet not funded
- Run deposit script locally:
  ```bash
  npm run circle:deposit
  ```

---

## Quick Test Script

Run this after deployment:

```bash
# Replace with your actual URL
APP_URL="https://validly-production-xxxx.up.railway.app"

echo "Testing backend health..."
curl -s $APP_URL/api/circle/status | jq '.ok'

echo "Testing flows..."
curl -s $APP_URL/api/flows | jq '.flows | length'

echo "Testing Circle balance..."
curl -s $APP_URL/api/circle/status | jq '.payerBalances.usdc.amount'

echo "All tests passed if you see: true, 1, and a USDC amount"
```

---

## What Changed

### Before (Broken in Production)
```typescript
const API_URL = "http://localhost:8787";
```
- Hardcoded localhost
- Won't work in production

### After (Works Everywhere)
```typescript
const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8787" : "");
```
- Development: Uses `http://localhost:8787`
- Production: Uses relative URLs (same domain)
- Can override with `VITE_API_URL` env var if needed

---

## Next Steps

1. ✅ **Push changes**: `git push origin main`
2. ✅ **Wait for redeploy**: Check Railway/Render dashboard
3. ✅ **Test production**: Open your URL and verify
4. ✅ **Record demo**: Once working, record your demo video

---

## Support

If still broken:

1. **Check deployment logs**:
   - Railway: Dashboard → Deployments → View Logs
   - Render: Dashboard → Logs tab

2. **Check environment variables**:
   - Railway: Dashboard → Variables
   - Render: Dashboard → Environment

3. **Test backend directly**:
   ```bash
   curl https://your-app-url/api/circle/status
   ```

4. **Check browser console**:
   - F12 → Console tab
   - Look for errors

---

**Your app should now work in production!** 🚀

The key fix was making the API URL work in both development (localhost:8787) and production (relative URLs).

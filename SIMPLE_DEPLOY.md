# ⚡ Simplest Deployment - 10 Minutes

## The Easiest Way (Railway - Everything Together)

Railway will host both your frontend and backend in one deployment.

### Step 1: Push to GitHub
```bash
cd /Users/sastrykasibotla/Desktop/hackthon/flexi-flow-validation
git init
git add .
git commit -m "Initial commit - Validly"
gh repo create validly --public --source=. --remote=origin --push
```

### Step 2: Deploy to Railway

1. Go to https://railway.app
2. Click "Start a New Project"
3. Click "Deploy from GitHub repo"
4. Select your `validly` repository
5. Click "Deploy Now"

### Step 3: Add Environment Variables

In Railway dashboard → Variables tab:

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

### Step 4: Configure Build Settings

In Railway dashboard → Settings:

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run server`
- **Root Directory**: (leave empty)

### Step 5: Generate Domain

- Go to Settings → Networking
- Click "Generate Domain"
- Your app will be live at: `https://validly-production-xxxx.up.railway.app`

**Done! Test your app** ✅

---

## Alternative: Render (Also Easy)

### Step 1: Push to GitHub (if not done)
```bash
cd /Users/sastrykasibotla/Desktop/hackthon/flexi-flow-validation
git init
git add .
git commit -m "Initial commit - Validly"
gh repo create validly --public --source=. --remote=origin --push
```

### Step 2: Create Render Blueprint

Create `render.yaml`:
```yaml
services:
  - type: web
    name: validly
    runtime: node
    region: oregon
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm run server
    envVars:
      - key: CIRCLE_API_KEY
        sync: false
      - key: CIRCLE_ENTITY_SECRET
        sync: false
      - key: PAYER_WALLET_ID
        sync: false
      - key: PAY_TO_ADDRESS
        sync: false
      - key: BILL_USDC_CENTS
        value: 1
      - key: CIRCLE_GATEWAY_ENV
        value: testnet
      - key: ARC_RPC_URL
        value: https://rpc.testnet.arc.network
      - key: ARC_EXPLORER_BASE_URL
        value: https://testnet.arcscan.app
      - key: NODE_ENV
        value: production
```

### Step 3: Deploy to Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`
5. Fill in the secret environment variables:
   - `CIRCLE_API_KEY`
   - `CIRCLE_ENTITY_SECRET`
   - `PAYER_WALLET_ID`
   - `PAY_TO_ADDRESS`
6. Click "Apply"

**Done! Your app will be at** `https://validly.onrender.com`

---

## Alternative: Vercel (Frontend Only)

Since Vercel works best for static sites, we'll deploy just the frontend. For the demo, you can run the backend locally.

### Step 1: Deploy Frontend to Vercel
```bash
cd /Users/sastrykasibotla/Desktop/hackthon/flexi-flow-validation

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Step 2: Update Frontend API URL

After deployment, update your frontend to point to your local backend:

In `.env.local` (create this file):
```
VITE_API_URL=http://localhost:8787
```

Then rebuild:
```bash
npm run build
vercel --prod
```

### Step 3: Run Backend Locally

When recording your demo:
```bash
npm run server
```

Keep this running while you demo the Vercel-hosted frontend.

**Your frontend**: `https://validly.vercel.app`
**Your backend**: `http://localhost:8787`

---

## Recommended: Railway or Render

For the simplest hackathon demo, use **Railway** or **Render** because:
- ✅ They host both frontend and backend together
- ✅ No serverless function configuration needed
- ✅ Free tier available
- ✅ One URL for everything
- ✅ Easy environment variable setup

---

## Quick Test After Deployment

### 1. Check Backend Health
```bash
curl https://your-app-url.com/api/circle/status
```

Should return:
```json
{
  "ok": true,
  "payer": {
    "address": "0x6fd6ab02df737384a67e381055c962603e47fee4",
    "balances": { ... }
  }
}
```

### 2. Test Frontend
Open: `https://your-app-url.com`

Should see the Validly dashboard.

### 3. Run a Test Flow
1. Go to Flow Builder
2. Click Deploy
3. Go to Run Scenario
4. Click "Run scenario"
5. Check if payments execute

---

## Troubleshooting

### "Application failed to respond"
- Check if `PORT` environment variable is set to `8787`
- Check if `NODE_ENV` is set to `production`
- View logs in platform dashboard

### "Circle API Error"
- Verify all Circle environment variables are set
- Check if API key is correct (no extra spaces)
- Test locally first: `npm run dev:full`

### "Cannot GET /api/..."
- Make sure server is serving both frontend and API
- Check `server/index.mjs` is serving static files from `dist/`
- Verify build completed successfully

---

## For Demo Recording

### If Deployed Successfully
- Use your deployment URL
- Everything should work out of the box

### If Deployment Has Issues
- Run locally: `npm run dev:full`
- Use ngrok for public URL: `ngrok http 5173`
- Record from ngrok URL

**Ngrok Setup** (fallback):
```bash
# Install ngrok
brew install ngrok  # Mac
# or download from https://ngrok.com

# Start your app
npm run dev:full

# In another terminal
ngrok http 5173

# Use the ngrok URL for demo
https://xxxx-xx-xx-xx-xx.ngrok.io
```

---

## Final Checklist

- [ ] Code pushed to GitHub
- [ ] Deployed to Railway/Render/Vercel
- [ ] Environment variables set
- [ ] Tested `/api/circle/status` endpoint
- [ ] Frontend loads correctly
- [ ] Can create and deploy a flow
- [ ] Can run a scenario successfully
- [ ] Circle payments work
- [ ] Ready to record demo!

---

## Need Help?

- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs

**Pro Tip**: If you're in a hurry, Railway is the fastest. Just push to GitHub, connect repo, add env vars, and you're live in 5 minutes.

Good luck! 🚀

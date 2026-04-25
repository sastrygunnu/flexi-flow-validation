# 🚀 Quick Deploy Guide - 5 Minutes

## Fastest Option: Vercel (Recommended)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Deploy
```bash
cd /Users/sastrykasibotla/Desktop/hackthon/flexi-flow-validation
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? (choose your account)
- Link to existing project? **N**
- What's your project's name? **validly**
- In which directory is your code located? **.**
- Want to override settings? **N**

### Step 4: Set Environment Variables

Copy-paste this command block (all at once):

```bash
vercel env add CIRCLE_API_KEY production
# Paste: TEST_API_KEY:c0a9ca19df7387f70fb346b81bb3101b:2bcd24e84328fbfd347b9efe7864a75b

vercel env add CIRCLE_ENTITY_SECRET production
# Paste: e8dda4908e96c921d5afa9779ce4394788b3a5e964f3ee1d39f62998efacc3cf

vercel env add PAYER_WALLET_ID production
# Paste: 38a7d65c-54e4-5f5e-a1ad-c8c9ddc32929

vercel env add PAY_TO_ADDRESS production
# Paste: 0x6fd6ab02df737384a67e381055c962603e47fee4

vercel env add BILL_USDC_CENTS production
# Paste: 1

vercel env add CIRCLE_GATEWAY_ENV production
# Paste: testnet

vercel env add ARC_RPC_URL production
# Paste: https://rpc.testnet.arc.network

vercel env add ARC_EXPLORER_BASE_URL production
# Paste: https://testnet.arcscan.app
```

### Step 5: Deploy to Production
```bash
vercel --prod
```

**Done!** Your app is live at the URL shown in the terminal.

---

## Alternative: Railway (Easiest - No CLI needed)

### Step 1: Create GitHub Repository
```bash
cd /Users/sastrykasibotla/Desktop/hackthon/flexi-flow-validation
git init
git add .
git commit -m "Deploy Validly"
```

Create new repo on GitHub:
```bash
gh repo create validly --public --source=. --remote=origin --push
```

### Step 2: Deploy to Railway

1. Go to https://railway.app
2. Click "Start a New Project"
3. Choose "Deploy from GitHub repo"
4. Select your `validly` repository
5. Click "Deploy Now"

### Step 3: Add Environment Variables

In Railway dashboard, go to Variables tab and add:

```
CIRCLE_API_KEY=TEST_API_KEY:c0a9ca19df7387f70fb346b81bb3101b:2bcd24e84328fbfd347b9efe7864a75b
CIRCLE_ENTITY_SECRET=e8dda4908e96c921d5afa9779ce4394788b3a5e964f3ee1d39f62998efacc3cf
PAYER_WALLET_ID=38a7d65c-54e4-5f5e-a1ad-c8c9ddc32929
PAY_TO_ADDRESS=0x6fd6ab02df737384a67e381055c962603e47fee4
BILL_USDC_CENTS=1
CIRCLE_GATEWAY_ENV=testnet
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_EXPLORER_BASE_URL=https://testnet.arcscan.app
PORT=8787
```

### Step 4: Generate Domain

- In Settings → Networking
- Click "Generate Domain"
- Your app will be at: `https://validly-production-xxxx.up.railway.app`

**Done!**

---

## Alternative: Render

### Step 1: Create GitHub Repo (if not done)
```bash
cd /Users/sastrykasibotla/Desktop/hackthon/flexi-flow-validation
git init
git add .
git commit -m "Deploy Validly"
gh repo create validly --public --source=. --remote=origin --push
```

### Step 2: Deploy to Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name**: validly
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run server`

### Step 3: Add Environment Variables

Click "Advanced" → "Add Environment Variable":

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
```

### Step 4: Deploy

- Click "Create Web Service"
- Wait 3-5 minutes
- Your app will be at: `https://validly.onrender.com`

**Done!**

---

## Test Your Deployment

### 1. Check Health
```bash
curl https://your-app-url.com/api/circle/status
```

Should return:
```json
{
  "ok": true,
  "payer": {
    "address": "0x..."
  }
}
```

### 2. Open in Browser
Navigate to: `https://your-app-url.com`

### 3. Quick Test Flow
1. Go to Flow Builder
2. Deploy a flow
3. Go to Run Scenario
4. Run a scenario
5. Check Cost Analytics

---

## Troubleshooting

### Build Fails
Check Node version in platform settings:
- Vercel: Auto-detects from `package.json`
- Railway: Uses latest Node LTS
- Render: Select "Node 20" in settings

### API Returns 500
1. Check environment variables are set correctly
2. View logs:
   - **Vercel**: `vercel logs`
   - **Railway**: Dashboard → Logs tab
   - **Render**: Dashboard → Logs tab

### Circle Payments Not Working
1. Verify Circle API key is valid
2. Check Gateway balance:
   ```bash
   npm run circle:deposit
   ```
3. Test locally first:
   ```bash
   npm run dev:full
   ```

---

## Quick Commands

### Redeploy
```bash
# Vercel
vercel --prod

# Git-based (Railway/Render)
git add .
git commit -m "Update"
git push origin main
```

### View Logs
```bash
# Vercel
vercel logs --follow

# Railway/Render
(Use web dashboard)
```

### Remove Deployment
```bash
# Vercel
vercel rm validly

# Railway/Render
(Use web dashboard → Settings → Delete Service)
```

---

## Next: Record Demo

Once deployed and tested:

1. **Get your URL** (e.g., `https://validly.vercel.app`)
2. **Follow [DEMO_CHECKLIST.md](./DEMO_CHECKLIST.md)**
3. **Record your demo** (5-7 minutes)
4. **Upload to YouTube/Loom**
5. **Submit to hackathon**

---

## Need Help?

- **Vercel**: https://vercel.com/docs
- **Railway**: https://docs.railway.app
- **Render**: https://render.com/docs

Good luck! 🚀

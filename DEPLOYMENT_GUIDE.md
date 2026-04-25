# Validly - Deployment & Demo Guide

## Quick Deploy to Vercel

### Option 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd /Users/sastrykasibotla/Desktop/hackthon/flexi-flow-validation
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add CIRCLE_API_KEY production
   vercel env add CIRCLE_ENTITY_SECRET production
   vercel env add PAYER_WALLET_ID production
   vercel env add PAY_TO_ADDRESS production
   vercel env add BILL_USDC_CENTS production
   vercel env add CIRCLE_GATEWAY_ENV production
   vercel env add ARC_RPC_URL production
   vercel env add ARC_EXPLORER_BASE_URL production
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Option 2: Vercel Dashboard

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Validly project"
   gh repo create validly --public --source=. --remote=origin --push
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Configure build settings:
     - Framework Preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

3. **Add Environment Variables** (in Vercel Dashboard)
   ```
   CIRCLE_API_KEY=TEST_API_KEY:c0a9ca19df7387f70fb346b81bb3101b:2bcd24e84328fbfd347b9efe7864a75b
   CIRCLE_ENTITY_SECRET=e8dda4908e96c921d5afa9779ce4394788b3a5e964f3ee1d39f62998efacc3cf
   PAYER_WALLET_ID=38a7d65c-54e4-5f5e-a1ad-c8c9ddc32929
   PAY_TO_ADDRESS=0x6fd6ab02df737384a67e381055c962603e47fee4
   BILL_USDC_CENTS=1
   CIRCLE_GATEWAY_ENV=testnet
   ARC_RPC_URL=https://rpc.testnet.arc.network
   ARC_EXPLORER_BASE_URL=https://testnet.arcscan.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

---

## Alternative: Deploy to Netlify

### Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login**
   ```bash
   netlify login
   ```

3. **Initialize**
   ```bash
   netlify init
   ```

4. **Deploy**
   ```bash
   netlify deploy --prod
   ```

### Netlify Configuration

Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server/:splat"
  status = 200

[dev]
  command = "npm run dev:full"
  port = 8788
  targetPort = 5173
```

---

## Alternative: Deploy to Render

1. **Create `render.yaml`**
   ```yaml
   services:
     - type: web
       name: validly
       runtime: node
       buildCommand: npm install && npm run build
       startCommand: npm run server
       envVars:
         - key: NODE_ENV
           value: production
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
   ```

2. **Push to GitHub**
3. **Connect to Render** (https://dashboard.render.com)
4. **Deploy from repository**

---

## Demo Recording Script

### Pre-Demo Checklist

- [ ] Deploy to Vercel/Netlify/Render
- [ ] Verify environment variables are set
- [ ] Test Circle Gateway balance (should have at least 5 USDC)
- [ ] Clear browser cache
- [ ] Test flow end-to-end once
- [ ] Prepare Arc Explorer tab (https://testnet.arcscan.app)
- [ ] Prepare Circle Console tab (https://console.circle.com)
- [ ] Screen recording software ready (Loom, OBS, QuickTime)

### Demo Script (5-7 minutes)

#### **Scene 1: Introduction (30 seconds)**
```
"Hi! I'm showing you Validly - a unified API platform for user validation
with pay-per-use pricing powered by Circle Gateway nanopayments.

The problem we solve: Traditional payment APIs are too expensive for
sub-dollar transactions. Our validation steps cost between 0.3 cents and
95 cents - way below traditional blockchain gas fees.

Circle Gateway's off-chain ledger with nanosecond settlement makes this viable."
```

#### **Scene 2: Flow Builder (1.5 minutes)**
1. Open deployed URL: `https://your-project.vercel.app`
2. Navigate to **Flow Builder** tab
3. Show the step library:
   - "Here we have 6 validation steps: Phone, Email, Identity, Address, Bank, Fraud"
4. Drag steps to canvas:
   - Drag "Phone OTP" → "Email Verification" → "Identity Check"
5. Click on a step to change provider:
   - "Notice each provider has different pricing - we support multiple vendors"
   - Switch Identity from Persona ($0.85) to Stripe Identity ($0.95)
6. Show total cost updating:
   - "Total cost per user: $1.247 - all charged via Circle Gateway"
7. Click **Deploy**:
   - "Flow saved! Now let's test it."

#### **Scene 3: Run Scenario (2 minutes)**
1. Navigate to **Run Scenario** tab
2. Show scenario configuration:
   - Flow: `us_onboarding`
   - Scenario: `All success (paid demo)`
3. Click **Run scenario**
4. Show real-time execution:
   - "Watch each step execute in real-time"
   - Point to status badges changing: Queued → Calling → Success
   - Point to payment status: Pending → Paid
5. Show payment details expanding:
   - "Here's the Circle Gateway payment receipt"
   - Amount: 0.007000 USDC
   - Rail: Circle Gateway x402
   - Settlement: 423 nanoseconds
   - Gateway Transfer ID (click JSON link)
6. Show Arc transaction (if available):
   - "Once Circle batches the payment, we get an Arc blockchain hash"
   - Click Arc Explorer link

#### **Scene 4: Cost Analytics (1.5 minutes)**
1. Navigate to **Cost Analytics** tab
2. Show stats:
   - "Total settled: 1.2470 USDC"
   - "5 nanopayments emitted"
   - "Average finality: 487 nanoseconds"
3. Show charts:
   - **Cost per flow**: Bar chart showing spend per flow
   - **Provider spend share**: Pie chart showing Stripe, Plaid, Google, etc.
   - **Payment settlement speed**: Line chart showing sub-second finality
4. Show Recent Payments table:
   - Scroll through payment history
   - Show Arc transaction links
   - Show Gateway transfer IDs

#### **Scene 5: Audit Logs (1 minute)**
1. Navigate to **Audit Logs** tab
2. Show filters:
   - Filter by step type
   - Filter by status
3. Expand a log entry:
   - Show input/output params
   - Show payment receipt with full details:
     - Payer wallet
     - Payee wallet
     - Arc tx hash
     - Nanopayment ID
4. Click **Export CSV**:
   - "All logs exportable for compliance"

#### **Scene 6: Circle Gateway Demo (1 minute)**
1. Open Arc Explorer in new tab
2. Search for a recent transaction hash
3. Show transaction details:
   - From: Your payer wallet
   - To: Provider wallet
   - Value: 0.007000 USDC
   - Status: Confirmed
4. Go back to Validly
5. Show how changing providers updates pricing:
   - Switch Identity provider from Stripe → Onfido ($0.75)
   - Cost updates instantly
   - Re-deploy and run

#### **Scene 7: Closing (30 seconds)**
```
"That's Validly! Key features:
- Pay-per-use validation API with 6 verification types
- Circle Gateway nanopayments enable sub-dollar transactions
- Nanosecond settlement on Arc testnet
- Real-time payment tracking and analytics
- Provider-agnostic: switch vendors without code changes

Perfect for fintech apps, KYC flows, and any use case needing
micropayment-based API billing.

Built in 48 hours for the Circle hackathon. Thanks for watching!"
```

### Recording Tips

1. **Screen Setup**
   - Use 1920x1080 resolution
   - Hide bookmarks bar
   - Close unnecessary tabs
   - Use incognito mode for clean UI

2. **Audio**
   - Use external microphone if possible
   - Record in quiet room
   - Speak clearly and slowly

3. **Video**
   - Use Loom (easiest): https://loom.com
   - Or OBS Studio (free, powerful): https://obsproject.com
   - Or QuickTime (Mac): Screen Recording

4. **Pacing**
   - Pause between sections
   - Move mouse slowly
   - Wait for animations to complete

5. **Backup Plan**
   - Record 2-3 takes
   - Have screenshots as fallback
   - Test everything before final recording

---

## Quick Test Deployment

### Local Test First

```bash
# Build the project
npm run build

# Test the build
npm run preview

# Open http://localhost:4173
```

### Deploy Test

```bash
# Deploy to Vercel (test)
vercel

# Get preview URL
# Test all features
# If working, deploy to production:
vercel --prod
```

---

## Troubleshooting

### Build Fails
- Check Node.js version (need v20+)
- Clear `node_modules`: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist`

### API Not Working
- Verify environment variables in Vercel dashboard
- Check server logs in Vercel deployment logs
- Test Circle API connection: `curl https://your-app.vercel.app/api/circle/status`

### Payments Failing
- Check Circle Gateway balance: `npm run circle:deposit`
- Verify Circle API key is valid
- Check Arc RPC URL is accessible

---

## Post-Deployment

### Update README

Add live demo link:
```markdown
## 🚀 Live Demo

**Live App**: https://validly.vercel.app

**Demo Video**: [Watch on Loom](your-loom-link)
```

### Share Links

- Deployment URL
- Demo video
- GitHub repository
- Arc Explorer transactions

---

## Quick Commands Reference

```bash
# Deploy to Vercel
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Remove deployment
vercel rm validly

# Environment variables
vercel env ls
vercel env add VARIABLE_NAME
vercel env pull .env.local
```

---

## Next Steps After Demo

1. **Upload demo video** to:
   - Loom
   - YouTube
   - Vimeo

2. **Update hackathon submission** with:
   - Live URL
   - Demo video link
   - GitHub repository
   - Circle product feedback (from previous response)

3. **Social media** (optional):
   - Tweet demo video
   - LinkedIn post
   - Dev.to article

4. **Backup everything**:
   - Code to GitHub
   - Video to cloud storage
   - Screenshots to Dropbox

Good luck! 🚀

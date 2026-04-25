# 🚀 Deploy & Demo - Quick Reference

## ⚡ Fastest Deployment: Railway (5 minutes)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Validly - Circle Hackathon"
gh repo create validly --public --source=. --remote=origin --push
```

### 2. Deploy
1. Go to **https://railway.app**
2. Click **"Deploy from GitHub repo"**
3. Select **validly**
4. Add these environment variables:

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

5. Click **"Generate Domain"**
6. **Done!** Test at your Railway URL

---

## 🎬 Record Demo (7 minutes)

### Setup (5 min)
1. Install Loom: https://loom.com
2. Test your deployment
3. Clear browser cache
4. Practice once

### Recording Script
**0:00-0:30** - Intro: "Validly solves micropayment problem with Circle Gateway"

**0:30-2:00** - Flow Builder
- Drag Phone → Email → Identity steps
- Show provider pricing
- Click Deploy

**2:00-4:00** - Run Scenario
- Select "All success"
- Click Run
- Show live Circle payments
- Expand payment receipt
- Click Arc Explorer link

**4:00-5:30** - Cost Analytics
- Show total USDC spent
- Point to settlement speed graph
- Show payment history

**5:30-6:30** - Audit Logs
- Expand a log
- Show payment details
- Export CSV

**6:30-7:00** - Closing: "Sub-second payments, pay-per-use, production-ready"

---

## 📋 Submission Checklist

- [ ] Deploy to Railway/Render
- [ ] Test deployment works
- [ ] Record demo video
- [ ] Upload to YouTube/Loom
- [ ] Fill hackathon form:
  - [ ] Project name: **Validly**
  - [ ] Live URL: [Your Railway URL]
  - [ ] Video: [Your Loom link]
  - [ ] GitHub: [Your repo]
  - [ ] Circle feedback: [See HACKATHON_SUBMISSION.md]
- [ ] Submit before deadline!

---

## 🆘 Quick Fixes

### Deployment fails?
→ Check environment variables in Railway dashboard

### Circle API errors?
→ Verify `CIRCLE_API_KEY` has no extra spaces

### Need to demo NOW?
→ Run locally: `npm run dev:full` and use http://localhost:5173

### Want public URL for local demo?
```bash
npx ngrok http 5173
# Use ngrok URL for demo
```

---

## 📦 Files You Need

✅ All deployment files are ready:
- `render.yaml` - Render config
- `vercel.json` - Vercel config
- `.vercelignore` - Ignore rules
- `SIMPLE_DEPLOY.md` - Full deployment guide
- `DEMO_CHECKLIST.md` - Recording checklist
- `HACKATHON_SUBMISSION.md` - Submission content

---

## 🎯 Demo URLs

**Your app**: [Add after deployment]

**Test these work**:
- [ ] Frontend loads
- [ ] Flow Builder works
- [ ] Scenario runs successfully
- [ ] Payments process
- [ ] Analytics show data

---

## ⏱️ Time Budget

- Deploy: **5 min**
- Test: **5 min**
- Practice demo: **10 min**
- Record demo: **20 min**
- Submit: **10 min**

**Total: 50 minutes** 🚀

---

**You got this!** Follow Railway deployment, test once, record demo, submit. Simple as that.

Good luck! 🎉

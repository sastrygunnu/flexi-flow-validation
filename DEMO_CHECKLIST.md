# Demo Recording Checklist

## Pre-Recording Setup (30 minutes before)

### System Preparation
- [ ] Close all unnecessary applications
- [ ] Disable notifications (Do Not Disturb mode)
- [ ] Set screen resolution to 1920x1080
- [ ] Charge laptop to 100%
- [ ] Clear browser cache and cookies
- [ ] Use incognito/private browser window
- [ ] Hide bookmarks bar in browser
- [ ] Prepare external microphone (if available)
- [ ] Test audio levels

### Application Preparation
- [ ] Deploy to Vercel/Netlify
- [ ] Get production URL
- [ ] Test deployment thoroughly
- [ ] Verify all environment variables are set
- [ ] Check Circle Gateway balance (≥5 USDC)
- [ ] Run one test flow end-to-end
- [ ] Clear any test data if needed
- [ ] Bookmark key pages:
  - [ ] Deployed app URL
  - [ ] Arc Explorer: https://testnet.arcscan.app
  - [ ] Circle Console: https://console.circle.com

### Recording Software
- [ ] Install/update recording software:
  - **Option 1**: Loom (https://loom.com) - easiest
  - **Option 2**: OBS Studio (https://obsproject.com) - free
  - **Option 3**: QuickTime (Mac only)
- [ ] Configure recording settings:
  - [ ] 1080p resolution
  - [ ] 30 fps
  - [ ] System audio + microphone
- [ ] Do a 10-second test recording
- [ ] Verify video and audio quality

### Script Preparation
- [ ] Print demo script
- [ ] Practice demo 2-3 times
- [ ] Time yourself (target: 5-7 minutes)
- [ ] Prepare talking points for each section
- [ ] Have backup phrases ready if something fails

---

## During Recording

### Introduction (30 seconds)
- [ ] Open deployed app URL
- [ ] Show dashboard overview
- [ ] Explain the problem Validly solves
- [ ] Mention Circle Gateway nanopayments

### Flow Builder Demo (1.5 minutes)
- [ ] Navigate to Flow Builder tab
- [ ] Show step library (6 validation types)
- [ ] Drag 3-4 steps to canvas
- [ ] Change a provider to show pricing updates
- [ ] Show total cost calculation
- [ ] Click Deploy button
- [ ] Wait for success toast

### Run Scenario Demo (2 minutes)
- [ ] Navigate to Run Scenario tab
- [ ] Show scenario configuration
- [ ] Select "All success (paid demo)"
- [ ] Click Run scenario
- [ ] Show real-time step execution
- [ ] Point out status changes (Queued → Calling → Success)
- [ ] Point out payment status (Pending → Paid)
- [ ] Expand a payment receipt
- [ ] Show Circle Gateway transfer ID
- [ ] Show Arc transaction hash (if available)
- [ ] Click Arc Explorer link (new tab)
- [ ] Show confirmed transaction on Arc

### Cost Analytics Demo (1.5 minutes)
- [ ] Navigate to Cost Analytics tab
- [ ] Show top stats (Total settled, Nanopayments, Avg finality)
- [ ] Explain each chart:
  - [ ] Cost per flow bar chart
  - [ ] Provider spend share pie chart
  - [ ] Payment settlement speed line chart
- [ ] Show Recent Payments table
- [ ] Click through a few payment details
- [ ] Show Arc Explorer links

### Audit Logs Demo (1 minute)
- [ ] Navigate to Audit Logs tab
- [ ] Show search and filter controls
- [ ] Filter by step type
- [ ] Expand a log entry
- [ ] Show input/output params
- [ ] Show full payment receipt details
- [ ] Click Export CSV button
- [ ] Show downloaded file briefly

### Closing (30 seconds)
- [ ] Summarize key features
- [ ] Emphasize Circle Gateway benefits
- [ ] Show nanosecond settlement speed
- [ ] Thank viewers

---

## Post-Recording

### Video Review
- [ ] Watch entire recording
- [ ] Check audio quality (clear, no background noise)
- [ ] Check video quality (smooth, no lag)
- [ ] Verify all features demonstrated
- [ ] Note timestamp for any errors
- [ ] Decide: use as-is or re-record?

### Video Editing (optional)
- [ ] Trim beginning/end
- [ ] Add title card with project name
- [ ] Add captions/subtitles
- [ ] Add background music (low volume)
- [ ] Add call-to-action at end
- [ ] Export in 1080p

### Video Upload
- [ ] Upload to YouTube (unlisted or public)
  - [ ] Title: "Validly - Pay-per-use Validation API with Circle Gateway"
  - [ ] Description: Include links (app, GitHub, Circle)
  - [ ] Tags: Circle, USDC, blockchain, fintech, API, nanopayments
  - [ ] Thumbnail: Screenshot of dashboard
- [ ] Upload to Loom (easier sharing)
- [ ] Backup video file to cloud storage

### Update Documentation
- [ ] Add demo video link to README
- [ ] Add deployment URL to README
- [ ] Update hackathon submission form
- [ ] Create social media posts
- [ ] Share with team/friends for feedback

---

## Backup Plan

### If Live Demo Fails
- [ ] Have pre-recorded video ready
- [ ] Have screenshots of each feature
- [ ] Have static data/mock mode enabled

### If Deployment Issues
- [ ] Run locally: `npm run dev:full`
- [ ] Use ngrok for public URL: `ngrok http 5173`
- [ ] Record from localhost (not ideal but works)

### If Circle API Issues
- [ ] Show cached data
- [ ] Explain what would happen
- [ ] Show previous successful transactions

---

## Quick Reference URLs

```
Production App: https://your-project.vercel.app
Arc Explorer:   https://testnet.arcscan.app
Circle Console: https://console.circle.com
GitHub Repo:    https://github.com/yourusername/validly
Loom Video:     [Add after recording]
```

---

## Recording Environment Setup

### Ideal Setup
- Quiet room with no background noise
- Good lighting (facing window or desk lamp)
- Stable internet connection
- Browser window maximized
- Dark mode theme (easier on eyes in video)
- Cursor visible and not too fast

### Audio Tips
- Speak clearly and at moderate pace
- Pause between sections
- Don't say "um" or "uh"
- If you mess up, pause 3 seconds and re-do that sentence
- Edit silence out later

### Video Tips
- Move mouse slowly and deliberately
- Wait for animations to complete
- Highlight important UI elements
- Don't click too fast
- Zoom in on small text if needed

---

## Time Allocation

Total: 5-7 minutes

1. Introduction: 0:00 - 0:30
2. Flow Builder: 0:30 - 2:00
3. Run Scenario: 2:00 - 4:00
4. Cost Analytics: 4:00 - 5:30
5. Audit Logs: 5:30 - 6:30
6. Closing: 6:30 - 7:00

---

## Emergency Contacts

- Vercel Support: https://vercel.com/support
- Circle Support: support@circle.com
- Arc Network: [Discord/Telegram]

---

## Final Check Before Recording

- [ ] Bathroom break
- [ ] Water nearby
- [ ] Phone on silent
- [ ] Door locked/sign posted
- [ ] "Recording" status on Slack/Teams
- [ ] Deep breath - you got this! 🚀

---

## After Submission

- [ ] Celebrate! 🎉
- [ ] Rest
- [ ] Check feedback
- [ ] Respond to questions
- [ ] Network with other participants
- [ ] Wait for results

Good luck with your demo! Remember: even if something goes wrong, stay calm and keep going. Judges care about the concept and execution, not perfection.

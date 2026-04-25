# Transfer USDC from MetaMask to Circle Wallet

## Your Circle Wallet Address

First, let's get your Circle Developer Controlled Wallet address where you'll send the funds.

Run this command to see your wallet address:
```bash
curl -s http://localhost:8787/api/circle/status | jq -r '.payer.address'
```

Or check your `.env` file - the wallet address is associated with `PAYER_WALLET_ID`.

## Step-by-Step: MetaMask → Circle Wallet

### Option 1: Using MetaMask (Easiest)

1. **Open MetaMask** and switch to Arc Testnet network

   If you don't have Arc Testnet added, add it manually:
   - Network Name: `Arc Testnet`
   - RPC URL: `https://rpc.testnet.arc.network`
   - Chain ID: `5042002`
   - Currency Symbol: `ARC`
   - Block Explorer: `https://testnet.arcscan.app`

2. **Get USDC on Arc Testnet**

   You need USDC on Arc Testnet (not Ethereum or other chains).

   **Option A: Use Circle Faucet**
   - Go to: https://faucet.circle.com/
   - Select "Arc Testnet"
   - Enter your MetaMask address
   - Get 10 USDC per hour

   **Option B: Bridge from another testnet**
   - If you have USDC on another testnet (Ethereum Sepolia, Base Sepolia, etc.)
   - Use Circle's CCTP (Cross-Chain Transfer Protocol)
   - Visit: https://www.circle.com/en/usdc/testnet-faucet

3. **Send USDC to your Circle Wallet**

   In MetaMask:
   - Click "Send"
   - Paste your Circle wallet address: `0xa7ebedb66d2fb65ab748ae6226fc773fe388afa5`
   - Enter amount (e.g., 10 USDC)
   - Select USDC token (address: `0x3600000000000000000000000000000000000000`)
   - Confirm and send!

4. **Wait for confirmation** (~2-3 seconds on Arc)

5. **Verify the balance**
   ```bash
   curl -s http://localhost:8787/api/circle/status | jq '.payerBalances, .onchain'
   ```

### Option 2: Using Circle API (Programmatic)

If you want to import your MetaMask wallet into Circle (not recommended for production):

1. **Export Private Key from MetaMask**
   - Open MetaMask
   - Click the 3 dots → Account Details → Export Private Key
   - Enter password and copy the key

   ⚠️ **Warning**: Never share this key or commit it to git!

2. **Import to Circle** (Circle doesn't support importing existing wallets directly)

   Instead, just send USDC from MetaMask to your Circle wallet address (Option 1 above is better).

### Option 3: Get Testnet USDC Directly to Circle Wallet

**Easiest if you don't have USDC yet:**

1. **Get your Circle wallet address**
   ```bash
   curl -s http://localhost:8787/api/circle/status | jq -r '.payer.address'
   ```

   Result: `0xa7ebedb66d2fb65ab748ae6226fc773fe388afa5`

2. **Use Circle's Faucet**
   - Visit: https://faucet.circle.com/
   - Network: Arc Testnet
   - Paste: `0xa7ebedb66d2fb65ab748ae6226fc773fe388afa5`
   - Click "Get USDC"
   - Repeat every hour if needed (10 USDC per hour)

3. **Check balance**
   ```bash
   curl -s http://localhost:8787/api/circle/status | jq '.payerBalances.usdc.amount'
   ```

## Complete Flow: MetaMask → Circle → Gateway

Here's the full journey your USDC takes:

```
┌─────────────────────────┐
│   YOUR METAMASK WALLET  │
│   (Any address you own) │
│   ┌─────────────────┐   │
│   │ 100 USDC        │   │
│   └─────────────────┘   │
└─────────────────────────┘
           │
           │ Step 1: Send USDC to Circle wallet
           │ (Using MetaMask send function)
           ↓
┌─────────────────────────────────────────┐
│   CIRCLE DEVELOPER CONTROLLED WALLET    │
│   0xa7ebedb66d2fb65ab748ae6226fc773fe388afa5  │
│   ┌─────────────────┐                   │
│   │ 100 USDC ✅     │                   │
│   └─────────────────┘                   │
└─────────────────────────────────────────┘
           │
           │ Step 2: Deposit to Gateway
           │ npm run circle:deposit -- --amount 10
           ↓
┌─────────────────────────────────────────┐
│   CIRCLE GATEWAY CONTRACT               │
│   0x0077777d7EBA4688BDeF3E311b846F25870A19B9  │
│   ┌─────────────────┐                   │
│   │ 10 USDC ✅      │                   │
│   └─────────────────┘                   │
│   Now x402 payments work! 🎉            │
└─────────────────────────────────────────┘
```

## Quick Reference

### Your Addresses

```bash
# Check your Circle wallet address
curl -s http://localhost:8787/api/circle/status | jq -r '.payer.address'

# Check Circle wallet balance
curl -s http://localhost:8787/api/circle/status | jq '.payerBalances.usdc.amount'

# Check onchain balance (direct blockchain query)
curl -s http://localhost:8787/api/circle/status | jq '.onchain.usdc.decimal'
```

### Important Addresses on Arc Testnet

- **USDC Token**: `0x3600000000000000000000000000000000000000`
- **Gateway Contract**: `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`
- **Your Circle Wallet**: `0xa7ebedb66d2fb65ab748ae6226fc773fe388afa5`

### Arc Testnet Network Config

Add to MetaMask:
```
Network Name: Arc Testnet
RPC URL: https://rpc.testnet.arc.network
Chain ID: 5042002
Currency Symbol: ARC
Block Explorer: https://testnet.arcscan.app
```

## Troubleshooting

### "I don't see USDC in MetaMask"

Add the USDC token manually:
1. MetaMask → Assets → Import Tokens
2. Token Address: `0x3600000000000000000000000000000000000000`
3. Symbol: USDC
4. Decimals: 6

### "Transaction failed"

- Make sure you're on Arc Testnet network
- Make sure you have some ARC tokens for gas (get from Arc faucet)
- Verify the USDC contract address is correct

### "I sent to wrong network"

If you sent USDC on Ethereum/Polygon/etc instead of Arc:
1. Use Circle's CCTP bridge to transfer to Arc Testnet
2. Or get fresh USDC on Arc from the faucet

## Recommended Approach

**For testing (easiest):**
```bash
# Just use the Circle faucet directly to your Circle wallet
# No need to involve MetaMask at all!

# 1. Get your Circle address
curl -s http://localhost:8787/api/circle/status | jq -r '.payer.address'

# 2. Visit https://faucet.circle.com/
#    - Network: Arc Testnet
#    - Address: 0xa7ebedb66d2fb65ab748ae6226fc773fe388afa5
#    - Get 10 USDC

# 3. Deposit to Gateway
npm run circle:deposit -- --amount 10

# Done! ✅
```

**For production (when you have real USDC):**
```bash
# 1. Send USDC from MetaMask to Circle wallet address
#    (using MetaMask UI on Arc Testnet)

# 2. Wait for confirmation

# 3. Deposit to Gateway
npm run circle:deposit -- --amount 10
```

---

**Need Help?**
- Circle Faucet: https://faucet.circle.com/
- Arc Explorer: https://testnet.arcscan.app
- Check your status: `curl http://localhost:8787/api/circle/status | jq`

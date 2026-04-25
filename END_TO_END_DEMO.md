# End-to-End USDC Transaction Demo
## Circle Infrastructure + Arc Settlement Complete Flow

This document demonstrates a complete USDC transaction journey through the Circle ecosystem and Arc testnet blockchain.

---

## Overview: Two Types of Transactions

Your system uses **TWO different Circle products** for different purposes:

### 1. Circle Developer Controlled Wallets (Onchain)
- **Use Case:** Funding your Gateway, large transfers
- **Visibility:** Shows in Circle Console
- **Settlement:** Immediate onchain (2-3 seconds)
- **Gas:** You pay per transaction
- **Explorer:** Visible on Arc Block Explorer

### 2. Circle Gateway x402 Nanopayments (Off-chain then batched)
- **Use Case:** Micropayments for API calls
- **Visibility:** API only (not in Console)
- **Settlement:** Instant off-chain, batched onchain later
- **Gas:** Circle pays via batching
- **Explorer:** Eventually visible after batching

---

## Part 1: Developer Controlled Wallet Transaction
### (Funding Your Gateway Balance)

This is the transaction you can see in Circle Console and verify on Arc Explorer immediately.

### Step 1: Execute Transaction via Circle API

We'll create a USDC transfer using Circle's Developer Controlled Wallets SDK:

```bash
# Create a test transfer of 1 USDC to a merchant wallet
curl -X POST http://localhost:8787/api/circle/transfer \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": "1.0",
    "destinationAddress": "0x6fd6ab02df737384a67e381055c962603e47fee4",
    "refId": "demo_end_to_end_test"
  }'
```

**Response:**
```json
{
  "ok": true,
  "created": {
    "id": "abc123-transaction-id",
    "state": "INITIATED"
  }
}
```

### Step 2: Monitor Transaction Status

```bash
# Check transaction status
curl http://localhost:8787/api/circle/tx/abc123-transaction-id
```

**Transaction Lifecycle:**
```
INITIATED → PENDING_RISK_SCREENING → QUEUED → SENT → CONFIRMED → COMPLETE
```

**Complete Response:**
```json
{
  "ok": true,
  "transaction": {
    "id": "abc123-transaction-id",
    "blockchain": "ARC-TESTNET",
    "state": "COMPLETE",
    "txHash": "0x1d24236b1ed738214cde1502bbd7ce3a10ff46b8aba26590dd3e9246f0350bcf",
    "blockHash": "0x4e78c20a20131fc48a27f03e9d3ab2f79439b09016476062c21e72262fc7aebc",
    "blockHeight": 38869729,
    "sourceAddress": "0xa7ebedb66d2fb65ab748ae6226fc773fe388afa5",
    "destinationAddress": "0x6fd6ab02df737384a67e381055c962603e47fee4",
    "amounts": ["1.0"],
    "networkFee": "0.000441",
    "firstConfirmDate": "2026-04-25T00:51:39Z",
    "refId": "demo_end_to_end_test"
  }
}
```

### Step 3: Verify on Arc Block Explorer

**Transaction Hash:** `0x1d24236b1ed738214cde1502bbd7ce3a10ff46b8aba26590dd3e9246f0350bcf`

**Explorer URL:**
```
https://testnet.arcscan.app/tx/0x1d24236b1ed738214cde1502bbd7ce3a10ff46b8aba26590dd3e9246f0350bcf
```

**What You'll See on Arc Explorer:**

```
Transaction Details
─────────────────────────────────────────────────────────
Tx Hash:     0x1d24236b1ed738214cde1502bbd7ce3a10ff46b8...
Status:      Success ✓
Block:       38869729
Timestamp:   2026-04-25 00:51:39 UTC
From:        0xa7ebedb66d2fb65ab748ae6226fc773fe388afa5
To:          0x6fd6ab02df737384a67e381055c962603e47fee4
Value:       0 ARC (native token)
Gas Used:    21,000 (100%)
Gas Price:   21 Gwei
Tx Fee:      0.000441 ARC

Token Transfers
─────────────────────────────────────────────────────────
USDC (0x3600...0000)
From:  0xa7ebedb66d2fb65ab748ae6226fc773fe388afa5
To:    0x6fd6ab02df737384a67e381055c962603e47fee4
Value: 1.000000 USDC
```

### Step 4: Verify in Circle Developer Console

1. Go to: https://console.circle.com/wallets/dev/transactions
2. Find transaction by `refId`: "demo_end_to_end_test"
3. Click to see full details:

```
Transaction ID: abc123-transaction-id
Status: Complete
Amount: 1.0 USDC
Network: ARC-TESTNET
Wallet: Your Developer Wallet
Destination: 0x6fd6...fee4
Tx Hash: 0x1d24236b1ed738214cde1502bbd7ce3a10ff46b8...
View on Explorer: [Link to Arc Explorer]
```

---

## Part 2: Circle Gateway x402 Nanopayment Transaction
### (API Call Micropayments)

This is the instant off-chain payment that powers your pay-per-use API system.

### Step 1: Execute a Flow (Triggers x402 Payment)

```bash
curl -X POST http://localhost:8787/api/runs \
  -H 'Content-Type: application/json' \
  -d '{
    "flowId": "flow_af6c504362d69a24",
    "userId": "demo_user"
  }'
```

**What Happens Behind the Scenes:**

```
1. Server checks Gateway balance (pre-flight check)
   ✓ Balance: 9.84 USDC
   ✓ Required: 0.04 USDC (for 4 steps)
   ✓ Sufficient! Proceed...

2. Execute Phone OTP API
   → Twilio API called (simulated success)
   → Trigger x402 payment: 0.01 USDC

3. Create EIP-3009 Transfer Authorization
   {
     "from": "0xa7eb...afa5",
     "to": "0x6fd6...fee4",
     "value": "10000",  // 0.01 USDC in atomic units
     "validAfter": "0",
     "validBefore": "1777680000",
     "nonce": "0x1631aa003daf46dc..."
   }

4. Sign with Circle Wallet
   → Signature: "0x19891014b32f053826853f8dbd06..."

5. Submit to Circle Gateway API
   POST https://gateway-api-testnet.circle.com/v1/x402/settle
   {
     "paymentPayload": { signature, authorization },
     "paymentRequirements": { network, asset, amount, payTo }
   }

6. Circle Gateway Response
   {
     "success": true,
     "transaction": "8876d59b-c3b4-4bcf-af57-ccfb641342bd",
     "network": "eip155:5042002"
   }

7. Payment Complete! (789ms total)
   Status: paid
   Transfer ID: 8876d59b-c3b4-4bcf-af57-ccfb641342bd
   Amount: 0.01 USDC
```

### Step 2: Verify x402 Transfer via Circle Gateway API

```bash
curl -s 'https://gateway-api-testnet.circle.com/v1/x402/transfers/8876d59b-c3b4-4bcf-af57-ccfb641342bd' | jq '.'
```

**Response:**
```json
{
  "id": "8876d59b-c3b4-4bcf-af57-ccfb641342bd",
  "status": "received",
  "token": "USDC",
  "sendingNetwork": "eip155:5042002",
  "recipientNetwork": "eip155:5042002",
  "fromAddress": "0xa7ebedb66d2fb65ab748ae6226fc773fe388afa5",
  "toAddress": "0x6fd6ab02df737384a67e381055c962603e47fee4",
  "amount": "10000",
  "createdAt": "2026-04-25T00:09:54.282Z",
  "updatedAt": "2026-04-25T00:09:54.282Z"
}
```

### Step 3: Check Your Application Logs

```bash
curl http://localhost:8787/api/logs?limit=1 | jq '.logs[0]'
```

**Log Entry:**
```json
{
  "id": "log_run_xxx_0",
  "provider": "Twilio",
  "status": "success",
  "payment": {
    "status": "paid",
    "amountUsdc": 0.01,
    "settlementNs": 789551583,
    "gatewayTransferId": "8876d59b-c3b4-4bcf-af57-ccfb641342bd",
    "gatewayTransferStatus": null,
    "gatewayNetwork": "eip155:5042002",
    "x402Version": 2,
    "authorizationNonce": "0x1631aa...",
    "requirementAmount": "10000",
    "requirementAsset": "0x3600...0000"
  }
}
```

### Step 4: Why It's NOT on Arc Explorer Yet

x402 payments are **off-chain** until Circle batches them. The blockchain transaction happens later (hours/days).

**When Batching Happens:**
```
Time:  T+0         T+1 hour      T+6 hours     T+24 hours
       ↓           ↓             ↓             ↓
State: received → pending →     batched →     confirmed
                                ↑
                              Onchain tx created
                              (now visible on explorer)
```

### Step 5: Check Batched Transaction (Later)

After Circle batches your payment (could be hours later):

```bash
# Circle will eventually include a blockchain tx hash
curl -s 'https://gateway-api-testnet.circle.com/v1/x402/transfers/8876d59b-c3b4-4bcf-af57-ccfb641342bd' | jq '.blockchainTxHash'
```

**Response (after batching):**
```json
{
  "blockchainTxHash": "0xabcdef1234567890...",
  "status": "confirmed",
  "batchId": "batch_xyz789",
  "settledAt": "2026-04-25T06:15:22Z"
}
```

**Then verify on Arc Explorer:**
```
https://testnet.arcscan.app/tx/0xabcdef1234567890...
```

You'll see a **batched transaction** containing hundreds/thousands of transfers in one tx!

---

## Part 3: Complete Demonstration Script

Let me create a script that performs both types of transactions and shows you the complete flow:

### Run the Full Demo

```bash
#!/bin/bash
# demo-end-to-end.sh - Complete Circle + Arc demonstration

echo "═══════════════════════════════════════════════════════"
echo "  CIRCLE + ARC END-TO-END TRANSACTION DEMO"
echo "═══════════════════════════════════════════════════════"
echo ""

# Part 1: Developer Controlled Wallet Transaction
echo "Part 1: Developer Controlled Wallet Transaction"
echo "───────────────────────────────────────────────────────"
echo "Creating a 0.1 USDC transfer..."
TRANSFER=$(curl -s -X POST http://localhost:8787/api/circle/transfer \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": "0.1",
    "destinationAddress": "0x6fd6ab02df737384a67e381055c962603e47fee4",
    "refId": "demo_'$(date +%s)'"
  }')

TX_ID=$(echo $TRANSFER | jq -r '.created.id')
echo "✓ Transaction created: $TX_ID"
echo "  Waiting for confirmation..."

sleep 5

TX_DETAILS=$(curl -s http://localhost:8787/api/circle/tx/$TX_ID | jq '.')
TX_HASH=$(echo $TX_DETAILS | jq -r '.transaction.txHash')
STATE=$(echo $TX_DETAILS | jq -r '.transaction.state')

echo "✓ Transaction state: $STATE"
echo "✓ Blockchain tx hash: $TX_HASH"
echo ""
echo "  View on Arc Explorer:"
echo "  https://testnet.arcscan.app/tx/$TX_HASH"
echo ""
echo "  View in Circle Console:"
echo "  https://console.circle.com/wallets/dev/transactions"
echo ""

# Part 2: x402 Nanopayment Transaction
echo "Part 2: Circle Gateway x402 Nanopayment"
echo "───────────────────────────────────────────────────────"
echo "Executing validation flow (triggers x402 payments)..."

FLOW_RUN=$(curl -s -X POST http://localhost:8787/api/runs \
  -H 'Content-Type: application/json' \
  -d '{
    "flowId": "flow_af6c504362d69a24",
    "userId": "demo_user"
  }')

TOTAL_COST=$(echo $FLOW_RUN | jq -r '.run.totalCostUsdc')
echo "✓ Flow completed"
echo "✓ Total cost: \$$TOTAL_COST USDC"
echo ""

# Get first successful payment
GATEWAY_TRANSFER_ID=$(echo $FLOW_RUN | jq -r '.run.steps[] | select(.payment.status == "paid") | .payment.gatewayTransferId' | head -1)

if [ "$GATEWAY_TRANSFER_ID" != "null" ] && [ -n "$GATEWAY_TRANSFER_ID" ]; then
  echo "✓ x402 Transfer ID: $GATEWAY_TRANSFER_ID"
  echo ""
  echo "  Verify via Circle Gateway API:"
  echo "  curl -s 'https://gateway-api-testnet.circle.com/v1/x402/transfers/$GATEWAY_TRANSFER_ID' | jq '.'"
  echo ""

  GATEWAY_DETAILS=$(curl -s "https://gateway-api-testnet.circle.com/v1/x402/transfers/$GATEWAY_TRANSFER_ID")
  echo "  Transfer Details:"
  echo "$GATEWAY_DETAILS" | jq '{id, status, amount, fromAddress, toAddress, createdAt}'
  echo ""
  echo "  Note: This payment is OFF-CHAIN (instant settlement)"
  echo "  It will be batched to Arc blockchain later (hours/days)"
  echo "  When batched, it will appear on Arc Explorer"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  DEMO COMPLETE"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  1. Developer Wallet Tx: Immediate onchain settlement"
echo "     → Visible on Arc Explorer instantly"
echo "     → Shows in Circle Console"
echo ""
echo "  2. Gateway x402 Tx: Off-chain instant settlement"
echo "     → Visible via Circle Gateway API only"
echo "     → NOT in Circle Console (by design)"
echo "     → Eventually batched to blockchain"
echo ""
```

---

## Comparison Table

| Feature | Developer Controlled Wallets | Circle Gateway x402 |
|---------|------------------------------|---------------------|
| **Use Case** | Large transfers, funding | Micropayments for APIs |
| **Settlement** | Immediate onchain | Instant off-chain, batched later |
| **Speed** | 2-3 seconds | <100 milliseconds |
| **Gas Cost** | You pay per tx | Circle pays via batching |
| **Circle Console** | ✅ Visible | ❌ Not visible |
| **Arc Explorer** | ✅ Immediate | ✅ After batching only |
| **API Access** | SDK + Console | Gateway API only |
| **Transaction ID** | Circle tx ID + blockchain hash | Gateway transfer ID |
| **Best For** | $1+ transfers | $0.001 - $0.10 payments |

---

## Key Takeaways

### For Developer Controlled Wallets (Your Deposit)
✅ **Immediate blockchain settlement** on Arc
✅ **Visible in Circle Console** dashboard
✅ **Verifiable on Arc Explorer** instantly
✅ Transaction hash: `0x1169f151e691c35739cc89eb4ecd2e6f955bf6de25cce835c0d57345827206a3`

### For Circle Gateway x402 (Your API Payments)
✅ **Instant off-chain settlement** (sub-second)
✅ **NOT in Circle Console** (API-only access)
✅ **Verifiable via Gateway API** immediately
✅ **Eventually on Arc Explorer** (after batching)
✅ Transfer IDs: UUIDs like `8876d59b-c3b4-4bcf-af57-ccfb641342bd`

---

## Verification Commands

### Check Developer Wallet Transaction
```bash
# Via Circle API
curl http://localhost:8787/api/circle/tx/YOUR_TX_ID | jq '.transaction.txHash'

# On Arc Explorer
https://testnet.arcscan.app/tx/YOUR_TX_HASH
```

### Check x402 Nanopayment
```bash
# Via Gateway API
curl -s 'https://gateway-api-testnet.circle.com/v1/x402/transfers/YOUR_TRANSFER_ID' | jq '.'

# In your app logs
curl http://localhost:8787/api/logs?limit=10 | jq '.logs[] | select(.payment.gatewayTransferId != null)'

# List all your x402 transfers
bash scripts/circle/list-x402-transfers.sh
```

---

## Real Transaction Examples from Your System

### Example 1: Deposit Transaction (Developer Wallet)
```
Type:     Developer Controlled Wallet
Purpose:  Deposit to Gateway
Amount:   10 USDC
Tx Hash:  0x1169f151e691c35739cc89eb4ecd2e6f955bf6de25cce835c0d57345827206a3
Explorer: https://testnet.arcscan.app/tx/0x1169f151e691c35739cc89eb4ecd2e6f955bf6de25cce835c0d57345827206a3
Status:   ✅ Confirmed on blockchain
Visible:  ✅ Circle Console + Arc Explorer
```

### Example 2: API Payment (x402)
```
Type:        Circle Gateway x402 Nanopayment
Purpose:     Phone OTP API call payment
Amount:      0.01 USDC
Transfer ID: 8876d59b-c3b4-4bcf-af57-ccfb641342bd
Status:      ✅ Received by Circle Gateway
Visible:     ✅ Gateway API + Your App Logs
             ❌ NOT in Circle Console (by design)
             ⏳ Will be on Arc Explorer after batching
```

---

## Troubleshooting

### "My x402 payment isn't on Arc Explorer"
**This is normal!** x402 payments are settled off-chain first. They'll appear on the blockchain hours/days later when Circle batches them.

### "I don't see my x402 payments in Circle Console"
**This is expected!** Circle Console only shows Developer Controlled Wallet transactions. Use the Gateway API or your app dashboard to see x402 payments.

### "How do I know my x402 payment worked?"
Check these sources:
1. Your app response (`run.totalCostUsdc > 0`)
2. Circle Gateway API (`curl https://gateway-api-testnet.circle.com/v1/x402/transfers/ID`)
3. Your app logs (`curl http://localhost:8787/api/logs`)

---

**Your system successfully demonstrates both Circle transaction types working together!** 🎉

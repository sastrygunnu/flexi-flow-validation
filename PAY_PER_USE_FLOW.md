# Pay-Per-Use Flow: Real-time Payment After Work Completion

## Current vs Desired Flow

### ❌ Current Implementation (Wrong)
```
1. Do API work (e.g., phone verification)
2. Try to charge payment
3. If payment fails → too late, work already done!
```

**Problem**: You've already consumed the service even if payment fails.

### ✅ Desired Implementation (Correct)
```
1. Check user's Gateway balance FIRST
2. If insufficient → reject immediately, no work done
3. If sufficient → do the API work
4. After work completes → charge based on actual consumption
5. Return result to user
```

**Benefit**: Pay-per-use model like AWS/Stripe - only charge for what was actually consumed.

## Implementation Strategy

### Option 1: Check Balance Before Work (Simpler)

```javascript
// Pseudocode for each API call

async function executeValidationStep(userId, stepConfig) {
  const cost = stepConfig.costUsdc; // e.g., 0.01 USDC

  // STEP 1: Check balance FIRST
  const balance = await getGatewayBalance(userId);
  if (balance < cost) {
    return {
      status: "rejected",
      reason: "insufficient_gateway_balance",
      requiredAmount: cost,
      currentBalance: balance
    };
  }

  // STEP 2: Do the actual work
  const result = await callValidationAPI(stepConfig);

  // STEP 3: Charge based on result
  if (result.success) {
    await chargePayment(userId, cost);
    return { status: "success", result, charged: cost };
  } else {
    // Don't charge for failed API calls (optional: could charge partial)
    return { status: "failed", result, charged: 0 };
  }
}
```

### Option 2: Reserve → Work → Settle (More Robust)

```javascript
// Like a credit card pre-authorization

async function executeValidationStep(userId, stepConfig) {
  const estimatedCost = stepConfig.costUsdc;

  // STEP 1: Reserve funds (authorization hold)
  const reservation = await reserveGatewayFunds(userId, estimatedCost);
  if (!reservation.success) {
    return { status: "rejected", reason: "insufficient_balance" };
  }

  // STEP 2: Do the work
  const result = await callValidationAPI(stepConfig);

  // STEP 3: Settle based on actual usage
  const actualCost = result.success ? estimatedCost : 0;
  await settleReservation(reservation.id, actualCost);

  // STEP 4: Refund difference (if any)
  const refund = estimatedCost - actualCost;
  if (refund > 0) {
    await refundGatewayFunds(userId, refund);
  }

  return { status: result.success ? "success" : "failed", charged: actualCost };
}
```

## Gateway Balance Check Implementation

### Add Balance Check Endpoint

Add this to your server:

```javascript
// server/index.mjs

// New endpoint to check Gateway balance for a specific address
if (pathname === "/api/gateway/balance" && req.method === "POST") {
  const body = await readBody(req);
  const address = body?.address;

  if (!address) {
    json(res, 400, { error: "Missing address" });
    return;
  }

  try {
    // Call Gateway contract's balanceOf function
    const balance = await getGatewayBalance(address);
    json(res, 200, {
      ok: true,
      address,
      balanceUsdc: balance,
      balanceAtomic: balance * 1_000_000
    });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
  return;
}
```

### Query Gateway Balance On-Chain

```javascript
// server/payments/circle-gateway.mjs

export async function getGatewayBalance(walletAddress) {
  // ERC-20 balanceOf(address) function
  const BALANCE_OF_SELECTOR = '0x70a08231';
  const paddedAddress = walletAddress.replace('0x', '').padStart(64, '0');

  const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
  const gatewayContract = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: gatewayContract,
          data: BALANCE_OF_SELECTOR + paddedAddress
        },
        'latest'
      ],
      id: 1
    })
  });

  const data = await response.json();
  const balanceHex = data.result;
  const balanceAtomic = parseInt(balanceHex, 16);
  const balanceUsdc = balanceAtomic / 1_000_000; // 6 decimals

  return balanceUsdc;
}
```

## Updated Flow Execution Logic

### Modified Run Execution

```javascript
// server/index.mjs - Update the POST /api/runs endpoint

if (pathname === "/api/runs" && req.method === "POST") {
  const body = await readBody(req);
  const flowId = body?.flowId;
  const userId = body?.userId || "usr_public";

  const flows = await getAllFlows();
  const flow = flows.find(f => f.id === flowId);

  if (!flow) {
    json(res, 404, { error: "Flow not found" });
    return;
  }

  const runId = `run_${randomHex(8)}`;
  const logs = [];
  let totalCost = 0;

  // NEW: Calculate total estimated cost
  let estimatedTotalCost = 0;
  for (const step of flow.steps) {
    const provider = STEP_LIBRARY[step.type]?.providers?.[step.provider];
    if (provider) {
      estimatedTotalCost += provider.costUsd;
    }
  }

  // NEW: Check Gateway balance BEFORE starting
  if (hasCirclePaymentConfig()) {
    try {
      const payer = await getPayerWallet();
      const balance = await getGatewayBalance(payer.address);

      if (balance < estimatedTotalCost) {
        json(res, 402, { // 402 Payment Required
          error: "Insufficient Gateway balance",
          requiredAmount: estimatedTotalCost,
          currentBalance: balance,
          deficit: estimatedTotalCost - balance,
          message: `Need ${estimatedTotalCost.toFixed(4)} USDC but only have ${balance.toFixed(4)} USDC. Run: npm run circle:deposit -- --amount ${Math.ceil(estimatedTotalCost - balance)}`
        });
        return;
      }
    } catch (e) {
      console.error('[balance-check] Error checking Gateway balance:', e.message);
      // Continue anyway (don't block on balance check failure)
    }
  }

  // Execute steps (existing logic)
  for (let i = 0; i < flow.steps.length; i++) {
    // ... existing step execution code ...

    // After successful payment, accumulate cost
    if (log.payment.status === "paid") {
      totalCost += log.payment.amountUsdc;
    }
  }

  // Return with total cost breakdown
  json(res, 200, {
    ok: true,
    run: {
      id: runId,
      flowId,
      status: /* ... */,
      totalCostUsdc: totalCost,
      estimatedCostUsdc: estimatedTotalCost,
      savings: estimatedTotalCost - totalCost
    },
    logs
  });
}
```

## Real-World Usage Example

### Scenario: Phone + Email + Identity Verification

```javascript
User requests validation flow:
  - Phone OTP: $0.01
  - Email check: $0.003
  - Identity: $0.50

Total estimated: $0.513 USDC

────────────────────────────────────────────────────────

STEP 1: Check Gateway Balance
Gateway balance: $10.00 USDC
Required: $0.513 USDC
✅ Sufficient! Proceed.

────────────────────────────────────────────────────────

STEP 2: Execute Phone OTP
- Call Twilio API → Success ✅
- Charge payment: $0.01 USDC
- Gateway balance: $10.00 → $9.99

────────────────────────────────────────────────────────

STEP 3: Execute Email Check
- Call Kickbox API → Success ✅
- Charge payment: $0.003 USDC
- Gateway balance: $9.99 → $9.987

────────────────────────────────────────────────────────

STEP 4: Execute Identity Verification
- Call Persona API → Failed ❌ (user uploaded wrong document)
- Don't charge (or charge partial)
- Gateway balance: $9.987 (unchanged)

────────────────────────────────────────────────────────

FINAL RESULT:
Estimated cost: $0.513
Actual charged: $0.013 (only for successful steps)
Savings: $0.50 (didn't charge for failed identity check)
Remaining balance: $9.987
```

## Benefits of This Approach

### 1. **Fair Pricing**
- Users only pay for successful API calls
- Failed APIs don't consume credits

### 2. **Prevent Abuse**
- Check balance upfront
- Can't spam APIs without funds

### 3. **Better UX**
- Clear error messages when balance is low
- No partial flows that can't complete

### 4. **Cost Transparency**
```javascript
Response shows:
{
  "estimatedCost": 0.513,
  "actualCost": 0.013,
  "savings": 0.50,
  "breakdown": [
    { "step": "phone", "charged": 0.01, "status": "success" },
    { "step": "email", "charged": 0.003, "status": "success" },
    { "step": "identity", "charged": 0, "status": "failed" }
  ]
}
```

## Implementation Checklist

- [ ] Add `getGatewayBalance()` function to query on-chain balance
- [ ] Add `/api/gateway/balance` endpoint for frontend to check
- [ ] Update `/api/runs` to check balance BEFORE executing flow
- [ ] Return 402 Payment Required if insufficient funds
- [ ] Only charge for successful API calls
- [ ] Show cost breakdown in response
- [ ] Update UI to display balance warnings

## Next Steps

Would you like me to:
1. **Implement the balance check** in your server code?
2. **Add a balance warning banner** to your dashboard UI?
3. **Create a usage/billing page** showing transaction history?
4. **Add balance auto-reload** when it drops below threshold?

Let me know what you'd like to tackle first! 🚀

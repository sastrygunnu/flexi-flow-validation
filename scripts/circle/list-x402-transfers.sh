#!/bin/bash
# List all x402 transfers from your app's logs

echo "=== Your Recent x402 Nanopayments ==="
echo ""

# Get all successful payments from logs
curl -s http://localhost:8787/api/logs?limit=50 | jq -r '
  .logs[]
  | select(.payment.gatewayTransferId != null and .payment.status == "paid")
  | "\(.timestamp) | \(.provider) | $\(.payment.amountUsdc) USDC | Transfer: \(.payment.gatewayTransferId)"
' | head -20

echo ""
echo "=== Verify a specific transfer with Circle Gateway API ==="
echo "Example: curl -s 'https://gateway-api-testnet.circle.com/v1/x402/transfers/YOUR_TRANSFER_ID' | jq '.'"
echo ""
echo "Note: These payments are recorded in Circle's Gateway system, not in Circle Console."
echo "They will be batched to blockchain later for gas efficiency."

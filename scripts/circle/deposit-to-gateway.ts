#!/usr/bin/env tsx
/**
 * Deposit USDC into Circle Gateway contract for x402 payments
 *
 * This script performs two transactions:
 * 1. Approve the Gateway contract to spend USDC
 * 2. Deposit USDC into the Gateway contract
 *
 * Usage:
 *   npm run circle:deposit -- --amount 10
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables manually (dotenv not in dependencies)
try {
  const envPath = resolve(process.cwd(), '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
} catch (e) {
  console.error('Warning: Could not load .env file');
}

const USDC_CONTRACT_ADDRESS = '0x3600000000000000000000000000000000000000';
const GATEWAY_CONTRACT_ADDRESS = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
const BLOCKCHAIN = 'ARC-TESTNET';

// ERC-20 approve function signature: approve(address spender, uint256 amount)
const APPROVE_ABI_FRAGMENT = 'approve(address,uint256)';

// Gateway deposit function signature: deposit(address token, uint256 amount)
const DEPOSIT_ABI_FRAGMENT = 'deposit(address,uint256)';

async function main() {
  const args = process.argv.slice(2);
  const amountIndex = args.indexOf('--amount');

  if (amountIndex === -1 || !args[amountIndex + 1]) {
    console.error('Usage: npm run circle:deposit -- --amount <USDC_AMOUNT>');
    console.error('Example: npm run circle:deposit -- --amount 10');
    process.exit(1);
  }

  const amountUsdc = parseFloat(args[amountIndex + 1]);
  if (isNaN(amountUsdc) || amountUsdc <= 0) {
    console.error('Invalid amount. Must be a positive number.');
    process.exit(1);
  }

  // Convert to atomic units (6 decimals for USDC)
  const amountAtomic = Math.floor(amountUsdc * 1_000_000).toString();

  console.log(`\n🔄 Depositing ${amountUsdc} USDC into Circle Gateway...`);
  console.log(`   Amount (atomic): ${amountAtomic}`);
  console.log(`   USDC Contract: ${USDC_CONTRACT_ADDRESS}`);
  console.log(`   Gateway Contract: ${GATEWAY_CONTRACT_ADDRESS}\n`);

  // Initialize Circle client
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const walletId = process.env.PAYER_WALLET_ID;

  if (!apiKey || !entitySecret || !walletId) {
    console.error('❌ Missing required environment variables:');
    console.error('   CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, PAYER_WALLET_ID');
    process.exit(1);
  }

  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  // Get wallet info
  console.log(`📍 Using wallet: ${walletId}`);
  const walletResp = await client.getWallet({ id: walletId });
  const wallet = walletResp.data?.wallet;
  if (!wallet?.address) {
    console.error('❌ Could not fetch wallet information');
    process.exit(1);
  }
  console.log(`   Address: ${wallet.address}\n`);

  // Step 1: Approve Gateway to spend USDC
  console.log('Step 1/2: Approving Gateway contract to spend USDC...');

  const approveResp = await client.createContractExecutionTransaction({
    walletId,
    contractAddress: USDC_CONTRACT_ADDRESS,
    blockchain: BLOCKCHAIN as any,
    abiFunctionSignature: APPROVE_ABI_FRAGMENT,
    abiParameters: [GATEWAY_CONTRACT_ADDRESS, amountAtomic],
    fee: {
      type: 'level',
      config: { feeLevel: 'MEDIUM' },
    },
  });

  const approveTxId = approveResp.data?.id;
  if (!approveTxId) {
    console.error('❌ Failed to create approve transaction');
    process.exit(1);
  }

  console.log(`   ✅ Approve transaction created: ${approveTxId}`);
  console.log(`   ⏳ Waiting for confirmation...`);

  // Wait for approve to confirm
  let approveTx = await client.getTransaction({ id: approveTxId });
  while (approveTx.data?.transaction?.state !== 'COMPLETE') {
    if (approveTx.data?.transaction?.state === 'FAILED') {
      console.error('❌ Approve transaction failed');
      process.exit(1);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    approveTx = await client.getTransaction({ id: approveTxId });
  }

  console.log(`   ✅ Approve confirmed! Tx hash: ${approveTx.data?.transaction?.txHash}\n`);

  // Step 2: Deposit into Gateway
  console.log('Step 2/2: Depositing USDC into Gateway contract...');

  const depositResp = await client.createContractExecutionTransaction({
    walletId,
    contractAddress: GATEWAY_CONTRACT_ADDRESS,
    blockchain: BLOCKCHAIN as any,
    abiFunctionSignature: DEPOSIT_ABI_FRAGMENT,
    abiParameters: [USDC_CONTRACT_ADDRESS, amountAtomic], // deposit(address token, uint256 amount)
    fee: {
      type: 'level',
      config: { feeLevel: 'MEDIUM' },
    },
  });

  const depositTxId = depositResp.data?.id;
  if (!depositTxId) {
    console.error('❌ Failed to create deposit transaction');
    process.exit(1);
  }

  console.log(`   ✅ Deposit transaction created: ${depositTxId}`);
  console.log(`   ⏳ Waiting for confirmation...`);

  // Wait for deposit to confirm
  let depositTx = await client.getTransaction({ id: depositTxId });
  while (depositTx.data?.transaction?.state !== 'COMPLETE') {
    if (depositTx.data?.transaction?.state === 'FAILED') {
      console.error('❌ Deposit transaction failed');
      process.exit(1);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    depositTx = await client.getTransaction({ id: depositTxId });
  }

  console.log(`   ✅ Deposit confirmed! Tx hash: ${depositTx.data?.transaction?.txHash}\n`);

  console.log('🎉 Successfully deposited to Circle Gateway!');
  console.log(`\n   Approve tx: https://testnet.arcscan.app/tx/${approveTx.data?.transaction?.txHash}`);
  console.log(`   Deposit tx: https://testnet.arcscan.app/tx/${depositTx.data?.transaction?.txHash}`);
  console.log(`\n   Your Gateway balance should now support x402 payments! 💳`);
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});

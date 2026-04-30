require('dotenv').config();
const { getAddressFromPrivateKey } = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const network = STACKS_MAINNET;

// ==========================================
// UTILITIES
// ==========================================
function fmt(ustx) { return (Number(ustx) / 1e6).toFixed(6); }
function addressFromKey(privKey) { return getAddressFromPrivateKey(privKey, network.version); }
const delay = ms => new Promise(res => setTimeout(res, ms));

async function mapConcurrent(items, limit, fn) {
  const results = [];
  let i = 0;
  const exec = async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, exec));
  return results;
}

// ==========================================
// HIRO API
// ==========================================
async function apiFetch(endpoint, retries = 10) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`https://api.mainnet.hiro.so${endpoint}`);
      if (res.status === 429) {
        if (attempt === retries) throw new Error(`Rate limit exceeded (429) after ${retries} retries`);
        await delay(3000 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`API error ${res.status} on ${endpoint}`);
      return await res.json();
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`Failed to fetch ${endpoint} after ${retries} retries: ${error.message}`);
      }
      await delay(3000 * attempt);
    }
  }
  throw new Error(`Failed to fetch ${endpoint}: Exhausted all retries`);
}

async function fetchBalance(address) {
  const data = await apiFetch(`/extended/v1/address/${address}/balances`);
  return BigInt(data.stx.balance);
}

// ==========================================
// MAIN SCRIPT
// ==========================================
async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  STX Balance Checker`);
  console.log(`  Network : MAINNET 🔴`);
  console.log(`${'═'.repeat(60)}\n`);

  // Parse .env
  const envContent = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  const envMap = new Map();
  const simKeys = [];
  const seen = new Set();

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    envMap.set(k, v);

    if (/^STACKS_WALLET_\d+_PRIVATE_KEY$/.test(k) && v && !seen.has(v)) {
      seen.add(v);
      simKeys.push({ id: k.replace('_PRIVATE_KEY', ''), key: v });
    }
  });

  const masterKey = envMap.get('STACKS_MASTER_2_PRIVATE_KEY');
  if (!masterKey) throw new Error('STACKS_MASTER_2_PRIVATE_KEY missing');
  const masterAddr = addressFromKey(masterKey);

  console.log(`📂 Found ${simKeys.length} simulation wallets.`);
  console.log(`💰 Fetching balances (this may take a moment due to API pacing)...\n`);

  // Fetch Master Balance
  const masterBalance = await fetchBalance(masterAddr);
  
  // Fetch Simulation Balances
  let totalSimBalance = 0n;
  const walletInfos = await mapConcurrent(simKeys, 2, async (wallet) => {
    const address = addressFromKey(wallet.key);
    const balance = await fetchBalance(address);
    await delay(200); // Pace scanning to avoid 50 req/min rate limit
    return { ...wallet, address, balance };
  });

  // Sort by ID to keep output organized
  walletInfos.sort((a, b) => {
    const numA = parseInt(a.id.match(/\d+/)[0]);
    const numB = parseInt(b.id.match(/\d+/)[0]);
    return numA - numB;
  });

  console.log(`${'─'.repeat(60)}`);
  console.log(`  ID                    ADDRESS             BALANCE (STX)`);
  console.log(`${'─'.repeat(60)}`);
  
  walletInfos.forEach(w => {
    totalSimBalance += w.balance;
    const paddedId = w.id.padEnd(20, ' ');
    const paddedAddr = w.address.substring(0, 15).padEnd(18, ' ') + '...';
    console.log(`  ${paddedId}  ${paddedAddr}  ${fmt(w.balance)}`);
  });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  SUMMARY`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Total in Simulation Wallets : ${fmt(totalSimBalance)} STX`);
  console.log(`  Master Wallet (${masterAddr.substring(0,6)}...) : ${fmt(masterBalance)} STX`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(err => {
  console.error('\n💀 Fatal:', err.message);
  process.exit(1);
});

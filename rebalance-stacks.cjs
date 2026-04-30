const { 
  makeSTXTokenTransfer, 
  broadcastTransaction, 
  getAddressFromPrivateKey, 
  AnchorMode 
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const { readFileSync } = require('fs');
const { resolve } = require('path');
const dns = require('dns');

// Fix Node.js >= 18 IPv6 fetch failures
dns.setDefaultResultOrder('ipv4first');

/**
 * rebalance-stacks.cjs
 * =====================
 * Emergency redistribution script that uses "Rich" simulation wallets
 * (those with > 1 STX) to fund "Poor" simulation wallets (< 0.05 STX).
 *
 * This bypasses the Master wallet if it is stuck or throttled.
 */

const network = STACKS_MAINNET;
const HIRO_API = 'https://api.mainnet.hiro.so';

// Configuration
const DONOR_THRESHOLD = 1_000_000n;   // 1.0 STX
const DONOR_RESERVE = 1_000_000n;     // Keep 1.0 STX in donor
const RECIPIENT_THRESHOLD = 50_000n; // 0.05 STX
const DRIP_AMOUNT = 150_000n;        // 0.15 STX
const TX_FEE = 3500n;                // 0.0035 STX (slightly higher for speed)

// Utilities
const fmt = (ustx) => (Number(ustx) / 1e6).toFixed(6);
const delay = ms => new Promise(res => setTimeout(res, ms));
const addressFromKey = (privKey) => getAddressFromPrivateKey(privKey, network);

async function apiFetch(endpoint, retries = 10) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${HIRO_API}${endpoint}`);
      if (res.status === 429) {
        console.warn(`   [API] Rate limit (429) on ${endpoint}. Retrying in ${attempt * 3}s...`);
        await delay(3000 * attempt);
        continue;
      }
      if (!res.ok) {
        if (res.status === 404) return { stx: { balance: "0" } };
        throw new Error(`API error ${res.status}`);
      }
      const data = await res.json();
      if (!data) throw new Error("Empty response from API");
      return data;
    } catch (error) {
      console.warn(`   [API] Fetch error on attempt ${attempt}/${retries}: ${error.message}`);
      if (attempt === retries) throw error;
      await delay(3000 * attempt);
    }
  }
}

async function fetchBalance(address) {
  const data = await apiFetch(`/extended/v1/address/${address}/balances`);
  if (!data || !data.stx || data.stx.balance === undefined) {
    return 0n;
  }
  return BigInt(data.stx.balance);
}

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

async function fetchNonce(address) {
  const data = await apiFetch(`/extended/v1/address/${address}/nonces`);
  return data.possible_next_nonce;
}

async function main() {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  STX Peer-to-Peer Rebalancing Script`);
  console.log(`  Network : MAINNET 🔴`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  // 1. Load Wallets
  const envContent = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  const wallets = [];
  const seen = new Set();

  envContent.split('\n').forEach(line => {
    const match = line.match(/^STACKS_WALLET_(\d+)_PRIVATE_KEY=(.*)/);
    if (match) {
      const id = `WALLET_${match[1]}`;
      const key = match[2].trim().replace(/^['"]|['"]$/g, '');
      if (key && !seen.has(key)) {
        seen.add(key);
        wallets.push({ id, key, address: addressFromKey(key) });
      }
    }
  });

  console.log(`📂 Loaded ${wallets.length} simulation wallets.`);
  console.log(`💰 Scanning balances (concurrent)...`);

  const walletData = await mapConcurrent(wallets, 3, async (w) => {
    const balance = await fetchBalance(w.address);
    await delay(200); // Pace API requests
    return { ...w, balance };
  });

  // 2. Categorize
  const donors = walletData.filter(w => w.balance > DONOR_THRESHOLD);
  const recipients = walletData.filter(w => w.balance < RECIPIENT_THRESHOLD);

  console.log(`\n📊 Status Summary:`);
  console.log(`   Donors (Rich)    : ${donors.length}`);
  console.log(`   Recipients (Poor): ${recipients.length}`);

  if (donors.length === 0) {
    console.log(`\n🛑 No donor wallets found with > 1 STX. Redistribution impossible.`);
    return;
  }

  if (recipients.length === 0) {
    console.log(`\n✅ All wallets are already funded above 0.05 STX.`);
    return;
  }

  // 3. Redistribute
  console.log(`\n🚀 Starting Peer-to-Peer Funding Cycle...\n`);

  for (const donor of donors) {
    if (recipients.length === 0) break;

    let surplus = donor.balance - DONOR_RESERVE;
    let currentNonce = await fetchNonce(donor.address);

    console.log(`💎 Donor ${donor.id} (${fmt(donor.balance)} STX)`);
    console.log(`   └─ Starting Nonce: ${currentNonce}`);
    console.log(`   └─ Surplus available: ${fmt(surplus)} STX`);

    while (surplus >= (DRIP_AMOUNT + TX_FEE) && recipients.length > 0) {
      const recipient = recipients.shift();
      console.log(`   └─ 💧 Dripping 0.15 STX to ${recipient.id} (${recipient.address.slice(0,10)}...)`);

      try {
        const tx = await makeSTXTokenTransfer({
          recipient: recipient.address,
          amount: DRIP_AMOUNT,
          senderKey: donor.key,
          network,
          fee: TX_FEE,
          nonce: currentNonce,
          anchorMode: AnchorMode.Any,
        });

        const result = await broadcastTransaction({ transaction: tx, network });

        if (result.error) {
          console.log(`   └─ ❌ Failed: ${result.error} ${result.reason || ''}`);
          
          if (result.reason === 'ConflictingNonceInMempool') {
             console.log(`   └─ 🔄 Nonce conflict. Syncing and retrying...`);
             currentNonce = await fetchNonce(donor.address);
             recipients.unshift(recipient);
             await delay(2000);
             continue;
          }

          // Put recipient back at the start of the list to try again with another donor
          recipients.unshift(recipient);
          
          if (result.reason === 'TooMuchChaining' || result.error === 'TooMuchChaining') {
            console.log(`   └─ ⚠️ Donor mempool full. Moving to next donor...`);
            break; 
          }
        } else {
          console.log(`   └─ ✅ Broadcasted (Nonce ${currentNonce}): ${result.txid}`);
          surplus -= (DRIP_AMOUNT + TX_FEE);
          currentNonce++;
          // Small pause to let API catch up
          await delay(2000);
        }
      } catch (err) {
        console.log(`   └─ ❌ Error: ${err.message}`);
        recipients.unshift(recipient);
        break;
      }
    }
    console.log(``);
  }

  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  Rebalancing Cycle Complete.`);
  console.log(`  Remaining unfunded wallets: ${recipients.length}`);
  console.log(`════════════════════════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error(`\n💀 Fatal Error:`, err.message);
  process.exit(1);
});

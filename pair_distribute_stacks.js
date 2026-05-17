import txPkg from '@stacks/transactions';
const {
    makeSTXTokenTransfer,
    broadcastTransaction,
    getAddressFromPrivateKey,
    AnchorMode,
} = txPkg;

import netPkg from '@stacks/network';
const { STACKS_MAINNET } = netPkg;

import fs from 'fs';
import path from 'path';

/**
 * pair_distribute_stacks.js
 * =========================
 * Funds new wallets from old wallets in a 1:1 pairing.
 * Pair: Wallet[i] -> Wallet[i + 58]
 */

const network = STACKS_MAINNET;
const API_BASE = 'https://api.hiro.so';
const STX = 1_000_000n;
const AMOUNT_TO_SEND = 500_000n; // 0.5 STX
const TX_FEE = 3_000n;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchNonce(address) {
    const res = await fetch(`${API_BASE}/extended/v1/address/${address}/nonces`);
    const data = await res.json();
    return data?.possible_next_nonce ?? 0;
}

async function main() {
    const envPath = path.resolve('.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const wallets = [];
    const lines = envContent.split('\n');
    const seen = new Set();

    // Extract all STACKS_WALLET_n_PRIVATE_KEY
    // We'll collect them in order of their index if possible
    const matches = [];
    const regex = /^STACKS_WALLET_(\d+)_PRIVATE_KEY=(.*)$/m;
    
    lines.forEach(line => {
        const match = line.trim().match(regex);
        if (match) {
            const index = parseInt(match[1], 10);
            const key = match[2].trim().replace(/^['"]|['"]$/g, '');
            if (!seen.has(key)) {
                seen.add(key);
                matches.push({ index, key, address: getAddressFromPrivateKey(key, network) });
            }
        }
    });

    // Sort by index to ensure stable pairing
    matches.sort((a, b) => a.index - b.index);

    if (matches.length < 116) {
        console.error(`❌ Found only ${matches.length} wallets. Expected at least 116.`);
        // We'll proceed anyway with what we have, pairing the first half with the second half
    }

    const half = Math.floor(matches.length / 2);
    const senders = matches.slice(0, half);
    const receivers = matches.slice(half, half * 2);

    console.log(`🚀 Starting Pair-Based Distribution (${senders.length} pairs)...`);

    for (let i = 0; i < senders.length; i++) {
        const sender = senders[i];
        const receiver = receivers[i];

        console.log(`[Pair ${i}] Wallet_${sender.index} -> Wallet_${receiver.index}`);
        console.log(`      From: ${sender.address}`);
        console.log(`      To:   ${receiver.address}`);

        try {
            const nonce = await fetchNonce(sender.address);
            const tx = await makeSTXTokenTransfer({
                recipient: receiver.address,
                amount: AMOUNT_TO_SEND,
                senderKey: sender.key,
                network,
                fee: TX_FEE,
                nonce,
                anchorMode: AnchorMode.Any,
            });

            const result = await broadcastTransaction({ transaction: tx, network });
            if (result.error) {
                console.error(`      ❌ Failed: ${result.error} ${result.reason || ''}`);
            } else {
                console.log(`      ✅ Success! txid: ${result.txid}`);
            }
        } catch (err) {
            console.error(`      ❌ Error: ${err.message}`);
        }

        // Delay to avoid overwhelming the API/Network
        await sleep(2000);
    }

    console.log(`\nAll pairs processed! 🎉`);
}

main().catch(console.error);

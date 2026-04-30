const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

let walletIndex = 0;
let batch2Detected = false;

const newLines = lines.map(line => {
  if (line.includes('--- NEW STACKS WALLETS')) {
    batch2Detected = true;
    walletIndex = 28; // Start from 28 for batch 2
  }

  if (line.startsWith('STACKS_WALLET_') || (line.startsWith('# Address:') && line.includes('STACKS_WALLET_'))) {
     // This is tricky because the user might have some comments with STACKS_WALLET_ index.
     // But primarily I need to target the keys.
  }

  // Use regex to replace the index in STACKS_WALLET_N_...
  let updatedLine = line;
  
  if (line.match(/^STACKS_WALLET_\d+_(MNEMONIC|PRIVATE_KEY)=/)) {
    const suffix = line.match(/_(MNEMONIC|PRIVATE_KEY)=/)[0];
    const currentIndex = parseInt(line.match(/\d+/)[0]);
    
    // If we are in batch 2 (detected by header) and the current index is < 30, we should offset it.
    // However, the user said Batch 1 has 28 wallets (0-27).
    // Batch 2 has 30 wallets (0-29).
    
    if (batch2Detected) {
       // We want to map 0 -> 28, 1 -> 29, etc.
       // The line currently has index 'currentIndex'.
       const newIndex = 28 + currentIndex;
       updatedLine = `STACKS_WALLET_${newIndex}${suffix}${line.split('=')[1]}`;
    }
  }

  return updatedLine;
});

// fs.writeFileSync(envPath, newLines.join('\n'));
console.log("Planned updates complete.");

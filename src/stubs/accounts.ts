// Stub module for wagmi's optional 'accounts' dependency (Tempo wallet connector).
// Turbopack requires all dynamic imports to resolve at build time.
// This stub is never actually invoked — the .catch() in Connectors.js handles it.
export {}


// ⟳ echo · package.json
//     "test:report": "vitest run -- --coverage --costs",
//     "test:watch": "chokidar \"tests/**/*.ts\" \"contracts/**/*.clar\" -c \"npm run test:report\""
//   },
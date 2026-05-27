import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactCompiler: true,
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      // Stub for @wagmi/core's optional 'accounts' dependency (Tempo wallet connector).
      // Turbopack can't handle unresolvable dynamic imports — webpack silently fails them.
      accounts: './src/stubs/accounts.ts',
    },
  },
  transpilePackages: [
    '@stacks/connect',
    '@stacks/transactions',
    '@stacks/auth',
    '@stacks/common',
    'react-chessboard',
    'wagmi',
    '@wagmi/core',
    '@wagmi/connectors'
  ],
};

export default nextConfig;

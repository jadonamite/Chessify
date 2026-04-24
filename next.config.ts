import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactCompiler: true,
  turbopack: {
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
    '@reown/appkit',
    '@reown/appkit-adapter-wagmi',
    '@reown/appkit-ui',
    '@reown/appkit-common',
    'wagmi',
    '@wagmi/core',
    '@wagmi/connectors'
  ],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ['@stacks/connect', '@stacks/transactions', '@stacks/auth', '@stacks/common', 'react-chessboard'],
};

export default nextConfig;

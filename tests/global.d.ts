// Re-declare the Clarinet vitest globals locally because the upstream
// declaration under node_modules/@stacks/clarinet-sdk/vitest-helpers is
// filtered out by this tsconfig's `exclude: ["node_modules"]`. The
// vitest-environment-clarinet runtime actually installs these globals;
// this file just teaches the type-checker about them.

import type { Simnet } from '@stacks/clarinet-sdk'

declare global {
  // eslint-disable-next-line no-var
  var simnet: Simnet
  // eslint-disable-next-line no-var
  var testEnvironment: string
  // eslint-disable-next-line no-var
  var coverageReports: string[]
  // eslint-disable-next-line no-var
  var costsReports: string[]
}

export {}

// Project-local re-declaration of @stacks/clarinet-sdk's custom Clarity vitest
// matchers. The SDK ships these in node_modules/@stacks/clarinet-sdk/vitest-helpers,
// but tsconfig's `exclude: ["node_modules"]` overrides the `include` of that path,
// so the module augmentation never reaches tsc. Mirroring it here (under tests/,
// which is included and not excluded) makes `expect(...).toBeOk()` etc. type-check.
import type { ExpectStatic } from 'vitest'
import type { ClarityType, ClarityValue } from '@stacks/transactions'

interface ClarityValuesMatchers<R = unknown> {
  toHaveClarityType(expectedType: ClarityType): R
  toBeOk(expected: ExpectStatic | ClarityValue): R
  toBeErr(expected: ExpectStatic | ClarityValue): R
  toBeSome(expected: ExpectStatic | ClarityValue): R
  toBeNone(): R
  toBeBool(expected: boolean): R
  toBeInt(expected: number | bigint): R
  toBeUint(expected: number | bigint): R
  toBeAscii(expected: string): R
  toBeUtf8(expected: string): R
  toBePrincipal(expected: string): R
  toBeBuff(expected: Uint8Array | string): R
  toBeList(expected: ExpectStatic[] | ClarityValue[]): R
  toBeTuple(expected: Record<string, ExpectStatic | ClarityValue>): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends ClarityValuesMatchers<T> {}
  interface AsymmetricMatchersContaining extends ClarityValuesMatchers<ExpectStatic> {}
}

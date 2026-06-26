// ERC-8021 Transaction Attribution for Base Builder Codes
// Format (schema 0): codes_ascii ∥ codesLength (1 byte) ∥ schemaId=0 (1 byte) ∥ 0x80218021802180218021802180218021
const ERC8021_SUFFIX = '80218021802180218021802180218021'

const getCodesBytes = (codes: string[]): Buffer => {
  const codesStr = codes.join(',');
  return Buffer.from(codesStr, 'ascii');
}

const getErc8021DataSuffix = (codesBytes: Buffer): `0x${string}` => {
  const codesHex = codesBytes.toString('hex');
  const codesLengthHex = codesBytes.length.toString(16).padStart(2, '0');
  return `0x${codesHex}${codesLengthHex}00${ERC8021_SUFFIX}`;
}

const getCode = (): string | undefined => process.env.NEXT_PUBLIC_BASE_BUILDER_CODE;

const isValidCode = (code: string | undefined): boolean => code !== undefined && code !== 'bc_placeholder';

export const toErc8021DataSuffix = (codes: string[]): `0x${string}` => {
  const codesBytes = getCodesBytes(codes);
  return getErc8021DataSuffix(codesBytes);
}

const code = getCode();
export const BUILDER_CODE_SUFFIX: `0x${string}` | null = isValidCode(code) ? toErc8021DataSuffix([code]) : null;

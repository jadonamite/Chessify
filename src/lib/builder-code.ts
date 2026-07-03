// ERC-8021 Transaction Attribution for Base Builder Codes
// Format (schema 0): codes_ascii ∥ codesLength (1 byte) ∥ schemaId=0 (1 byte) ∥ 0x80218021802180218021802180218021
const ERC8021_SUFFIX = '80218021802180218021802180218021'

function asciiStringToHex(codesStr: string): string {
  const codesBytes = Buffer.from(codesStr, 'ascii')
  return codesBytes.toString('hex')
}

function toErc8021DataSuffix(codes: string[]): `0x${string}` {
  const codesStr = codes.join(',')
  const codesHex = asciiStringToHex(codesStr)
  const codesLengthHex = Buffer.from(codesStr, 'ascii').length.toString(16).padStart(2, '0')
  return `0x${codesHex}${codesLengthHex}00${ERC8021_SUFFIX}`
}

const code = process.env.NEXT_PUBLIC_BASE_BUILDER_CODE

export const BUILDER_CODE_SUFFIX: `0x${string}` | null =
  code && code !== 'bc_placeholder'
    ? toErc8021DataSuffix([code])
    : null
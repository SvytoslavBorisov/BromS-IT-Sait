// src/lib/crypto/functions.ts
import { createHmac, timingSafeEqual, randomBytes } from 'crypto'
import { HashCalculator } from '@/lib/crypto/gost3411-2012'

export interface GostAlgorithm {
  name: 'GOST R 34.11'
  version: 2012
  length: 256 | 512
}

export const GOST256: GostAlgorithm = { name: 'GOST R 34.11', version: 2012, length: 256 }
export const GOST512: GostAlgorithm = { name: 'GOST R 34.11', version: 2012, length: 512 }

/**
 * XOR двух hex-строк одинаковой длины
 */
function hexXor(a: string, b: string): string {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  if (bufA.length !== bufB.length) {
    throw new Error(`hexXor: buffers have different lengths (${bufA.length} vs ${bufB.length})`)
  }
  const res = Buffer.alloc(bufA.length)
  for (let i = 0; i < bufA.length; i++) {
    res[i] = bufA[i] ^ bufB[i]
  }
  return res.toString('hex')
}

/**
 * HMAC на базе ГОСТ Р 34.11-2012 (стробог)
 */
export function hmacGost(
  data: string,
  hexKey: string,
  algo: GostAlgorithm = GOST256
): string {
  // блок для ГОСТ-HMAC всегда 512 бит = 64 байта = 128 hex-символов
  const BLOCK_HEX_LEN = 128

  // 1) Подготовим ключ: если длиннее блока — хешируем, иначе дополняем нулями
  let key = hexKey.length > BLOCK_HEX_LEN
    ? new HashCalculator(algo.length === 512 ? '1' : '0', 'hex', hexKey).run()
    : hexKey
  if (key.length < BLOCK_HEX_LEN) {
    key = key.padEnd(BLOCK_HEX_LEN, '0')
  }

  // 2) ipad/opad
  const ipad = '36'.repeat(BLOCK_HEX_LEN / 2)
  const opad = '5c'.repeat(BLOCK_HEX_LEN / 2)

  // 3) Inner hash: H( (K ⊕ ipad) || data )
  const keyIpadHex = hexXor(key, ipad)
  const dataHex = Buffer.from(data, 'utf8').toString('hex')
  const inner = new HashCalculator(
    algo.length === 512 ? '1' : '0',
    'hex',
    keyIpadHex + dataHex
  ).run()

  // 4) Outer hash: H( (K ⊕ opad) || inner )
  const keyOpadHex = hexXor(key, opad)
  return new HashCalculator(
    algo.length === 512 ? '1' : '0',
    'hex',
    keyOpadHex + inner
  ).run()
}

/**
 * Проверяет HMAC-ГОСТ в constant time
 */
export function verifyHmacGost(
  data: string,
  signatureHex: string,
  hexKey: string,
  algo: GostAlgorithm = GOST256
): boolean {
  const expected = hmacGost(data, hexKey, algo)
  const sigBuf  = Buffer.from(signatureHex, 'hex')
  const expBuf  = Buffer.from(expected,    'hex')
  if (sigBuf.length !== expBuf.length) return false
  return timingSafeEqualHex(signatureHex, expected)
}

/**
 * HMAC-SHA256 через встроенный crypto
 */
export function hmacSha256(data: string, key: string): string {
  return createHmac('sha256', key).update(data).digest('hex')
}

export function verifyHmacSha256(
  data: string,
  signatureHex: string,
  key: string
): boolean {
  const expected = hmacSha256(data, key)
  const sigBuf   = Buffer.from(signatureHex, 'hex')
  const expBuf   = Buffer.from(expected,      'hex')
  if (sigBuf.length !== expBuf.length) return false
  return timingSafeEqual(sigBuf, expBuf)
}

/**
 * Генерация случайного ключа (256/512 бит) в hex
 */
export function generateRandomKey(lengthBits: 256 | 512 = 256): string {
  return randomBytes(lengthBits / 8).toString('hex')
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let diff = 0
  for (let i = 0; i < a.length; i++) {
    // XOR кодов символов; суммируем все отличия
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
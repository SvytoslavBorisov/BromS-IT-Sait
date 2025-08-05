import { hmacGost, verifyHmacGost } from '@/lib/crypto/functions'

const EXPIRATION_MS = 15 * 60 * 1000  // 15 минут

/**
 * Генерирует токен подтверждения в виде base64url(payload:sig)
 * где payload = userId:expiryTimestamp
 */
export function generateConfirmationToken(userId: string): string {
  const expiry = Date.now() + EXPIRATION_MS
  const payload = `${userId}:${expiry}`
  const sig     = hmacGost(payload, process.env.NEXT_PUBLIC_HMAC_SECRET!)
  // base64url (без =, +, /)
  return Buffer.from(`${payload}:${sig}`)
               .toString('base64')
               .replace(/\+/g, '-')
               .replace(/\//g, '_')
               .replace(/=+$/, '')
}

/**
 * Проверяет токен, возвращает userId или ошибку
 */
export function verifyConfirmationToken(token: string): {
  valid: boolean
  userId?: string
  error?: string
} {
  let decoded: string
  try {
    decoded = Buffer.from(token
                .replace(/-/g, '+')
                .replace(/_/g, '/'), 'base64')
                .toString('utf-8')
  } catch {
    return { valid: false, error: 'Невалидный формат токена' }
  }

  const [userId, expiryStr, sig] = decoded.split(':')
  if (!userId || !expiryStr || !sig) {
    return { valid: false, error: 'Неверный формат данных' }
  }

  const expiry = parseInt(expiryStr, 10)
  if (Date.now() > expiry) {
    return { valid: false, error: 'Срок действия истёк' }
  }

  const payload = `${userId}:${expiry}`
  if (!verifyHmacGost(payload, sig, process.env.NEXT_PUBLIC_HMAC_SECRET!)) {
    return { valid: false, error: 'Подпись не совпадает' }
  }

  return { valid: true, userId }
}

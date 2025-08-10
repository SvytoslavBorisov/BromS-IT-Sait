import { NextResponse } from 'next/server'
import { verifyHmacGost } from '@/lib/crypto/functions'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // let body: any
  // try {
  //   body = await request.json()
  // } catch (err) {
  //   // JSON некорректен
  //   return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  // }

  // const { payload, signature } = body

  // if (typeof payload !== 'string' || typeof signature !== 'string') {
  //   return NextResponse.json({ error: 'Неверный формат полей' }, { status: 400 })
  // }

  // const key = process.env.HMAC_SECRET_GOST
  // if (!key) {
  //   return NextResponse.json({ error: 'Ключ не настроен' }, { status: 500 })
  // }

  // const valid = verifyHmacGost(payload, signature, key)
  // if (!valid) {
  //   return NextResponse.json(
  //     { valid: false, error: 'Неправильная подпись' },
  //     { status: 401 }
  //   )
  // }

  return NextResponse.json({ valid: true }, { status: 200 })
}
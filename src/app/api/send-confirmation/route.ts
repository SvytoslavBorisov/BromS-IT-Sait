// src/app/api/send-confirmation/route.ts
import { NextResponse } from 'next/server'
import { generateConfirmationToken } from '@/lib/confirmation'

export async function POST(request: Request) {
  console.log('asdasdasdad');
  const body = await request.json().catch(() => ({}))
  const { email, userId } = body as { email?: string; userId?: string }
  if (request.method !== 'POST') {
    return NextResponse.error()
  }
  if (!email || !userId) {
    return NextResponse.json({ error: 'Нужны email и userId' }, { status: 400 })
  }

  const token = generateConfirmationToken(userId)
  const link  = `/profile/confirm?token=${token}`

  // TODO: здесь отправка письма
  console.log(`Send to ${email}: ${link}`)

  return NextResponse.json({ link }, { status: 200 })
}

import request from 'supertest'
import { createServer, Server } from 'http'
import next from 'next'

const PORT = 3001
const BASE_URL = `http://localhost:${PORT}`

let server: Server | undefined

beforeAll(async () => {
  // Запускаем Next.js в режиме разработки, чтобы не требовать build id
  const app = next({ dev: true, dir: process.cwd() })
  await app.prepare()
  const handle = app.getRequestHandler()

  server = createServer((req, res) => handle(req, res))
  await new Promise<void>((resolve) => server!.listen(PORT, resolve))
}, 20000) // до 20 сек на поднятие

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server!.close(err => err ? reject(err) : resolve())
    )
  }
})

test('valid gost-hmac', async () => {
  const payload   = 'test-message'
  const signature = '67622fb1399b3dc67c94e8e8cceb35ba2c89cd8b2bf9b5ef87521f92464b4fca'

  const res = await request(BASE_URL)
    .post('/api/verify')
    .send({ payload, signature })
    .set('Accept', 'application/json')

  expect(res.status).toBe(200)
  expect(res.body).toEqual({ valid: true })
})

test('invalid signature', async () => {
  const res = await request(BASE_URL)
    .post('/api/verify')
    .send({ payload: 'test-message', signature: '00' })
    .set('Accept', 'application/json')

  expect(res.status).toBe(401)
  expect(res.body.valid).toBe(false)
})
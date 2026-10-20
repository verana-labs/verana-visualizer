import { Buffer } from 'node:buffer'
import { createServer, type ServerResponse } from 'node:http'
import { isTolerated404, matchFixture } from './fixtures'

const PORT = Number(process.env.MOCK_PORT ?? 3101)
const unmatched: string[] = []

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': '*',
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { ...CORS, 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

createServer((req, res) => {
  const url = req.url ?? '/'
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    res.end()
    return
  }
  if (url === '/__unmatched') {
    if (req.method === 'DELETE') unmatched.length = 0
    json(res, 200, unmatched)
    return
  }
  const chunks: Buffer[] = []
  req.on('data', (chunk: Buffer) => chunks.push(chunk))
  req.on('end', () => {
    const text = Buffer.concat(chunks).toString('utf8')
    const body = text ? JSON.parse(text) : null
    const match = matchFixture(req.method ?? 'GET', url, req.headers, body)
    if (!match) {
      if (isTolerated404(req.method ?? 'GET', url, body)) {
        json(res, 404, { error: 'no fixture' })
        return
      }
      unmatched.push(
        `${req.method} ${url}${req.headers['at-block-height'] ? ` @${req.headers['at-block-height']}` : ''}${body ? ` ${JSON.stringify(body)}` : ''}`
      )
      json(res, 404, { error: 'no fixture' })
      return
    }
    json(res, match.status, match.body)
  })
}).listen(PORT, '127.0.0.1')

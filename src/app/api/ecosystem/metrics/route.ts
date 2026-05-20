import { NextRequest, NextResponse } from 'next/server'

const IDX_ENDPOINT = process.env.IDX_ENDPOINT || 'https://idx.testnet.verana.network'

export async function GET(request: NextRequest) {
  const height = request.nextUrl.searchParams.get('height')

  const headers: HeadersInit = {}
  if (height) {
    const parsed = parseInt(height, 10)
    if (isNaN(parsed) || parsed <= 0) {
      return NextResponse.json({ error: 'Invalid height parameter: must be a positive integer' }, { status: 400 })
    }
    headers['At-Block-Height'] = parsed.toString()
  }

  try {
    const response = await fetch(`${IDX_ENDPOINT}/verana/metrics/v1/all`, { headers })

    if (!response.ok) {
      return NextResponse.json({ error: `Indexer returned ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error proxying metrics request:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics from indexer' }, { status: 502 })
  }
}

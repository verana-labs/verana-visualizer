import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testnetModel } from '@/features/search/search-fixture'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { useObservatory } from '@/store/observatory-store'
import { EconomicsLens } from './economics-lens'

const raw = (name: string): unknown =>
  (
    JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet/raw', `${name}.json`), 'utf8')) as {
      body: unknown
    }
  ).body

const model = testnetModel()

beforeEach(() => {
  useObservatory.setState({ model, lens: 'network', economics: null, simulationOpen: false })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const { pathname } = new URL(input)
      if (pathname === '/v4/trust-deposit/get/1') return Response.json(raw('trust-deposit'))
      if (pathname.startsWith('/v4/trust-deposit/get/')) return Response.json({ code: 404 }, { status: 404 })
      if (pathname === '/v4/trust-deposit/params') return Response.json(raw('td-params'))
      if (pathname === '/v4/exchange-rate/list') return Response.json(raw('exchange-rates'))
      if (pathname === '/v4/stats/stats') return Response.json(raw('stats'))
      return new Response('unexpected', { status: 500 })
    })
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('EconomicsLens', () => {
  it('stays out of the way and fetches nothing until the Economics lens is chosen', () => {
    render(<EconomicsLens cfg={testnetCfg} />)
    expect(screen.queryByLabelText('Economics')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('loads live data, sizes the scene and opens the simulation panel', async () => {
    render(<EconomicsLens cfg={testnetCfg} />)
    act(() => useObservatory.getState().setLens('economics'))
    expect(await screen.findByTestId('deposit-total')).toHaveTextContent('0.05 VNA')
    expect(useObservatory.getState().economics?.sizes.get('ecosystem:1')).toBeCloseTo(2.4)
    await userEvent.setup().click(screen.getByRole('button', { name: /what-if simulator/i }))
    expect(screen.getByRole('dialog', { name: /simulation/i })).toBeInTheDocument()
  })
})

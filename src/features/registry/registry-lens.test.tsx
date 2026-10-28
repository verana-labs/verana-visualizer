import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useObservatory } from '@/store/observatory-store'
import { testnetCfg } from '../../../tests/support/network'
import { recorded, testnetModel } from '../../../tests/support/recorded'
import { RegistryLens } from './registry-lens'

const stats = recorded<unknown>('stats')
const model = testnetModel()
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  useObservatory.setState({ model, lens: 'network', selected: null, trustCheck: null })
  fetchMock = vi.fn(async (input: string) => {
    if (new URL(input).pathname === '/v4/stats/stats') return Response.json(stats)
    return new Response('unexpected', { status: 500 })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('RegistryLens', () => {
  it('stays out of the way and fetches nothing until the Registry lens is chosen', () => {
    render(<RegistryLens cfg={testnetCfg} />)
    expect(screen.queryByRole('complementary', { name: 'Registry' })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows lifecycle, watch list and coverage from real data in the Registry lens', async () => {
    render(<RegistryLens cfg={testnetCfg} />)
    act(() => useObservatory.getState().setLens('registry'))
    expect(screen.getByRole('complementary', { name: 'Registry' })).toBeInTheDocument()
    expect(await screen.findByText('No slashes recorded since 2026-10-15')).toBeInTheDocument()
    expect(screen.getByText('No accreditation expires in the next 30 days')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Coverage' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/pending/flat'))).toBe(false)
  })

  it('refreshes pending and slash data each time the lens is entered again', async () => {
    render(<RegistryLens cfg={testnetCfg} />)
    const statsCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('/v4/stats/stats')).length
    act(() => useObservatory.getState().setLens('registry'))
    await screen.findByText('No slashes recorded since 2026-10-15')
    act(() => useObservatory.getState().setLens('network'))
    act(() => useObservatory.getState().setLens('registry'))
    await screen.findByText('No slashes recorded since 2026-10-15')
    expect(statsCalls()).toBe(2)
  })

  it('gives the inspector slot back when an entity is selected', () => {
    render(<RegistryLens cfg={testnetCfg} />)
    act(() => useObservatory.setState({ lens: 'registry', selected: 'ecosystem:2' }))
    expect(screen.queryByRole('complementary', { name: 'Coverage' })).toBeNull()
  })
})

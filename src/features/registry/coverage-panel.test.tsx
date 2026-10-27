import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useObservatory } from '@/store/observatory-store'
import { testnetModel } from '../../../tests/support/recorded'
import { CoveragePanel } from './coverage-panel'
import { coverageMatrix } from './registry-data'

const model = testnetModel()

beforeEach(() => useObservatory.setState({ model, selected: null }))

describe('CoveragePanel', () => {
  it('lays out ecosystems × schemas with participant and service counts per cell', () => {
    render(<CoveragePanel model={model} />)
    const matrix = coverageMatrix(model)
    const rows = screen.getAllByRole('region')
    expect(rows).toHaveLength(matrix.length)
    const ecs = screen.getByRole('region', { name: 'ECS' })
    const cells = within(ecs).getAllByRole('listitem')
    const service = matrix.flatMap((row) => row.cells).find((cell) => cell.name === 'ServiceCredential')
    expect(cells).toHaveLength(5)
    expect(within(ecs).getByText('ServiceCredential').closest('li')).toHaveTextContent(
      `${service?.participants} participants · ${service?.services} services`
    )
  })

  it('selects a schema from its cell', async () => {
    render(<CoveragePanel model={model} />)
    await userEvent.click(screen.getByRole('button', { name: /ServiceCredential/ }))
    expect(useObservatory.getState().selected).toBe('schema:4')
  })
})

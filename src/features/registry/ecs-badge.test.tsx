import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Inspector } from '@/features/inspector/inspector'
import { useObservatory } from '@/store/observatory-store'
import { testnetModel } from '../../../tests/support/recorded'
import { EcsBadge, ecosystemEcsCompliance } from './ecs-badge'

const model = testnetModel()

describe('EcsBadge', () => {
  it('shows the badge once all 5 essential schema digests match', async () => {
    render(<EcsBadge model={model} ecosystemId={2} />)
    const badge = await screen.findByText('ECS compliant')
    expect(badge.closest('a')).toHaveAttribute(
      'href',
      'https://verana-labs.github.io/verifiable-trust-spec/#ecs-ec-essential-credential-schemas-ecosystem'
    )
  })

  it('renders nothing for an ordinary ecosystem, never an unknown badge', async () => {
    const { container } = render(<EcsBadge model={model} ecosystemId={11} />)
    await act(async () => {
      await expect(ecosystemEcsCompliance(model, 11)).resolves.toBe(false)
    })
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(/unknown/i)).toBeNull()
  })

  it('appears on the ECS ecosystem in the inspector', async () => {
    useObservatory.setState({ model, selected: 'ecosystem:2', trustCheck: null, queries: {} })
    render(<Inspector frontendUrl="https://app.testnet.verana.network" chainId="vna-testnet-1" />)
    expect(await screen.findByText('ECS compliant')).toBeInTheDocument()
  })
})

import { screen } from '@testing-library/dom'
import { render } from '@testing-library/react'
import { Header } from '../layout'

describe('Header', () => {
  it('renders title and subtitle', () => {
    render(<Header />)
    expect(screen.getByText('Verana Visualizer')).toBeInTheDocument()
    expect(screen.getByText('Decentralized Trust Layer')).toBeInTheDocument()
  })
})

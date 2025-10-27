import { render, screen } from '@testing-library/react'
import Header from '../Header'

describe('Header', () => {
  it('renders title and subtitle', () => {
    render(<Header />)
    expect(screen.getByText('Verana Visualizer')).toBeInTheDocument()
    expect(screen.getByText('Decentralized Trust Layer')).toBeInTheDocument()
  })
})



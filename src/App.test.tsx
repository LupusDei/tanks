import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the title', () => {
    render(<App />)
    expect(screen.getByText('Scorched Earth Tanks')).toBeInTheDocument()
  })

  it('shows project initialized message', () => {
    render(<App />)
    expect(screen.getByText('Project initialized successfully!')).toBeInTheDocument()
  })
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthProvider, useAuth } from '../src/features/auth/AuthContext'

function Harness() {
  const { user, register, changePassword } = useAuth()
  return <><span data-testid="user">{user?.name ?? 'signed out'}</span><button onClick={() => void register({ name: 'Test Admin', email: 'test@example.com', password: 'OldPass123', role: 'citizen' })}>register</button><button onClick={() => void changePassword('OldPass123', 'NewPass123')}>change</button></>
}

describe('auth integration contract', () => {
  afterEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('rotates the token on password change', async () => {
    render(<AuthProvider><Harness /></AuthProvider>)
    fireEvent.click(screen.getByText('register'))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Test Admin'))
    const originalToken = sessionStorage.getItem('civicx_access_token')
    fireEvent.click(screen.getByText('change'))
    await waitFor(() => expect(sessionStorage.getItem('civicx_access_token')).not.toBe(originalToken))
    expect(localStorage.getItem('civicx_user')).toContain('test@example.com')
  })
})
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../src/features/auth/AuthContext'
import { request } from '../src/api/client'

vi.mock('../src/api/client', () => ({ request: vi.fn() }))

function Harness() {
  const { user, register, changePassword } = useAuth()
  return <>
    <span data-testid="user">{user?.name ?? 'signed out'}</span>
    <button onClick={() => void register({ name: 'Test Citizen', email: 'test@example.com', password: 'OldPass123', role: 'citizen' })}>register</button>
    <button onClick={() => void changePassword('OldPass123', 'NewPass123')}>change</button>
  </>
}

describe('auth integration contract', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.mocked(request).mockReset()
  })

  it('does not create a local account when registration fails', async () => {
    vi.mocked(request).mockRejectedValueOnce(new Error('Network request failed'))
    render(<AuthProvider><Harness /></AuthProvider>)
    fireEvent.click(screen.getByText('register'))
    await waitFor(() => expect(vi.mocked(request)).toHaveBeenCalled())
    expect(screen.getByTestId('user')).toHaveTextContent('signed out')
    expect(localStorage.getItem('civicx_user')).toBeNull()
    expect(sessionStorage.getItem('civicx_access_token')).toBeNull()
  })

  it('does not claim that password changes were saved without a backend endpoint', async () => {
    render(<AuthProvider><Harness /></AuthProvider>)
    fireEvent.click(screen.getByText('change'))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('signed out'))
    expect(localStorage.getItem('civicx_session_version')).toBeNull()
  })
})

import React, { createContext, useCallback, useContext, useState } from 'react'
import { ROLES, type Role } from '../../constants/roles'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
  institution?: string
  status?: 'pending' | 'approved'
}

type Credentials = { email: string; password: string }
type AuthContextType = {
  user: AuthUser | null
  role: Role | null
  isMockMode: boolean
  isRefreshing: boolean
  login: (credentials: Credentials, role: Role) => Promise<{ ok: boolean; message?: string }>
  register: (user: Omit<AuthUser, 'id' | 'status'> & { password: string }) => Promise<{ ok: boolean; message?: string }>
  logout: () => void
  refreshSession: () => Promise<boolean>
}

const USER_KEY = 'civicx_user'
const DEMO_EMAIL = 'citizen@civicx.test'
const DEMO_PASSWORD = 'CivicX@123'
const AuthContext = createContext<AuthContextType | undefined>(undefined)

function readSavedUser(): AuthUser | null {
  try {
    const saved = localStorage.getItem(USER_KEY)
    return saved ? JSON.parse(saved) as AuthUser : null
  } catch {
    return null
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(readSavedUser)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isMockMode = import.meta.env.DEV

  const saveSession = (nextUser: AuthUser) => {
    sessionStorage.setItem('civicx_access_token', `demo-token-${Date.now()}`)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const login = async ({ email, password }: Credentials, role: Role) => {
    if (!email || !password) return { ok: false, message: 'Enter your email and password.' }
    if (password.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' }
    if (email.toLowerCase() !== DEMO_EMAIL && !email.includes('@')) return { ok: false, message: 'Enter a valid email address.' }
    if (email.toLowerCase() === DEMO_EMAIL && password !== DEMO_PASSWORD) return { ok: false, message: 'Invalid email or password.' }
    if (role === ROLES.ADMIN) return { ok: false, message: 'Administrator access is invitation-only.' }
    saveSession({ id: 'usr_demo_001', name: 'Aarav Kumar', email, role, status: role === ROLES.UNIVERSITY || role === ROLES.INDUSTRY ? 'pending' : 'approved' })
    return { ok: true }
  }

  const register = async (newUser: Omit<AuthUser, 'id' | 'status'> & { password: string }) => {
    if (newUser.password.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' }
    if (!newUser.email.includes('@')) return { ok: false, message: 'Enter a valid email address.' }
    saveSession({ id: `usr_${Date.now()}`, name: newUser.name, email: newUser.email, role: newUser.role, institution: newUser.institution, status: newUser.role === ROLES.CITIZEN ? 'approved' : 'pending' })
    return { ok: true }
  }

  const refreshSession = useCallback(async () => {
    setIsRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 250))
    const saved = readSavedUser()
    const hasRefreshCookie = Boolean(saved)
    if (!hasRefreshCookie) sessionStorage.removeItem('civicx_access_token')
    setUser(saved)
    setIsRefreshing(false)
    return hasRefreshCookie
  }, [])

  const logout = () => {
    sessionStorage.removeItem('civicx_access_token')
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, role: user?.role ?? null, isMockMode, isRefreshing, login, register, logout, refreshSession }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

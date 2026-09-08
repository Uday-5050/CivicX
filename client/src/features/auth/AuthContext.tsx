import React, { createContext, useCallback, useContext, useState } from 'react'
import { ROLES, type Role } from '../../constants/roles'
import { request } from '../../api/client'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
  institution?: string
  status?: 'pending' | 'approved'
}

type Credentials = { email: string; password: string }
type ApiUser = { id: string; name: string; email: string; role: Role; accountStatus: 'pending' | 'active' | 'suspended'; institutionId?: string | null }
type AuthPayload = { user: ApiUser; accessToken: string }
type AuthContextType = {
  user: AuthUser | null
  role: Role | null
  isMockMode: boolean
  isRefreshing: boolean
  login: (credentials: Credentials, role: Role) => Promise<{ ok: boolean; message?: string }>
  register: (user: Omit<AuthUser, 'id' | 'status'> & { password: string }) => Promise<{ ok: boolean; message?: string }>
  logout: () => void
  refreshSession: () => Promise<boolean>
  updateProfile: (updates: { name: string; institution?: string }) => Promise<{ ok: boolean; message?: string }>
  changePassword: (currentPassword: string, nextPassword: string) => Promise<{ ok: boolean; message?: string }>
}

const USER_KEY = 'civicx_user'
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
  const isMockMode = false

  const saveSession = (nextUser: AuthUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const saveApiSession = (payload: AuthPayload) => {
    sessionStorage.setItem('civicx_access_token', payload.accessToken)
    saveSession({ id: payload.user.id, name: payload.user.name, email: payload.user.email, role: payload.user.role, institution: payload.user.institutionId ?? undefined, status: payload.user.accountStatus === 'active' ? 'approved' : 'pending' })
  }

  const login = async ({ email, password }: Credentials, role: Role) => {
    if (!email || !password) return { ok: false, message: 'Enter your email and password.' }
    if (password.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' }

    try {
      const response = await request<AuthPayload>('/auth/web/login', { method: 'POST', data: { email, password } })
      if (response.data.user.role !== role && !(role === ROLES.UNIVERSITY && response.data.user.role === ROLES.INDUSTRY)) return { ok: false, message: 'This account does not match the selected sign-in type.' }
      saveApiSession(response.data)
      return { ok: true }
    } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Unable to sign in.' } }
  }

  const register = async (newUser: Omit<AuthUser, 'id' | 'status'> & { password: string }) => {
    try {
      if (newUser.role === ROLES.CITIZEN) {
        await request('/auth/register', { method: 'POST', data: { name: newUser.name, email: newUser.email, password: newUser.password } })
        return login({ email: newUser.email, password: newUser.password }, ROLES.CITIZEN)
      }
      const response = await request<{ user: ApiUser }>('/auth/onboard-request', { method: 'POST', data: { name: newUser.name, email: newUser.email, password: newUser.password, institutionName: newUser.institution, institutionType: newUser.role === ROLES.INDUSTRY ? ROLES.INDUSTRY : ROLES.UNIVERSITY } })
      saveSession({ id: response.data.user.id, name: response.data.user.name, email: response.data.user.email, role: response.data.user.role, institution: newUser.institution, status: 'pending' })
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Unable to create account.' }
    }
  }

  const refreshSession = useCallback(async () => {
    setIsRefreshing(true)
    try { const response = await request<AuthPayload>('/auth/web/refresh', { method: 'POST' }); saveApiSession(response.data); return true }
    catch { sessionStorage.removeItem('civicx_access_token'); localStorage.removeItem(USER_KEY); setUser(null); return false }
    finally { setIsRefreshing(false) }
  }, [])

  const logout = () => {
    void request('/auth/web/logout', { method: 'POST' }).catch(() => undefined)
    sessionStorage.removeItem('civicx_access_token')
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  const updateProfile = async (updates: { name: string; institution?: string }) => {
    if (!user) return { ok: false, message: 'Sign in to update your profile.' }
    if (!updates.name.trim()) return { ok: false, message: 'Name is required.' }
    return { ok: false, message: 'Profile editing is not available yet.' }
  }

  const changePassword = async (currentPassword: string, nextPassword: string) => {
    if (!user) return { ok: false, message: 'Sign in to change your password.' }
    if (nextPassword.length < 8) return { ok: false, message: 'New password must be at least 8 characters.' }
    if (!currentPassword) return { ok: false, message: 'Enter your current password.' }
    return { ok: false, message: 'Password changes are not available yet. Use Forgot password from the sign-in page.' }
  }

  return <AuthContext.Provider value={{ user, role: user?.role ?? null, isMockMode, isRefreshing, login, register, logout, refreshSession, updateProfile, changePassword }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

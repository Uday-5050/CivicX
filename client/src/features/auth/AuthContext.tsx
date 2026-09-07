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
const DEMO_EMAIL = 'citizen@civicx.test'
const DEMO_PASSWORD = 'CivicX@123'
const DEMO_ADMIN_EMAIL = 'admin@civicx.test'
const DEMO_ADMIN_PASSWORD = 'Admin@123'
const DEMO_GOV_EMAIL = 'gov@civicx.test'
const DEMO_GOV_PASSWORD = 'Gov@1234'
const PASSWORD_KEY = 'civicx_password'
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

  const saveSession = (nextUser: AuthUser, password?: string) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    if (password) localStorage.setItem(`${PASSWORD_KEY}:${nextUser.id}`, password)
    setUser(nextUser)
  }

  const saveApiSession = (payload: AuthPayload, password?: string) => {
    sessionStorage.setItem('civicx_access_token', payload.accessToken)
    saveSession({ id: payload.user.id, name: payload.user.name, email: payload.user.email, role: payload.user.role, institution: payload.user.institutionId ?? undefined, status: payload.user.accountStatus === 'active' ? 'approved' : 'pending' }, password)
  }

  const login = async ({ email, password }: Credentials, role: Role) => {
    if (!email || !password) return { ok: false, message: 'Enter your email and password.' }
    if (password.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' }

    const isCitizenDemo = email.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD
    const isAdminDemo = role === ROLES.ADMIN && email.toLowerCase() === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD
    const isGovDemo = role === ROLES.GOVERNMENT && email.toLowerCase() === DEMO_GOV_EMAIL && password === DEMO_GOV_PASSWORD

    if (isGovDemo) {
      saveSession({ id: 'usr_gov_001', name: 'Dr. Anita Sharma', email, role: ROLES.GOVERNMENT, status: 'approved' }, password)
      return { ok: true }
    }
    if (isAdminDemo) {
      saveSession({ id: 'usr_admin_001', name: 'Platform Administrator', email, role: ROLES.ADMIN, status: 'approved' }, password)
      return { ok: true }
    }
    if (isCitizenDemo) {
      saveSession({ id: 'usr_demo_001', name: 'Aarav Kumar', email, role: ROLES.CITIZEN, status: 'approved' }, password)
      return { ok: true }
    }

    try {
      const response = await request<AuthPayload>('/auth/web/login', { method: 'POST', data: { email, password } })
      if (response.data.user.role !== role && !(role === ROLES.UNIVERSITY && response.data.user.role === ROLES.INDUSTRY)) return { ok: false, message: 'This account does not match the selected sign-in type.' }
      saveApiSession(response.data, password)
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
      saveSession({ id: response.data.user.id, name: response.data.user.name, email: response.data.user.email, role: response.data.user.role, institution: newUser.institution, status: 'pending' }, newUser.password)
      return { ok: true }
    } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Unable to create account.' } }
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
    const nextUser = { ...user, name: updates.name.trim(), institution: updates.institution?.trim() || undefined }
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser)); setUser(nextUser); return { ok: true }
  }

  const changePassword = async (currentPassword: string, nextPassword: string) => {
    if (!user) return { ok: false, message: 'Sign in to change your password.' }
    if (nextPassword.length < 8) return { ok: false, message: 'New password must be at least 8 characters.' }
    const savedPassword = localStorage.getItem(`${PASSWORD_KEY}:${user.id}`)
    if (!savedPassword || currentPassword !== savedPassword) return { ok: false, message: 'Current password is incorrect.' }
    localStorage.setItem(`${PASSWORD_KEY}:${user.id}`, nextPassword)
    localStorage.setItem('civicx_session_version', String(Date.now()))
    return { ok: true }
  }

  return <AuthContext.Provider value={{ user, role: user?.role ?? null, isMockMode, isRefreshing, login, register, logout, refreshSession, updateProfile, changePassword }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

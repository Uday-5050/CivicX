import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import Threads from './components/Threads/Threads'
import { useAuth } from './features/auth/AuthContext'
import { ROLE_LABELS, ROLES, type Role } from './constants/roles'
import './App.css'

type Route = '/' | '/login' | '/register' | '/institution' | '/forgot-password' | '/reset-password' | '/home'
const route = (): Route => (window.location.hash.replace('#', '') as Route) || '/'
const go = (next: Route) => { window.location.hash = next }

function Brand() {
  return <a className="brand" href="#/" aria-label="CivicX home"><span className="brand-mark">CX</span><span><strong>CivicX</strong><small>Public service, connected</small></span></a>
}

function AuthLayout({ children, eyebrow, title, copy }: { children: ReactNode; eyebrow: string; title: string; copy: string }) {
  return <main className="auth-page"><div className="auth-art" aria-hidden="true"><Threads color={[0.38, 0.72, 1]} amplitude={1.1} distance={0.12} enableMouseInteraction /><div className="auth-art-wash" /></div><header className="auth-header"><Brand /><a href="#/" className="back-link">Back to CivicX <span>↗</span></a></header><section className="auth-layout"><div className="auth-intro"><p className="eyebrow"><span /> {eyebrow}</p><h1>{title}</h1><p>{copy}</p></div><div className="auth-panel">{children}</div></section></main>
}

function Login() {
  const { login } = useAuth()
  const [role, setRole] = useState<Role>(ROLES.CITIZEN)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); const result = await login({ email, password }, role); setBusy(false); if (!result.ok) setError(result.message ?? 'Unable to sign in.'); else go('/home') }
  return <AuthLayout eyebrow="Welcome back" title="Your civic space is waiting." copy="Sign in to follow requests, collaborate with your institution, and make progress visible."><form className="auth-form" onSubmit={submit}><div className="role-switch" aria-label="Sign in as"><button type="button" className={role === ROLES.CITIZEN ? 'active' : ''} onClick={() => setRole(ROLES.CITIZEN)}>Citizen</button><button type="button" className={role !== ROLES.CITIZEN ? 'active' : ''} onClick={() => setRole(ROLES.UNIVERSITY)}>Institution</button></div><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required /></label><div className="form-row"><label className="check-label"><input type="checkbox" /> Remember this device</label><a href="#/forgot-password">Forgot password?</a></div>{error && <p className="inline-error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'} <span>→</span></button><p className="form-foot">New to CivicX? <a href="#/register">Create a citizen account</a></p><p className="demo-note">Demo: citizen@civicx.test / CivicX@123</p></form></AuthLayout>
}

function Register({ institution = false }: { institution?: boolean }) {
  const { register } = useAuth()
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [institutionName, setInstitutionName] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); const result = await register({ name, email, password, institution: institutionName || undefined, role: institution ? ROLES.UNIVERSITY : ROLES.CITIZEN }); setBusy(false); if (!result.ok) setError(result.message ?? 'Unable to create account.'); else go('/home') }
  return <AuthLayout eyebrow={institution ? 'Institution onboarding' : 'Citizen registration'} title={institution ? 'Bring your institution into the conversation.' : 'Start making a difference locally.'} copy={institution ? 'Register your organization to collaborate on civic challenges and turn ideas into measurable outcomes.' : 'Create a trusted identity to raise issues, track outcomes, and participate in your community.'}><form className="auth-form" onSubmit={submit}><div className="form-grid"><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label></div>{institution && <label>Institution name<input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} placeholder="Organization or university" required /></label>}<label>Create password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required /></label><label className="check-label"><input type="checkbox" required /> I agree to the CivicX terms and privacy notice</label>{error && <p className="inline-error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Creating account...' : institution ? 'Submit for approval' : 'Create account'} <span>→</span></button><p className="form-foot">Already registered? <a href="#/login">Sign in</a></p></form></AuthLayout>
}

function PasswordReset({ reset = false }: { reset?: boolean }) {
  const [sent, setSent] = useState(false)
  const submit = (event: FormEvent) => { event.preventDefault(); setSent(true) }
  return <AuthLayout eyebrow={reset ? 'Choose a new password' : 'Account recovery'} title={reset ? 'Set a password you will remember.' : 'Let’s get you back in.'} copy={reset ? 'Your reset link is verified. Choose a strong password for your CivicX account.' : 'Enter your email and we will send a secure password reset link.'}>{sent ? <div className="success-box"><span className="success-icon">✓</span><h2>{reset ? 'Password updated' : 'Check your inbox'}</h2><p>{reset ? 'Your password has been changed successfully.' : 'A reset link has been sent. This demo accepts any valid email address.'}</p><a className="auth-submit" href="#/login">Return to sign in <span>→</span></a></div> : <form className="auth-form" onSubmit={submit}><label>{reset ? 'New password' : 'Email address'}<input type={reset ? 'password' : 'email'} placeholder={reset ? 'At least 8 characters' : 'you@example.com'} minLength={reset ? 8 : undefined} required /></label><button className="auth-submit" type="submit">{reset ? 'Update password' : 'Send reset link'} <span>→</span></button><p className="form-foot"><a href="#/login">Return to sign in</a></p></form>}</AuthLayout>
}

function Home() {
  const { user, logout } = useAuth()
  if (!user) { go('/login'); return null }
  const pending = user.status === 'pending'
  return <main className="home-page"><header className="home-header"><Brand /><div className="home-account"><span>{user.name}</span><button type="button" onClick={() => { logout(); go('/') }}>Sign out</button></div></header><section className="home-content"><p className="eyebrow"><span /> {ROLE_LABELS[user.role]} workspace</p><h1>Hello, {user.name.split(' ')[0]}.</h1><p className="home-lead">{pending ? 'Your institution profile is under review. We will notify you when it is approved.' : 'Your civic journey starts here. What would you like to do today?'}</p><div className="home-grid"><article><span className="tile-number">01</span><h2>Raise a request</h2><p>Share an issue or idea with the people who can help.</p><button type="button">Start a request →</button></article><article><span className="tile-number">02</span><h2>Track progress</h2><p>See updates from your community and institutions.</p><button type="button">View activity →</button></article><article><span className="tile-number">03</span><h2>Your profile</h2><p>Keep your contact details and preferences current.</p><button type="button">Manage profile →</button></article></div></section></main>
}

  function Landing() { return <main className="landing-page"><div className="landing-canvas" aria-hidden="true"><Threads color={[0.38, 0.72, 1]} amplitude={1.15} distance={0.12} enableMouseInteraction /></div><div className="landing-wash" aria-hidden="true" /><nav className="site-nav" aria-label="Main navigation"><Brand /><div className="nav-links"><a href="#services">Services</a><a href="#about">About CivicX</a></div><a className="nav-login" href="#/login">Sign in <span>↗</span></a></nav><section className="hero-copy" id="about"><p className="eyebrow"><span /> समस्या से समाधान तक</p><h1>From problems to solutions,<br /><em>CivicX is with you.</em></h1><p className="hero-description">Access public services, follow your requests, and build a better community from one trusted place.</p><div className="hero-actions"><a className="btn btn-primary" href="#/register">Get started <span>→</span></a><a className="text-link" href="#/login">Already registered? <strong>Sign in</strong></a></div></section><section className="service-bar" id="services" aria-label="CivicX services"><div className="service-intro"><span className="live-dot" /> Your civic space</div><div className="service-item"><span>01</span><strong>Raise a request</strong><small>Be heard, be counted</small></div><div className="service-item"><span>02</span><strong>Track progress</strong><small>Stay in the loop</small></div><div className="service-item"><span>03</span><strong>Shape tomorrow</strong><small>Take part locally</small></div></section></main> }

export default function App() {
  const { user, isRefreshing, refreshSession } = useAuth()
  const [currentRoute, setCurrentRoute] = useState<Route>(route)
  useEffect(() => { const handleHash = () => setCurrentRoute(route()); window.addEventListener('hashchange', handleHash); if (!user && currentRoute === '/home') void refreshSession(); return () => window.removeEventListener('hashchange', handleHash) }, [currentRoute, refreshSession, user])
  if (isRefreshing) return <div className="route-loading">Restoring your secure session...</div>
  if (currentRoute === '/home') return <Home />
  if (currentRoute === '/login') return <Login />
  if (currentRoute === '/register') return <Register />
  if (currentRoute === '/institution') return <Register institution />
  if (currentRoute === '/forgot-password') return <PasswordReset />
  if (currentRoute === '/reset-password') return <PasswordReset reset />
  return <Landing />
}

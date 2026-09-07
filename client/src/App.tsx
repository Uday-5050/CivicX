import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import Threads from './components/Threads/Threads'
import { useAuth } from './features/auth/AuthContext'
import { ROLE_LABELS, ROLES, type Role } from './constants/roles'
import SubmissionWorkspace from './components/Submissions/SubmissionWorkspace'
import UniversityInbox from './components/University/UniversityInbox'
import IndustryWorkspace from './components/Industry/IndustryWorkspace'
import UniversityCollaborationRequests from './components/University/UniversityCollaborationRequests'
import ProjectBoard from './components/Projects/ProjectBoard'
import AccountWorkspace from './components/Account/AccountWorkspace'
import AccountExtras from './components/Account/AccountExtras'
import AdminDashboard from './components/Admin/AdminDashboard'
import './App.css'

type Route = '/' | '/login' | '/register' | '/institution' | '/forgot-password' | '/reset-password' | '/home' | '/submit' | '/university' | '/industry' | '/projects' | '/settings' | '/admin'
const route = (): Route => (window.location.hash.replace('#', '') as Route) || '/'
const go = (next: Route) => { window.location.hash = next }

function Brand() {
  return <a className="brand civicx-brand" href="#/" aria-label="CivicX home"><span className="civicx-logo" aria-hidden="true"><svg viewBox="0 0 56 42" role="presentation"><defs><linearGradient id="civicx-blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#36d5ed" /><stop offset="1" stopColor="#075df0" /></linearGradient><linearGradient id="civicx-green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8df254" /><stop offset="1" stopColor="#16bdce" /></linearGradient></defs><path fill="url(#civicx-blue)" d="M2 3h15l12 14L17 30H2l12-13L2 3Zm52 0H39L27 17l12 13h15L42 17 54 3Z" /><path fill="url(#civicx-green)" d="M39 3h15L42 17 54 30H39L27 17 39 3Z" /><path fill="#071d3d" d="M29 10c5 7 7 13 4 20-1 3-3 6-6 9H17c8-8 12-15 12-20 0-3-1-6-2-9h2Z" /><path fill="#fff" d="m31 14 2 1-1 4-3-1 1-4Zm1 8 3 1-2 5-3-1 2-5Zm-4 9 3 1-3 5h-4l4-6Z" /></svg></span><span className="civicx-wordmark"><strong>Civic<span>X</span></strong><small><i>CONNECT</i><b>•</b><i>REPORT</i><b>•</b><i>RESOLVE</i></small></span></a>
}

function AuthLayout({ children, eyebrow, title, copy }: { children: ReactNode; eyebrow: string; title: string; copy: string }) {
  return <main className="auth-page"><div className="auth-art" aria-hidden="true"><Threads color={[0.38, 0.72, 1]} amplitude={1.1} distance={0.12} enableMouseInteraction /><div className="auth-art-wash" /></div><header className="auth-header"><Brand /><a href="#/" className="back-link">Back to CivicX <span>↗</span></a></header><section className="auth-layout"><div className="auth-intro"><p className="eyebrow"><span /> {eyebrow}</p><h1>{title}</h1><p>{copy}</p></div><div className="auth-panel">{children}</div></section></main>
}

function Login({ initialRole = ROLES.CITIZEN }: { initialRole?: Role }) {
  const { login } = useAuth()
  const [role, setRole] = useState<Role>(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); const result = await login({ email, password }, role); setBusy(false); if (!result.ok) setError(result.message ?? 'Unable to sign in.'); else go('/home') }
  return <main className="login-page"><section className="login-story"><div className="login-brand"><Brand /></div><div className="login-story-copy"><p className="login-eyebrow"><span /> Welcome back</p><h1>Your civic<br />space is<br /><em>waiting.</em></h1><p>Sign in to follow requests, collaborate with your institution, and make progress visible.</p><div className="login-features"><div><span>♧</span><strong>Connect<small>with your community</small></strong></div><div><span>▤</span><strong>Report<small>issues easily</small></strong></div><div><span>▥</span><strong>Resolve<small>for a better tomorrow</small></strong></div></div></div><p className="login-quote">Better<br />Communities<br /><em>Brighter<br />Tomorrows</em></p><div className="login-civic-art" aria-hidden="true"><span className="login-art-sun" /><span className="login-art-building building-main" /><span className="login-art-building building-side" /><span className="login-art-road" /></div></section><section className="login-panel"><div className="login-panel-art" aria-hidden="true"><Threads color={[0.3, 0.75, 1]} amplitude={.8} distance={.1} enableMouseInteraction /></div><a className="login-back" href="#/">Back to CivicX <span>→</span></a><div className="login-card"><div className="role-switch" aria-label="Sign in as"><button type="button" className={role === ROLES.CITIZEN ? 'active' : ''} onClick={() => setRole(ROLES.CITIZEN)}>♟ &nbsp; Citizen</button><button type="button" className={role !== ROLES.CITIZEN ? 'active' : ''} onClick={() => setRole(ROLES.UNIVERSITY)}>♜ &nbsp; Institution</button></div><form className="auth-form" onSubmit={submit}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required /></label><div className="form-row"><label className="check-label"><input type="checkbox" /> Remember this device</label><a href="#/forgot-password">Forgot password?</a></div>{error && <p className="inline-error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'} <span>→</span></button><p className="form-foot">New to CivicX? <a href="#/register">Create a citizen account</a></p><p className="demo-note">Demo: citizen@civicx.test / CivicX@123</p></form></div><p className="login-panel-quote">“ &nbsp;Small actions. A stronger community.&nbsp; ”</p></section></main>
}

function Register({ institution = false }: { institution?: boolean }) {
  const { register } = useAuth()
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [institutionName, setInstitutionName] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); const result = await register({ name, email, password, institution: institutionName || undefined, role: institution ? ROLES.UNIVERSITY : ROLES.CITIZEN }); setBusy(false); if (!result.ok) setError(result.message ?? 'Unable to create account.'); else go('/home') }
  if (institution) return <AuthLayout eyebrow="Institution onboarding" title="Bring your institution into the conversation." copy="Register your organization to collaborate on civic challenges and turn ideas into measurable outcomes."><form className="auth-form" onSubmit={submit}><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label>Institution name<input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} placeholder="Organization or university" required /></label><label>Create password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required /></label><label className="check-label"><input type="checkbox" required /> I agree to the CivicX terms and privacy notice</label>{error && <p className="inline-error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Creating account...' : 'Submit for approval'} <span>→</span></button><p className="form-foot">Already registered? <a href="#/login">Sign in</a></p></form></AuthLayout>
  return <main className="registration-page"><section className="registration-story"><div className="registration-brand"><Brand /><span className="registration-account">Already have an account? <a href="#/login">Sign in</a></span></div><div className="registration-story-copy"><p className="registration-eyebrow"><span /> Citizen registration</p><h1>Start making a<br /><em>difference</em><br />locally.</h1><p>Create a trusted identity to raise issues, track outcomes, and participate in your community.</p><div className="registration-features"><div><span className="feature-icon feature-blue">◆</span><span><strong>Raise Issues</strong><small>Report local problems easily</small></span></div><div><span className="feature-icon feature-green">▥</span><span><strong>Track Outcomes</strong><small>Stay updated in real time</small></span></div><div><span className="feature-icon feature-purple">●</span><span><strong>Stronger Community</strong><small>Be a part of the change</small></span></div></div></div><p className="registration-quote">Together For A<br /><em>Better Tomorrow</em></p><div className="registration-city" aria-hidden="true"><img className="student-photo" src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=82" alt="Students walking together" /><span className="city-sun" /><span className="city-building city-building-one" /><span className="city-building city-building-two" /><span className="city-building city-building-three" /><span className="city-person person-one" /><span className="city-person person-two" /><span className="city-person person-three" /></div></section><section className="registration-form-side"><div className="registration-form-wrap"><div className="registration-form-heading"><h2>Create your account</h2><p>Join CivicX and be a part of a smarter, stronger tomorrow.</p></div><form className="registration-form" onSubmit={submit}><label><span>Full name</span><div className="registration-input"><b>♙</b><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required /></div></label><label><span>Email address</span><div className="registration-input"><b>✉</b><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label><label><span>Create password</span><div className="registration-input"><b>▣</b><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required /><i>◉</i></div></label><label className="registration-check"><input type="checkbox" required /> <span>I agree to the CivicX <a href="#/register">terms</a> and <a href="#/register">privacy notice</a></span></label>{error && <p className="inline-error" role="alert">{error}</p>}<button className="registration-submit" type="submit" disabled={busy}>{busy ? 'Creating account...' : 'Create account'} <span>→</span></button></form><p className="registration-signin">Already registered? <a href="#/login">Sign in</a></p></div><footer className="registration-footer"><span>© 2025 CivicX &nbsp;|&nbsp; Making cities better, together.</span><span>Help &nbsp;|&nbsp; Privacy &nbsp;|&nbsp; Terms</span></footer></section></main>
}

function PasswordReset({ reset = false }: { reset?: boolean }) {
  const [sent, setSent] = useState(false)
  const submit = (event: FormEvent) => { event.preventDefault(); setSent(true) }
  return <AuthLayout eyebrow={reset ? 'Choose a new password' : 'Account recovery'} title={reset ? 'Set a password you will remember.' : 'Let’s get you back in.'} copy={reset ? 'Your reset link is verified. Choose a strong password for your CivicX account.' : 'Enter your email and we will send a secure password reset link.'}>{sent ? <div className="success-box"><span className="success-icon">✓</span><h2>{reset ? 'Password updated' : 'Check your inbox'}</h2><p>{reset ? 'Your password has been changed successfully.' : 'A reset link has been sent. This demo accepts any valid email address.'}</p><a className="auth-submit" href="#/login">Return to sign in <span>→</span></a></div> : <form className="auth-form" onSubmit={submit}><label>{reset ? 'New password' : 'Email address'}<input type={reset ? 'password' : 'email'} placeholder={reset ? 'At least 8 characters' : 'you@example.com'} minLength={reset ? 8 : undefined} required /></label><button className="auth-submit" type="submit">{reset ? 'Update password' : 'Send reset link'} <span>→</span></button><p className="form-foot"><a href="#/login">Return to sign in</a></p></form>}</AuthLayout>
}

function Home() {
  const { user, logout } = useAuth()
  if (!user) { go('/login'); return null }
  if (user.role === ROLES.UNIVERSITY) return <UniversityPage />
  if (user.role === ROLES.INDUSTRY) return <IndustryPage />
  if (user.role === ROLES.ADMIN) return <AdminPage />
  const pending = user.status === 'pending'
  return <main className="home-page"><header className="home-header"><Brand /><div className="home-account"><a href="#/settings">Notifications & settings</a><span>{user.name}</span><button type="button" onClick={() => { logout(); go('/') }}>Sign out</button></div></header><section className="home-content"><p className="eyebrow"><span /> {ROLE_LABELS[user.role]} workspace</p><h1>Hello, {user.name.split(' ')[0]}.</h1><p className="home-lead">{pending ? 'Your institution profile is under review. We will notify you when it is approved.' : 'Your civic journey starts here. What would you like to do today?'}</p><div className="home-grid"><article><span className="tile-number">01</span><h2>Raise a request</h2><p>Share an issue or idea with the people who can help.</p><button type="button" onClick={() => go('/submit')}>Start a request →</button></article><article><span className="tile-number">02</span><h2>Track progress</h2><p>See updates from your community and institutions.</p><button type="button" onClick={() => go('/submit')}>View activity →</button></article><article><span className="tile-number">03</span><h2>Your profile</h2><p>Keep your contact details and preferences current.</p><button type="button" onClick={() => go('/settings')}>Manage profile →</button></article></div></section></main>
}

function SubmissionPage() {
  const { user, logout } = useAuth()
  if (!user) { go('/login'); return null }
  return <main className="home-page"><header className="home-header"><Brand /><div className="home-account"><a href="#/home">Dashboard</a><span>{user.name}</span><button type="button" onClick={() => { logout(); go('/') }}>Sign out</button></div></header><section className="home-content submission-page-content"><SubmissionWorkspace role={user.role} /></section></main>
}

function UniversityPage() {
  const { user, logout } = useAuth()
  if (!user || user.role !== ROLES.UNIVERSITY) { go('/login'); return null }
  return <main className="home-page"><header className="home-header"><Brand /><div className="home-account"><a href="#/home">Dashboard</a><a href="#/projects">Project board</a><span>{user.name}</span><button type="button" onClick={() => { logout(); go('/') }}>Sign out</button></div></header><UniversityInbox /><UniversityCollaborationRequests /></main>
}

function IndustryPage() {
  const { user, logout } = useAuth()
  if (!user || user.role !== ROLES.INDUSTRY) return <Login initialRole={ROLES.INDUSTRY} />
  return <main className="home-page"><header className="home-header"><Brand /><div className="home-account"><a href="#/home">Dashboard</a><a href="#/projects">Project board</a><span>{user.name}</span><button type="button" onClick={() => { logout(); go('/') }}>Sign out</button></div></header><IndustryWorkspace /></main>
}

function ProjectBoardPage() {
  const { user, logout } = useAuth()
  if (!user || (user.role !== ROLES.UNIVERSITY && user.role !== ROLES.INDUSTRY)) { go('/login'); return null }
  return <main className="home-page"><header className="home-header"><Brand /><div className="home-account"><a href="#/home">Dashboard</a><span>{user.name}</span><button type="button" onClick={() => { logout(); go('/') }}>Sign out</button></div></header><ProjectBoard role={user.role} /></main>
}

function SettingsPage() {
  const { user, logout } = useAuth()
  if (!user) { go('/login'); return null }
  return <main className="home-page"><header className="home-header"><Brand /><div className="home-account"><a href="#/home">Dashboard</a><span>{user.name}</span><button type="button" onClick={() => { logout(); go('/') }}>Sign out</button></div></header><AccountWorkspace /><AccountExtras /></main>
}

function AdminLogin() {
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@civicx.test')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); const result = await login({ email, password }, ROLES.ADMIN); setBusy(false); if (!result.ok) setError(result.message ?? 'Unable to sign in.'); else go('/admin') }
  return <AuthLayout eyebrow="Administrator access" title="Keep CivicX accountable." copy="Review institution access, moderation decisions, reports, and the audit trail from one controlled workspace."><form className="auth-form" onSubmit={submit}><label>Administrator email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter administrator password" autoComplete="current-password" required /></label>{error && <p className="inline-error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Open admin dashboard'} <span>→</span></button><p className="form-foot"><a href="#/">Return to CivicX</a></p></form></AuthLayout>
}

function AdminPage() {
  const { user, logout } = useAuth()
  if (!user || user.role !== ROLES.ADMIN) return <AdminLogin />
  return <main className="home-page"><header className="home-header"><Brand /><div className="home-account"><a href="#/admin">Admin dashboard</a><span>{user.name}</span><button type="button" onClick={() => { logout(); go('/') }}>Sign out</button></div></header><AdminDashboard /></main>
}

  function Landing() { return <main className="landing-page"><div className="landing-canvas" aria-hidden="true"><Threads color={[0.38, 0.72, 1]} amplitude={1.15} distance={0.12} enableMouseInteraction /></div><div className="landing-wash" aria-hidden="true" /><nav className="site-nav" aria-label="Main navigation"><Brand /><div className="nav-links"><a href="#services">Services</a><a href="#about">About CivicX</a></div><a className="nav-login" href="#/login">Sign in <span>↗</span></a></nav><section className="hero-copy" id="about"><p className="eyebrow"><span /> समस्या से समाधान तक</p><h1>From problems to solutions,<br /><em>CivicX is with you.</em></h1><p className="hero-description">Access public services, follow your requests, and build a better community from one trusted place.</p><div className="hero-actions"><a className="btn btn-primary" href="#/register">Get started <span>→</span></a><a className="text-link" href="#/login">Already registered? <strong>Sign in</strong></a></div></section><section className="service-bar" id="services" aria-label="CivicX services"><div className="service-intro"><span className="live-dot" /> Your civic space</div><div className="service-item"><span>01</span><strong>Raise a request</strong><small>Be heard, be counted</small></div><div className="service-item"><span>02</span><strong>Track progress</strong><small>Stay in the loop</small></div><div className="service-item"><span>03</span><strong>Shape tomorrow</strong><small>Take part locally</small></div></section></main> }

export default function App() {
  const { user, isRefreshing, refreshSession } = useAuth()
  const [currentRoute, setCurrentRoute] = useState<Route>(route)
  useEffect(() => { const handleHash = () => setCurrentRoute(route()); window.addEventListener('hashchange', handleHash); if (!user && currentRoute === '/home') void refreshSession(); return () => window.removeEventListener('hashchange', handleHash) }, [currentRoute, refreshSession, user])
  if (isRefreshing) return <div className="route-loading">Restoring your secure session...</div>
  if (currentRoute === '/home') return <Home />
  if (currentRoute === '/submit') return <SubmissionPage />
  if (currentRoute === '/university') return <UniversityPage />
  if (currentRoute === '/industry') return <IndustryPage />
  if (currentRoute === '/projects') return <ProjectBoardPage />
  if (currentRoute === '/settings') return <SettingsPage />
  if (currentRoute === '/admin') return <AdminPage />
  if (currentRoute === '/login') return <Login />
  if (currentRoute === '/register') return <Register />
  if (currentRoute === '/institution') return <Register institution />
  if (currentRoute === '/forgot-password') return <PasswordReset />
  if (currentRoute === '/reset-password') return <PasswordReset reset />
  return <Landing />
}

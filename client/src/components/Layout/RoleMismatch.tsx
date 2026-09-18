import './Layout.css'

export default function RoleMismatch({ destination = '/home', destinationLabel = 'Return to your workspace' }: { destination?: string; destinationLabel?: string }) {
  return <main className="role-mismatch-page"><section className="role-mismatch-card" role="alert"><span className="role-mismatch-mark">↗</span><p className="eyebrow"><span /> Access boundary</p><h1>This workspace belongs to another role.</h1><p>Your account is signed in, but it does not have permission to open this area. Use the workspace assigned to your account.</p><a className="auth-submit" href={`#${destination}`}>{destinationLabel} <span>→</span></a></section></main>
}

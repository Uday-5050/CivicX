import { useEffect, useState } from 'react'
import { useAuth } from '../../features/auth/AuthContext'

export default function AccountExtras() {
  const { user } = useAuth()
  const [pushState, setPushState] = useState<'unsupported' | 'default' | 'granted' | 'denied'>('default')

  useEffect(() => {
    if (typeof Notification === 'undefined') setPushState('unsupported')
    else setPushState(Notification.permission)
  }, [])

  if (!user) return null
  const requestPush = async () => {
    if (typeof Notification === 'undefined') { setPushState('unsupported'); return }
    setPushState(await Notification.requestPermission())
  }

  return <section className="account-extras account-panel">
    <div className="panel-title"><div><p className="section-kicker">04 <strong>Location and push</strong></p><h2>Choose your signal.</h2></div></div>
    <p className="account-extra-copy">Location access is requested only when needed. Denying it does not block CivicX.</p>
    <div className="location-control"><div><strong>Push notifications</strong><small>{pushState === 'granted' ? 'Push permission granted.' : pushState === 'denied' ? 'Push denied. In-app alerts remain available.' : pushState === 'unsupported' ? 'Push is unavailable in this browser.' : 'Optional browser alerts for new activity.'}</small></div><button type="button" onClick={() => void requestPush()}>Request push access</button></div>
  </section>
}

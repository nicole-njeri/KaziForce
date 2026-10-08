import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../pages/WorkerFlow.css'
import { readAccount } from './workerApi'

const links = [
  { label: 'Dashboard', to: '/worker/dashboard', icon: '⌂' },
  { label: 'Find gigs', to: '/worker/gigs', icon: '⌕' },
  { label: 'My applications', to: '/worker/applications', icon: '▤' },
  { label: 'My profile', to: '/worker/profile', icon: '◯' }
]

export function WorkerLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const account = readAccount()
  const name = account.full_name || account.fullName || 'Worker'
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return <div className="worker-app">
    <aside className="wf-sidebar">
      <Link className="wf-brand" to="/worker/dashboard"><span className="wf-brand-mark">K</span><span><strong>Kazi<span>Force</span></strong><small>Skills. People. Opportunities.</small></span></Link>
      <p className="wf-nav-label">WORKSPACE</p>
      <nav aria-label="Worker navigation">{links.map((item) => {
        const active = location.pathname === item.to || (item.to !== '/worker/dashboard' && location.pathname.startsWith(`${item.to}/`))
        return <Link key={item.to} className={`wf-nav-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} to={item.to}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>
      })}</nav>
      <div className="wf-sidebar-note"><span>YOUR NEXT STEP</span><strong>Make your skills easy to find.</strong><p>Keep your profile details current to help clients understand your experience.</p><Link to="/worker/profile/edit">Update profile <span aria-hidden="true">→</span></Link></div>
      <button className="wf-logout" type="button" onClick={logout}><span aria-hidden="true">↪</span>Log out</button>
    </aside>
    <div className="wf-main-shell">
      <header className="wf-topbar"><div className="wf-topbar-spacer"/><div className="wf-account"><span className="wf-avatar-small">{name.charAt(0).toUpperCase()}</span><span><strong>{name}</strong><small>Worker</small></span></div></header>
      <main className="wf-content">{children}</main>
    </div>
  </div>
}


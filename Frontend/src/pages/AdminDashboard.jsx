import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:5000/api/admin'

function AdminDashboard() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [gigs, setGigs] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Admin API calls carry the JWT; the backend independently enforces the
  // Administrator role for every route in this dashboard.
  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...options.headers }
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Admin request failed.')
    return data
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [stats, userData, gigData] = await Promise.all([request('/overview'), request('/users'), request('/gigs')])
      setOverview(stats.overview); setUsers(userData.users || []); setGigs(gigData.gigs || []); setError('')
    } catch (err) { setError(err.message) }
  }, [request])
  useEffect(() => { const timer = window.setTimeout(refresh, 0); return () => window.clearTimeout(timer) }, [refresh])

  // Only toggle account activity; the API prevents moderation of admin accounts.
  const moderateUser = async (user) => {
    try { await request(`/users/${user.user_id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !user.is_active }) }); setMessage(`${user.full_name} ${user.is_active ? 'suspended' : 'restored'}.`); await refresh() }
    catch (err) { setError(err.message) }
  }
  const moderateGig = async (gig) => {
    const status = gig.status === 'Closed' ? 'Open' : 'Closed'
    try { await request(`/gigs/${gig.gig_id}/moderation`, { method: 'PATCH', body: JSON.stringify({ status }) }); setMessage(`${gig.title} marked ${status.toLowerCase()}.`); await refresh() }
    catch (err) { setError(err.message) }
  }
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login') }

  return <main style={styles.page}>
    <header style={styles.header}><div><h1 style={{ color: 'white' }}>KaziForce administration</h1><p>Platform monitoring and moderation</p></div><button onClick={logout}>Log out</button></header>
    <section style={styles.section}><h2 style={styles.heading}>Platform monitoring</h2>{overview ? <div style={styles.metrics}>{Object.entries(overview).map(([label, value]) => <article key={label} style={styles.metric}><strong>{value}</strong><span>{label.replaceAll('_', ' ')}</span></article>)}</div> : <p>Loading platform totals…</p>}</section>
    {error && <p role="alert" style={{ color: '#a32222' }}>{error}</p>}{message && <p role="status">{message}</p>}
    <section style={styles.section}><h2 style={styles.heading}>User management</h2>{users.map((user) => <article key={user.user_id} style={styles.row}><div><strong>{user.full_name}</strong><p>{user.email} · {user.role} · {user.is_active ? 'Active' : 'Suspended'}</p></div>{user.role !== 'Administrator' && <button onClick={() => moderateUser(user)}>{user.is_active ? 'Suspend' : 'Restore'}</button>}</article>)}</section>
    <section style={styles.section}><h2 style={styles.heading}>Gig moderation</h2>{gigs.map((gig) => <article key={gig.gig_id} style={styles.row}><div><strong>{gig.title}</strong><p>{gig.client_name} · {gig.location} · {gig.status} · {gig.application_count} applications</p></div><button onClick={() => moderateGig(gig)}>{gig.status === 'Closed' ? 'Reopen' : 'Close'}</button></article>)}</section>
  </main>
}

const styles = {
  page: { minHeight: '100vh', background: '#f5f7fa', color: '#172b4d', fontFamily: 'system-ui, sans-serif', paddingBottom: 36, colorScheme: 'light', textAlign: 'left' },
  header: { background: '#243b53', color: 'white', padding: '18px max(24px, calc((100% - 1100px)/2))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  section: { maxWidth: 1100, margin: '24px auto', padding: '0 20px' },
  heading: { color: '#172b4d', textAlign: 'left' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12 },
  metric: { background: 'white', borderRadius: 10, padding: 18, display: 'grid', gap: 8, textTransform: 'capitalize' },
  row: { background: 'white', borderRadius: 9, padding: '12px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }
}

export default AdminDashboard

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:5000/api'
const emptyGig = { title: '', description: '', category: '', requiredSkills: '', location: '', budget: '', duration: '' }

function ClientDashboard() {
  const navigate = useNavigate()
  const [gigs, setGigs] = useState([])
  const [form, setForm] = useState(emptyGig)
  const [applications, setApplications] = useState([])
  const [selectedGig, setSelectedGig] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reviewDrafts, setReviewDrafts] = useState({})

  // Attach the session token centrally so client-only APIs receive the same
  // authentication header and response error handling.
  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...options.headers }
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || data.error || 'Request failed.')
    return data
  }, [])

  const loadGigs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await request('/gigs/client/mine')
      setGigs(data.gigs || [])
      setError('')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }, [request])

  useEffect(() => {
    const timer = window.setTimeout(loadGigs, 0)
    return () => window.clearTimeout(timer)
  }, [loadGigs])

  const postGig = async (event) => {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await request('/gigs', { method: 'POST', body: JSON.stringify(form) })
      setForm(emptyGig); setNotice('Gig posted successfully.'); await loadGigs()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  // Load applicant details and ranked recommendations together for the
  // selected gig while showing a loading state for both results.
  const openApplications = async (gig) => {
    setSelectedGig(gig); setError(''); setNotice(''); setRecommendations([])
    setDetailsLoading(true)
    try {
      const [applicationData, matches] = await Promise.all([
        request(`/applications/gig/${gig.gig_id}`),
        request('/matching/workers', { method: 'POST', body: JSON.stringify({ gigId: gig.gig_id, topN: 5 }) }).catch(() => ({ recommendations: [] }))
      ])
      setApplications(applicationData.applications || [])
      setRecommendations(matches.recommendations || [])
    } catch (err) { setError(err.message); setApplications([]) } finally { setDetailsLoading(false) }
  }

  // The API verifies that the current client owns the gig before changing
  // an application's pending status.
  const updateStatus = async (applicationId, status) => {
    try {
      await request(`/applications/${applicationId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await openApplications(selectedGig)
      setNotice(`Application ${status.toLowerCase()}.`)
    } catch (err) { setError(err.message) }
  }

  const updateGig = async (gig, status) => {
    try {
      await request(`/gigs/${gig.gig_id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setNotice(`Gig marked ${status.toLowerCase()}.`); await loadGigs()
    } catch (err) { setError(err.message) }
  }

  // Reviews are submitted only for accepted applications and are tied to
  // the client/worker identities associated with that application.
  const saveReview = async (applicationId) => {
    const draft = reviewDrafts[applicationId] || { rating: 5, review: '' }
    try {
      await request(`/applications/${applicationId}/review`, { method: 'POST', body: JSON.stringify(draft) })
      await openApplications(selectedGig)
      setNotice('Worker review saved.')
    } catch (err) { setError(err.message) }
  }

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login') }
  const field = (name, label, type = 'text', required = false) => <label style={styles.label} key={name}>{label}<input style={styles.input} type={type} required={required} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} /></label>

  return <div style={styles.page}>
    <header style={styles.header}><div><h1 style={{ margin: 0, color: 'white' }}>KaziForce</h1><span>Client dashboard</span></div><button style={styles.secondary} onClick={logout}>Log out</button></header>
    <main style={styles.main}>
      <h2 style={styles.heading}>Post a gig</h2>
      <form onSubmit={postGig} style={styles.form}>
        {field('title', 'Title', 'text', true)}{field('category', 'Category')}{field('requiredSkills', 'Required skills (comma-separated)')}
        {field('location', 'Location')}{field('budget', 'Budget (KES)', 'number')}{field('duration', 'Duration')}
        <label style={{ ...styles.label, gridColumn: '1 / -1' }}>Description<textarea required style={{ ...styles.input, minHeight: 90 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button style={styles.primary} disabled={busy}>{busy ? 'Posting…' : 'Post gig'}</button>
      </form>
      {error && <p role="alert" style={styles.error}>{error}</p>}{notice && <p role="status" style={styles.notice}>{notice}</p>}
      <section><h2 style={styles.heading}>Manage gigs</h2>{loading ? <p>Loading gigs…</p> : gigs.length === 0 ? <p>You have not posted any gigs yet.</p> : <div style={styles.cards}>{gigs.map((gig) => <article key={gig.gig_id} style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><h3>{gig.title}</h3><p>{gig.location || 'Location flexible'} · {gig.status}</p><p>{gig.application_count ?? 0} applications</p></div><strong>{gig.budget ? `KES ${gig.budget}` : 'Budget negotiable'}</strong></div>
        <div style={styles.actions}><button style={styles.primary} onClick={() => openApplications(gig)}>Applications & recommendations</button>{gig.status === 'Open' ? <button style={styles.secondary} onClick={() => updateGig(gig, 'Closed')}>Close gig</button> : <button style={styles.secondary} onClick={() => updateGig(gig, 'Open')}>Reopen gig</button>}</div>
      </article>)}</div>}</section>
      {selectedGig && <section style={styles.panel}><div style={styles.actions}><h2 style={{ ...styles.heading, flex: 1 }}>{selectedGig.title}: applicants</h2><button style={styles.secondary} onClick={() => setSelectedGig(null)}>Close</button></div>
        <h3 style={styles.heading}>Recommended workers</h3>{detailsLoading ? <p>Loading worker recommendations…</p> : recommendations.length ? <div style={styles.cards}>{recommendations.map((worker) => <article key={worker.worker_id} style={styles.card}><strong>{worker.worker_id}</strong><p>{worker.score}% match · {worker.match_strength}</p><p>{(worker.similarity?.common_tags || []).join(', ') || 'No overlapping tags reported'}</p></article>)}</div> : <p>Matching recommendations are unavailable for this gig yet.</p>}
        <h3 style={styles.heading}>Applications</h3>{detailsLoading ? <p>Loading applications…</p> : applications.length === 0 ? <p>No applications yet.</p> : applications.map((app) => <article key={app.application_id} style={styles.card}><div style={styles.actions}><strong>{app.full_name}</strong><span>{app.status}</span></div><p>{app.email} · {app.location}</p><p>{app.bio || 'No profile bio provided.'} {app.experience_years != null && `· ${app.experience_years} years experience`}</p><p>{app.cover_message}</p>{app.status === 'Pending' && <div style={styles.actions}><button style={styles.primary} onClick={() => updateStatus(app.application_id, 'Accepted')}>Accept</button><button style={styles.secondary} onClick={() => updateStatus(app.application_id, 'Rejected')}>Reject</button></div>}{app.status === 'Accepted' && <div style={styles.actions}><label>Rating <select value={reviewDrafts[app.application_id]?.rating ?? app.review_rating ?? 5} onChange={(e) => setReviewDrafts({ ...reviewDrafts, [app.application_id]: { ...reviewDrafts[app.application_id], rating: Number(e.target.value), review: reviewDrafts[app.application_id]?.review ?? app.client_review ?? '' } })}><option value={5}>5 stars</option><option value={4}>4 stars</option><option value={3}>3 stars</option><option value={2}>2 stars</option><option value={1}>1 star</option></select></label><input aria-label={`Review for ${app.full_name}`} placeholder="Write a worker review" value={reviewDrafts[app.application_id]?.review ?? app.client_review ?? ''} onChange={(e) => setReviewDrafts({ ...reviewDrafts, [app.application_id]: { ...reviewDrafts[app.application_id], rating: reviewDrafts[app.application_id]?.rating ?? app.review_rating ?? 5, review: e.target.value } })} /><button style={styles.secondary} onClick={() => saveReview(app.application_id)}>{app.review_rating ? 'Update review' : 'Rate worker'}</button></div>}</article>)}
      </section>}
    </main>
  </div>
}

const styles = {
  page: { minHeight: '100vh', background: '#f5f7fa', color: '#172b4d', fontFamily: 'system-ui, sans-serif', colorScheme: 'light' },
  header: { background: '#123d35', color: 'white', padding: '18px max(24px, calc((100% - 1100px)/2))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  main: { maxWidth: 1100, margin: '30px auto', padding: '0 20px', textAlign: 'left' },
  heading: { color: '#172b4d', textAlign: 'left' },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, padding: 20, background: 'white', borderRadius: 12, boxShadow: '0 2px 12px #102a4320' },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 600, fontSize: 14 },
  input: { border: '1px solid #cbd5e1', borderRadius: 7, padding: '10px 12px', font: 'inherit' },
  cards: { display: 'grid', gap: 14, marginTop: 14 },
  card: { background: 'white', borderRadius: 10, padding: 18, boxShadow: '0 2px 10px #102a4315', marginBottom: 12 },
  panel: { marginTop: 28, padding: 20, background: '#eaf2ef', borderRadius: 12 },
  actions: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  primary: { background: '#0b7665', color: 'white', border: 0, borderRadius: 7, padding: '10px 15px', cursor: 'pointer' },
  secondary: { background: 'white', color: '#123d35', border: '1px solid #9db7b0', borderRadius: 7, padding: '9px 14px', cursor: 'pointer' },
  error: { color: '#a32222' }, notice: { color: '#086a45' }
}

export default ClientDashboard

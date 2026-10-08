import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { WorkerLayout } from '../components/WorkerLayout'
import { apiHeaders } from '../components/workerApi'

function WorkerDashboard() {
  const [data, setData] = useState({ recommendations: [], applications: [], profile: null, worker: null, matchingAvailable: true })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    const load = async () => {
      try {
        const [recommended, applications, profile] = await Promise.all([
          fetch('http://localhost:5000/api/matching/gigs', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ topN: 4 }) }),
          fetch('http://localhost:5000/api/applications/worker/mine', { headers: apiHeaders() }),
          fetch('http://localhost:5000/api/profiles/mine', { headers: apiHeaders() })
        ].map((request, index) => index === 0 ? request.catch(() => null) : request))
        const [matchingData, applicationData, profileData] = await Promise.all([recommended?.json?.().catch(() => ({})) || {}, applications.json(), profile.json()])
        if (!applications.ok) throw new Error(applicationData.message || 'Unable to load your applications.')
        if (!profile.ok && profile.status !== 404) throw new Error(profileData.message || 'Unable to load your profile.')
        if (live) setData({ recommendations: recommended?.ok ? matchingData.recommendations || [] : [], worker: matchingData.worker || null, matchingAvailable: Boolean(recommended?.ok), applications: applicationData.applications || [], profile: profile.ok ? profileData.profile : null })
      } catch (loadError) { if (live) setError(loadError.message || 'Unable to load your dashboard.') }
      finally { if (live) setLoading(false) }
    }
    load()
    return () => { live = false }
  }, [])

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()
  const name = user.full_name || user.fullName || 'there'
  const completionFields = data.profile ? [data.profile.skills, data.profile.bio, data.profile.education, data.profile.availability, data.profile.experience_years] : []
  const completion = completionFields.length ? Math.round(completionFields.filter((value) => value !== null && value !== undefined && value !== '').length * 100 / completionFields.length) : 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return <WorkerLayout>
    <div className="wf-dashboard-welcome"><div><p className="wf-eyebrow">WORKER DASHBOARD</p><h1>{greeting}, {name.split(' ')[0]}</h1><p>Here are opportunities and updates based on your KaziForce activity.</p></div><Link className="wf-primary" to="/worker/gigs">Explore gigs</Link></div>
    {error && <div className="wf-error" role="alert">{error}</div>}
    <section className="wf-metrics" aria-label="Your worker summary">
      <article className="wf-card wf-metric"><span>Recommended gigs</span><strong>{loading || !data.matchingAvailable ? '—' : data.recommendations.length}</strong><small>Open opportunities matched to your profile</small></article>
      <article className="wf-card wf-metric"><span>Applications</span><strong>{loading ? '—' : data.applications.length}</strong><small>Applications submitted from your account</small></article>
      <article className="wf-card wf-metric"><span>Profile complete</span><strong>{loading ? '—' : `${completion}%`}</strong><small>Based on saved professional details</small></article>
      <article className="wf-card wf-metric"><span>Experience</span><strong>{loading ? '—' : data.profile?.experience_years != null ? `${data.profile.experience_years} yrs` : '—'}</strong><small>Years recorded on your profile</small></article>
    </section>
    {loading ? <div className="wf-state" role="status"><span className="wf-spinner"/>Loading your worker dashboard…</div> : <div className="wf-dashboard-grid">
      <section className="wf-card wf-panel"><div className="wf-panel-heading"><div><p className="wf-eyebrow">CURATED FOR YOU</p><h2>Recommended gigs</h2></div><Link to="/worker/gigs">Find all gigs →</Link></div>
        {data.recommendations.length ? <div className="wf-mini-list">{data.recommendations.map((gig) => <article className="wf-mini-gig" key={gig.gig_id}><span className="wf-gig-mark">{String(gig.category || gig.title || 'G').charAt(0).toUpperCase()}</span><div className="wf-mini-copy"><strong>{gig.title || `Gig #${gig.gig_id}`}</strong><span>{gig.category || 'Open opportunity'}{gig.location ? ` · ${gig.location}` : ''}</span></div>{Number.isFinite(Number(gig.score)) && <span className="wf-match">{gig.score}% match</span>}<Link to={`/worker/gigs/${gig.gig_id}`}>View</Link></article>)}</div> : <div className="wf-state"><h2>{data.matchingAvailable ? 'No recommendations yet' : 'Recommendations unavailable'}</h2><p>{data.matchingAvailable ? 'Browse open gigs or add skills to your profile to help the matching service find opportunities.' : 'The matching service did not respond. You can still browse open gigs.'}</p><Link className="wf-secondary" to="/worker/gigs">Browse open gigs</Link></div>}
      </section>
      <div className="wf-mini-list">
        <section className="wf-card wf-panel"><div className="wf-panel-heading"><div><p className="wf-eyebrow">YOUR ACTIVITY</p><h2>Recent applications</h2></div><Link to="/worker/applications">View all →</Link></div>
          {data.applications.length ? <div className="wf-application-list">{data.applications.slice(0, 4).map((application) => <Link className="wf-application-row" key={application.application_id} to={`/worker/applications/${application.application_id}`}><div><strong>{application.gig_title || `Gig #${application.gig_id}`}</strong><small>{application.applied_at ? new Date(application.applied_at).toLocaleDateString() : 'Date not available'}</small></div><span className={`wf-status ${String(application.status || '').toLowerCase()}`}>{application.status}</span></Link>)}</div> : <p className="wf-profile-bio">No applications yet. Your submissions will appear here.</p>}
        </section>
        <section className="wf-card wf-panel"><div className="wf-panel-heading"><div><p className="wf-eyebrow">YOUR PROFILE</p><h2>Profile overview</h2></div><Link to="/worker/profile">View →</Link></div><div className="wf-completion" role="progressbar" aria-label="Profile completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow={completion}><span style={{ width: `${completion}%` }}/></div><div className="wf-completion-label"><span>Saved profile details</span><strong>{completion}%</strong></div><div className="wf-tags">{String(data.profile?.skills || '').split(/[,;\n]/).map((skill) => skill.trim()).filter(Boolean).slice(0, 5).map((skill) => <span className="wf-tag" key={skill}>{skill}</span>)}</div></section>
      </div>
    </div>}
  </WorkerLayout>
}
export default WorkerDashboard
